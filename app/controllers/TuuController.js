const logger = require("../../config/logger"); // Importa el logger
const { TuuRepository, TicketRepository } = require("../repositories");

const TuuController = {
  // Listar roles
  async createPayment(req, res) {
    //logger.info(`${req.user.name} - Accediendo al pago con tuu`);

    try {
      // Llamar al repository para crear el pago
      const paymentResponse = await TuuRepository.createPayment(req.body);

      res.status(200).json({ payment: paymentResponse });
    } catch (error) {
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";
      logger.error("Error en TuuController->createPayment: " + errorMsg);
      res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },

  async store(req, res) {
    logger.info(`${req.user.name} - Accediendo a guardar los datos del pago de tuu` );
    logger.info("Datos recibidos al guardar el pago");
    logger.info(JSON.stringify(req.body));
    try {
      // Llamar al repository para crear el pago
      const paymentResponse = await TuuRepository.create(req.body);

      res.status(200).json({ payment: paymentResponse });
    } catch (error) {
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";
      logger.error("Error en TuuController->store: " + errorMsg);
      res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },

  async getPaymentsByTicketId(req, res) {
    logger.info(`${req.user.name} - Accediendo a consultar los pagos de un ticket`);
    const {id} = req.body;

    // Verificar si el viaje, usuario y sucursal existen
    const ticket = await TicketRepository.findById(id);
    if (!ticket) {
      logger.error(
        `TuuController->getPaymentsByTicketId: Ticket no encontrado con ID ${id}`
      );
      return res.status(400).json({ msg: "TicketNotFound" });
    }

    try {
      // Llamar al repository para crear el pago
      const payments = await TuuRepository.getPaymentsByTicketId(id);

      res.status(200).json({ payments: payments });
    } catch (error) {
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";
      logger.error("Error en TuuController->getPaymentsByTicketId: " + errorMsg);
      res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },
};

module.exports = TuuController;
