const { Ticket, sequelize } = require("../models");
const logger = require("../../config/logger"); // Logger para seguimiento
const {
  TicketRepository,
  TripRepository,
  BranchRepository,
  CompanyRepository,
  IncidentRepository,
  TuuRepository,
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
        price: Number(ticket.price),
        total: Number(ticket.total),
        seats: Array.isArray(ticket.seats)
          ? ticket.seats // Si ya es un array, úsalo directamente
          : JSON.parse(ticket.seats), // Si es una cadena JSON, parsearla
        promotions: Array.isArray(ticket.promotions)
          ? ticket.promotions // Si ya es un array, úsalo directamente
          : JSON.parse(ticket.promotions), // Si es una cadena JSON, parsearla
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

    const { branch_id, date, endDate } = req.body;
    const workerId = req.worker.id;
    const branch = await BranchRepository.findById(branch_id);
    if (!branch) {
      logger.error(
        `TripController->getTicketDate: Sucursal no encontrada con ID ${branch_id}`
      );
      return res.status(400).json({ msg: "BranchNotFound" });
    }

    try {
      const tickets = await TicketRepository.findAllDate(
        branch_id,
        date,
        endDate,
        workerId
      );

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
        price: Number(ticket.price),
        total: Number(ticket.total),
        seats: Array.isArray(ticket.seats)
          ? ticket.seats // Si ya es un array, úsalo directamente
          : JSON.parse(ticket.seats), // Si es una cadena JSON, parsearla
        promotions: Array.isArray(ticket.promotions)
          ? ticket.promotions // Si ya es un array, úsalo directamente
          : JSON.parse(ticket.promotions), // Si es una cadena JSON, parsearla
        adults: ticket.adults ? ticket.adults : 0,
        minors: ticket.minors ? ticket.minors : 0,
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
      id
    } = req.body;
    let ticket = {};

    const t = await sequelize.transaction(); // Inicia la transacción
    try {
      // Verifica los asientos reservados
      const conflictingSeats = await TicketRepository.checkReservedSeats(
        trip_id,
        seats
      );

      if (conflictingSeats.length > 0) {
        logger.error(
          `TicketController->store: Los asientos ya están reservados: ${conflictingSeats.join(
            ", "
          )}`
        );
        return res
          .status(400)
          .json({ msg: "Hacientos seleccionados ya han sido reservados" });
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

      if(id){
        req.body.qr = id;
        req.body.barcode = id;
      }

      let ticket = await TicketRepository.create(req.body, { transaction: t });

      const mappedTicket = {
        id: ticket.id,
        method: ticket.method,
        quantity: ticket.quantity,
        price: ticket.price,
        total: ticket.total,
        adults: ticket.adults,
        minors: ticket.minors,
        date: ticket.date,
        sequenceNumber: ticket.sequenceNumber,
      };
      if (id === undefined || id === null || id === 0 || id === "") {
        // Si id no existe, es null o está vacío, generar QR y código de barras
        const { qrCodePath, barcodePath } = await TicketRepository.generateTicketCodes(mappedTicket, ticket);
        const ticketWithCodes = {
          ...ticket.get({ plain: true }), // Convertir el modelo Sequelize a objeto plano si es necesario
          qrCodePath,
          barcodePath
        };
      }

      await t.commit();
      res.status(201).json({ ticket: ticketWithCodes?? ticket });
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

  async store_web(req, res) {
    logger.info(`${req.user.name} - Crea un nuevo ticket web`);
    logger.info("Datos recibidos al crear un ticket web");
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
      device,
    } = req.body;
    let ticket = {};

    const t = await sequelize.transaction(); // Inicia la transacción
    try {
      // Verifica los asientos reservados
      const conflictingSeats = await TicketRepository.checkReservedSeats(
        trip_id,
        seats
      );

      if (conflictingSeats.length > 0) {
        logger.error(
          `TicketController->store_web: Los asientos ya están reservados: ${conflictingSeats.join(
            ", "
          )}`
        );
        return res
          .status(400)
          .json({ msg: "Hacientos seleccionados ya han sido reservados" });
      }

      // Verificar si el viaje, usuario y sucursal existen
      const trip = await TripRepository.findById(trip_id);
      if (!trip) {
        logger.error(
          `TicketController->store_web: Viaje no encontrado con ID ${trip_id}`
        );
        return res.status(400).json({ msg: "TripNotFound" });
      }

      const branch = await BranchRepository.findById(branch_id);
      if (!branch) {
        logger.error(
          `TicketController->store_web: Sucursal no encontrada con ID ${branch_id}`
        );
        return res.status(400).json({ msg: "BranchNotFound" });
      }
      if (method === "Efectivo") {
        let ticket = await TicketRepository.create(req.body, {
          transaction: t,
        });
        const mappedTicket = {
          id: ticket.id,
          method: ticket.method,
          quantity: ticket.quantity,
          price: ticket.price,
          total: ticket.total,
          adults: ticket.adults,
          minors: ticket.minors,
          date: ticket.date,
          sequenceNumber: ticket.sequenceNumber,
        };
        //generar qr y codigo de barra
        const { qrCodePath, barcodePath } =
            await TicketRepository.generateTicketCodes(mappedTicket, ticket);
        const ticketWithCodes = {
          ...ticket.get({ plain: true }), // Convertir el modelo Sequelize a objeto plano si es necesario
          qrCodePath,
          barcodePath
        };
        
        await t.commit();
        res.status(201).json({ ticket: ticketWithCodes });
      } else {
        const paymentData = {
          amount: total,
          device: device || "TJ44245N20440",
          description: "Compra de tickets",
          dteType: 48,
          exemptAmount: 0,
          customFields: [
            {
              name: "Contacto",
              value: "9 51221345",
              print: false,
            },
          ],
        };
        const result = await TuuRepository.createPayment(paymentData);
        if (result.success) {
          logger.log("Pago creado con éxito:", result.paymentRequestId);
          req.body.transactionStatus = result.success;
          req.body.sequenceNumber = result.paymentRequestId;
          req.body.extraData = result.extraData;

          let ticket = await TicketRepository.create(req.body, {
            transaction: t,
          });

          const mappedTicket = {
            id: ticket.id,
            method: ticket.method,
            quantity: ticket.quantity,
            price: ticket.price,
            total: ticket.total,
            adults: ticket.adults,
            minors: ticket.minors,
            date: ticket.date,
            sequenceNumber: ticket.sequenceNumber,
          };
          //generar qr y codigo de barra
          const { qrCodePath, barcodePath } =
            await TicketRepository.generateTicketCodes(mappedTicket, ticket);
            const ticketWithCodes = {
              ...ticket.get({ plain: true }), // Convertir el modelo Sequelize a objeto plano si es necesario
              qrCodePath,
              barcodePath
            };
          await t.commit();
          res.status(201).json({ ticket: ticketWithCodes });
        } else {
          logger.error("Error al crear el pago:", result.message);
          await t.commit();
          res
            .status(result.status || 500)
            .json({ msg: result.message, ticket: [] });
        }
      }
    } catch (error) {
      if (!t.finished) {
        await t.rollback();
      }
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";

      logger.error("TicketController->store_web:" + errorMsg);
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

      let mappedTicket = [];
      if (ticket.print < 2) {
        // Incrementar el contador de impresiones
        mappedTicket = {
          id: ticket.id,
          branchId: ticket.branch_id,
          branch_id: ticket.branch_id,
          user_id: ticket.user_id,
          userId: ticket.user_id,
          tripId: ticket.trip_id,
          trip_id: ticket.trip_id,
          method: ticket.method,
          status: ticket.status,
          quantity: ticket.quantity,
          price: Number(ticket.price),
          total: Number(ticket.total),
          seats: Array.isArray(ticket.seats)
            ? ticket.seats // Si ya es un array, úsalo directamente
            : JSON.parse(ticket.seats), // Si es una cadena JSON, parsearla
          promotions: Array.isArray(ticket.promotions)
            ? ticket.promotions // Si ya es un array, úsalo directamente
            : JSON.parse(ticket.promotions), // Si es una cadena JSON, parsearla
          date: ticket.date,
          print: ticket.print + 1,
          adults: ticket.adults,
          minors: ticket.minors,
          time: await TicketController.getCurrentTime(),
          qr: ticket.qr,
          barcode: ticket.barcode,
          branchName: ticket.branch.name, // Incluir los datos de la sucursal asociada
          companyName: ticket.branch.company.name,
          companyRut: ticket.branch.company.rut,
          companyAddress: ticket.branch.company.address,
          companyPhone: ticket.branch.company.phone,
          userName: ticket.user.name, // Incluir los datos del usuario asociado
          tripName: ticket.trip.route.name, // Incluir los detalles del viaje asociado
          tripOrigin: ticket.trip.route.origin.address, // Incluir los detalles del viaje asociado
          tripDestination: ticket.trip.route.destination.address, // Incluir los detalles del viaje asociado
        };
      }

      ticket.print += 1;
      await ticket.save();

      logger.info(`Agregando incidencia de reimpresión`);
      const incidentBody = {
        branch_id: ticket.branch_id, // ID de la sucursal
        user_id: req.user.id, // ID del usuario que realiza la acción
        title: "Reimpresión de ticket",
        description: `${req.user.name} solicitó la reimpresión del ticket: ${ticket.id} por ${ticket.print} ocasión`,
        details: {
          print: ticket.print,
          ticket_id: ticket.id,
          method: ticket.method,
          quantity: ticket.quantity,
          price: ticket.price,
          total: ticket.total,
          trip_id: ticket.trip_id,
        },
        date: new Date(), // Fecha actual
      };

      // Llamar al método create del IncidentRepository
      await IncidentRepository.create(incidentBody);

      res.status(200).json({ ticket: mappedTicket });
    } catch (error) {
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";

      logger.error("TicketController->show:" + errorMsg);
      return res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },

  async verifyEncryptedQR(req, res) {
    logger.info(`${req.user.name} - Verificando QR: ${req.body.qr}`);
    // Validación del input
    let qr = req.body.qr;
    try {
        // 1. Buscar ticket por QR encriptado
        const ticket = await Ticket.findOne({ 
            where: { qr: qr },
        });

        if (!ticket) {
            return res.status(404).json({ msg: "QRNotFound" });
        }
       try {
        let decryptedData = await TicketRepository.decryptData(ticket.qr);
    
        // 3. Verificar coincidencia con los datos del ticket
        const isValid = await TicketController.validateDecryptedData(decryptedData, ticket);

        if (!isValid) {
            logger.warn(`QR alterado para ticket ${ticket.id}`);
            return res.status(400).json({ error: "TamperedQR" });
        }
        } catch (decryptError) {
            logger.info("Error al desencriptar QR:", decryptError);
            return res.status(400).json({ error: "InvalidQRFormat" });
        }


        // 4. Lógica de estado (qr_status)
        let actionTaken = "Reescaneado";
        const incidentDetails = {
          ticket_id: ticket.id,
          qr: req.body.qr,
          previous_status: ticket.qr_status
      };

      if (ticket.qr_status === null) {
          // Primer escaneo - Actualizar estado
          ticket.qr_status = 1;
          actionTaken = "Primero";
          logger.info(`Primer escaneo del QR: ${ticket.id}`);
          await ticket.save();
      } else {
          ticket.qr_status += 1
          // QR ya había sido escaneado antes
          actionTaken = "Reescaneado";
          logger.info(`QR re-escaneado: ${ticket.id} (Estado anterior: ${ticket.qr_status})`);
          await ticket.save();
          const incidentBody = {
            branch_id: ticket.branch_id,
            user_id: req.user.id,
            title: `Escaneo de QR (${actionTaken})`,
            description: `${req.user.name} escaneó el QR del ticket ${ticket.id}`,
            details: {
                ...incidentDetails,
                new_status: ticket.qr_status,
                action: actionTaken
            },
            date: new Date()
        };
  
        await IncidentRepository.create(incidentBody);
      }
        // 5. Respuesta con datos desencriptados
        res.status(200).json({
            ticket_id: ticket.id,
            qr_status: ticket.qr_status,
            action: actionTaken === "Primero" ? true : false,
        });

    } catch (error) {
        logger.error("Error en verifyEncryptedQR:", error);
        res.status(500).json({ error: "ServerError" });
    }
  },
// Método auxiliar para validar datos desencriptados
  async validateDecryptedData(decryptedData, ticket) {
    const comparisons = {
        id: { 
            decrypted: decryptedData.id, 
            ticket: ticket.id,
            typeDecrypted: typeof decryptedData.id,
            typeTicket: typeof ticket.id,
            match: decryptedData.id == ticket.id
        },
        method: {
            decrypted: decryptedData.method,
            ticket: ticket.method,
            match: decryptedData.method == ticket.method
        },
        total: {
          decrypted: decryptedData.total,
          ticket: ticket.total,
          match: decryptedData.total == ticket.total
      },
        date: {
            decrypted: new Date(decryptedData.date),
            ticket: new Date(ticket.date),
            match: new Date(decryptedData.date).getTime() === new Date(ticket.date).getTime()
        }
    };
    
    return comparisons.id.match && 
          comparisons.method.match && 
          comparisons.total.match && 
          comparisons.date.match;
  },
    async getCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0"); // Asegura dos dígitos
    const minutes = String(now.getMinutes()).padStart(2, "0"); // Asegura dos dígitos
    return `${hours}:${minutes}`;
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

  async getMonthlySales(req, res) {
    try {
      const { month, type, branch_id } = req.body;
      if (branch_id) {
        // Verificar si la sucursal existe
        const branch = await BranchRepository.findById(branch_id);
        if (!branch) {
          logger.error(
            `TicketController->getMonthlySales: Sucursal no encontrada con ID ${branch_id}`
          );
          return res.status(404).json({ msg: "BranchNotFound" });
        }
      }
      const { ticketsVendidos, ingresoGenerado } =
        await TicketRepository.getMonthlySales(month, type, branch_id);
      const occupancyRate = await TicketRepository.getOccupancyRate(
        month,
        type,
        branch_id
      );
      // Obtener las ganancias anuales por meses
      const yearlyEarnings = await TicketRepository.getYearlyEarnings(
        month,
        type,
        branch_id
      );

      const trips = await TicketRepository.getTripsWithDetails(
        month,
        type,
        branch_id
      );

      const { totalIncidents, incidents } =
        await IncidentRepository.getIncidentsByBranchMonth(
          month,
          type,
          branch_id
        );

      const formattedTrips = trips.map((trip) => {
        // Concatenar información del vehículo
        const vehicle = trip.vehicle;

        const tickets = trip.tickets || [];

        // Concatenar origen y destino
        const routeInfo = `${trip.route.origin.address} - ${trip.route.destination.address}`;

        // Calcular el horario
        /*let horario;
        if (trip.end) {
          // Si hay hora de finalización, usar start y end
          horario = `${trip.start} - ${trip.end}`;
        } else if (trip.start) {
          // Si hay hora de inicio, sumar estimated a start
          const estimatedTime = TicketController.addMinutesToTime(
            trip.start,
            trip.route.estimated
          );
          horario = `${trip.start} - ${estimatedTime}`;
        } else {
          // Si no hay hora de inicio, sumar estimated a schedule
          const estimatedTime = TicketController.addMinutesToTime(
            trip.schedule,
            trip.route.estimated
          );
          horario = `${trip.schedule} - ${estimatedTime}`;
        }*/
          let horario;

          if (trip.end) {
            // Si hay hora de finalización, usar start y end (ya están en el formato correcto)
            horario = `${trip.start} - ${trip.end}`;
          } else if (trip.start) {
            // Si hay hora de inicio, sumar estimated a start
            const startDate = new Date(trip.start);
            const estimatedTime = new Date(startDate.getTime() + trip.route.estimated * 60000);
            const formattedEstimated = estimatedTime.toISOString().replace('T', ' ').substring(0, 19);
            horario = `${trip.start} - ${formattedEstimated}`;
          } else {
            // Si no hay hora de inicio, combinar trip.date con schedule y sumar estimated
            // Asumo que trip.schedule es solo la hora (ej. "10:00:00") y trip.date es la fecha (ej. "2025-04-16")
            const combinedDateTime = `${trip.date} ${trip.schedule}`;
            const scheduleDate = new Date(combinedDateTime);
            const estimatedTime = new Date(scheduleDate.getTime() + trip.route.estimated * 60000);
            const formattedSchedule = combinedDateTime;
            const formattedEstimated = estimatedTime.toISOString().replace('T', ' ').substring(0, 19);
            horario = `${formattedSchedule} - ${formattedEstimated}`;
          }
        // Calcular asientos vendidos y dinero generado
        const asientosVendidos = tickets.reduce(
          (sum, ticket) => sum + ticket.quantity,
          0
        );
        const dineroGenerado = tickets.reduce(
          (sum, ticket) => sum + parseFloat(ticket.total),
          0
        );

        return {
          id: trip.id,
          date: trip.date,
          vehicleImage: vehicle.image,
          vehiclePlate: vehicle.plate,
          vehicleBrand: vehicle.brand,
          route: routeInfo, // Origen y destino concatenados
          estimated: trip.route.estimated,
          horario: horario, // Horario dinámico
          capacidad: trip.vehicle.seats, // Capacidad del vehículo
          asientosVendidos, // Asientos vendidos
          dineroGenerado, // Dinero generado
        };
      });

      const data = [
        {
          title: "Boletos Vendidos",
          value: Number(ticketsVendidos),
          color: "#1976D2",
          icon: "mdi-ticket",
        },
        {
          title: "Ingreso Generado",
          value: Number(ingresoGenerado),
          color: "#4CAF50",
          icon: "mdi-cash-multiple",
        },
        {
          title: "Incidentes",
          value: Number(totalIncidents),
          color: "#F44336",
          icon: "mdi-alert",
        },
        {
          title: "Tasa de Ocupación",
          value: occupancyRate,
          color: "#FF9800",
          icon: "mdi-account-group",
        } /*Tasa de ocupación: Promedio de pasajeros por viaje */,
      ];

      res.status(200).json({
        sales: data,
        salesYear: yearlyEarnings,
        trips: formattedTrips,
      });
    } catch (error) {
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";

      logger.error("TicketController->getMonthlySales:" + errorMsg);
      return res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },
  addMinutesToTime(time, minutes) {
    const [hours, mins] = time.split(":").map(Number); // Convertir la hora y los minutos a números
    const date = new Date();
    date.setHours(hours, mins + minutes, 0); // Sumar los minutos
    return date.toTimeString().slice(0, 5); // Devolver la hora en formato HH:mm
  },

  async getTicketsSoldDate(req, res) {
    logger.info(
      `${req.user.name} - Entra a buscar los datos de los pasajes de una fecha dada`
    );
    logger.info("Datos recibidos al obtener los pasajes de una fecha dada");
    logger.info(JSON.stringify(req.body));
    try {
      const { type, id, date, endDate } = req.body;

      // Validar si la sucursal o compañía existe
      if (type === "Sucursal") {
        const branch = await BranchRepository.findById(id);
        if (!branch) {
          logger.error(
            `TicketController->getTicketsSoldDate: Sucursal no encontrada con ID ${id}`
          );
          return res.status(404).json({ msg: "BranchNotFound" });
        }
      } else {
        const company = await CompanyRepository.findById(id);
        if (!company) {
          logger.error(
            `TicketController->getTicketsSoldDate: Compañía no encontrada con ID ${id}`
          );
          return res.status(404).json({ msg: "CompanyNotFound" });
        }
      }

      // Obtener los tickets vendidos en la fecha dada
      const tickets = await TicketRepository.getTicketsSoldDate(
        type,
        id,
        date,
        endDate
      );

      // Inicializar las variables para calcular los totales
      const totalsByMethod = {}; // Objeto para almacenar los totales por método de pago
      let totalGeneral = 0; // Variable para almacenar el total general en dinero
      let totalPasajesVendidos = 0; // Variable para almacenar el total general de pasajes vendidos
      let reimpresiones = 0;
      // Procesar los tickets
      tickets.forEach((ticket) => {
        const method = ticket.method.toUpperCase(); // Convertir a mayúsculas para consistencia
        const total = parseFloat(ticket.total); // Convertir a número
        const quantity = parseInt(ticket.quantity, 10); // Convertir a número entero

        if (!totalsByMethod[method]) {
          totalsByMethod[method] = {
            total: 0, // Total en dinero
            cantidad: 0, // Cantidad de pasajes
          };
        }
        reimpresiones += ticket.print - 1;
        totalsByMethod[method].total += total; // Sumar el total en dinero
        //totalsByMethod[method].cantidad += quantity; // Sumar la cantidad de pasajes
        totalsByMethod[method].cantidad += 1; // Sumar la cantidad de pasajes
        totalGeneral += total; // Sumar al total general en dinero
        //totalPasajesVendidos += quantity; // Sumar al total general de pasajes
        totalPasajesVendidos++; // Sumar al total general de pasajes
      });

      // Convertir el objeto totalsByMethod en un array
      const totalsByMethodArray = Object.keys(totalsByMethod).map((method) => ({
        metodo: method,
        total: totalsByMethod[method].total, // Total en dinero
        cantidad: totalsByMethod[method].cantidad, // Cantidad de pasajes
      }));

      // Obtener el nombre de la entidad (Company o Branch)
      const entityName =
        type === "Company"
          ? tickets[0]?.branch?.company?.name // Usar el alias correcto
          : tickets[0]?.branch?.name;
      let fecha = null;
      if (endDate && endDate.trim() !== "") {
        fecha = date + "-" + endDate;
      } else {
        fecha = date;
      }
      // Formatear la respuesta
      const response = {
        nombre: entityName,
        fecha: fecha,
        pasajesEmitidos: totalPasajesVendidos, // Total de pasajes vendidos
        reimpresiones: reimpresiones,
        totalesPorMetodo: totalsByMethodArray, // Array de totales por método de pago
        totales: totalGeneral, // Total general en dinero
      };

      res.json(response);
    } catch (error) {
      logger.error("Error en el controlador:", error);
      res.status(500).json({ error: error.message });
    }
  },

  async getTicketsSoldDateWorker(req, res) {
    logger.info(
      `${req.user.name} - Entra a buscar los datos de los pasajes de una fecha dada de un trabajador`
    );
    logger.info("Datos recibidos al obtener los pasajes de una fecha dada");
    logger.info(JSON.stringify(req.body));
    try {
      const workerId = req.worker.id;
      const { branch_id, date, endDate} = req.body;

      // Validar si la sucursal existe
      const branch = await BranchRepository.findById(branch_id);
      if (!branch) {
        logger.error(
          `TicketController->getTicketsSoldDate: Sucursal no encontrada con ID ${branch_id}`
        );
        return res.status(404).json({ msg: "BranchNotFound" });
      }

      // Obtener los tickets vendidos en la fecha dada para el trabajador
      const tickets = await TicketRepository.getTicketsSoldDateWorker(
        branch_id,
        date,
        endDate,
        workerId
      );

      // Inicializar las variables para calcular los totales
      const totalsByMethod = {};
      let totalGeneral = 0;
      let totalPasajesVendidos = 0;
      let reimpresiones = 0;

      // Procesar los tickets
      tickets.forEach((ticket) => {
        const method = ticket.method.toUpperCase();
        const total = parseFloat(ticket.total);
        const quantity = parseInt(ticket.quantity, 10);

        if (!totalsByMethod[method]) {
          totalsByMethod[method] = {
            total: 0,
            cantidad: 0,
          };
        }
        
        reimpresiones += ticket.print - 1;
        totalsByMethod[method].total += total;
        totalsByMethod[method].cantidad += 1;
        totalGeneral += total;
        totalPasajesVendidos++;
      });

      // Convertir el objeto totalsByMethod en un array
      const totalsByMethodArray = Object.keys(totalsByMethod).map((method) => ({
        metodo: method,
        total: totalsByMethod[method].total,
        cantidad: totalsByMethod[method].cantidad,
      }));

      // Formatear la respuesta
      let fecha = null;
      if (endDate && endDate.trim() !== "") {
        fecha = `${date} - ${endDate}`;
      } else {
        fecha = date;
      }

      const response = {
        nombre: branch.name,
        fecha: fecha,
        pasajesEmitidos: totalPasajesVendidos,
        reimpresiones: reimpresiones,
        totalesPorMetodo: totalsByMethodArray,
        totales: totalGeneral,
      };

      res.json(response);
    } catch (error) {
      logger.error("Error en el controlador:", error);
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = TicketController;
