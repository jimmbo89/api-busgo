const { Ticket, sequelize } = require("../models");
const logger = require("../../config/logger"); // Logger para seguimiento
const {
  TicketRepository,
  TicketItemRepository,
  TripRepository,
  BranchRepository,
  CompanyRepository,
  IncidentRepository,
  TuuRepository,
  FareSegmentRepository,
  } = require("../repositories");

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const toPlainObject = (item) =>
  item && typeof item.toJSON === "function" ? item.toJSON() : item;
const parseArrayValue = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  return [];
};

const mapTicketItems = (ticketItems = []) =>
  parseArrayValue(ticketItems).map((ticketItem) => ({
    ...toPlainObject(ticketItem),
    tripFare: ticketItem.tripFare ? toPlainObject(ticketItem.tripFare) : null,
    ticketType: ticketItem.ticketType ? toPlainObject(ticketItem.ticketType) : null,
  }));

const resolveTripFareMatch = (trip, fareSegmentId, ticketTypeId) => {
  const tripFares = Array.isArray(trip?.tripFares) ? trip.tripFares : [];
  if (!ticketTypeId || tripFares.length === 0) {
    return null;
  }

  const normalizedTicketTypeId = Number(ticketTypeId);
  const normalizedFareSegmentId =
    fareSegmentId !== undefined && fareSegmentId !== null && fareSegmentId !== ""
      ? Number(fareSegmentId)
      : null;

  const exactMatch = tripFares.find((tripFare) => {
    const fareSegmentTicketType = tripFare.fareSegmentTicketType || {};
    return (
      Number(fareSegmentTicketType.ticket_type_id) === normalizedTicketTypeId &&
      (normalizedFareSegmentId === null ||
        Number(fareSegmentTicketType.fare_segment_id) === normalizedFareSegmentId)
    );
  });

  if (exactMatch) {
    return exactMatch;
  }

  const looseMatch = tripFares.find((tripFare) => {
    const fareSegmentTicketType = tripFare.fareSegmentTicketType || {};
    return Number(fareSegmentTicketType.ticket_type_id) === normalizedTicketTypeId;
  });

  return looseMatch || null;
};

const resolveTripFareById = (trip, tripFareId) => {
  const tripFares = Array.isArray(trip?.tripFares) ? trip.tripFares : [];
  if (!tripFareId || tripFares.length === 0) {
    return null;
  }

  const normalizedTripFareId = Number(tripFareId);
  return (
    tripFares.find((tripFare) => Number(tripFare.id) === normalizedTripFareId) ||
    null
  );
};

const resolveFareSegmentIdsFromTicketItems = (trip, ticketItems = []) => {
  const tripFares = Array.isArray(trip?.tripFares) ? trip.tripFares : [];
  const tripFareMap = new Map();
  for (const tripFare of tripFares) {
    const fareSegmentId = Number(
      tripFare?.fareSegmentTicketType?.fareSegment?.id
    );
    if (Number.isFinite(fareSegmentId) && fareSegmentId > 0) {
      tripFareMap.set(Number(tripFare.id), fareSegmentId);
    }
  }

  const fareSegmentIds = [];
  const seen = new Set();
  for (const item of Array.isArray(ticketItems) ? ticketItems : []) {
    const fareSegmentId = tripFareMap.get(Number(item.trip_fare_id));
    if (Number.isFinite(fareSegmentId) && fareSegmentId > 0 && !seen.has(fareSegmentId)) {
      seen.add(fareSegmentId);
      fareSegmentIds.push(fareSegmentId);
    }
  }

  return fareSegmentIds;
};

const normalizeTicketItemsFromRequest = (body = {}, trip = null) => {
  const hasTicketItems = hasOwn(body, "ticketItems");
  const hasLegacyTicketTypes =
    hasOwn(body, "tickettypes") || hasOwn(body, "ticketType");

  if (!hasTicketItems && !hasLegacyTicketTypes) {
    return null;
  }

  const rawItems = hasTicketItems
    ? body.ticketItems
    : body.tickettypes ?? body.ticketType ?? [];
  const sourceItems = parseArrayValue(rawItems);
  const isLegacy = !hasTicketItems;

  return sourceItems.map((item) => {
    const tripFareFromId = resolveTripFareById(
      trip,
      item.trip_fare_id ?? item.tripFareId ?? null
    );
    const ticketTypeId = isLegacy
      ? item.ticket_type_id ?? item.id ?? tripFareFromId?.fareSegmentTicketType?.ticket_type_id ?? null
      : item.ticket_type_id ?? tripFareFromId?.fareSegmentTicketType?.ticket_type_id ?? null;
    const tripFare =
      tripFareFromId ??
      (item.trip_fare_id || item.tripFareId
        ? null
        : resolveTripFareMatch(trip, null, ticketTypeId));
    const tripFareId = item.trip_fare_id ?? item.tripFareId ?? tripFare?.id ?? null;
    const resolvedTicketType = tripFare?.fareSegmentTicketType?.ticketType || {};

    const basePriceValue =
      item.base_price ??
      item.basePrice ??
      item.adjustment_details?.base_price ??
      item.adjustmentDetails?.base_price ??
      tripFare?.base_price ??
      tripFare?.fareSegmentTicketType?.base_price ??
      null;
    const unitPriceValue =
      item.unit_price ??
      item.unitPrice ??
      item.adjustment_details?.unit_price ??
      item.adjustmentDetails?.unit_price ??
      tripFare?.price ??
      basePriceValue ??
      null;
    const quantity = Number(item.quantity ?? item.cant ?? 1);
    const subtotalValue =
      item.subtotal ??
      item.subTotal ??
      item.adjustment_details?.line_total ??
      item.adjustmentDetails?.line_total ??
      (unitPriceValue !== null ? Number(unitPriceValue) * quantity : null);

    return {
      id: item.id ?? null,
      ticket_type_id: ticketTypeId,
      trip_fare_id: tripFareId,
      quantity,
      base_price: basePriceValue !== null ? Number(basePriceValue) : 0,
      unit_price: unitPriceValue !== null ? Number(unitPriceValue) : 0,
      subtotal: subtotalValue !== null ? Number(subtotalValue) : 0,
      currency: item.currency ?? "CLP",
      active: item.active ?? true,
      source_type: item.source_type ?? "auto",
      ticket_type_name:
        item.ticket_type_name ??
        item.ticketTypeName ??
        item.name ??
        resolvedTicketType.name ??
        tripFare?.fareSegmentTicketType?.ticketTypeName ??
        null,
      ticket_type_description:
        item.ticket_type_description ??
        item.ticketTypeDescription ??
        item.description ??
        resolvedTicketType.description ??
        tripFare?.fareSegmentTicketType?.ticketTypeDescription ??
        null,
    };
  });
};

const mapMonthlyTrip = (trip) => {
  const vehicle = trip.vehicle || {};
  const tickets = trip.tickets || [];
  const route = trip.route || {};
  const origin = route.origin || {};
  const destination = route.destination || {};

  const routeInfo = `${origin.address || ""} - ${destination.address || ""}`;

  let horario;
  if (trip.end) {
    horario = `${trip.start} - ${trip.end}`;
  } else if (trip.start) {
    const startDate = new Date(trip.start);
    const estimatedTime = new Date(
      startDate.getTime() + (route.estimated || 0) * 60000
    );
    const formattedEstimated = estimatedTime
      .toISOString()
      .replace("T", " ")
      .substring(0, 19);
    horario = `${trip.start} - ${formattedEstimated}`;
  } else {
    const combinedDateTime = `${trip.date} ${trip.schedule}`;
    const scheduleDate = new Date(combinedDateTime);
    const estimatedTime = new Date(
      scheduleDate.getTime() + (route.estimated || 0) * 60000
    );
    const formattedEstimated = estimatedTime
      .toISOString()
      .replace("T", " ")
      .substring(0, 19);
    horario = `${combinedDateTime} - ${formattedEstimated}`;
  }

  const asientosVendidos = tickets.reduce(
    (sum, ticket) => sum + (Number(ticket.quantity) || 0),
    0
  );
  const dineroGenerado = tickets.reduce(
    (sum, ticket) => sum + (Number.parseFloat(ticket.total) || 0),
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
    route: routeInfo,
    estimated: route.estimated,
    horario,
    capacidad: vehicle.seats,
    asientosVendidos,
    dineroGenerado,
  };
};

const mapMonthlyIncident = (incident) => ({
  id: incident.id,
  title: incident.title,
  description: incident.description,
  date: incident.date,
  details: incident.details,
  workerName: incident.user?.worker?.name,
  image: incident.user?.worker?.image,
  nameBranch: incident.branch?.name,
  imageBranch: incident.branch?.image,
  branchId: incident.branch_id,
  branch_id: incident.branch_id,
  workerId: incident.worker_id,
  worker_d: incident.worker_id,
});

async function resolveMonthlySalesScope(type, branchId, companyId) {
  if (type === "Sucursal") {
    if (!branchId) {
      return { error: "BranchNotFound" };
    }

    const branch = await BranchRepository.findById(branchId);
    if (!branch) {
      return { error: "BranchNotFound" };
    }

    return { branchId: branch.id };
  }

  if (companyId) {
    const company = await CompanyRepository.findById(companyId);
    if (!company) {
      return { error: "CompanyNotFound" };
    }

    const branchIds = await BranchRepository.findIdsByCompanyId(company.id);
    return { companyId: company.id, branchIds };
  }

  if (branchId) {
    const branch = await BranchRepository.findById(branchId);
    if (!branch) {
      return { error: "BranchNotFound" };
    }

    const branchIds = await BranchRepository.findIdsByCompanyId(branch.company_id);
    return { companyId: branch.company_id, branchIds };
  }

  return { error: "CompanyNotFound" };
}

function getChileDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const values = {};
  for (const part of parts) {
    if (part.type !== "literal") values[part.type] = part.value;
  }

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}:${values.second}`,
  };
}

function getPreviousChileDate(date = new Date()) {
  const previous = new Date(date);
  previous.setDate(previous.getDate() - 1);
  return getChileDateParts(previous).date;
}

function buildComparison(currentValue, previousValue) {
  const current = Number(currentValue) || 0;
  const previous = Number(previousValue) || 0;

  if (previous === 0) {
    return {
      previousValue: previous,
      changePercent: current > 0 ? 100 : 0,
      trend: current > 0 ? "up" : "flat",
    };
  }

  const changePercent = ((current - previous) / previous) * 100;
  return {
    previousValue: previous,
    changePercent: Number(changePercent.toFixed(1)),
    trend: changePercent > 0 ? "up" : changePercent < 0 ? "down" : "flat",
  };
}

async function validateFareSegmentForTrip(fareSegmentId, trip, branch) {
  if (fareSegmentId === undefined || fareSegmentId === null || fareSegmentId === "") {
    return null;
  }

  const fareSegment = await FareSegmentRepository.findById(fareSegmentId);
  if (!fareSegment) {
    return { error: "FareSegmentNotFound" };
  }

  if (Number(fareSegment.route_id) !== Number(trip.route_id)) {
    return { error: "FareSegmentRouteMismatch" };
  }

  const branchCompanyId = branch?.company_id || branch?.company?.id || null;
  if (branchCompanyId && Number(fareSegment.company_id) !== Number(branchCompanyId)) {
    return { error: "FareSegmentCompanyMismatch" };
  }

  return fareSegment;
}

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
        fare_segment_id: ticket.fare_segment_id,
        fareSegmentId: ticket.fare_segment_id,
        method: ticket.method,
        status: ticket.status,
        quantity: Number(ticket.quantity),
        price: Number(ticket.price),
        total: Number(ticket.total),
        seats: parseArrayValue(ticket.seats),
        // promotions: parseArrayValue(ticket.promotions),
        // tickettypes: parseArrayValue(ticket.tickettypes),
        ticketItems: mapTicketItems(ticket.ticketItems),
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
        fareSegment: ticket.fareSegment
          ? {
              id: ticket.fareSegment.id,
              company_id: ticket.fareSegment.company_id,
              route_id: ticket.fareSegment.route_id,
              origin_route_stop_id: ticket.fareSegment.origin_route_stop_id,
              destination_route_stop_id: ticket.fareSegment.destination_route_stop_id,
              service_class: ticket.fareSegment.service_class,
              base_price: Number(ticket.fareSegment.base_price ?? 0),
              currency: ticket.fareSegment.currency,
              valid_from: ticket.fareSegment.valid_from,
              valid_to: ticket.fareSegment.valid_to,
              priority: ticket.fareSegment.priority,
              active: ticket.fareSegment.active,
              originRouteStop: ticket.fareSegment.originRouteStop?.location?.address ?? null,
              destinationRouteStop: ticket.fareSegment.destinationRouteStop?.location?.address ?? null,
            }
          : null,
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
        fare_segment_id: ticket.fare_segment_id,
        fareSegmentId: ticket.fare_segment_id,
        method: ticket.method,
        status: ticket.status,
        quantity: Number(ticket.quantity),
        price: Number(ticket.price),
        total: Number(ticket.total),
        seats: parseArrayValue(ticket.seats),
        promotions: parseArrayValue(ticket.promotions),
        tickettypes: parseArrayValue(ticket.tickettypes),
        ticketItems: mapTicketItems(ticket.ticketItems),
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
        fareSegment: ticket.fareSegment
          ? {
              id: ticket.fareSegment.id,
              company_id: ticket.fareSegment.company_id,
              route_id: ticket.fareSegment.route_id,
              origin_route_stop_id: ticket.fareSegment.origin_route_stop_id,
              destination_route_stop_id: ticket.fareSegment.destination_route_stop_id,
              service_class: ticket.fareSegment.service_class,
              base_price: Number(ticket.fareSegment.base_price ?? 0),
              currency: ticket.fareSegment.currency,
              valid_from: ticket.fareSegment.valid_from,
              valid_to: ticket.fareSegment.valid_to,
              priority: ticket.fareSegment.priority,
              active: ticket.fareSegment.active,
              originRouteStop: ticket.fareSegment.originRouteStop?.location?.address ?? null,
              destinationRouteStop: ticket.fareSegment.destinationRouteStop?.location?.address ?? null,
            }
          : null,
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

    const trip = await TripRepository.findByIdWithTickets(trip_id);
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

    const t = await sequelize.transaction(); // Inicia la transacción
    try {
      const normalizedTicketItems = normalizeTicketItemsFromRequest(req.body, trip);
      if (normalizedTicketItems !== null) {
        req.body.ticketItems = normalizedTicketItems;
      }

      const fareSegmentIdsForValidation = resolveFareSegmentIdsFromTicketItems(
        trip,
        normalizedTicketItems ?? []
      );

      // Verifica los asientos reservados
      const conflictingSeats = fareSegmentIdsForValidation.length > 0
        ? await TicketRepository.checkReservedSeatsBySegment(
            trip_id,
            seats,
            fareSegmentIdsForValidation
          )
        : await TicketRepository.checkReservedSeats(trip_id, seats);

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

      for (const fareSegmentId of fareSegmentIdsForValidation) {
        const fareSegmentValidation = await validateFareSegmentForTrip(
          fareSegmentId,
          trip,
          branch
        );
        if (fareSegmentValidation?.error === "FareSegmentNotFound") {
          logger.error(
            `TicketController->store: Tramo no encontrado con ID ${fareSegmentId}`
          );
          if (!t.finished) {
            await t.rollback();
          }
          return res.status(400).json({ msg: "FareSegmentNotFound" });
        }
        if (fareSegmentValidation?.error === "FareSegmentRouteMismatch") {
          logger.error(
            `TicketController->store: El tramo ${fareSegmentId} no pertenece a la ruta ${trip.route_id}`
          );
          if (!t.finished) {
            await t.rollback();
          }
          return res.status(400).json({ msg: "FareSegmentRouteMismatch" });
        }
        if (fareSegmentValidation?.error === "FareSegmentCompanyMismatch") {
          logger.error(
            `TicketController->store: El tramo ${fareSegmentId} no pertenece a la empresa de la sucursal ${branch_id}`
          );
          if (!t.finished) {
            await t.rollback();
          }
          return res.status(400).json({ msg: "FareSegmentCompanyMismatch" });
        }
      }

      if(id){
        req.body.qr = id;
        req.body.barcode = id;
        req.body.sequenceNumber = id;
      }

      let ticket = await TicketRepository.create(req.body, { transaction: t });

      if (normalizedTicketItems !== null) {
        await TicketItemRepository.sync(ticket.id, normalizedTicketItems, {
          transaction: t,
        });
      }

      let mappedTicket = {
        id: ticket.id,
        branch_id: ticket.branch_id,
        branchId: ticket.branch_id,
        trip_id: ticket.trip_id,
        tripId: ticket.trip_id,
        fare_segment_id: ticket.fare_segment_id,
        fareSegmentId: ticket.fare_segment_id,
        method: ticket.method,
        quantity: ticket.quantity,
        price: ticket.price,
        total: ticket.total,
        date: ticket.date,
        sequenceNumber: ticket.sequenceNumber,
        ticketItems: normalizedTicketItems ?? [],
      };
      //if (!id ) {
        // Si id no existe, es null o está vacío, generar QR y código de barras
        const { qrCodePath, barcodePath } = await TicketRepository.generateTicketCodes(mappedTicket, ticket, { transaction: t });
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
        fare_segment_id: ticket.fare_segment_id,
        fareSegmentId: ticket.fare_segment_id,
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
        ticketItems: mapTicketItems(ticket.ticketItems),
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

    const trip = await TripRepository.findByIdWithTickets(req.body.trip_id);
    if (!trip) {
      logger.error(
        `TicketController->store_web: Viaje no encontrado con ID ${req.body.trip_id}`
      );
      return res.status(400).json({ msg: "TripNotFound" });
    }

    const branch = await BranchRepository.findById(req.body.branch_id);
    if (!branch) {
      logger.error(
        `TicketController->store_web: Sucursal no encontrada con ID ${req.body.branch_id}`
      );
      return res.status(400).json({ msg: "BranchNotFound" });
    }

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
      const normalizedTicketItems = normalizeTicketItemsFromRequest(req.body, trip);
      if (normalizedTicketItems !== null) {
        req.body.ticketItems = normalizedTicketItems;
      }

      const fareSegmentIdsForValidation = resolveFareSegmentIdsFromTicketItems(
        trip,
        normalizedTicketItems ?? []
      );

      // Verifica los asientos reservados
      const conflictingSeats = fareSegmentIdsForValidation.length > 0
        ? await TicketRepository.checkReservedSeatsBySegment(
            trip_id,
            seats,
            fareSegmentIdsForValidation
          )
        : await TicketRepository.checkReservedSeats(trip_id, seats);

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

      for (const fareSegmentId of fareSegmentIdsForValidation) {
        const fareSegmentValidation = await validateFareSegmentForTrip(
          fareSegmentId,
          trip,
          branch
        );
        if (fareSegmentValidation?.error === "FareSegmentNotFound") {
          logger.error(
            `TicketController->store_web: Tramo no encontrado con ID ${fareSegmentId}`
          );
          if (!t.finished) {
            await t.rollback();
          }
          return res.status(400).json({ msg: "FareSegmentNotFound" });
        }
        if (fareSegmentValidation?.error === "FareSegmentRouteMismatch") {
          logger.error(
            `TicketController->store_web: El tramo ${fareSegmentId} no pertenece a la ruta ${trip.route_id}`
          );
          if (!t.finished) {
            await t.rollback();
          }
          return res.status(400).json({ msg: "FareSegmentRouteMismatch" });
        }
        if (fareSegmentValidation?.error === "FareSegmentCompanyMismatch") {
          logger.error(
            `TicketController->store_web: El tramo ${fareSegmentId} no pertenece a la empresa de la sucursal ${branch_id}`
          );
          if (!t.finished) {
            await t.rollback();
          }
          return res.status(400).json({ msg: "FareSegmentCompanyMismatch" });
        }
      }

      if (method === "Efectivo") {
        ticket = await TicketRepository.create(req.body, {
          transaction: t,
        });
        if (normalizedTicketItems !== null) {
          await TicketItemRepository.sync(ticket.id, normalizedTicketItems, {
            transaction: t,
          });
        }
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
            seats: ticket.seats,      // Agregar seats para validación
            ticketItems: normalizedTicketItems ?? []
        };
        //generar qr y codigo de barra
        const { qrCodePath, barcodePath } =
          await TicketRepository.generateTicketCodes(mappedTicket, ticket, { transaction: t });
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
          fare_segment_id: ticket.fare_segment_id,
          fareSegmentId: ticket.fare_segment_id,
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
          ticketItems: mapTicketItems(ticket.ticketItems),
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
          if (normalizedTicketItems !== null) {
            await TicketItemRepository.sync(ticket.id, normalizedTicketItems, {
              transaction: t,
            });
          }

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
            await TicketRepository.generateTicketCodes(mappedTicket, ticket, { transaction: t });
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
          fare_segment_id: ticket.fare_segment_id,
          fareSegmentId: ticket.fare_segment_id,
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
          ticketItems: mapTicketItems(ticket.ticketItems),
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
          fare_segment_id: ticket.fare_segment_id,
          fareSegmentId: ticket.fare_segment_id,
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
          ticketItems: mapTicketItems(ticket.ticketItems),
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

    const tripForValidation = trip_id
      ? await TripRepository.findByIdWithTickets(trip_id)
      : await TripRepository.findByIdWithTickets(ticket.trip_id);
    if (!tripForValidation) {
      return res.status(400).json({ msg: "TripNotFound" });
    }

    const branchForValidation = branch_id
      ? await BranchRepository.findById(branch_id)
      : ticket.branch;
    if (!branchForValidation) {
      return res.status(400).json({ msg: "BranchNotFound" });
    }

    const normalizedTicketItems = normalizeTicketItemsFromRequest(req.body, tripForValidation);
    if (normalizedTicketItems !== null) {
      req.body.ticketItems = normalizedTicketItems;
    }

    const fareSegmentIdsForValidation = resolveFareSegmentIdsFromTicketItems(
      tripForValidation,
      normalizedTicketItems ?? []
    );

    const conflictingSeats = fareSegmentIdsForValidation.length > 0
      ? await TicketRepository.checkReservedSeatsBySegment(
          tripForValidation.id,
          seats,
          fareSegmentIdsForValidation,
          id
        )
      : await TicketRepository.checkReservedSeats(tripForValidation.id, seats, id);

    if (conflictingSeats.length > 0) {
      logger.error(
        `TicketController->update: Los asientos ya están reservados: ${conflictingSeats.join(
          ", "
        )}`
      );
      return res.status(400).json({ msg: "SeatsReserved" });
    }

    for (const fareSegmentId of fareSegmentIdsForValidation) {
      const fareSegmentValidation = await validateFareSegmentForTrip(
        fareSegmentId,
        tripForValidation,
        branchForValidation
      );
      if (fareSegmentValidation?.error === "FareSegmentNotFound") {
        logger.error(
          `TicketController->update: Tramo no encontrado con ID ${fareSegmentId}`
        );
        return res.status(400).json({ msg: "FareSegmentNotFound" });
      }
      if (fareSegmentValidation?.error === "FareSegmentRouteMismatch") {
        logger.error(
          `TicketController->update: El tramo ${fareSegmentId} no pertenece a la ruta ${tripForValidation.route_id}`
        );
        return res.status(400).json({ msg: "FareSegmentRouteMismatch" });
      }
      if (fareSegmentValidation?.error === "FareSegmentCompanyMismatch") {
        logger.error(
          `TicketController->update: El tramo ${fareSegmentId} no pertenece a la empresa de la sucursal ${branchForValidation.id || branchForValidation.branch_id || branch_id}`
        );
        return res.status(400).json({ msg: "FareSegmentCompanyMismatch" });
      }
    }

    try {
      const updatedTicket = await TicketRepository.update(ticket, req.body);
      if (normalizedTicketItems !== null) {
        await TicketItemRepository.sync(ticket.id, normalizedTicketItems);
      }

      let ticketMaped = await TicketRepository.findById(ticket.id);
      const mappedTicket = {
        id: ticketMaped.id,
        branchId: ticketMaped.branch_id,
        userId: ticketMaped.user_id,
        tripId: ticketMaped.trip_id,
        fare_segment_id: ticketMaped.fare_segment_id,
        fareSegmentId: ticketMaped.fare_segment_id,
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
        ticketItems: mapTicketItems(ticketMaped.ticketItems),
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
      const { month, type, branch_id, company_id } = req.body;
      const scope = await resolveMonthlySalesScope(type, branch_id, company_id);
      if (scope.error) {
        logger.error(
          `TicketController->getMonthlySales: ${
            scope.error === "BranchNotFound" ? "Sucursal" : "Compañía"
          } no encontrada con ID ${company_id || branch_id}`
        );
        return res.status(404).json({ msg: scope.error });
      }

      const today = new Date();
      const { date: formattedToday, time: currentTimeChile } = getChileDateParts(today);
      const yesterdayChile = getPreviousChileDate(today);
      /*const { ticketsVendidos, ingresoGenerado } =
        await TicketRepository.getMonthlySales(month, type, branch_id);*/
      const { ticketsVendidos, ingresoGenerado } =
        await TicketRepository.getDailySales(
          formattedToday,
          type,
          scope.branchId || null,
          scope.companyId || null
        );
      /*const occupancyRate = await TicketRepository.getOccupancyRate(
        month,
        type,
        branch_id
      );*/
      const occupancyRate = await TicketRepository.getDailyOccupancyRate(
        formattedToday,
        type,
        scope.branchId || null,
        scope.companyId || null
      );
      const previousSales = await TicketRepository.getDailySales(
        yesterdayChile,
        type,
        scope.branchId || null,
        scope.branchIds || null
      );
      const previousOccupancyRate = await TicketRepository.getDailyOccupancyRate(
        yesterdayChile,
        type,
        scope.branchId || null,
        scope.branchIds || null
      );
      // Obtener las ganancias anuales por meses
      const yearlyEarnings = await TicketRepository.getYearlyEarnings(
        month,
        type,
        scope.branchId || null,
        scope.companyId || null
      );

      /*const trips = await TicketRepository.getTripsWithDetails(
        month,
        type,
        branch_id
      );*/

      const pendingTrips = await TripRepository.getPendingTripsWithDetails({
        date: formattedToday,
        currentTime: currentTimeChile,
        branchId: scope.branchId || null,
        branchIds: scope.branchIds || null,
        limit: 5,
      });

      const { totalIncidents } = await IncidentRepository.getIncidentsByBranchDay(
        formattedToday,
        type,
        scope.branchId || null,
        scope.branchIds || null
      );
      const previousIncidents = await IncidentRepository.getIncidentsByBranchDay(
        yesterdayChile,
        type,
        scope.branchId || null,
        scope.branchIds || null
      );

      const recentIncidents = await IncidentRepository.getRecentIncidentsByScope({
        date: formattedToday,
        branchId: scope.branchId || null,
        branchIds: scope.branchIds || null,
        limit: 5,
      });

      const formattedTrips = pendingTrips.map(mapMonthlyTrip);
      const formattedIncidents = recentIncidents.map(mapMonthlyIncident);

      /* const formattedTrips = trips.map((trip) => {
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

      */

      const data = [
        {
          title: "Boletos Vendidos",
          value: Number(ticketsVendidos),
          color: "#1976D2",
          icon: "mdi-ticket",
          to: "/ticket",
          comparison: buildComparison(ticketsVendidos, previousSales.ticketsVendidos),
        },
        {
          title: "Ingreso Generado",
          value: Number(ingresoGenerado),
          color: "#4CAF50",
          icon: "mdi-cash-multiple",
          to: "ticketdate",
          comparison: buildComparison(ingresoGenerado, previousSales.ingresoGenerado),
        },
        {
          title: "Incidentes",
          value: Number(totalIncidents),
          color: "#F44336",
          icon: "mdi-alert",
          to: "/incident",
          comparison: buildComparison(totalIncidents, previousIncidents.totalIncidents),
        },
        {
          title: "Tasa de Ocupación",
          value: occupancyRate,
          color: "#FF9800",
          icon: "mdi-account-group",
          comparison: buildComparison(occupancyRate, previousOccupancyRate),
        }, 
      ];

      res.status(200).json({
        sales: data,
        salesYear: yearlyEarnings,
        trips: formattedTrips,
        incidents: formattedIncidents,
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
