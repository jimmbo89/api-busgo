const { Ticket, sequelize } = require("../models");
const logger = require("../../config/logger"); // Logger para seguimiento
const {
  TicketRepository,
  TripRepository,
  BranchRepository,
} = require("../repositories");

const TicketController = {
  // Obtener todos los tickets
  async index(req, res) {
    logger.info(`${req.user.name} - Entra a buscar los tickets`);

    try {
      const tickets = await TicketRepository.findAll();

      if (!tickets.length) {
        return res.status(204).json({ msg: "TicketsNotFound" });
      }

      const mappedTickets = tickets.map((ticket) => ({
        id: ticket.id,
        branchId: ticket.branch_id,
        branch_id: ticket.branch_id,
        userId: ticket.user_id,
        user_id: ticket.user_id,
        tripId: ticket.trip_id,
        trip_id: ticket.trip_id,
        method: ticket.method,
        status: ticket.status,
        quantity: ticket.quantity,
        price: ticket.price,
        total: ticket.total,
        seats: ticket.seats,
        adults: ticket.adults,
        minors: ticket.minors,
        qr: ticket.qr,
        barcode: ticket.barcode,
        date: ticket.date,
        branchName: ticket.branch.name, // Incluir los datos de la sucursal asociada
        userName: ticket.user.name, // Incluir los datos del usuario asociado
        tripName: ticket.trip.route.name, // Incluir los detalles del viaje asociado
        originImage: ticket.trip.route.origin.image, // Incluir los detalles del viaje asociadoc
        tripOrigin: ticket.trip.route.origin.address, // Incluir los detalles del viaje asociadoc
        destinationImage: ticket.trip.route.destination.image, // Incluir los detalles del viaje asociado
        tripDestination: ticket.trip.route.destination.address, // Incluir los detalles del viaje asociado
        schedule: ticket.trip.schedule, // Incluir los detalles del viaje asociado
      }));

      res.status(200).json({ tickets: mappedTickets });
    } catch (error) {
      logger.error("TicketController->index: " + error.message);
      res.status(500).json({ error: "ServerError", details: error.message });
    }
  },

  async getTicketsDate(req, res) {
    logger.info(
      `${req.user.name} - Entra a buscar los tickets de una sucursal en el dia `
    );

    const { branch_id } = req.body;
    const branch = await BranchRepository.findById(branch_id);
    if (!branch) {
      logger.error(
        `TripController->getTicketDate: Sucursal no encontrada con ID ${branch_id}`
      );
      return res.status(400).json({ msg: "BranchNotFound" });
    }

    try {
      const tickets = await TicketRepository.findAllDate(branch_id);

      if (!tickets.length) {
        return res.status(204).json({ msg: "TicketsNotFound" });
      }

      const mappedTickets = tickets.map((ticket) => ({
        id: ticket.id,
        branchId: ticket.branch_id,
        branch_id: ticket.branch_id,
        userId: ticket.user_id,
        user_id: ticket.user_id,
        tripId: ticket.trip_id,
        trip_id: ticket.trip_id,
        method: ticket.method,
        status: ticket.status,
        quantity: ticket.quantity,
        price: ticket.price,
        total: ticket.total,
        seats: Array.isArray(ticket.seats) 
        ? ticket.seats // Si ya es un array, úsalo directamente
        : JSON.parse(ticket.seats), // Si es una cadena JSON, parsearla
        adults: ticket.adults,
        minors: ticket.minors,
        qr: ticket.qr,
        barcode: ticket.barcode,
        date: ticket.date,
        branchName: ticket.branch.name, // Incluir los datos de la sucursal asociada
        userName: ticket.user.name, // Incluir los datos del usuario asociado
        tripName: ticket.trip.route.name, // Incluir los detalles del viaje asociado
        originImage: ticket.trip.route.origin.image, // Incluir los detalles del viaje asociadoc
        tripOrigin: ticket.trip.route.origin.address, // Incluir los detalles del viaje asociadoc
        destinationImage: ticket.trip.route.destination.image, // Incluir los detalles del viaje asociado
        tripDestination: ticket.trip.route.destination.address, // Incluir los detalles del viaje asociado
        schedule: ticket.trip.schedule, // Incluir los detalles del viaje asociado
      }));

      res.status(200).json({ tickets: mappedTickets });
    } catch (error) {
      logger.error("TicketController->getTicketDate: " + error.message);
      res.status(500).json({ error: "ServerError", details: error.message });
    }
  },

  // Crear un nuevo ticket
  async store(req, res) {
    logger.info(`${req.user.name} - Crea un nuevo ticket`);
    logger.info("Datos recibidos al crear un ticket");
    logger.info(JSON.stringify(req.body));

    req.body.user_id = req.user.id;

    const {
      branch_id,
      user_id,
      trip_id,
      method,
      status,
      quantity,
      price,
      total,
      seats,
      date,
      adults,
      minors,
      pay,
    } = req.body;
    let ticket = {};

    const t = await sequelize.transaction(); // Inicia la transacción
    try {
      // Verifica los asientos reservados
      const conflictingSeats = await TicketRepository.checkReservedSeats(trip_id, seats);

      if (conflictingSeats.length > 0) {
        logger.error( `TicketController->store: Los asientos ya están reservados: ${conflictingSeats.join(", ")}`);
        return res.status(400).json({ msg: "Hacientos seleccionados ya han sido reservados" });
      }

      // Verificar si el viaje, usuario y sucursal existen
      const trip = await TripRepository.findById(trip_id);
      if (!trip) {
        logger.error(
          `TicketController->store: Viaje no encontrado con ID ${trip_id}`
        );
        return res.status(400).json({ msg: "TripNotFound" });
      }

      const branch = await BranchRepository.findById(branch_id);
      if (!branch) {
        logger.error(
          `TicketController->store: Sucursal no encontrada con ID ${branch_id}`
        );
        return res.status(400).json({ msg: "BranchNotFound" });
      }

      let ticket = await TicketRepository.create(req.body, { transaction: t });      


      ticketMaped = await TicketRepository.findById(ticket.id);
      const mappedTicket = {
        id: ticketMaped.id,
        branchId: ticketMaped.branch_id,
        userId: ticketMaped.user_id,
        tripId: ticketMaped.trip_id,
        method: ticketMaped.method,
        status: ticketMaped.status,
        quantity: ticketMaped.quantity,
        price: ticketMaped.price,
        total: ticketMaped.total,
        seats: ticketMaped.seats,
        adults: ticketMaped.adults,
        minors: ticketMaped.minors,
        date: ticketMaped.date,
        branchName: ticketMaped.branch.name, // Incluir los datos de la sucursal asociada
        userName: ticketMaped.user.name, // Incluir los datos del usuario asociado
        tripName: ticketMaped.trip.route.name, // Incluir los detalles del viaje asociado
        tripOrigin: ticketMaped.trip.route.origin.address, // Incluir los detalles del viaje asociado
        tripDestination: ticketMaped.trip.route.destination.address, // Incluir los detalles del viaje asociado
      };
      //generar qr y codigo de barra
      const { qrCodePath, barcodePath } =
        await TicketRepository.generateTicketCodes(mappedTicket, ticket);

       await t.commit();
      res.status(201).json({ ticket: ticket });
    } catch (error) {
      if (!t.finished) {
        await t.rollback();
      }
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";

      logger.error("TicketController->store:" + errorMsg);
      return res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },

  // Obtener un ticket por ID
  async show(req, res) {
    logger.info(`${req.user.name} - Busca un ticket con ID ${req.body.id}`);

    try {
      const ticket = await TicketRepository.findById(req.body.id);

      if (!ticket) {
        return res.status(404).json({ msg: "TicketNotFound" });
      }

      const mappedTicket = {
        id: ticket.id,
        branchId: ticket.branch_id,
        userId: ticket.user_id,
        tripId: ticket.trip_id,
        method: ticket.method,
        status: ticket.status,
        quantity: ticket.quantity,
        price: ticket.price,
        total: ticket.total,
        seats: ticket.seats,
        date: ticket.date,
        adults: ticket.adults,
        minors: ticket.minors,
        qr: ticket.qr,
        barcode: ticket.barcode,
        branchName: ticket.branch.name, // Incluir los datos de la sucursal asociada
        userName: ticket.user.name, // Incluir los datos del usuario asociado
        tripName: ticket.trip.route.name, // Incluir los detalles del viaje asociado
        tripOrigin: ticket.trip.route.origin.address, // Incluir los detalles del viaje asociado
        tripDestination: ticket.trip.route.destination.address, // Incluir los detalles del viaje asociado
      };

      res.status(200).json({ ticket: mappedTicket });
    } catch (error) {
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";

      logger.error("TicketController->show:" + errorMsg);
      return res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },

  // Actualizar un ticket
  async update(req, res) {
    logger.info(`${req.user.name} - Actualiza el ticket con ID ${req.body.id}`);
    logger.info("Datos recibidos al editar un ticket");
    logger.info(JSON.stringify(req.body));

    const {
      id,
      branch_id,
      user_id,
      trip_id,
      method,
      status,
      quantity,
      price,
      total,
      seats,
      date,
    } = req.body;

    const ticket = await TicketRepository.findById(id);
      if (!ticket) {
        return res.status(400).json({ msg: "TicketNotFound" });
      }

      const conflictingSeats = await TicketRepository.checkReservedSeats(
        trip_id,
        seats,
        id
      );

      if (conflictingSeats.length > 0) {
        logger.error(
          `TicketController->update: Los asientos ya están reservados: ${conflictingSeats.join(
            ", "
          )}`
        );
        return res.status(400).json({ msg: "SeatsReserved" });
      }

      // Verificar si el viaje, usuario y sucursal existen
      if (trip_id) {
        const trip = await TripRepository.findById(trip_id);
        if (!trip) {
          logger.error(
            `TicketController->update: Viaje no encontrado con ID ${trip_id}`
          );
          return res.status(400).json({ msg: "TripNotFound" });
        }
      }

      if (branch_id) {
        const branch = await BranchRepository.findById(branch_id);
        if (!branch) {
          logger.error(
            `TicketController->update: Sucursal no encontrada con ID ${branch_id}`
          );
          return res.status(400).json({ msg: "BranchNotFound" });
        }
      }

    try {      

      const updatedTicket = await TicketRepository.update(ticket, req.body);

      let ticketMaped = await TicketRepository.findById(ticket.id);
      const mappedTicket = {
        id: ticketMaped.id,
        branchId: ticketMaped.branch_id,
        userId: ticketMaped.user_id,
        tripId: ticketMaped.trip_id,
        method: ticketMaped.method,
        status: ticketMaped.status,
        quantity: ticketMaped.quantity,
        price: ticketMaped.price,
        total: ticketMaped.total,
        seats: ticketMaped.seats,
        adults: ticketMaped.adults,
        minors: ticketMaped.minors,
        date: ticketMaped.date,
        branchName: ticketMaped.branch.name, // Incluir los datos de la sucursal asociada
        userName: ticketMaped.user.name, // Incluir los datos del usuario asociado
        tripName: ticketMaped.trip.route.name, // Incluir los detalles del viaje asociado
        tripOrigin: ticketMaped.trip.route.origin.address, // Incluir los detalles del viaje asociado
        tripDestination: ticketMaped.trip.route.destination.address, // Incluir los detalles del viaje asociado
      };
      //generar qr y codigo de barra
      const { qrCodePath, barcodePath } =
        await TicketRepository.generateTicketCodes(mappedTicket, null);
      res.status(200).json({ ticket: updatedTicket });
    } catch (error) {
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";

      logger.error("TicketController->update:" + errorMsg);
      return res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },

  // Eliminar un ticket
  async destroy(req, res) {
    logger.info(`${req.user.name} - Elimina el ticket con ID ${req.body.id}`);

    try {
      const ticket = await TicketRepository.findById(req.body.id);

      if (!ticket) {
        return res.status(404).json({ msg: "TicketNotFound" });
      }

      await TicketRepository.delete(ticket);

      res.status(200).json({ msg: "TicketDeleted" });
    } catch (error) {
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";

      logger.error("TicketController->destroy:" + errorMsg);
      return res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },
};

module.exports = TicketController;
