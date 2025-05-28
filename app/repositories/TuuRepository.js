require("dotenv").config();
const { Payment } = require("../models"); // Aquí usamos el modelo Vehicle
const axios = require("axios");
const logger = require("../../config/logger"); // Logger para seguimiento
const { info } = require("winston");

const TUU_API_URL =
  "https://integrations.payment.haulmer.com/PaymentRequest/Create"; // URL oficial

const TuuRepository = {
  /*async createPayment(paymentData) {
    try {
      // Incluye el encabezado directamente en la solicitud
      const response = await tuuDevelopers.postPaymentrequestCreate(
        paymentData,
        {
          headers: {
            "X-API-Key": process.env.TUU_API_KEY, // Configura la API Key aquí
          },
        }
      );
      return response.data;
    } catch (error) {
      if (error.response) {
        // El servidor respondió con un código de estado fuera del rango 2xx
        logger.error(
          "Error en la respuesta del servidor:",
          error.response.data
        );
        throw new Error(
          error.response.data.message || "Error al procesar el pago"
        );
      } else if (error.request) {
        // La solicitud fue hecha pero no se recibió respuesta
        logger.error("No se recibió respuesta del servidor:", error.request);
        throw new Error("No se recibió respuesta del servidor");
      } else {
        // Algo sucedió en la configuración de la solicitud que provocó un error
        logger.error("Error al configurar la solicitud:", error);
        throw new Error("Error al configurar la solicitud");
      }
    }
  },*/

  /*async createPayment(paymentData) {
    try {
      if (!process.env.TUU_API_KEY) {
        throw new Error("TUU_API_KEY no está definida en las variables de entorno");
      }

      // Construcción de datos en el formato requerido
      const requestData = {
        Amount: paymentData.amount,
        Device: paymentData.device,
        Description: paymentData.description,
        DteType: paymentData.dteType,
        extraData: {
          exemptAmount: paymentData.exemptAmount ?? 0, // Si no está definido, asigna 0
          customFields: paymentData.customFields || [],
          sourceName: "POS Pagos",
          sourceVersion: "v1.17v0.2",
        },
      };

      const options = {
        method: 'POST',
        url: 'https://integrations.payment.haulmer.com/PaymentRequest/Create',
        headers: {accept: 'application/json', 'content-type': 'application/json', "X-API-Key": "VGtcyYOqUM0x7ttAd2FL2CYuL2XiKhRC83AVT1GQMZ4PSacINB5gu9FTClvy9oijcNh3oY9j74bldwDQWVBvu8gLVYCa1DoxlbJBOod1oEcn2fbPGI3UWhkYi8mJrq",},
        data: {
          Amount: 3000,
          Device: 'TJ44245N20440',
          Description: 'Pago de compra de ticket',
          DteType: 48,
          extraData: {
            exemptAmount: 0,
            customFields: [{name: 'Contacto', value: '9 51221345', print: false}],
            sourceName: 'POS Pagos',
            sourceVersion: 'v1.17v0.2'
          }
        }
      };

      const response = await axios.request(options);
      logger.info("Pago procesado exitosamente:", response.data);
      return response.data;
    } catch (error) {
      if (error.response) {
        logger.error("Error en la respuesta del servidor:", error.response.data);
        throw new Error(error.response.data.message || "Error al procesar el pago");
      } else if (error.request) {
        logger.error("No se recibió respuesta del servidor:", error.request);
        throw new Error("No se recibió respuesta del servidor");
      } else {
        logger.error("Error al configurar la solicitud:", error.message);
        throw new Error("Error al configurar la solicitud");
      }
    }
  },*/

  async createPayment(paymentData) {
    logger.info("Datos Al hacer el pago web");
    logger.info(JSON.stringify(paymentData));
    try {
      // Verificar que la API Key esté definida
      if (!process.env.TUU_API_KEY) {
        logger.info("TUU_API_KEY no está definida en las variables de entorno");
        throw new Error(
          "TUU_API_KEY no está definida en las variables de entorno"
        );
      }

      const options = {
        method: "POST",
        url: "https://integrations.payment.haulmer.com/PaymentRequest/Create",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "X-API-Key": process.env.TUU_API_KEY, // Usar la API Key desde las variables de entorno
        },
        data: {
          Amount: paymentData.amount,
          Device: paymentData.device || "TJ44245N20440",
          Description: paymentData.description || "Pago de compra de ticket",
          DteType: paymentData.dteType || 48,
          extraData: {
            exemptAmount: paymentData.exemptAmount ?? 0, // Valor predeterminado 0 si no está definido
            customFields: [
              { name: "Contacto", value: "9 51221345", print: false },
            ],
            sourceName: paymentData.sourceName || "POS Pagos",
            sourceVersion: paymentData.sourceVersion || "v1.17v0.2",
          },
        },
      };

      // Realizar la solicitud a la API
      const response = await axios.request(options);

      // Verificar la respuesta y devolver los datos relevantes
      if (response.data && response.data.paymentRequest) {
        logger.info("Pago procesado exitosamente:", response.data);
        return {
          success: true,
          status:response.data.status,
          paymentRequestId: response.data.paymentRequest.paymentRequestId,
          amount: response.data.paymentRequest.amount,
          device: response.data.paymentRequest.device,
          description: response.data.paymentRequest.description,
          extraData: response.data.paymentRequest.extraData,
          message: "Pago creado exitosamente",
          data: response.data, // Respuesta completa de la API
        };
      } else {
        // Si la API no devuelve los datos esperados
        logger.error("Error en la respuesta de la API:", response.data);
        return {
          success: false,
          status:response.status,
          message: response.data.message || "Error al procesar el pago",
          data: response.data, // Respuesta completa de la API
        };
      }
    } catch (error) {
      // Manejo de errores
      if (error.response) {
        // Error en la respuesta del servidor
        logger.error(
          "Error en la respuesta del servidor:",
          error.response.data
        );
        return {
          success: false,
          status:error.response.status,
          message:
            error.response.data.message || "Error en la respuesta del servidor",
          data: error.response.data, // Respuesta de error de la API
        };
      } else if (error.request) {
        // No se recibió respuesta del servidor
        logger.error("No se recibió respuesta del servidor:", error.request);
        return {
          success: false,
          status:error.response.status,
          message: "No se recibió respuesta del servidor",
        };
      } else {
        // Error al configurar la solicitud
        logger.error("Error al configurar la solicitud:", error.message);
        return {
          success: false,
          status:error.response.status,
          message: "Error al configurar la solicitud",
        };
      }
    }
  },

  async create(body) {
    try {
      // Crear y guardar el pago en la base de datos
      const payment = await Payment.create({
        ticket_id: body.ticket_id,
        amount: body.amount,
        device: body.device,
        description: body.description,
        dteType: body.dteType,
        idempotencyKey: body.idempotencyKey,
        status: body.status,
        exemptAmount: body.exemptAmount || 0, // Valor por defecto si no se proporciona
        customFields: body.customFields || [], // Valor por defecto si no se proporciona
      });

      return payment;
    } catch (err) {
      logger.error("Error al guardar el pago:", err);
      throw err;
    }
  },

  async getPaymentsByTicketId(ticket_id) {
    try {
      // Realizar la consulta a la base de datos usando Sequelize
      const payments = await Payment.findAll({
        where: {
          ticket_id: ticket_id, // Filtrar por ticket_id
        },
      });
      // Si se encuentran pagos, devolver los pagos
      return payments;
    } catch (error) {
      // Manejo de errores
      logger.error("Error al obtener los pagos:", error);
      throw error;
    }
  },
};

module.exports = TuuRepository;
