require("dotenv").config();
const { Payment } = require("../models");
const axios = require("axios");
const logger = require("../../config/logger");
const {
  buildCreateRequest,
  parsePaymentResponse,
} = require("../services/TuuRemotePaymentContract");

const TUU_API_URL = "https://integrations.payment.haulmer.com/PaymentRequest/Create";
const TUU_REMOTE_API_URL = "https://integrations.payment.haulmer.com/RemotePayment/v2";
const DEFINITIVE_TUU_REJECTION = /\b(?:RP-(?:000|001|003|004|005|006|007|008|010|011|012|015|017|018|019|020|021|022|025|026|027|028|029|030|031|032)|MR-(?:000|100|110|120|130|140|141|150|151|161|180)|KEY-00[23]|RP-10[012]|I-0[234])\b/;
const TUU_ERROR_LOG_MESSAGE_LIMIT = 500;

function boundedTuuLogValue(value) {
  return String(value)
    .replace(/(X-API-Key\s*[:=]\s*)[^\s,;]+/gi, "$1[REDACTED]")
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi, "$1[REDACTED]")
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, "[REDACTED]")
    .slice(0, TUU_ERROR_LOG_MESSAGE_LIMIT);
}

function extractTuuError(responseData) {
  const nestedError = responseData && typeof responseData === "object"
    ? responseData.error
    : null;
  const firstError = responseData && typeof responseData === "object"
    && Array.isArray(responseData.errors)
    ? responseData.errors[0]
    : null;
  const providerCode = responseData && typeof responseData === "object"
    ? responseData.code ?? responseData.errorCode ?? nestedError?.code ?? firstError?.code
    : null;
  const providerMessage = typeof responseData === "string"
    ? responseData
    : responseData && typeof responseData === "object"
      ? responseData.message ?? responseData.errorMessage ?? nestedError?.message ?? firstError?.message
      : null;
  return { providerCode, providerMessage };
}

function logTuuError(operation, cause, payment) {
  const responseData = cause.response?.data;
  const { providerCode, providerMessage } = extractTuuError(responseData);
  const details = {
    operation,
    httpStatus: cause.response?.status ?? null,
    networkCode: cause.code ?? null,
    ...(payment?.idempotencyKey ? { idempotencyKey: payment.idempotencyKey } : {}),
    ...(providerCode != null ? { providerCode: boundedTuuLogValue(providerCode) } : {}),
    ...(providerMessage != null ? { providerMessage: boundedTuuLogValue(providerMessage) } : {}),
    ...(!cause.response && cause.message
      ? { errorMessage: boundedTuuLogValue(cause.message) }
      : {}),
  };

  // The Winston formatter writes info.message only; serialize the allowlisted
  // diagnostic here instead of passing response/config objects as metadata.
  logger.error(`TUU ${operation} failed ${JSON.stringify(details)}`);
}

function isDocumentedTuuRejection(response) {
  if (response?.status === 401) return true;
  if (!response || response.status < 400 || response.status >= 500) return false;
  let payload;
  try {
    payload = typeof response.data === "string"
      ? response.data
      : JSON.stringify(response.data ?? "");
  } catch {
    return false;
  }
  return DEFINITIVE_TUU_REJECTION.test(payload || "");
}

const TuuRepository = {
  // Adaptador existente v1. Crear una solicitud NO acredita un pago.
  // https://developers.tuu.cl/docs/pago-remoto
  async createPayment(paymentData) {
    const value = paymentData || {};
    if (!process.env.TUU_API_KEY) {
      throw new Error("TUU_API_KEY no está definida en las variables de entorno");
    }

    try {
      const response = await axios.request({
        method: "POST",
        url: TUU_API_URL,
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "X-API-Key": process.env.TUU_API_KEY,
        },
        data: {
          Amount: value.amount,
          Device: value.device || "TJ44245N20440",
          Description: value.description || "Pago de compra de ticket",
          DteType: value.dteType || 48,
          extraData: {
            exemptAmount: value.exemptAmount ?? 0,
            customFields: [
              { name: "Contacto", value: "9 51221345", print: false },
            ],
            sourceName: value.sourceName || "POS Pagos",
            sourceVersion: value.sourceVersion || "v1.17v0.2",
          },
        },
      });

      // Se conserva la lectura del adaptador v1; no es un decoder de v2
      // ni se usa para confirmar o emitir tickets.
      if (response.data && response.data.paymentRequest) {
        return {
          success: true,
          status: response.data.status,
          paymentRequestId: response.data.paymentRequest.paymentRequestId,
          amount: response.data.paymentRequest.amount,
          device: response.data.paymentRequest.device,
          description: response.data.paymentRequest.description,
          extraData: response.data.paymentRequest.extraData,
          message: "Pago creado exitosamente",
          data: response.data,
        };
      }

      return {
        success: false,
        status: response.status,
        message: response.data?.message || "Error al procesar el pago",
        data: response.data,
      };
    } catch (error) {
      // Axios incluye la API key en config/request: no registrar esos objetos.
      logTuuError("PaymentRequest/Create", error, value);
      if (error.response) {
        return {
          success: false,
          status: error.response.status,
          message: error.response.data?.message || "Error en la respuesta de TUU",
          data: error.response.data,
        };
      }

      const timedOut = ["ETIMEDOUT", "ECONNABORTED"].includes(error.code);
      return {
        success: false,
        status: timedOut ? 504 : 502,
        message: "No se obtuvo confirmación de TUU; no reintentar el cobro automáticamente",
      };
    }
  },

  async createRemotePayment(payment) {
    if (!process.env.TUU_API_KEY) {
      const error = new Error('TUU_API_KEY no está configurada');
      error.httpStatus = 503;
      error.uncertain = false;
      throw error;
    }

    const requestData = buildCreateRequest(payment);
    try {
      const response = await axios.request({
        method: 'POST',
        url: `${TUU_REMOTE_API_URL}/Create`,
        timeout: 15000,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'X-API-Key': process.env.TUU_API_KEY,
        },
        data: requestData,
      });
      if (response.status !== 201) {
        const error = new Error('TUU devolvió un código de creación inesperado');
        error.httpStatus = 502;
        error.uncertain = true;
        throw error;
      }
      return parsePaymentResponse(response.data, payment, 'POST');
    } catch (cause) {
      logTuuError("RemotePayment/v2/Create", cause, payment);
      if (cause.httpStatus) throw cause;

      const { providerCode, providerMessage } = extractTuuError(cause.response?.data);
      const error = new Error(providerMessage || cause.message || 'Error al crear pago remoto TUU');
      error.httpStatus = cause.response?.status || (["ETIMEDOUT", "ECONNABORTED"].includes(cause.code) ? 504 : 502);
      if (providerCode != null) error.providerCode = String(providerCode);
      // El catálogo TUU también contiene errores 400 de duplicidad y proceso.
      // Sin un código documentado de rechazo, un 4xx no demuestra por sí solo
      // que no exista un pago asociado a esta clave.
      error.uncertain = !isDocumentedTuuRejection(cause.response);
      error.providerStatus = cause.response?.status ?? null;
      throw error;
    }
  },

  async getRemotePayment(payment) {
    if (!process.env.TUU_API_KEY) {
      const error = new Error('TUU_API_KEY no está configurada');
      error.httpStatus = 503;
      error.uncertain = true;
      throw error;
    }

    try {
      const response = await axios.request({
        method: 'GET',
        url: `${TUU_REMOTE_API_URL}/GetPaymentRequest/${encodeURIComponent(payment.idempotencyKey)}`,
        timeout: 15000,
        headers: {
          accept: 'application/json',
          'X-API-Key': process.env.TUU_API_KEY,
        },
      });
      if (response.status !== 200) {
        const error = new Error('TUU devolvió un código de consulta inesperado');
        error.httpStatus = 502;
        error.uncertain = true;
        throw error;
      }
      return parsePaymentResponse(response.data, payment, 'GET');
    } catch (cause) {
      logTuuError("RemotePayment/v2/GetPaymentRequest", cause, payment);
      if (cause.httpStatus) throw cause;

      const { providerCode, providerMessage } = extractTuuError(cause.response?.data);
      const error = new Error(providerMessage || cause.message || 'Error al consultar pago remoto TUU');
      error.httpStatus = cause.response?.status || (["ETIMEDOUT", "ECONNABORTED"].includes(cause.code) ? 504 : 502);
      if (providerCode != null) error.providerCode = String(providerCode);
      error.uncertain = true;
      error.providerStatus = cause.response?.status ?? null;
      throw error;
    }
  },

  async create(body, options = {}) {
    try {
      const payment = await Payment.create({
        ticket_id: body.ticket_id,
        amount: body.amount,
        device: body.device,
        description: body.description,
        dteType: body.dteType,
        idempotencyKey: body.idempotencyKey,
        status: body.status,
        exemptAmount: body.exemptAmount || 0,
        customFields: body.customFields || [],
      }, options);
      return payment;
    } catch (err) {
      logger.error("Error al guardar el pago:", err);
      throw err;
    }
  },

  async getPaymentsByTicketId(ticket_id) {
    try {
      return await Payment.findAll({ where: { ticket_id } });
    } catch (error) {
      logger.error("Error al obtener los pagos:", error);
      throw error;
    }
  },
};

module.exports = TuuRepository;
