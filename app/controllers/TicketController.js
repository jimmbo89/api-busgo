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
        quantity: Number(ticket.quantity),
        price: Number(ticket.price),
        total: Number(ticket.total),
        seats: Array.isArray(ticket.seats)
          ? ticket.seats // Si ya es un array, úsalo directamente
          : JSON.parse(ticket.seats), // Si es una cadena JSON, parsearla
        promotions: Array.isArray(ticket.promotions)
          ? ticket.promotions // Si ya es un array, úsalo directamente
          : JSON.parse(ticket.promotions), // Si es una cadena JSON, parsearla
        tickettypes: Array.isArray(ticket.tickettypes)
          ? ticket.tickettypes // Si ya es un array, úsalo directamente
          : JSON.parse(ticket.tickettypes), // Si es una cadena JSON, parsearla
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
        vehiclePlate: ticket.trip.vehicle?.plate,
        internal_number: ticket.trip.vehicle?.internal_number,
        internalNumber: ticket.trip.vehicle?.internal_number,
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
    //const workerId = req.worker.id;
    const workerId = null;
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
        logger.info(
          "TripController->getTicketDate: TicketsNotFound"
        );
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
        quantity: Number(ticket.quantity),
        price: Number(ticket.price),
        total: Number(ticket.total),
        seats: Array.isArray(ticket.seats)
          ? ticket.seats // Si ya es un array, úsalo directamente
          : JSON.parse(ticket.seats), // Si es una cadena JSON, parsearla
        promotions: Array.isArray(ticket.promotions)
          ? ticket.promotions // Si ya es un array, úsalo directamente
          : JSON.parse(ticket.promotions), // Si es una cadena JSON, parsearla
        tickettypes: Array.isArray(ticket.tickettypes)
          ? ticket.tickettypes // Si ya es un array, úsalo directamente
          : JSON.parse(ticket.tickettypes),
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
        vehiclePlate: ticket.trip.vehicle?.plate,
        internal_number: ticket.trip.vehicle?.internal_number,
        internalNumber: ticket.trip.vehicle?.internal_number,
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

    // Transformar ticketType antiguo a tickettypes nuevo
  if (req.body.ticketType && !req.body.tickettypes) {
    req.body.tickettypes = req.body.ticketType.map(type => ({
      id: type.ticket_type_id || null,
      name: type.ticket_type_name || '',
      adjustment_type: type.adjustment_type || "descuento",
      value_type: type.value_type || "monto",
      adjustment_value: type.adjustment_value ?? 0,
      cant: type.quantity || 1,
      promotion_id: type.promotion_id || null,
      namePromotion: type.promotion_name || null,
      discount_type: type.discount_type || "monto",
      percentage: 0, // Valor por defecto
      discount: 0, // Valor por defecto
      showPromotionSelect: false,
      selectedPromotion: null
    }));
    delete req.body.ticketType; // Eliminar el campo antiguo
  };

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
        req.body.sequenceNumber = id;
      }

      let ticket = await TicketRepository.create(req.body, { transaction: t });

      let mappedTicket = {
        id: ticket.id,
        branch_id: ticket.branch_id,
        branchId: ticket.branch_id,
        trip_id: ticket.trip_id,
        tripId: ticket.trip_id,
        method: ticket.method,
        quantity: ticket.quantity,
        price: ticket.price,
        total: ticket.total,
        date: ticket.date,
        sequenceNumber: ticket.sequenceNumber,
      };
      //if (!id ) {
        // Si id no existe, es null o está vacío, generar QR y código de barras
        const { qrCodePath, barcodePath } = await TicketRepository.generateTicketCodes(mappedTicket, ticket);
        const ticketWithCodes = {
          ...ticket.get({ plain: true }), // Convertir el modelo Sequelize a objeto plano si es necesario
          qrCodePath,
          barcodePath
        };
      //}

      await t.commit();
      ticket = await TicketRepository.findById(ticket.id);
      mappedTicket = {
        id: ticket.id,
        branchId: ticket.branch_id,
        branch_id: ticket.branch_id,
        tripId: ticket.trip_id,
        trip_id: ticket.trip_id,
        method: ticket.method,
        quantity: ticket.quantity,
        price: Number(ticket.price),
        total: Number(ticket.total),
        date: ticket.date,
        schedule: ticket.trip.schedule,
        vehiclePlate: ticket.trip.vehicle?.plate,
        internal_number: ticket.trip.vehicle?.internal_number,
        internalNumber: ticket.trip.vehicle?.internal_number,
        print: ticket.print,
        qr: ticket.qr,
        barcode: ticket.barcode,
        branchName: ticket.branch.name, // Incluir los datos de la sucursal asociada
        rut: ticket.branch.company.rut,
        address: ticket.branch.address,
        phone: ticket.branch.phone,
        tripName: ticket.trip.route.name, // Incluir los detalles del viaje asociado
        tripOrigin: ticket.trip.route.origin.address, // Incluir los detalles del viaje asociado
        tripDestination: ticket.trip.route.destination.address, // Incluir los detalles del viaje asociado
      };
      res.status(201).json({ ticket: mappedTicket });
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
        ticket = await TicketRepository.create(req.body, {
          transaction: t,
        });
        let mappedTicket = {
          id: ticket.id,
            method: ticket.method,
            quantity: ticket.quantity,
            price: ticket.price,
            total: ticket.total,
            adults: ticket.adults,
            minors: ticket.minors,
            date: ticket.date,
            sequenceNumber: ticket.sequenceNumber,
            trip_id: ticket.trip_id,  // Agregar trip_id
            seats: ticket.seats       // Agregar seats para validación
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
        ticket = await TicketRepository.findById(ticket.id);
        mappedTicket = {
          id: ticket.id,
          branchId: ticket.branch_id,
          branch_id: ticket.branch_id,
          tripId: ticket.trip_id,
          trip_id: ticket.trip_id,
          method: ticket.method,
          quantity: ticket.quantity,
          price: Number(ticket.price),
          total: Number(ticket.total),
          date: ticket.date,
          schedule: ticket.trip.schedule,
          vehiclePlate: ticket.trip.vehicle?.plate,
          internal_number: ticket.trip.vehicle?.internal_number,
          internalNumber: ticket.trip.vehicle?.internal_number,
          print: ticket.print,
          qr: ticket.qr,
          barcode: ticket.barcode,
          branchName: ticket.branch.name, // Incluir los datos de la sucursal asociada
          rut: ticket.branch.company.rut,
          address: ticket.branch.address,
          phone: ticket.branch.phone,
          tripName: ticket.trip.route.name, // Incluir los detalles del viaje asociado
          tripOrigin: ticket.trip.route.origin.address, // Incluir los detalles del viaje asociado
          tripDestination: ticket.trip.route.destination.address, // Incluir los detalles del viaje asociado
        };
        res.status(201).json({ ticket: mappedTicket });
      } else {
        const paymentData = {
          amount: total,
          device: device || "TJ44243320217",
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

          let mappedTicket = {
            id: ticket.id,
            method: ticket.method,
            quantity: ticket.quantity,
            price: ticket.price,
            total: ticket.total,
            adults: ticket.adults,
            minors: ticket.minors,
            date: ticket.date,
            sequenceNumber: ticket.sequenceNumber,
               trip_id: ticket.trip_id,  // Agregar trip_id
            seats: ticket.seats       // Agregar seats para validacións
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

          ticket = await TicketRepository.findById(ticket.id);
        mappedTicket = {
          id: ticket.id,
          branchId: ticket.branch_id,
          branch_id: ticket.branch_id,
          tripId: ticket.trip_id,
          trip_id: ticket.trip_id,
          method: ticket.method,
          quantity: ticket.quantity,
          price: Number(ticket.price),
          total: Number(ticket.total),
          date: ticket.date,
          schedule: ticket.trip.schedule,
          vehiclePlate: ticket.trip.vehicle?.plate,
          internal_number: ticket.trip.vehicle?.internal_number,
          internalNumber: ticket.trip.vehicle?.internal_number,
          print: ticket.print,
          qr: ticket.qr,
          barcode: ticket.barcode,
          branchName: ticket.branch.name, // Incluir los datos de la sucursal asociada
          rut: ticket.branch.rut,
          address: ticket.branch.address,
          phone: ticket.branch.phone,
          tripName: ticket.trip.route.name, // Incluir los detalles del viaje asociado
          tripOrigin: ticket.trip.route.origin.address, // Incluir los detalles del viaje asociado
          tripDestination: ticket.trip.route.destination.address, // Incluir los detalles del viaje asociado
        };
        res.status(201).json({ ticket: mappedTicket });
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
      const ticket = await TicketRepository.findByIdOrSequence(req.body.id);

      if (!ticket) {
        return res.status(404).json({ msg: "TicketNotFound" });
      }

      ticket.print += 1;
      await ticket.save();
      let mappedTicket = [];
      //if (ticket.print < 2) {
        // Incrementar el contador de impresiones
        mappedTicket = {
          id: ticket.id,
          branchId: ticket.branch_id,
          branch_id: ticket.branch_id,
          tripId: ticket.trip_id,
          trip_id: ticket.trip_id,
          method: ticket.method,
          quantity: Number(ticket.quantity),
          price: Number(ticket.price),
          total: Number(ticket.total),
          sequenceNumber: Number(ticket.sequenceNumber),
          date: ticket.date,
          schedule: ticket.trip.schedule,
          vehiclePlate: ticket.trip.vehicle?.plate,
          internal_number: ticket.trip.vehicle?.internal_number,
          internalNumber: ticket.trip.vehicle?.internal_number,
          print: ticket.print,
          qr: ticket.qr,
          barcode: ticket.barcode,
          branchName: ticket.branch.name, // Incluir los datos de la sucursal asociada
          rut: ticket.branch.company.rut,
          address: ticket.branch.address,
          phone: ticket.branch.phone,
          tripName: ticket.trip.route.name, // Incluir los detalles del viaje asociado
          tripOrigin: ticket.trip.route.origin.address, // Incluir los detalles del viaje asociado
          tripDestination: ticket.trip.route.destination.address, // Incluir los detalles del viaje asociado
        };
      //}


      logger.info(`Agregando incidencia de reimpresión`);
      const incidentBody = {
        branch_id: ticket.branch_id, // ID de la sucursal
        user_id: req.user.id, // ID del usuario que realiza la acción
        title: "Reimpresión de ticket",
        description: `${req.user.name} imprime ticket: ${ticket.sequenceNumber} por ${ticket.print} ocasión`,
        details: {
          print: ticket.print,
          ticket_id: ticket.id,
          sequenceNumber: ticket.sequenceNumber,
          method: ticket.method,
          quantity: ticket.quantity,
          price: ticket.price,
          total: ticket.total,
          trip_id: ticket.trip_id,

          transactionNumber: ticket.sequenceNumber || ticket.id,
    
          // 2. Ruta: origen y destino (direcciones)
          routeOrigin: ticket.trip?.route?.origin?.address || null,
          routeDestination: ticket.trip?.route?.destination?.address || null,
          
          // 3. Hora de salida y hora de llegada del viaje
          // Ajusta los nombres de las propiedades según tu modelo Sequelize/MySQL
          departureTime: ticket.trip?.start || null,
          arrivalTime: ticket.trip?.end || null,
          
          // 4. (Opcional) Nombres adicionales para mayor claridad en el reporte
          routeName: ticket.trip?.route?.name || null,
          branchName: ticket.branch?.name || null,
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
// Método auxiliar para validar datos desencriptados
async validateDecryptedData(decryptedData, ticket) {
  try {
    const comparisons = {
      id: { 
        decrypted: decryptedData.id, 
        ticket: ticket.id,
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
        decrypted: decryptedData.date,
        ticket: ticket.date,
        match: new Date(decryptedData.date).getTime() === new Date(ticket.date).getTime()
      },
      trip_id: {
        decrypted: decryptedData.trip_id,
        ticket: ticket.trip_id,
        match: decryptedData.trip_id == ticket.trip_id
      }
    };
    
    const isValid = comparisons.id.match && 
                    comparisons.method.match && 
                    comparisons.total.match && 
                    comparisons.date.match &&
                    comparisons.trip_id.match 
    
    if (!isValid) {
      logger.warn(`Validación fallida: ${JSON.stringify({
        comparisons: Object.keys(comparisons).filter(key => !comparisons[key].match)
      })}`);
    }
    
    return isValid;
  } catch (error) {
    logger.error("Error en validateDecryptedData:", error);
    return false;
  }
},
async verifyEncryptedQR(req, res) {
  logger.info(`${req.user.name} - Verificando QR/SequenceNumber para trip_id ${req.body.trip_id}`);
  
  const { qr, trip_id } = req.body; // 'qr' ahora contiene el sequenceNumber
  
  try {
    // 1. Buscar ticket por sequenceNumber
    const ticket = await TicketRepository.findBySequenceNumberWithTrip(qr);

    // 2. Si no se encuentra el ticket
    if (!ticket) {
      return res.status(404).json({ 
        success: false,
        belongsToTrip: null,
        alreadyScanned: null,
        ticket_id: null,
        seats: [],
        message: "Ticket no válido o no encontrado"
      });
    }

    // 4. Verificar si pertenece al viaje especificado
    const belongsToTrip = Number(ticket.trip_id) === Number(trip_id);

    // 5. Verificar si ya fue escaneado
    const alreadyScanned = ticket.qr_status !== null && ticket.qr_status > 0;

    // Resto del flujo igual...
    let shouldUpdateStatus = false;
    
    if (belongsToTrip) {
      if (!alreadyScanned) {
        // Primer escaneo
        ticket.qr_status = 1;
        shouldUpdateStatus = true;
        logger.info(`✓ Primer escaneo - Ticket ${ticket.id} para trip ${trip_id}`);
      } else {
        // Re-escaneo
        ticket.qr_status += 1;
        shouldUpdateStatus = true;
        logger.warn(`⚠ Re-escaneo - Ticket ${ticket.id} para trip ${trip_id}`);
        
        // Registrar incidente
        try {
          const incidentBody = {
            branch_id: ticket.branch_id,
            user_id: req.user.id,
            title: `Re-escaneo Ticket - Viaje ${trip_id}`,
            description: `${req.user.name} re-escaneó ticket ${ticket.id}`,
            details: {
              ticket_id: ticket.id,
              trip_id: trip_id,
              actual_trip_id: ticket.trip_id,
              scan_count: ticket.qr_status,
              sequenceNumber: ticket.sequenceNumber,
              timestamp: new Date()
            },
            date: new Date(),
            status: 1
          };
          
          await IncidentRepository.create(incidentBody);
        } catch (incidentError) {
          logger.error("Error al crear incidente:", incidentError);
        }
      }
    }

    // 7. Guardar cambios
    if (shouldUpdateStatus) {
      await ticket.save();
    }

    // 8. Preparar respuesta UNIFICADA
    const response = {
      success: true,
      belongsToTrip: belongsToTrip,
      alreadyScanned: alreadyScanned,
      ticket_id: ticket.id,
      trip_id: trip_id,
      actual_trip_id: ticket.trip_id,
      sequenceNumber: ticket.sequenceNumber,
      seats: ticket.seats || []
    };

    // 9. Agregar mensaje según el caso
    if (!belongsToTrip) {
      response.message = `Ticket pertenece al viaje ${ticket.trip?.route?.name}`;
    } else if (alreadyScanned) {
      response.message = `Ticket ya escaneado ${ticket.qr_status} veces`;
    } else {
      response.message = "Ticket válido y escaneado exitosamente";
    }

    res.status(200).json(response);

  } catch (error) {
    logger.error("Error en verifyEncryptedQR:", error);
    
    res.status(500).json({ 
      success: false,
      belongsToTrip: null,
      alreadyScanned: null,
      ticket_id: null,
      seats: [],
      message: "Error interno del servidor"
    });
  }
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
        vehiclePlate: ticketMaped.trip.vehicle?.plate,
        internal_number: ticketMaped.trip.vehicle?.internal_number,
        internalNumber: ticketMaped.trip.vehicle?.internal_number,
      };
      //generar qr y codigo de barra
      const { qrCodePath, barcodePath } =
        await TicketRepository.generateTicketCodes(mappedTicket, ticketMaped);
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
    logger.info(`${req.user.name} - Obtiene las ventas mensuales`);
    logger.info("Datos recibidos al obtener las ventas mensuales");
    logger.info(JSON.stringify(req.body));
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

      const today = new Date();
    const formattedToday = today.toLocaleDateString('es-CL', {
        timeZone: 'America/Santiago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).split('-').reverse().join('-');
      /*const { ticketsVendidos, ingresoGenerado } =
        await TicketRepository.getMonthlySales(month, type, branch_id);*/
      const { ticketsVendidos, ingresoGenerado } =
        await TicketRepository.getDailySales(formattedToday, type, branch_id);
      /*const occupancyRate = await TicketRepository.getOccupancyRate(
        month,
        type,
        branch_id
      );*/
      const occupancyRate = await TicketRepository.getDailyOccupancyRate(
        formattedToday,
        type,
        branch_id
      );
      // Obtener las ganancias anuales por meses
      const yearlyEarnings = await TicketRepository.getYearlyEarnings(
        month,
        type,
        branch_id
      );

      /*const trips = await TicketRepository.getTripsWithDetails(
        month,
        type,
        branch_id
      );*/

      const trips = await TicketRepository.getDailyTripsWithDetails(
        formattedToday,
        type,
        branch_id
      );

      /*const { totalIncidents, incidents } =
        await IncidentRepository.getIncidentsByBranchMonth(
          month,
          type,
          branch_id
        );*/

      const { totalIncidents, incidents } =
        await IncidentRepository.getIncidentsByBranchDay(
          formattedToday,
          type,
          branch_id
        );

      const formattedTrips = trips.map((trip) => {
        // Concatenar información del vehículo
        const vehicle = trip.vehicle;

        const tickets = trip.tickets || [];

        // Concatenar origen y destino
        const routeInfo = `${trip.route.origin.address} - ${trip.route.destination.address}`;

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
          internal_number: vehicle.internal_number,
          internalNumber: vehicle.internal_number,
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
          to: "#",
        },
        {
          title: "Ingreso Generado",
          value: Number(ingresoGenerado),
          color: "#4CAF50",
          icon: "mdi-cash-multiple",
          to: "ticketdate",
        },
        {
          title: "Incidentes",
          value: Number(totalIncidents),
          color: "#F44336",
          icon: "mdi-alert",
          to: "/incident",
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
      const trips = await TripRepository.getTripsDate(type, id, date, endDate);

      // Inicializar las variables para calcular los totales
      const totalsByMethod = {}; // Objeto para almacenar los totales por método de pago
      let totalGeneral = 0; // Variable para almacenar el total general en dinero
      let totalPasajesVendidos = 0; // Variable para almacenar el total general de pasajes vendidos
      let reimpresiones = 0;
      // Procesar los tickets
      tickets.forEach((ticket) => {
        const method = ticket.method.toUpperCase(); // Convertir a mayúsculas para consistencia
        const total = parseFloat(ticket.total); // Convertir a número

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

      const tripsSummary = trips.map((trip) => {
        const origin = trip.route.origin;
        const destination = trip.route.destination;
        const tripName = origin.address + "-" + destination.address;
        const tripOrigin = origin.address;
        const tripDestination = destination.address;
        const tripTickets = trip.tickets || [];

        const tripTotalsByMethod = {};
        let tripTotal = 0;
        let tripPasajesVendidos = 0;

        tripTickets.forEach((ticket) => {
          const method = ticket.method.toUpperCase();
          const total = parseFloat(ticket.total);

          if (!tripTotalsByMethod[method]) {
            tripTotalsByMethod[method] = {
              total: 0,
              cantidad: 0,
            };
          }

          tripTotalsByMethod[method].total += total;
          tripTotalsByMethod[method].cantidad += 1;
          tripTotal += total;
          tripPasajesVendidos += 1;
        });

        return {
          nombre: tripName,
          origin: tripOrigin,
          destination: tripDestination,
          totalPasajes: tripPasajesVendidos,
          totalTramo: tripTotal,
          totalesPorMetodo: Object.keys(tripTotalsByMethod).map((method) => ({
            metodo: method,
            total: tripTotalsByMethod[method].total,
            cantidad: tripTotalsByMethod[method].cantidad,
          })),
        };
      });

      // Obtener el nombre de la entidad (Company o Branch)
      const entityName =
        type === "Company"
          ? tickets[0]?.branch?.company?.name || trips[0]?.branch?.company?.name
          : tickets[0]?.branch?.name || trips[0]?.branch?.name;
      let fecha = null;
      if (endDate && endDate.trim() !== "") {
        fecha = date + " al " + endDate;
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
        tramos: tripsSummary,
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
        fecha = `${date} al ${endDate}`;
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

  // TicketController.js

  /**
   * Reporte general de tickets indicando estado de impresión.
   * Devuelve TODOS los tickets, marcando cuáles son incidencias.
   */
  async getTicketsPrintReport(req, res) {
    logger.info(`${req.user.name} - Solicita reporte de estado de impresión de tickets`);
    logger.info("Filtros: " + JSON.stringify(req.body));

    const { ticket_id, date, branch_id, limit } = req.body;

    try {
      // 1. Obtener TODOS los tickets (sin filtrar por print)
      const tickets = await TicketRepository.findWithPrintStatus({
        ticket_id,
        date,
        branch_id,
        limit
      });

      if (!tickets.length) {
        return res.status(204).json({ msg: "NoTicketsFound" });
      }

      // 2. Mapeo con Lógica de Negocio de Incidencias
      const mappedTickets = tickets.map(ticket => {
        const printCount = ticket.print || 1; // Por seguridad, default a 1
        const reprintCount = printCount - 1;
        
        // DEFINICIÓN DE ESTADO
        const isIncident = printCount > 1;
        const statusLabel = isIncident 
          ? `Incidencia (${reprintCount} reimpresione${reprintCount === 1 ? 's' : 's'})` 
          : 'Impresión Normal';
        
        // Tipo de incidente para facilitar filtrado en frontend si se requiere
        const incidentType = isIncident ? 'REPRINT_INCIDENT' : 'NORMAL';

        return {
          id: ticket.id,
          sequenceNumber: ticket.sequenceNumber, // Útil para reportes SII/Internos
          branch_id: ticket.branch_id,
          trip_id: ticket.trip_id,
          
          // Datos del viaje
          routeName: ticket.trip?.route?.name || 'N/A',
          origin: ticket.trip?.route?.origin?.address,
          destination: ticket.trip?.route?.destination?.address,
          schedule: ticket.trip?.schedule,
          date: ticket.date,
          
          // Datos económicos
          price: Number(ticket.price),
          total: Number(ticket.total),
          quantity: Number(ticket.quantity),
          method: ticket.method,
          
          // --- CAMPOS CLAVE SOLICITADOS ---
          print_count: printCount,          // Total de veces impreso (1, 2, 3...)
          reprint_count: reprintCount,      // Cantidad de reimpresiones (0, 1, 2...)
          is_incident: isIncident,          // Booleano: true si print > 1
          status_label: statusLabel,        // Texto legible: "Incidencia (2 reimpresiones)"
          incident_type: incidentType,      // Código para lógica: 'REPRINT_INCIDENT' | 'NORMAL'
          last_modified: ticket.updatedAt,  // Cuándo ocurrió la última acción
          // ------------------------------

          // Contexto
          branchName: ticket.branch?.name,
          companyRut: ticket.branch?.company?.rut,
          userName: ticket.user?.name,
          userEmail: ticket.user?.email
        };
      });

      // 3. Estadísticas rápidas (Opcional, pero muy útil en reportes)
      const stats = {
        total_tickets: mappedTickets.length,
        normal_prints: mappedTickets.filter(t => !t.is_incident).length,
        incidents: mappedTickets.filter(t => t.is_incident).length,
        total_reprints_count: mappedTickets.reduce((sum, t) => sum + t.reprint_count, 0)
      };

      return res.status(200).json({
        stats, // Resumen rápido
        tickets: mappedTickets
      });

    } catch (error) {
      logger.error(`TicketController->getTicketsPrintReport: ${error.message}`);
      return res.status(500).json({ error: "ServerError", details: error.message });
    }
  }
};

module.exports = TicketController;
