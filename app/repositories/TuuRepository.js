require("dotenv").config();
const { Payment } = require("../models"); // Aquí usamos el modelo Vehicle
const axios = require("axios");
const logger = require("../../config/logger"); // Logger para seguimiento

const TUU_API_URL = "https://integrations.payment.haulmer.com/PaymentRequest/Create"; // URL oficial

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

  async createPayment(paymentData) {
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
          Description: 'Servicio de afiliacion',
          DteType: 48,
          extraData: {
            exemptAmount: 0,
            customFields: [{name: 'Contacto', value: '9 51221345', print: true}],
            sourceName: 'POS Pagos',
            sourceVersion: 'v1.17v0.2'
          }
        }
      };

      /*const options = {
        method: "POST",
        url: TUU_API_URL,
        headers: {
          "X-API-Key": "VGtcyYOqUM0x7ttAd2FL2CYuL2XiKhRC83AVT1GQMZ4PSacINB5gu9FTClvy9oijcNh3oY9j74bldwDQWVBvu8gLVYCa1DoxlbJBOod1oEcn2fbPGI3UWhkYi8mJrq", // Aquí va la API Key
          accept: "application/json",
          "Content-Type": "application/json",
        },
        data: requestData,
      };*/

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
