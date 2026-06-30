const { Worker, TripWorker, sequelize } = require("../models");
const logger = require("../../config/logger"); // Logger para seguimiento
const {
  TripRepository,
  VehicleRepository,
  RouteRepository,
  BranchRepository,
  BranchVehicleRepository,
  BranchRouteRepository,
  BranchWorkerRepository,
  TripWorkerRepository,
  TripStopRepository,
  TripFareRepository,
  RouteStopRepository,
  LocationRepository,
  VehicleWorkerRepository,
  TicketRepository,
  CompanyRepository,
  IncidentRepository,
  PromotionRepository,
  TicketTypeRepository,
  FareSegmentRepository,
  FareSegmentTicketTypeRepository,
} = require("../repositories");

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const toPlainObject = (item) =>
  item && typeof item.toJSON === "function" ? item.toJSON() : item;
const getChileDate = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = {};
  for (const part of parts) {
    if (part.type !== "literal") values[part.type] = part.value;
  }

  return `${values.year}-${values.month}-${values.day}`;
};
const isFareSegmentActiveForDate = (fareSegment, currentDate) => {
  if (!fareSegment || !fareSegment.active) {
    return false;
  }

  const validFrom = fareSegment.valid_from || null;
  const validTo = fareSegment.valid_to || null;

  if (validFrom && currentDate < validFrom) {
    return false;
  }

  if (validTo && currentDate > validTo) {
    return false;
  }

  return true;
};
const tripHasOriginDestinationSegment = (
  trip,
  originRouteStopId,
  destinationRouteStopId,
  currentDate = null
) => {
  const tripStops = Array.isArray(trip?.tripStops)
    ? trip.tripStops
        .filter((tripStop) => tripStop && tripStop.active)
        .slice()
        .sort((a, b) => {
          const orderA = Number(a.stop_order ?? a.routeStop?.stop_order ?? 0);
          const orderB = Number(b.stop_order ?? b.routeStop?.stop_order ?? 0);
          return orderA - orderB;
        })
    : [];
  const normalizedOriginId = Number(originRouteStopId);
  const normalizedDestinationId = Number(destinationRouteStopId);

  if (
    !Number.isFinite(normalizedOriginId) ||
    !Number.isFinite(normalizedDestinationId) ||
    normalizedOriginId <= 0 ||
    normalizedDestinationId <= 0 ||
    normalizedOriginId === normalizedDestinationId
  ) {
    return false;
  }

  const originStop = tripStops.find(
    (tripStop) =>
      Number(tripStop.routeStop?.location_id) === normalizedOriginId ||
      Number(tripStop.routeStop?.location?.id) === normalizedOriginId
  );
  const destinationStop = tripStops.find(
    (tripStop) =>
      Number(tripStop.routeStop?.location_id) === normalizedDestinationId ||
      Number(tripStop.routeStop?.location?.id) === normalizedDestinationId
  );

  if (!originStop || !destinationStop) {
    return false;
  }

  if (originStop.can_board === false || destinationStop.can_alight === false) {
    return false;
  }

  const originOrder = Number(originStop.stop_order ?? originStop.routeStop?.stop_order ?? NaN);
  const destinationOrder = Number(
    destinationStop.stop_order ?? destinationStop.routeStop?.stop_order ?? NaN
  );

  if (!Number.isFinite(originOrder) || !Number.isFinite(destinationOrder)) {
    return false;
  }

  if (originOrder >= destinationOrder) {
    return false;
  }

  const tripFares = Array.isArray(trip?.tripFares) ? trip.tripFares : [];
  const exactTripFare = tripFares.find((tripFare) => {
    const fareSegmentTicketType = tripFare?.fareSegmentTicketType || {};
    const fareSegment = fareSegmentTicketType?.fareSegment || {};
    const fareOriginId =
      fareSegment.originRouteStop?.location_id ?? fareSegment.originRouteStop?.location?.id ?? null;
    const fareDestinationId =
      fareSegment.destinationRouteStop?.location_id ??
      fareSegment.destinationRouteStop?.location?.id ??
      null;

    if (
      Number(fareOriginId) !== normalizedOriginId ||
      Number(fareDestinationId) !== normalizedDestinationId
    ) {
      return false;
    }

    if (tripFare.active === false || fareSegmentTicketType.active === false) {
      return false;
    }

    if (!isFareSegmentActiveForDate(fareSegment, currentDate || getChileDate())) {
      return false;
    }

    return true;
  });

  return Boolean(exactTripFare);
};
const getExactTripFareForSegment = (
  trip,
  originRouteStopId,
  destinationRouteStopId,
  currentDate = null
) => {
  const tripFares = Array.isArray(trip?.tripFares) ? trip.tripFares : [];
  const normalizedOriginId = Number(originRouteStopId);
  const normalizedDestinationId = Number(destinationRouteStopId);

  return tripFares.filter((tripFare) => {
    const fareSegmentTicketType = tripFare?.fareSegmentTicketType || {};
    const fareSegment = fareSegmentTicketType?.fareSegment || {};
    const fareOriginId =
      fareSegment.originRouteStop?.location_id ?? fareSegment.originRouteStop?.location?.id ?? null;
    const fareDestinationId =
      fareSegment.destinationRouteStop?.location_id ??
      fareSegment.destinationRouteStop?.location?.id ??
      null;

    if (
      Number(fareOriginId) !== normalizedOriginId ||
      Number(fareDestinationId) !== normalizedDestinationId
    ) {
      return false;
    }

    if (tripFare.active === false || fareSegmentTicketType.active === false) {
      return false;
    }

    return isFareSegmentActiveForDate(fareSegment, currentDate || getChileDate());
  });
};
const mapTripStops = (tripStops = []) =>
  (Array.isArray(tripStops) ? tripStops : []).map((tripStop) => ({
    id: tripStop.id,
    company_id: tripStop.company_id,
    trip_id: tripStop.trip_id,
    route_stop_id: tripStop.route_stop_id,
    stop_order: tripStop.stop_order,
    arrival_time: tripStop.arrival_time,
    departure_time: tripStop.departure_time,
    can_board: tripStop.can_board,
    can_alight: tripStop.can_alight,
    active: tripStop.active,
    source_type: tripStop.source_type,
    routeStop: tripStop.routeStop
      ? {
          id: tripStop.routeStop.id,
          company_id: tripStop.routeStop.company_id,
          route_id: tripStop.routeStop.route_id,
          location_id: tripStop.routeStop.location_id,
          stop_order: tripStop.routeStop.stop_order,
          distance_km: tripStop.routeStop.distance_km,
          minutes_from_origin: tripStop.routeStop.minutes_from_origin,
          allows_boarding: tripStop.routeStop.allows_boarding,
          allows_alighting: tripStop.routeStop.allows_alighting,
          active: tripStop.routeStop.active,
          location: tripStop.routeStop.location
            ? {
                id: tripStop.routeStop.location.id,
                address: tripStop.routeStop.location.address,
                country: tripStop.routeStop.location.country,
                city: tripStop.routeStop.location.city,
                image: tripStop.routeStop.location.image,
                active: tripStop.routeStop.location.active,
              }
            : null,
        }
      : null,
  }));
const mapRouteStops = (routeStops = []) =>
  (Array.isArray(routeStops) ? routeStops : []).map((routeStop) => ({
    id: routeStop.id,
    company_id: routeStop.company_id,
    route_id: routeStop.route_id,
    location_id: routeStop.location_id,
    stop_order: routeStop.stop_order,
    distance_km: routeStop.distance_km,
    minutes_from_origin: routeStop.minutes_from_origin,
    allows_boarding: routeStop.allows_boarding,
    allows_alighting: routeStop.allows_alighting,
    active: routeStop.active,
    location: routeStop.location
      ? {
          id: routeStop.location.id,
          address: routeStop.location.address,
          country: routeStop.location.country,
          city: routeStop.location.city,
          image: routeStop.location.image,
          active: routeStop.location.active,
        }
      : null,
  }));
const mapTripFares = (tripFares = []) =>
  (Array.isArray(tripFares) ? tripFares : []).map((tripFare) => ({
    id: tripFare.id,
    company_id: tripFare.company_id,
    trip_id: tripFare.trip_id,
    fare_segment_ticket_type_id: tripFare.fare_segment_ticket_type_id,
    base_price: Number(tripFare.base_price ?? 0),
    price: Number(tripFare.price ?? 0),
    active: tripFare.active,
    source_type: tripFare.source_type,
    fareSegmentTicketType: tripFare.fareSegmentTicketType
      ? {
          id: tripFare.fareSegmentTicketType.id,
          fare_segment_id: tripFare.fareSegmentTicketType.fare_segment_id,
          ticket_type_id: tripFare.fareSegmentTicketType.ticket_type_id,
          base_price: Number(tripFare.fareSegmentTicketType.base_price ?? 0),
          active: tripFare.fareSegmentTicketType.active,
          ticketTypeName: tripFare.fareSegmentTicketType.ticketType?.name,
          ticketTypeDescription: tripFare.fareSegmentTicketType.ticketType?.description,
          ticketTypeActive: tripFare.fareSegmentTicketType.ticketType?.active,
          fareSegment: tripFare.fareSegmentTicketType.fareSegment
            ? {
                id: tripFare.fareSegmentTicketType.fareSegment.id,
                route_id: tripFare.fareSegmentTicketType.fareSegment.route_id,
                origin_route_stop_id: tripFare.fareSegmentTicketType.fareSegment.origin_route_stop_id,
                destination_route_stop_id: tripFare.fareSegmentTicketType.fareSegment.destination_route_stop_id,
                originRouteStop: tripFare.fareSegmentTicketType.fareSegment.originRouteStop?.location?.address ?? null,
                destinationRouteStop: tripFare.fareSegmentTicketType.fareSegment.destinationRouteStop?.location?.address ?? null,
              }
            : null,
        }
      : null,
  }));
const mapFareSegments = (fareSegments = []) =>
  (Array.isArray(fareSegments) ? fareSegments : []).map((fareSegment) => ({
    id: fareSegment.id,
    company_id: fareSegment.company_id,
    route_id: fareSegment.route_id,
    origin_route_stop_id: fareSegment.origin_route_stop_id,
    destination_route_stop_id: fareSegment.destination_route_stop_id,
    service_class: fareSegment.service_class,
    base_price: Number(fareSegment.base_price ?? 0),
    currency: fareSegment.currency,
    valid_from: fareSegment.valid_from,
    valid_to: fareSegment.valid_to,
    priority: fareSegment.priority,
    active: fareSegment.active,
    originRouteStop: fareSegment.originRouteStop
      ? {
          id: fareSegment.originRouteStop.id,
          company_id: fareSegment.originRouteStop.company_id,
          route_id: fareSegment.originRouteStop.route_id,
          location_id: fareSegment.originRouteStop.location_id,
          stop_order: fareSegment.originRouteStop.stop_order,
          distance_km: fareSegment.originRouteStop.distance_km,
          minutes_from_origin: fareSegment.originRouteStop.minutes_from_origin,
          allows_boarding: fareSegment.originRouteStop.allows_boarding,
          allows_alighting: fareSegment.originRouteStop.allows_alighting,
          active: fareSegment.originRouteStop.active,
          location: fareSegment.originRouteStop.location
            ? {
                id: fareSegment.originRouteStop.location.id,
                address: fareSegment.originRouteStop.location.address,
                country: fareSegment.originRouteStop.location.country,
                city: fareSegment.originRouteStop.location.city,
                image: fareSegment.originRouteStop.location.image,
                active: fareSegment.originRouteStop.location.active,
              }
            : null,
        }
      : null,
    destinationRouteStop: fareSegment.destinationRouteStop
      ? {
          id: fareSegment.destinationRouteStop.id,
          company_id: fareSegment.destinationRouteStop.company_id,
          route_id: fareSegment.destinationRouteStop.route_id,
          location_id: fareSegment.destinationRouteStop.location_id,
          stop_order: fareSegment.destinationRouteStop.stop_order,
          distance_km: fareSegment.destinationRouteStop.distance_km,
          minutes_from_origin: fareSegment.destinationRouteStop.minutes_from_origin,
          allows_boarding: fareSegment.destinationRouteStop.allows_boarding,
          allows_alighting: fareSegment.destinationRouteStop.allows_alighting,
          active: fareSegment.destinationRouteStop.active,
          location: fareSegment.destinationRouteStop.location
            ? {
                id: fareSegment.destinationRouteStop.location.id,
                address: fareSegment.destinationRouteStop.location.address,
                country: fareSegment.destinationRouteStop.location.country,
                city: fareSegment.destinationRouteStop.location.city,
                image: fareSegment.destinationRouteStop.location.image,
                active: fareSegment.destinationRouteStop.location.active,
              }
            : null,
        }
      : null,
  }));
const mapRouteFareSegments = (fareSegments = []) =>
  (Array.isArray(fareSegments) ? fareSegments : []).map((fareSegment) => ({
    ...mapFareSegments([fareSegment])[0],
    fareSegmentTicketTypes: Array.isArray(fareSegment.fareSegmentTicketTypes)
      ? fareSegment.fareSegmentTicketTypes.map((item) => ({
          id: item.id,
          fare_segment_id: item.fare_segment_id,
          ticket_type_id: item.ticket_type_id,
          base_price: Number(item.base_price ?? 0),
          active: item.active,
          ticketTypeName: item.ticketType?.name,
          ticketTypeDescription: item.ticketType?.description,
          ticketTypeActive: item.ticketType?.active,
        }))
      : [],
  }));
const mapFareSegmentTicketTypes = (fareSegments = []) =>
  (Array.isArray(fareSegments) ? fareSegments : []).flatMap((fareSegment) =>
    Array.isArray(fareSegment.fareSegmentTicketTypes)
      ? fareSegment.fareSegmentTicketTypes.map((item) => ({
          id: item.id,
          fare_segment_id: item.fare_segment_id,
          ticket_type_id: item.ticket_type_id,
          base_price: Number(item.base_price ?? 0),
          active: item.active,
          ticketTypeName: item.ticketType?.name,
          ticketTypeDescription: item.ticketType?.description,
          ticketTypeActive: item.ticketType?.active,
          fareSegment: {
            id: fareSegment.id,
            company_id: fareSegment.company_id,
            route_id: fareSegment.route_id,
            origin_route_stop_id: fareSegment.origin_route_stop_id,
            destination_route_stop_id: fareSegment.destination_route_stop_id,
            originRouteStop: fareSegment.originRouteStop?.location?.address ?? null,
            destinationRouteStop:
              fareSegment.destinationRouteStop?.location?.address ?? null,
          },
        }))
      : []
  );

const buildTripStopPayload = (trip, companyId, item, routeStop) => ({
  company_id: companyId,
  trip_id: trip.id,
  route_stop_id: routeStop.id,
  stop_order: item.stop_order ?? routeStop.stop_order,
  arrival_time: item.arrival_time ?? null,
  departure_time: item.departure_time ?? null,
  can_board: item.can_board ?? routeStop.allows_boarding ?? true,
  can_alight: item.can_alight ?? routeStop.allows_alighting ?? true,
  active: item.active ?? true,
  source_type: item.source_type ?? "auto",
});

const buildTripFarePayload = (trip, companyId, item, fareSegmentTicketType) => {
  const basePrice = Number(fareSegmentTicketType.base_price ?? 0);
  const hasPrice = item.price !== undefined && item.price !== null && item.price !== "";

  return {
    company_id: companyId,
    trip_id: trip.id,
    fare_segment_ticket_type_id: fareSegmentTicketType.id,
    base_price: basePrice,
    price: hasPrice ? Number(item.price) : basePrice,
    active: item.active ?? true,
    source_type: item.source_type ?? "auto",
  };
};

const getTripStopSyncErrorMessage = (error) => {
  const message = error?.message || "";

  if (message === "TripStopsMustBeArray") {
    return "El campo tripStops debe ser un arreglo";
  }

  if (message === "DuplicateTripStopRouteStop") {
    return "No se puede repetir la misma parada dentro de tripStops";
  }

  if (message === "RouteStopCompanyMismatch") {
    return "Una de las paradas no pertenece a la misma compañia del viaje";
  }

  if (message === "RouteStopRouteMismatch") {
    return "Una de las paradas no pertenece a la ruta del viaje";
  }

  if (message === "TripStopIdRequiredForUpdate") {
    return "Para editar una parada existente debes enviar su id";
  }

  if (message.startsWith("TripStopNotFound:")) {
    const tripStopId = message.split(":")[1];
    return `No se encontro la parada del viaje con ID ${tripStopId}`;
  }

  if (message.startsWith("RouteStopNotFound:")) {
    const routeStopId = message.split(":")[1];
    return `No se encontro la parada con ID ${routeStopId}`;
  }

  return null;
};

const getTripFareSyncErrorMessage = (error) => {
  const message = error?.message || "";

  if (message === "TripFaresMustBeArray") {
    return "El campo tripFares debe ser un arreglo";
  }

  if (message === "DuplicateTripFareFareSegmentTicketType") {
    return "No se puede repetir el mismo tramo tarifario dentro de tripFares";
  }

  if (message === "FareSegmentTicketTypeRequired") {
    return "Debes enviar fare_segment_ticket_type_id en cada tripFare";
  }

  if (message === "FareSegmentTicketTypeNotFound") {
    return "No se encontro el tipo de tarifa del tramo";
  }

  if (message === "FareSegmentTicketTypeCompanyMismatch") {
    return "Uno de los precios no pertenece a la misma compania del viaje";
  }

  if (message === "FareSegmentTicketTypeRouteMismatch") {
    return "Uno de los precios no pertenece a la ruta del viaje";
  }

  if (message === "TripFareIdRequiredForUpdate") {
    return "Para editar un precio existente debes enviar su id";
  }

  if (message.startsWith("TripFareNotFound:")) {
    const tripFareId = message.split(":")[1];
    return `No se encontro el precio del viaje con ID ${tripFareId}`;
  }

  return null;
};

const TripController = {
  // Obtener todos los viajes
  async index(req, res) {
    logger.info(`${req.user.name} - Entra a buscar los viajes`);

    try {
      const trips = await TripRepository.findAll();

      if (!trips.length) {
        return res.status(204).json({ msg: "TripsNotFound" });
      }

      const mappedTrips = await Promise.all(
        trips.map(async (trip) => {
          const tripStops = Array.isArray(trip.tripStops)
            ? trip.tripStops.map((tripStop) => ({
                id: tripStop.id,
                company_id: tripStop.company_id,
                trip_id: tripStop.trip_id,
                route_stop_id: tripStop.route_stop_id,
                stop_order: tripStop.stop_order,
                arrival_time: tripStop.arrival_time,
                departure_time: tripStop.departure_time,
                can_board: tripStop.can_board,
                can_alight: tripStop.can_alight,
                active: tripStop.active,
                source_type: tripStop.source_type,
                routeStop: tripStop.routeStop
                  ? {
                      id: tripStop.routeStop.id,
                      company_id: tripStop.routeStop.company_id,
                      route_id: tripStop.routeStop.route_id,
                      location_id: tripStop.routeStop.location_id,
                      stop_order: tripStop.routeStop.stop_order,
                      distance_km: tripStop.routeStop.distance_km,
                      minutes_from_origin: tripStop.routeStop.minutes_from_origin,
                      allows_boarding: tripStop.routeStop.allows_boarding,
                      allows_alighting: tripStop.routeStop.allows_alighting,
                      active: tripStop.routeStop.active,
                      location: tripStop.routeStop.location
                        ? {
                            id: tripStop.routeStop.location.id,
                            address: tripStop.routeStop.location.address,
                            country: tripStop.routeStop.location.country,
                            city: tripStop.routeStop.location.city,
                            image: tripStop.routeStop.location.image,
                            active: tripStop.routeStop.location.active,
                          }
                        : null,
                    }
                  : null,
              }))
            : [];

          return {
            id: trip.id,
            branchId: trip.branch_id,
            branch_id: trip.branch_id,
            vehicleId: trip.vehicle_id,
            vehicle_id: trip.vehicle_id,
            routeId: trip.route_id,
            route_id: trip.route_id,
            date: trip.date,
            schedule: trip.schedule,
            arrival: trip.arrival,
            start: trip.start,
            end: trip.end,
            price: trip.price,
            seats: trip.vehicle.seats,
            branchName: trip.branch.name, // Incluir los datos de la sucursal asociada
            vehicleName: trip.vehicle.plate, // Incluir los datos del vehículo asociado
            internal_number: trip.vehicle.internal_number,
            internalNumber: trip.vehicle.internal_number,
            vehicleImage: trip.vehicle.image, // Incluir los datos del vehículo asociado
            name: trip.route.name, // Incluir los datos de la ruta asociada
            origin: trip.route.origin.address,
            originImage: trip.route.origin.image,
            destination: trip.route.destination.address,
            destinationImage: trip.route.destination.image,
            workers: await TripWorkerRepository.workersTrip(trip),
            tripStops: tripStops,
          };
        })
      );

      res.status(200).json({ trips: mappedTrips });
    } catch (error) {
      logger.error("TripController->index: " + error.message);
      res.status(500).json({ error: "ServerError", details: error.message });
    }
  },

  async index_branch_date(req, res) {
    logger.info(
      `${req.user.name} - Entra a buscar los viajes(index_branch_date) `
    );

    const { branch_id, date } = req.body;
    //const workerId = req.worker.id;
    const workerId = null;
    const branch = await BranchRepository.findById(branch_id);
    if (!branch) {
      logger.error(
        `TripController->index_branch_date: Sucursal no encontrada con ID ${branch_id}`
      );
      return res.status(400).json({ msg: "BranchNotFound" });
    }

    try {
      const trips = await TripRepository.findDate(branch_id, workerId, date, null);

      if (!trips.length) {
        return res.status(204).json({ msg: "TripsNotFound" });
      }

      const mappedTrips = await Promise.all(
        trips.map(async (trip) => {
          const tripStops = mapTripStops(trip.tripStops);

          return {
            id: trip.id,
            branchId: trip.branch_id,
            branch_id: trip.branch_id,
            vehicleId: trip.vehicle_id,
            vehicle_id: trip.vehicle_id,
            routeId: trip.route_id,
            route_id: trip.route_id,
            date: trip.date,
            schedule: trip.schedule,
            arrival: trip.arrival,
            start: trip.start,
            end: trip.end,
            price: trip.price,
            seats: trip.vehicle.seats,
            branchName: trip.branch.name, // Incluir los datos de la sucursal asociada
            vehicleName: trip.vehicle.plate, // Incluir los datos del vehículo asociado
            internal_number: trip.vehicle.internal_number,
            internalNumber: trip.vehicle.internal_number,
            vehicleImage: trip.vehicle.image, // Incluir los datos del vehículo asociado
            name: trip.route.name, // Incluir los datos de la ruta asociada
            origin: trip.route.origin.address,
            originImage: trip.route.origin.image,
            destination: trip.route.destination.address,
            destinationImage: trip.route.destination.image,
            workers: await TripWorkerRepository.workersTrip(trip),
            passengers: await TicketRepository.getpassengers(trip.id),
            tripStops: tripStops,
            tripFares: mapTripFares(trip.tripFares),
          };
        })
      );

       // Ordenar usando el método del controlador
      const sortedTrips = await TripController.sortTripsBySchedule(mappedTrips);

      res.status(200).json({ trips: sortedTrips });
    } catch (error) {
      logger.error("TripController->index: " + error.message);
      res.status(500).json({ error: "ServerError", details: error.message });
    }
  },

  async sortTripsBySchedule(trips) {
    // 1. Obtener fecha y hora actual en Chile
    const now = new Date();
    const chileanDate = now.toLocaleDateString('es-CL', {
        timeZone: 'America/Santiago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).split('-').reverse().join('-'); // Formato: YYYY-MM-DD

    const chileanTime = now.toLocaleTimeString('es-CL', {
        timeZone: 'America/Santiago',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).replace('.', ''); // Formato: HH:MM

    // 2. Función para crear timestamp comparable (fecha + hora)
    const createTripTimestamp = (trip) => {
        return `${trip.date}T${trip.schedule}:00`;
    };

    // 3. Función de comparación
    const compareTrips = (a, b) => {
        // a) Primero verificar viajes en curso (hoy, horario pasado pero no terminado)
        const isTodayA = a.date === chileanDate;
        const isTodayB = b.date === chileanDate;
        
        const isAInProgress = isTodayA && 
                            a.schedule < chileanTime && 
                            (!a.end || new Date(createTripTimestamp(a)) > now);
        const isBInProgress = isTodayB && 
                            b.schedule < chileanTime && 
                            (!b.end || new Date(createTripTimestamp(b)) > now);

        if (isAInProgress && !isBInProgress) return -1;
        if (!isAInProgress && isBInProgress) return 1;
        if (isAInProgress && isBInProgress) {
            return new Date(createTripTimestamp(a)) - new Date(createTripTimestamp(b));
        }

        // b) Comparación por fecha + hora combinadas
       const timestampA = createTripTimestamp(a);
        const timestampB = createTripTimestamp(b);

        const dateA = new Date(timestampA);
        const dateB = new Date(timestampB);

        // Si ambos son futuros o pasados, ordenar por proximidad al presente
        if (dateA < now && dateB < now) {
          // Ambos pasados: mostrar el más reciente primero (menor diferencia)
          return dateB - dateA; // DESCENDENTE para pasados (más reciente arriba)
        } else if (dateA >= now && dateB >= now) {
          // Ambos futuros: mostrar el más cercano primero (ASCENDENTE)
          return dateA - dateB;
        } else {
          // Uno pasado, uno futuro: mostrar primero el futuro
          return dateA >= now ? -1 : 1;
        }
    };

    // 4. Ordenar y devolver
    return [...trips].sort(compareTrips);
  },

  async syncTripStops(trip, branch, routeId, tripStops, transaction = null) {
    if (!Array.isArray(tripStops)) {
      throw new Error("TripStopsMustBeArray");
    }

    const incomingRouteStopIds = tripStops.map((item) =>
      Number(item.route_stop_id)
    );
    const duplicateRouteStopIds = incomingRouteStopIds.filter(
      (routeStopId, index) => incomingRouteStopIds.indexOf(routeStopId) !== index
    );

    if (duplicateRouteStopIds.length > 0) {
      throw new Error("DuplicateTripStopRouteStop");
    }

    const existingTripStops = await TripStopRepository.findByTrip(trip.id);
    const existingById = new Map(
      existingTripStops.map((tripStop) => [Number(tripStop.id), tripStop])
    );
    const incomingKeptIds = new Set(
      tripStops
        .map((item) => Number(item.id))
        .filter((id) => Number.isFinite(id) && id > 0)
    );
    const survivingExistingTripStops = existingTripStops.filter((tripStop) =>
      incomingKeptIds.has(Number(tripStop.id))
    );
    const existingByRouteStopId = new Map(
      survivingExistingTripStops.map((tripStop) => [
        Number(tripStop.route_stop_id),
        tripStop,
      ])
    );
    const transactionOptions = transaction ? { transaction } : {};
    const tripStopsToRemove = existingTripStops.filter(
      (tripStop) => !incomingKeptIds.has(Number(tripStop.id))
    );

    for (const tripStop of tripStopsToRemove) {
      await TripStopRepository.delete(tripStop, transactionOptions);
    }

    for (const item of tripStops) {
      const incomingId = item.id != null ? Number(item.id) : null;
      const existingTripStop = incomingId
        ? existingById.get(incomingId)
        : null;

      if (incomingId && !existingTripStop) {
        throw new Error(`TripStopNotFound:${item.id}`);
      }

      if (!incomingId && existingByRouteStopId.has(Number(item.route_stop_id))) {
        throw new Error("TripStopIdRequiredForUpdate");
      }

      const routeStopId = Number(
        item.route_stop_id ?? existingTripStop?.route_stop_id
      );
      const routeStop = await RouteStopRepository.findById(routeStopId);

      if (!routeStop) {
        throw new Error(`RouteStopNotFound:${routeStopId}`);
      }

      if (Number(routeStop.company_id) !== Number(branch.company_id)) {
        throw new Error("RouteStopCompanyMismatch");
      }

      if (Number(routeStop.route_id) !== Number(routeId)) {
        throw new Error("RouteStopRouteMismatch");
      }

      const payload = buildTripStopPayload(
        trip,
        branch.company_id,
        item,
        routeStop
      );

      if (existingTripStop) {
        await TripStopRepository.update(
          existingTripStop,
          payload,
          transactionOptions
        );
      } else {
        await TripStopRepository.create(payload, transactionOptions);
      }
    }

    return await TripStopRepository.findByTrip(trip.id);
  },

  async syncTripFares(trip, branch, routeId, tripFares, transaction = null) {
    if (!Array.isArray(tripFares)) {
      throw new Error("TripFaresMustBeArray");
    }

    const incomingFsttIds = tripFares.map((item) =>
      Number(item.fare_segment_ticket_type_id)
    );
    const duplicateFsttIds = incomingFsttIds.filter(
      (fsttId, index) => incomingFsttIds.indexOf(fsttId) !== index
    );

    if (duplicateFsttIds.length > 0) {
      throw new Error("DuplicateTripFareFareSegmentTicketType");
    }

    const existingTripFares = await TripFareRepository.findByTrip(trip.id);
    const existingById = new Map(
      existingTripFares.map((tripFare) => [Number(tripFare.id), tripFare])
    );
    const incomingKeptIds = new Set(
      tripFares
        .map((item) => Number(item.id))
        .filter((id) => Number.isFinite(id) && id > 0)
    );
    const transactionOptions = transaction ? { transaction } : {};
    const tripFaresToRemove = existingTripFares.filter(
      (tripFare) => !incomingKeptIds.has(Number(tripFare.id))
    );

    for (const tripFare of tripFaresToRemove) {
      await TripFareRepository.delete(tripFare, transactionOptions);
    }

    for (const item of tripFares) {
      const incomingId = item.id != null ? Number(item.id) : null;
      const existingTripFare = incomingId ? existingById.get(incomingId) : null;

      if (incomingId && !existingTripFare) {
        throw new Error(`TripFareNotFound:${incomingId}`);
      }

      if (incomingId && item.id == null) {
        throw new Error("TripFareIdRequiredForUpdate");
      }

      const fareSegmentTicketTypeId = Number(item.fare_segment_ticket_type_id);
      if (!Number.isFinite(fareSegmentTicketTypeId) || fareSegmentTicketTypeId <= 0) {
        throw new Error("FareSegmentTicketTypeRequired");
      }

      const fareSegmentTicketType = await FareSegmentTicketTypeRepository.findById(
        fareSegmentTicketTypeId
      );

      if (!fareSegmentTicketType) {
        throw new Error("FareSegmentTicketTypeNotFound");
      }

      const fareSegment = fareSegmentTicketType.fareSegment;
      if (
        !fareSegment ||
        Number(fareSegment.company_id) !== Number(branch.company_id)
      ) {
        throw new Error("FareSegmentTicketTypeCompanyMismatch");
      }

      if (Number(fareSegment.route_id) !== Number(routeId)) {
        throw new Error("FareSegmentTicketTypeRouteMismatch");
      }

      const payload = buildTripFarePayload(
        trip,
        branch.company_id,
        item,
        fareSegmentTicketType
      );

      if (existingTripFare) {
        await TripFareRepository.update(
          existingTripFare,
          payload,
          transactionOptions
        );
      } else {
        await TripFareRepository.create(payload, transactionOptions);
      }
    }

    return await TripFareRepository.findByTrip(trip.id);
  },

  async getTripDate(req, res) {
    logger.info( `${req.user.name} - Entra a buscar los viajes de una fecha dada`);
     logger.info("datos recibidos");
    logger.info(JSON.stringify(req.body));
    const { ticket_id, branch_id, date } = req.body;
    //const workerId = req.worker.id;
    const workerId = null;
    const branch = await BranchRepository.findById(branch_id);
    if (!branch) {
      logger.error(
        `TripController->getTripDate: Sucursal no encontrada con ID ${branch_id}`
      );
      return res.status(400).json({ msg: "BranchNotFound" });
    }

    if (ticket_id) {
      const ticket = await TicketRepository.findById(ticket_id);
      if (!ticket) {
        logger.error(
          `TripController->getTripDate: Ticket no encontrado con ID ${ticket_id}`
        );
        return res.status(400).json({ msg: "BranchNotFound" });
      }
    }

    try {
      const currentChileDate = getChileDate();
      const locations = (await LocationRepository.findAll())
        .filter((location) => Number(location.active) === 1 || location.active === true)
        .map((location) => ({
          id: location.id,
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address,
          country: location.country,
          city: location.city,
          image: location.image,
          active: location.active,
        }));
      /*const trips = await TripRepository.findDate(branch_id, workerId, date, ticket_id);

      if (!trips.length) {
        return res.status(204).json({ msg: "TripsNotFound" });
      }

      /*const mappedTrips = await Promise.all(
        trips.map(async (trip) => {
          const tripStops = mapTripStops(trip.tripStops);
          const routeStops = mapRouteStops(
            (await RouteStopRepository.findByRoute(trip.route_id)).filter(
              (routeStop) => Number(routeStop.active) === 1 || routeStop.active === true
            )
          );
          const fareSegments = mapFareSegments(
            (await FareSegmentRepository.findByRoute(trip.route_id)).filter(
              (fareSegment) => isFareSegmentActiveForDate(fareSegment, currentChileDate)
            )
          );
          const tripFares = mapTripFares(trip.tripFares);

          const reservedSeats = trip.tickets
          ? trip.tickets.flatMap((ticket) => {
              return Array.isArray(ticket.seats)
                ? ticket.seats
                : JSON.parse(ticket.seats);
            })
          : [];
          const seatMap = trip.vehicle?.structure?.seatMap
            ? Array.isArray(trip.vehicle.structure.seatMap)
              ? trip.vehicle.structure.seatMap // Si ya es un array, lo usas directamente
              : JSON.parse(trip.vehicle.structure.seatMap) // Si es un string, lo parseas a array
            : []; // Si no existe structure.seatMap, devuelves un array vacío

            // Calcular abordando y pendiente considerando quantity
        const totalPasajeros = trip.tickets 
            ? trip.tickets.reduce((sum, ticket) => sum + (ticket.quantity || 1), 0)
            : 0;
            
        const boarding = trip.tickets 
            ? trip.tickets.reduce((sum, ticket) => 
                sum + ((ticket.qr_status !== null && ticket.qr_status !== 0) ? (ticket.quantity || 1) : 0), 0)
            : 0;
            
        const pending = totalPasajeros - boarding;

          return {
            id: trip.id,
            trip_id: trip.id,
            date: trip.date,
            schedule: trip.schedule,
            arrival: trip.arrival,
            start: trip.start,
            end: trip.end,
            seats: trip.vehicle.seats,
            plate: trip.vehicle.plate,
            internal_number: trip.vehicle.internal_number,
            internalNumber: trip.vehicle.internal_number,
            imageVehicle: trip.vehicle.image,
            name: trip.route.name, // Incluir los datos de la ruta asociada
            origin: trip.route.origin.address,
            price: trip.price,
            originImage: trip.route.origin.image,
            destination: trip.route.destination.address,
            destinationImage: trip.route.destination.image,
            reservedSeats,
            seatMap: seatMap,
            boarding,       // Number of passengers who have boarded (sum of quantities)
            pending,       // Number of passengers pending to board
            tripStops: tripStops,
            routeStops: routeStops,
            fareSegments: fareSegments,
            tripFares: tripFares,
          };
        })
      );*/

      //const sortedTrips = await TripController.sortTripsBySchedule(mappedTrips);

      //const notDepartedTrips = sortedTrips.filter(trip => trip.start === null);
      const promotions = (await PromotionRepository.findByActiveStatus(true)).map((promotion) => ({
        ...promotion.toJSON(),
        discountType: promotion.discount_type,
      }));
      const tickettypes  = (await TicketTypeRepository.findByActiveStatus(1)).map((ticketType) => ({
        ...ticketType.toJSON(),
        adjustmentType: ticketType.adjustment_type,
        valueType: ticketType.value_type,
        adjustmentValue: ticketType.adjustment_value,
      }));

      res.status(200).json({
        // trips: notDepartedTrips,
        //allTrips: sortedTrips,
        promotions: promotions,
        tickettypes: tickettypes,
        locations,
      });
    } catch (error) {
      logger.error("TripController->getTripDate: " + error.message);
      res.status(500).json({ error: "ServerError", details: error.message });
    }
  },

  async getTripDateBySegment(req, res) {
    logger.info(`${req.user.name} - Entra a buscar los viajes por tramo de una fecha dada`);
    logger.info("TripController->getTripDateBySegment: datos recibidos");
    logger.info(JSON.stringify(req.body));

    const {
      branch_id,
      origin_id,
      destination_id,
      origin_route_stop_id,
      destination_route_stop_id,
      date,
    } = req.body;
    const normalizedOriginId = origin_id ?? origin_route_stop_id;
    const normalizedDestinationId = destination_id ?? destination_route_stop_id;
    logger.info(
      `TripController->getTripDateBySegment: branch_id=${branch_id} origin_id=${normalizedOriginId} destination_id=${normalizedDestinationId} date=${date || "current-chile-date"}`
    );

    const workerId = null;
    const branch = await BranchRepository.findById(branch_id);
    if (!branch) {
      logger.error(
        `TripController->getTripDateBySegment: Sucursal no encontrada con ID ${branch_id}`
      );
      return res.status(400).json({ msg: "BranchNotFound" });
    }

    try {
      const currentChileDate = getChileDate();
      const searchDate = date || currentChileDate;
      logger.info(
        `TripController->getTripDateBySegment: currentChileDate=${currentChileDate} searchDate=${searchDate}`
      );
      const trips = await TripRepository.findDate(branch_id, workerId, searchDate, null);
      logger.info(
        `TripController->getTripDateBySegment: viajes encontrados para sucursal=${branch_id} fecha=${searchDate} => ${trips.length}`
      );

      if (!trips.length) {
        return res.status(204).json({ msg: "TripsNotFound" });
      }

      const mappedTrips = await Promise.all(
        trips
          .map((trip) => ({
            trip,
            matchingTripFares: getExactTripFareForSegment(
              trip,
              normalizedOriginId,
              normalizedDestinationId,
              currentChileDate
            ),
          }))
          .map((entry) => {
            logger.info(
              `TripController->getTripDateBySegment: trip=${entry.trip?.id} matchingTripFares=${entry.matchingTripFares.length}`
            );
            return entry;
          })
          .filter(({ matchingTripFares }) => matchingTripFares.length > 0)
          .map(async (trip) => {
            const tripStops = mapTripStops(trip.trip.tripStops);
            const tripFares = mapTripFares(trip.matchingTripFares);
            const reservedSeats = trip.trip.tickets
              ? trip.trip.tickets.flatMap((ticket) => {
                  return Array.isArray(ticket.seats)
                    ? ticket.seats
                    : JSON.parse(ticket.seats);
                })
              : [];
            const seatMap = trip.trip.vehicle?.structure?.seatMap
              ? Array.isArray(trip.trip.vehicle.structure.seatMap)
                ? trip.trip.vehicle.structure.seatMap
                : JSON.parse(trip.trip.vehicle.structure.seatMap)
              : [];

            const totalPasajeros = trip.trip.tickets
              ? trip.trip.tickets.reduce((sum, ticket) => sum + (ticket.quantity || 1), 0)
              : 0;

            const boarding = trip.trip.tickets
              ? trip.trip.tickets.reduce(
                  (sum, ticket) =>
                    sum + ((ticket.qr_status !== null && ticket.qr_status !== 0) ? (ticket.quantity || 1) : 0),
                  0
                )
              : 0;

            const pending = totalPasajeros - boarding;

            return {
              id: trip.trip.id,
              trip_id: trip.trip.id,
              date: trip.trip.date,
              schedule: trip.trip.schedule,
              arrival: trip.trip.arrival,
              start: trip.trip.start,
              end: trip.trip.end,
              seats: trip.trip.vehicle.seats,
              plate: trip.trip.vehicle.plate,
              internal_number: trip.trip.vehicle.internal_number,
              imageVehicle: trip.trip.vehicle.image,
              name: trip.trip.route.name,
              origin: trip.trip.route.origin.address,
              price: trip.trip.price,
              originImage: trip.trip.route.origin.image,
              destination: trip.trip.route.destination.address,
              destinationImage: trip.trip.route.destination.image,
              reservedSeats,
              seatMap,
              boarding,
              pending,
              tripStops,
              tripFares,
            };
          })
      );

      if (!mappedTrips.length) {
        return res.status(204).json({ msg: "TripsNotFound" });
      }

      const sortedTrips = await TripController.sortTripsBySchedule(mappedTrips);
      const notDepartedTrips = sortedTrips.filter((trip) => trip.start === null);

      return res.status(200).json({
        trips: notDepartedTrips,
      });
    } catch (error) {
      logger.error("TripController->getTripDateBySegment: " + error.message);
      return res.status(500).json({ error: "ServerError", details: error.message });
    }
  },

  async getTripVehicle(req, res) {
    logger.info(`${req.user.name} - Entra a buscar los vehículos activos de una sucursal`);
    logger.info("Datos recibidos al buscar los vehículos activos de una sucursal");
    logger.info(JSON.stringify(req.body));

    try {
      const { branch_id } = req.body;
      const branch = await BranchRepository.findById(branch_id);

      if (!branch) {
        logger.error(`TripController->getTripVehicle: Sucursal no encontrada con ID ${branch_id}`);
        return res.status(400).json({ msg: "BranchNotFound" });
      }

      const branchVehicles = await BranchVehicleRepository.findByBranch(branch_id);
      const activeBranchVehicles = branchVehicles.filter(
        (branchVehicle) => Number(branchVehicle.vehicle?.state) === 1
      );

      if (!activeBranchVehicles.length) {
        return res.status(204).json({ msg: "TripsNotFound" });
      }

      const mappedTrips = activeBranchVehicles.map((branchVehicle) => {
        const vehicle = branchVehicle.vehicle;
        return {
          id: vehicle.id,
          vehicleName: vehicle.plate,
          internal_number: vehicle.internal_number,
          vehicleImage: vehicle.image,
          seats: vehicle.seats,
        };
      });

      res.status(200).json({ vehicles: mappedTrips });
    } catch (error) {
      logger.error("TripController->getTripVehicle: " + error.message);
      res.status(500).json({ error: "ServerError", details: error.message });
    }
  },

  async getTripWorkerDate(req, res) {
    logger.info(
      `${req.user.name} - Entra a buscar los viajes de una fecha dada relacionados a un trabajador`
    );

    const { ticket_id, branch_id, date } = req.body;
    const workerId = req.worker.id;
    const branch = await BranchRepository.findById(branch_id);
    if (!branch) {
      logger.error(
        `TripController->getTripDate: Sucursal no encontrada con ID ${branch_id}`
      );
      return res.status(400).json({ msg: "BranchNotFound" });
    }

    if (ticket_id) {
      const ticket = await TicketRepository.findById(ticket_id);
      if (!ticket) {
        logger.error(
          `TripController->getTripDate: Ticket no encontrado con ID ${ticket_id}`
        );
        return res.status(400).json({ msg: "BranchNotFound" });
      }
    }

    try {
      const trips = await TripRepository.findDate(branch_id, workerId, date, ticket_id);

      if (!trips.length) {
        return res.status(204).json({ msg: "TripsNotFound" });
      }

      const mappedTrips = await Promise.all(
        trips.map(async (trip) => {
          /*const reservedSeats = trip.tickets
            ? trip.tickets
                .filter((ticket) => !ticket_id || ticket.id !== ticket_id) // Si ticketId está presente, excluye el ticket con ese id
                .flatMap((ticket) => {
                  // Asegúrate de parsear correctamente los asientos
                  return Array.isArray(ticket.seats)
                    ? ticket.seats // Si ya es un array, lo usas directamente
                    : JSON.parse(ticket.seats); // Si es un string JSON, lo parseas
                })
            : [];
          const seatMap = trip.vehicle?.structure?.seatMap
            ? Array.isArray(trip.vehicle.structure.seatMap)
              ? trip.vehicle.structure.seatMap // Si ya es un array, lo usas directamente
              : JSON.parse(trip.vehicle.structure.seatMap) // Si es un string, lo parseas a array
            : []; // Si no existe structure.seatMap, devuelves un array vacío*/

            const totalPasajeros = trip.tickets 
            ? trip.tickets.reduce((sum, ticket) => sum + (ticket.quantity || 1), 0)
            : 0;
            
        const boarding = trip.tickets 
            ? trip.tickets.reduce((sum, ticket) => 
                sum + ((ticket.qr_status !== null && ticket.qr_status !== 0) ? (ticket.quantity || 1) : 0), 0)
            : 0;
            
        const pending = totalPasajeros - boarding;
          return {
            id: trip.id,
            trip_id: trip.id,
            date: trip.date,
            schedule: trip.schedule,
            arrival: trip.arrival,
            start: trip.start,
            end: trip.end,
            seats: trip.vehicle.seats,
            plate: trip.vehicle.plate,
            internal_number: trip.vehicle.internal_number,
            internalNumber: trip.vehicle.internal_number,
            imageVehicle: trip.vehicle.image,
            name: trip.route.name, // Incluir los datos de la ruta asociada
            origin: trip.route.origin.address,
            price: trip.price,
            originImage: trip.route.origin.image,
            destination: trip.route.destination.address,
            destinationImage: trip.route.destination.image,
            //reservedSeats,
            //seatMap: seatMap,
            boarding,       // Number of passengers who have boarded (sum of quantities)
            pending       // Number of passengers pending to board
          };
        })
      );

       const sortedTrips = await TripController.sortTripsBySchedule(mappedTrips);

      //const promotions = await PromotionRepository.findByActiveStatus(true);

      res.status(200).json({ trips: sortedTrips/*, promotions: promotions*/ });
    } catch (error) {
      logger.error("TripController->getTripDate: " + error.message);
      res.status(500).json({ error: "ServerError", details: error.message });
    }
  },
  // Crear un nuevo viaje
  async store(req, res) {
    logger.info(`${req.user.name} - Crea un nuevo viaje`);
    logger.info("datos recibidos al crear un viaje");
    logger.info(JSON.stringify(req.body));

    const {
      date,
      schedule,
      arrival,
      start,
      end,
      branch_id,
      vehicle_id,
      route_id,
      workers = [],
      price,
      tripStops = [],
      tripFares = [],
    } = req.body;

    try {
      // Verificar si ya existe un viaje en la misma sucursal con la misma fecha
      let trip = {}; // Este objeto es solo un placeholder para la comprobación de duplicados

      // Llamar a la función para verificar si ya existe un viaje con esos campos
      const existingTrip = await TripRepository.existsByUpdatedFields(trip, {
        date,
        schedule,
        branch_id,
        vehicle_id,
        route_id,
      });

      if (existingTrip) {
        logger.error("Ya existe un viaje en esa sucursal en la misma fecha");
        return res.status(400).json({
          error: "DuplicateTrip",
          msg: "Ya existe un viaje en esta sucursal para la misma fecha.",
        });
      }

      // Verificar si el vehículo y la ruta existen
      const vehicle = await VehicleRepository.findById(vehicle_id);
      if (!vehicle) {
        logger.error(
          `TripController->store: Vehículo no encontrado con ID ${vehicle_id}`
        );
        return res.status(400).json({ msg: "VehicleNotFound" });
      }
      const route = await RouteRepository.findById(route_id);
      if (!route) {
        logger.error(
          `TripController->store: Ruta no encontrada con ID ${route_id}`
        );
        return res.status(400).json({ msg: "RouteNotFound" });
      }
      const branch = await BranchRepository.findById(branch_id);
      if (!branch) {
        logger.error(
          `TripController->update: Sucursal no encontrada con ID ${branch_id}`
        );
        return res.status(400).json({ msg: "BranchNotFound" });
      }
      if (Array.isArray(workers) && workers.length > 0) {
        const workerIds = workers.map((worker) => parseInt(worker.worker_id));

        const [foundWorkers] = await Promise.all([
          Worker.findAll({ where: { id: workerIds } }),
        ]);

        const missingWorkers = workerIds.filter(
          (workerId) => !foundWorkers.find((worker) => worker.id === workerId)
        );

        if (missingWorkers.length) {
          logger.error(`No se encontraron trabajdores, los siguientes IDs: 
                            Workers: ${missingWorkers}`);
          return res
            .status(400)
            .json({ msg: "Datos no encontrados para algunas asociaciones." });
        }
      }

      trip = await sequelize.transaction(async (transaction) => {
        const createdTrip = await TripRepository.create(req.body, { transaction });

        if (hasOwn(req.body, "tripStops")) {
          await TripController.syncTripStops(
            createdTrip,
            branch,
            route_id,
            tripStops,
            transaction
          );
        }

        if (hasOwn(req.body, "tripFares")) {
          await TripController.syncTripFares(
            createdTrip,
            branch,
            route_id,
            tripFares,
            transaction
          );
        }

        return createdTrip;
      });

      if (Array.isArray(workers) && workers.length > 0) {
        // Crear las asociaciones en paralelo
        for (const worker of workers) {
          const { worker_id } = worker;

          const workersTripAssociation = await TripWorker.create({
            trip_id: trip.id,
            worker_id,
            branch_id,
            date,
          });
        }
      }

      const refreshedTripStops = hasOwn(req.body, "tripStops")
        ? await TripStopRepository.findByTrip(trip.id)
        : [];
      const refreshedTripFares = hasOwn(req.body, "tripFares")
        ? await TripFareRepository.findByTrip(trip.id)
        : [];

      res.status(201).json({
        trip: toPlainObject(trip),
        tripStops: refreshedTripStops.map(toPlainObject),
        tripFares: refreshedTripFares.map(toPlainObject),
      });
    } catch (error) {
      const tripStopSyncMessage = getTripStopSyncErrorMessage(error);
      if (tripStopSyncMessage) {
        return res.status(400).json({
          error: "TripStopValidationError",
          details: tripStopSyncMessage,
        });
      }

      const tripFareSyncMessage = getTripFareSyncErrorMessage(error);
      if (tripFareSyncMessage) {
        return res.status(400).json({
          error: "TripFareValidationError",
          details: tripFareSyncMessage,
        });
      }

      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";

      logger.error("TripController->store:" + errorMsg);
      return res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },

  // Obtener un viaje por ID
  async show(req, res) {
    logger.info(`${req.user.name} - Busca un viaje con ID ${req.body.id}`);

    try {
      const trip = await TripRepository.findById(req.body.id);

      if (!trip) {
        return res.status(404).json({ msg: "TripNotFound" });
      }

      const mappedTrip = {
        id: trip.id,
        branchId: trip.branch_id,
        branch_id: trip.branch_id,
        vehicleId: trip.vehicle_id,
        vehicle_id: trip.vehicle_id,
        routeId: trip.route_id,
        route_id: trip.route_id,
        date: trip.date,
        schedule: trip.schedule,
        arrival: trip.arrival,
        start: trip.start,
        end: trip.end,
        price: trip.price,
        branchName: trip.branch.name, // Incluir los datos de la sucursal asociada
        vehicleName: trip.vehicle.plate, // Incluir los datos del vehículo asociado
        internal_number: trip.vehicle.internal_number,
        internalNumber: trip.vehicle.internal_number,
        vehicleImage: trip.vehicle.image, // Incluir los datos del vehículo asociado
        routeName: trip.route.name, // Incluir los datos de la ruta asociada
        origin: trip.route.origin.address,
        originImage: trip.route.origin.image,
        destination: trip.route.destination.address,
        destinationImage: trip.route.destination.image,
      };

      const tripStops = await TripStopRepository.findByTrip(trip.id);
      const tripFares = await TripFareRepository.findByTrip(trip.id);

      res.status(200).json({
        trip: mappedTrip,
        tripStops: tripStops.map(toPlainObject),
        tripFares: tripFares.map(toPlainObject),
      });
    } catch (error) {
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";

      logger.error("TripController->show:" + errorMsg);
      return res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },

  async createDateTime(datePart, timePart) {
    // Si timePart ya incluye fecha completa (YYYY-MM-DD HH:MM:SS)
    if (
      typeof timePart === "string" &&
      timePart.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    ) {
      const [dateStr, timeStr] = timePart.split(" ");
      return new Date(`${dateStr}T${timeStr}`);
    }

    // Si timePart es solo hora (HH:MM)
    if (typeof timePart === "string" && timePart.match(/^\d{2}:\d{2}$/)) {
      return new Date(`${datePart}T${timePart}:00`);
    }

    // Si es un timestamp o formato ISO
    if (typeof timePart === "string" && !isNaN(new Date(timePart))) {
      return new Date(timePart);
    }

    throw new Error(`Formato de fecha no reconocido: ${timePart}`);
  },

  async compareDates(date1, date2) {
    // Convertir a objetos Date si son strings
    const d1 = typeof date1 === "string" ? new Date(date1) : date1;
    const d2 = typeof date2 === "string" ? new Date(date2) : date2;

    if (isNaN(d1.getTime())) throw new Error(`Fecha inválida: ${date1}`);
    if (isNaN(d2.getTime())) throw new Error(`Fecha inválida: ${date2}`);

    const diffMs = d2 - d1; // Diferencia en milisegundos
    const diffMinutes = Math.round(diffMs / (1000 * 60));

    // Formato legible para humanos (ej: "2 horas 15 minutos")
    const hours = Math.floor(Math.abs(diffMinutes) / 60);
    const minutes = Math.abs(diffMinutes) % 60;
    let humanReadable = "";

    if (diffMinutes < 0) {
      humanReadable = `${hours}h ${minutes}m antes`;
    } else if (diffMinutes > 0) {
      humanReadable = `${hours}h ${minutes}m después`;
    } else {
      humanReadable = "a tiempo";
    }

    return {
      difference: diffMinutes, // -15 (antes), 0 (a tiempo), 30 (después)
      humanReadable,
      isDelayed: diffMinutes > 0,
    };
  },

  async formatToMySQLDateTime(date) {
    try {
      if (!date) return null;

      // Si ya está en el formato correcto
      if (
        typeof date === "string" &&
        date.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
      ) {
        return date;
      }

      const timeZone = process.env.TZ || "America/Santiago";
      const dateObj = new Date(date);

      if (isNaN(dateObj.getTime())) {
        throw new Error("Fecha inválida");
      }

      // Formatear componentes individualmente
      const year = dateObj.toLocaleString("es-CL", {
        timeZone,
        year: "numeric",
      });
      const month = dateObj.toLocaleString("es-CL", {
        timeZone,
        month: "2-digit",
      });
      const day = dateObj.toLocaleString("es-CL", { timeZone, day: "2-digit" });
      const time = dateObj.toLocaleString("es-CL", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });

      // Ensamblar el formato deseado: YYYY-MM-DD HH:MM:SS
      return `${year}-${month}-${day} ${time}`;
    } catch (error) {
      logger.error("Error al formatear fecha:", error);
      return null;
    }
  },

  async update(req, res) {
    logger.info(`${req.user.name} - Actualiza el viaje con ID ${req.body.id}`);
    logger.info("datos recibidos al editar un viaje");
    logger.info(JSON.stringify(req.body));

    let {
      id,
      date,
      schedule,
      arrival,
      start,
      end,
      branch_id,
      vehicle_id,
      route_id,
      price,
      workers = [],
      tripStops = [],
      tripFares = [],
    } = req.body;

    try {
      const trip = await TripRepository.findById(id);
      if (!trip) {
        return res.status(404).json({ msg: "TripNotFound" });
      }

      // Verificar si ya existe un viaje en la misma sucursal con la misma fecha (excluyendo el viaje actual)
      // Pasamos el viaje y los nuevos datos al repositorio para que haga la comprobación
      const existingTrip = await TripRepository.existsByUpdatedFields(trip, {
        date,
        schedule,
        branch_id,
        vehicle_id,
        route_id,
      });

      if (existingTrip) {
        logger.error("Ya existe un viaje en esa sucursal en la misma fecha");
        return res.status(400).json({
          error: "DuplicateTrip",
          msg: "Ya existe un viaje en esta sucursal para la misma fecha.",
        });
      }

      // Verificar si el vehículo y la ruta existen
      if (vehicle_id) {
        const vehicle = await VehicleRepository.findById(vehicle_id);
        if (!vehicle) {
          logger.error(
            `TripController->update: Vehículo no encontrado con ID ${vehicle_id}`
          );
          return res.status(400).json({ msg: "VehicleNotFound" });
        }
      }

      if (route_id) {
        const route = await RouteRepository.findById(route_id);
        if (!route) {
          logger.error(
            `TripController->update: Ruta no encontrada con ID ${route_id}`
          );
          return res.status(400).json({ msg: "RouteNotFound" });
        }
      }

      let currentBranch = null;
      if (branch_id) {
        currentBranch = await BranchRepository.findById(branch_id);
        if (!currentBranch) {
          logger.error(
            `TripController->update: Sucursal no encontrada con ID ${branch_id}`
          );
          return res.status(400).json({ msg: "BranchNotFound" });
        }
      } else if (hasOwn(req.body, "tripStops")) {
        currentBranch = await BranchRepository.findById(trip.branch_id);
      }

      if (Array.isArray(workers) && workers.length > 0) {
        const workerIds = workers.map((worker) => parseInt(worker.worker_id));

        const [foundWorkers] = await Promise.all([
          Worker.findAll({ where: { id: workerIds } }),
        ]);

        const missingWorkers = workerIds.filter(
          (workerId) => !foundWorkers.find((worker) => worker.id === workerId)
        );

        if (missingWorkers.length) {
          logger.error(`No se encontraron trabajdores, los siguientes IDs: 
                            Workers: ${missingWorkers}`);
          return res
            .status(400)
            .json({ msg: "Datos no encontrados para algunas asociaciones." });
        }
      }
      if (start) {
        const today = new Date().toISOString().split("T")[0]; // Fecha actual en YYYY-MM-DD
        const actualStart = await TripController.createDateTime(today, start);
        const scheduledStart = await TripController.createDateTime(
          trip.date,
          trip.schedule
        );
        // Comparar fechas
        const { difference, humanReadable, isDelayed } =
          await TripController.compareDates(scheduledStart, actualStart);
        if (isDelayed) {
          logger.info(`Start es mayor que Schedule por ${humanReadable}.`);
          const incidentBody = {
            branch_id: trip.branch_id, // ID de la sucursal
            user_id: req.user.id, // ID del usuario que realiza la acción
            title: "Retraso en la salida del viaje",
            description: `Realizó la salida del viaje ${trip.id} con un retraso de (${humanReadable}).`,
            details: {
              actualStart: await TripController.formatToMySQLDateTime(
                actualStart
              ),
              scheduledStart: await TripController.formatToMySQLDateTime(
                scheduledStart
              ),
              difference: humanReadable,
            },
            date: await TripController.formatToMySQLDateTime(new Date()), // Fecha actual
          };
          logger.info(`actualStart ${actualStart}`);
          const formattedStart = await TripController.formatToMySQLDateTime(
            actualStart
          ); // Cortar los milisegundos

          // 4. Asignar al cuerpo de la petición
          req.body.start = formattedStart; // "2025-04-14 15:00:00"
          await IncidentRepository.create(incidentBody);
        }
      }
      if (end) {
        const today = new Date().toISOString().split("T")[0];
        const actualEnd = await TripController.createDateTime(today, end);
        const scheduledArrival = trip.arrival; // Asumiendo que trip.arrival es 'YYYY-MM-DD HH:mm:ss'

        const { difference, humanReadable, isDelayed } =
          await TripController.compareDates(scheduledArrival, actualEnd);

        if (isDelayed) {
          logger.info(`End es mayor que Arrival por ${humanReadable}.`);
          const incidentBody = {
            branch_id: trip.branch_id, // ID de la sucursal
            user_id: req.user.id, // ID del usuario que realiza la acción
            title: "Retraso en la llegada del viaje",
            description: `Hizo la llegada del viaje ${trip.id} (${humanReadable}).`,
            details: {
              actualEnd: await TripController.formatToMySQLDateTime(actualEnd),
              arrival: trip.arrival,
              difference: humanReadable,
            },
            date: await TripController.formatToMySQLDateTime(new Date()), // Fecha actual
          };
          const formattedEnd = await TripController.formatToMySQLDateTime(actualEnd); // Cortar los milisegundos

          // 4. Asignar al cuerpo de la petición
          req.body.end = formattedEnd; // "2025-04-14 15:00:00"
          await IncidentRepository.create(incidentBody);
        }
      }
      const updatedTrip = await sequelize.transaction(async (transaction) => {
        const tripUpdated = await TripRepository.update(trip, req.body, {
          transaction,
        });

        if (hasOwn(req.body, "tripStops")) {
          const tripRouteId = route_id ?? trip.route_id;
          const tripBranch =
            currentBranch || (await BranchRepository.findById(trip.branch_id));

          await TripController.syncTripStops(
            tripUpdated,
            tripBranch,
            tripRouteId,
            tripStops,
            transaction
          );
        }

        if (hasOwn(req.body, "tripFares")) {
          const tripRouteId = route_id ?? trip.route_id;
          const tripBranch =
            currentBranch || (await BranchRepository.findById(trip.branch_id));

          await TripController.syncTripFares(
            tripUpdated,
            tripBranch,
            tripRouteId,
            tripFares,
            transaction
          );
        }

        return tripUpdated;
      });

      if (Array.isArray(workers) && workers.length > 0) {
        await TripRepository.updateTripWorkers(trip, req.body);
      }

      const refreshedTripStops = hasOwn(req.body, "tripStops")
        ? await TripStopRepository.findByTrip(updatedTrip.id)
        : [];
      const refreshedTripFares = hasOwn(req.body, "tripFares")
        ? await TripFareRepository.findByTrip(updatedTrip.id)
        : [];

      res.status(200).json({
        trip: toPlainObject(updatedTrip),
        tripStops: refreshedTripStops.map(toPlainObject),
        tripFares: refreshedTripFares.map(toPlainObject),
      });
    } catch (error) {
      const tripStopSyncMessage = getTripStopSyncErrorMessage(error);
      if (tripStopSyncMessage) {
        return res.status(400).json({
          error: "TripStopValidationError",
          details: tripStopSyncMessage,
        });
      }

      const tripFareSyncMessage = getTripFareSyncErrorMessage(error);
      if (tripFareSyncMessage) {
        return res.status(400).json({
          error: "TripFareValidationError",
          details: tripFareSyncMessage,
        });
      }

      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";

      logger.error("TripController->update:" + errorMsg);
      return res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },

  getSoldSeatSummary(trip) {
    const tickets = trip.tickets || [];
    const soldSeatNumbers = [];
    let soldSeatCount = 0;

    tickets.forEach((ticket) => {
      let parsedSeats = [];

      if (Array.isArray(ticket.seats)) {
        parsedSeats = ticket.seats;
      } else if (typeof ticket.seats === "string") {
        try {
          const decodedSeats = JSON.parse(ticket.seats);
          parsedSeats = Array.isArray(decodedSeats) ? decodedSeats : [];
        } catch (error) {
          parsedSeats = [];
        }
      }

      const numericSeats = parsedSeats
        .map((seat) => Number(seat))
        .filter((seat) => Number.isFinite(seat) && seat > 0);

      soldSeatNumbers.push(...numericSeats);

      if (numericSeats.length > 0) {
        soldSeatCount += numericSeats.length;
      } else {
        soldSeatCount += Number(ticket.quantity || 0);
      }
    });

    return {
      soldSeatCount,
      soldSeatNumbers,
    };
  },

  getOccupiedSeatNumbers(trip) {
    const tickets = trip.tickets || [];
    const occupiedSeatNumbers = [];

    tickets.forEach((ticket) => {
      let parsedSeats = [];

      if (Array.isArray(ticket.seats)) {
        parsedSeats = ticket.seats;
      } else if (typeof ticket.seats === "string") {
        try {
          const decodedSeats = JSON.parse(ticket.seats);
          parsedSeats = Array.isArray(decodedSeats) ? decodedSeats : [];
        } catch (error) {
          parsedSeats = [];
        }
      }

      const numericSeats = parsedSeats
        .map((seat) => Number(seat))
        .filter((seat) => Number.isFinite(seat) && seat > 0);

      occupiedSeatNumbers.push(...numericSeats);
    });

    return occupiedSeatNumbers;
  },

  async changeTrip(req, res) {
    logger.info(`${req.user.name} - Cambia el vehiculo de un viaje`);
    logger.info("Datos recibidos al cambiar el vehiculo de un viaje");
    logger.info(JSON.stringify(req.body));

    const { id, vehicle_id } = req.body;

    try {
      const trip = await TripRepository.findByIdWithTickets(id);
      if (!trip) {
        return res.status(404).json({
          msg: "TripNotFound",
          details: "No se encontro el viaje que intentas actualizar.",
        });
      }

      const newVehicle = await VehicleRepository.findById(vehicle_id);
      if (!newVehicle) {
        return res.status(404).json({
          msg: "VehicleNotFound",
          details: "No se encontro el vehiculo al que intentas cambiar el viaje.",
        });
      }

      if (Number(trip.vehicle_id) === Number(newVehicle.id)) {
        return res.status(400).json({
          msg: "SameVehicleTransfer",
          details: "El viaje ya tiene asignado ese mismo vehiculo.",
        });
      }

      if (Number(newVehicle.state) !== 1) {
        return res.status(400).json({
          msg: "VehicleInactive",
          details: "El vehiculo seleccionado no esta activo.",
        });
      }

      const branchVehicles = await BranchVehicleRepository.findByBranch(trip.branch_id);
      const branchVehicle = branchVehicles.find(
        (branchVehicleItem) => Number(branchVehicleItem.vehicle_id) === Number(newVehicle.id)
      );

      if (!branchVehicle) {
        return res.status(400).json({
          msg: "VehicleNotInBranch",
          details: "El vehiculo no pertenece a la sucursal del viaje.",
        });
      }

      const conflictingTrip = await TripRepository.existsByUpdatedFields(trip, {
        vehicle_id: newVehicle.id,
      });

      if (conflictingTrip) {
        return res.status(409).json({
          msg: "DuplicateTripConstraint",
          details: `Ya existe un viaje programado en la misma sucursal, fecha, horario y ruta con el vehículo ${newVehicle.internal_number || newVehicle.plate || newVehicle.id}.`,
        });
      }

      const sourceTickets = trip.tickets || [];
      const { soldSeatCount } = TripController.getSoldSeatSummary(trip);
      const targetVehicleSeats = Number(newVehicle.seats || 0);

      if (soldSeatCount > targetVehicleSeats) {
        return res.status(400).json({
          msg: "VehicleWithoutEnoughSeats",
          details: `No se puede cambiar el vehiculo porque el nuevo bus solo tiene ${targetVehicleSeats} asientos y el viaje ya tiene ${soldSeatCount} asientos vendidos.`,
        });
      }

      const vehicleWorkers = await VehicleWorkerRepository.findByVehicle(newVehicle.id);
      const branchWorkers = await BranchWorkerRepository.findByBranch(trip.branch_id);
      const branchWorkerIds = new Set(
        branchWorkers.map((branchWorker) => Number(branchWorker.worker_id))
      );

      const eligibleWorkers = [
        ...new Set(
          vehicleWorkers
            .filter((vehicleWorker) => branchWorkerIds.has(Number(vehicleWorker.worker_id)))
            .map((vehicleWorker) => Number(vehicleWorker.worker_id))
        ),
      ];

      if (!eligibleWorkers.length) {
        return res.status(400).json({
          msg: "VehicleWithoutBranchWorkers",
          details: "El vehiculo no tiene choferes asociados en la sucursal del viaje.",
        });
      }

      const reassignedSeatsByTicket = [];
      let seatCursor = 0;
      const availableSeatNumbers = Array.from(
        { length: targetVehicleSeats },
        (_, index) => index + 1
      );

      const ticketUpdates = [];

      sourceTickets.forEach((ticket) => {
        let parsedSeats = [];

        if (Array.isArray(ticket.seats)) {
          parsedSeats = ticket.seats;
        } else if (typeof ticket.seats === "string") {
          try {
            const decodedSeats = JSON.parse(ticket.seats);
            parsedSeats = Array.isArray(decodedSeats) ? decodedSeats : [];
          } catch (error) {
            parsedSeats = [];
          }
        }

        const currentSeatCount = parsedSeats.length > 0
          ? parsedSeats.length
          : Number(ticket.quantity || 0);

        const reassignedSeats = availableSeatNumbers.slice(
          seatCursor,
          seatCursor + currentSeatCount
        );

        seatCursor += currentSeatCount;
        reassignedSeatsByTicket.push({
          ticket_id: ticket.id,
          seats: reassignedSeats,
        });

        ticketUpdates.push({
          ticket,
          body: {
            seats: reassignedSeats,
          },
        });
      });

      const updatedTripWorkers = eligibleWorkers.map((worker_id) => ({
        trip_id: trip.id,
        branch_id: trip.branch_id,
        date: trip.date,
        worker_id,
      }));

      await sequelize.transaction(async (transaction) => {
        logger.info(`TripController->changeTrip: eliminando choferes actuales del viaje ${trip.id}`);
        await TripWorker.destroy({
          where: { trip_id: trip.id },
          transaction,
        });

        logger.info(`TripController->changeTrip: actualizando tickets del viaje ${trip.id}`);
        for (const ticketUpdate of ticketUpdates) {
          await ticketUpdate.ticket.update(ticketUpdate.body, { transaction });
        }

        logger.info(`TripController->changeTrip: asignando choferes del vehiculo ${newVehicle.id}`);
        await TripWorker.bulkCreate(updatedTripWorkers, { transaction });

        logger.info(`TripController->changeTrip: actualizando vehiculo del viaje ${trip.id} a ${newVehicle.id}`);
        await trip.update(
          {
            vehicle_id: newVehicle.id,
          },
          { transaction }
        );
      });

      const refreshedTrip = await TripRepository.findByIdWithTickets(trip.id);
      const refreshedWorkers = await TripWorkerRepository.workersTrip(refreshedTrip);

      const oldVehicleLabel = trip.vehicle?.internal_number || trip.vehicle?.plate || trip.vehicle_id;
      const newVehicleLabel = newVehicle.internal_number || newVehicle.plate || newVehicle.id;
      const tripOrigin = refreshedTrip?.route?.origin?.address || "origen";
      const tripDestination = refreshedTrip?.route?.destination?.address || "destino";
      const tripSchedule = refreshedTrip?.schedule || trip.schedule;

      return res.status(200).json({
        msg: "TripVehicleChanged",
        details: `Se cambió correctamente el vehículo ${oldVehicleLabel} por el vehículo ${newVehicleLabel} para el viaje de las ${tripSchedule} de ${tripOrigin} a ${tripDestination}.`,
        trip: {
          ...refreshedTrip.toJSON(),
          workers: refreshedWorkers,
        },
        reassignedSeats: reassignedSeatsByTicket,
      });
    } catch (error) {
      if (
        error.name === "SequelizeUniqueConstraintError" ||
        error.parent?.code === "ER_DUP_ENTRY"
      ) {
        const duplicateMsg = error.errors?.[0]?.message ||
          "Ya existe un viaje con la misma sucursal, vehículo, ruta, fecha y horario.";

        logger.error(`TripController->changeTrip unique constraint: ${duplicateMsg}`);
        logger.error(error.stack || "Sin stack trace");
        return res.status(409).json({
          error: "DuplicateTripConstraint",
          details: duplicateMsg,
        });
      }

      const validationMessages = Array.isArray(error.errors)
        ? error.errors.map((item) => item.message).join(", ")
        : null;
      const parentMessage = error.parent?.message || error.original?.message || null;
      const errorMsg =
        validationMessages ||
        error.details?.map((detail) => detail.message).join(", ") ||
        parentMessage ||
        error.message ||
        "Error desconocido";

      logger.error(`TripController->changeTrip: ${errorMsg}`);
      logger.error(error.stack || "Sin stack trace");
      if (error.errors) {
        logger.error(`TripController->changeTrip validation details: ${JSON.stringify(error.errors)}`);
      }
      if (error.fields) {
        logger.error(`TripController->changeTrip fields: ${JSON.stringify(error.fields)}`);
      }
      if (error.parent) {
        logger.error(`TripController->changeTrip parent: ${error.parent.message || JSON.stringify(error.parent)}`);
      }
      return res.status(500).json({ error: "ServerError", details: 'Error interno del servidor' });
    }
  },

  // Eliminar un viaje
  async destroy(req, res) {
    logger.info(`${req.user.name} - Elimina el viaje con ID ${req.body.id}`);

    try {
      const trip = await TripRepository.findById(req.body.id);

      if (!trip) {
        return res.status(404).json({ msg: "TripNotFound" });
      }

      const deleteTrip = await TripRepository.delete(trip);

      res.status(200).json({ msg: "TripDeleted" });
    } catch (error) {
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";

      logger.error("TripController->destroy:" + errorMsg);
      return res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },

  async getRouteVehicleBranch(req, res) {
    logger.info(`${req.user.name} - Entra a la ruta unificada de viajes`);

    try {
      const routes = await RouteRepository.findAll();
      const branchVehicles = await BranchVehicleRepository.findByBranch(
        req.body.branch_id
      );
      const branchWorkers = await BranchWorkerRepository.findByBranch(
        req.body.branch_id
      );

      // Mapeamos los resultados para obtener solo los IDs y nombres
      const mappedRoutes = routes.map((route) => {
        return {
          id: route.id,
          name: route.name,
          originId: route.origin_id,
          origin_id: route.origin_id,
          destinationId: route.destination_id,
          destination_id: route.destination_id,
          originAddress: route.origin.address,
          originImage: route.origin.image,
          destinationAddress: route.destination.address,
          destinationImage: route.destination.image,
          estimated: route.estimated,
          routeStops: [],
          fareSegments: [],
        };
      });

      for (const mappedRoute of mappedRoutes) {
        const routeStops = await RouteStopRepository.findByRoute(mappedRoute.id);
        mappedRoute.routeStops = routeStops.map((routeStop) => ({
          id: routeStop.id,
          company_id: routeStop.company_id,
          route_id: routeStop.route_id,
          location_id: routeStop.location_id,
          stop_order: routeStop.stop_order,
          distance_km: routeStop.distance_km,
          minutes_from_origin: routeStop.minutes_from_origin,
          allows_boarding: routeStop.allows_boarding,
          allows_alighting: routeStop.allows_alighting,
          active: routeStop.active,
          locationName: routeStop.location?.address,
          locationCity: routeStop.location?.city,
          locationCountry: routeStop.location?.country,
          image: routeStop.location?.image,
        })); 
        const routeFareSegments = await FareSegmentRepository.findByRoute(mappedRoute.id);
        mappedRoute.fareSegments = mapRouteFareSegments(routeFareSegments);
      }
      const mappedBranchVehicles = branchVehicles.map((branchVehicle) => ({
        id: branchVehicle.vehicle_id,
        vehicleName: branchVehicle.vehicle.plate,
        internal_number: branchVehicle.vehicle.internal_number,
        internalNumber: branchVehicle.vehicle.internal_number,
        vehicleImage: branchVehicle.vehicle.image,
        brand: branchVehicle.vehicle.brand,
        seats: branchVehicle.vehicle.seats,
      }));

      // Mapeamos los resultados para obtener solo los IDs y nombres
      const mappedBranchWorkers = branchWorkers.map((branchWorker) => ({
        id: branchWorker.worker_id,
        workerId: branchWorker.worker.id,
        worker_id: branchWorker.worker.id,
        workerName: branchWorker.worker.name,
        workerImage: branchWorker.worker.image,
        roleId: branchWorker.role.id,
        role_id: branchWorker.role.id,
        roleName: branchWorker.role.name,
        vehicles: branchWorker.worker.vehicles,
      }));

      res.json({
        triproutes: mappedRoutes,
        tripvehicles: mappedBranchVehicles,
        tripworkers: mappedBranchWorkers,
      });
    } catch (error) {
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";

      logger.error("TripController->getRouteVehicleBranch:" + errorMsg);
      return res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },

  async getTripsTicketsDate(req, res) {
    logger.info(
      `${req.user.name} - Entra a buscar los datos de los viajes y pasajes de una fecha dada`
    );
    logger.info(
      "Datos recibidos al obtener los viajes y pasajes de una fecha dada"
    );
    logger.info(JSON.stringify(req.body));

    try {
      const { type, id, date, endDate } = req.body;

      // Validar si la sucursal o compañía existe
      if (type === "Sucursal") {
        const branch = await BranchRepository.findById(id);
        if (!branch) {
          logger.error(
            `TtripController->getTripsDate: Sucursal no encontrada con ID ${id}`
          );
          return res.status(404).json({ msg: "BranchNotFound" });
        }
      } else {
        const company = await CompanyRepository.findById(id);
        if (!company) {
          logger.error(
            `TtripController->getTripsDate: Compañía no encontrada con ID ${id}`
          );
          return res.status(404).json({ msg: "CompanyNotFound" });
        }
      }

      // Obtener los trips con sus tickets asociados
      const trips = await TripRepository.getTripsDate(type, id, date, endDate);

      // Inicializar las variables para calcular los totales
      const totalsByMethod = {}; // Objeto para almacenar los totales por método de pago
      let totalGeneral = 0; // Total general en dinero
      let totalPasajesVendidos = 0; // Total general de pasajes vendidos
      let reimpresiones = 0; // Total de reimpresiones

      // Procesar los trips y sus tickets
      const tripsSummary = trips.map((trip) => {
        const origin = trip.route.origin;
        const destination = trip.route.destination;
        const tripName = origin.address + "-" + destination.address;
        const tripOrigin = origin.address;
        const tripDestination = destination.address;
        const tripTickets = trip.tickets || [];

        // Inicializar los totales por método de pago para este trip
        const tripTotalsByMethod = {};
        let tripTotal = 0;
        let tripPasajesVendidos = 0;

        // Procesar los tickets del trip
        tripTickets.forEach((ticket) => {
          const method = ticket.method.toUpperCase(); // Convertir a mayúsculas para consistencia
          const total = parseFloat(ticket.total); // Convertir a número
          const quantity = parseInt(ticket.quantity, 10); // Convertir a número entero

          // Sumar al total general
          totalGeneral += total;
          totalPasajesVendidos += 1; // Contar cada ticket como un pasaje vendido
          reimpresiones += ticket.print - 1;
          // Sumar al total por método de pago
          if (!totalsByMethod[method]) {
            totalsByMethod[method] = {
              total: 0,
              cantidad: 0,
            };
          }
          totalsByMethod[method].total += total;
          totalsByMethod[method].cantidad += 1;

          // Sumar al total del trip
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

        // Formatear la información del trip
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

      // Convertir el objeto totalsByMethod en un array
      const totalsByMethodArray = Object.keys(totalsByMethod).map((method) => ({
        metodo: method,
        total: totalsByMethod[method].total,
        cantidad: totalsByMethod[method].cantidad,
      }));

      // Obtener el nombre de la entidad (Company o Branch)
      const entityName =
        type === "Company"
          ? trips[0]?.branch?.company?.name // Usar el alias correcto
          : trips[0]?.branch?.name;

      // Formatear la respuesta
      const response = {
        nombre: entityName,
        fecha: endDate && endDate.trim() !== "" ? `${date} al ${endDate}` : date,
        pasajesEmitidos: totalPasajesVendidos,
        reimpresiones: reimpresiones,
        totalesPorMetodo: totalsByMethodArray,
        totales: totalGeneral,
        tramos: tripsSummary,
      };

      res.json(response);
    } catch (error) {
      logger.error("Error en el controlador TripController:", error);
      res.status(500).json({ error: error.message });
    }
  },

  async getTripsTicketsDateWorker(req, res) {
    logger.info(
      `${req.user.name} - Entra a buscar los datos de los viajes y pasajes de una fecha dada de un trabajador`
    );
    logger.info(
      "Datos recibidos al obtener los viajes y pasajes de una fecha dada"
    );
    logger.info(JSON.stringify(req.body));

    try {
      const { branch_id, date, endDate } = req.body;
      const workerId = req.worker.id; // Obtenemos el ID del trabajador desde el request

      // Validar si la sucursal existe
      const branch = await BranchRepository.findById(branch_id);
      if (!branch) {
        logger.error(
          `TripController->getTripsDate: Sucursal no encontrada con ID ${branch_id}`
        );
        return res.status(404).json({ msg: "BranchNotFound" });
      }

      // Obtener los trips con sus tickets asociados para el trabajador
      const trips = await TripRepository.getTripsDateWorker(
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

      // Procesar los trips y sus tickets
      const tripsSummary = trips.map((trip) => {
        const origin = trip.route.origin;
        const destination = trip.route.destination;
        const tripName = `${origin.address} - ${destination.address}`;
        const tripTickets = trip.tickets || [];

        // Obtener información del trabajador en este viaje
        const tripWorker = trip.tripworkers?.[0]?.worker;

        // Inicializar los totales por método de pago para este trip
        const tripTotalsByMethod = {};
        let tripTotal = 0;
        let tripPasajesVendidos = 0;

        // Procesar los tickets del trip
        tripTickets.forEach((ticket) => {
          const method = ticket.method.toUpperCase();
          const total = parseFloat(ticket.total);
          const quantity = parseInt(ticket.quantity, 10);

          // Sumar al total general
          totalGeneral += total;
          totalPasajesVendidos += 1;
          reimpresiones += ticket.print - 1;

          // Sumar al total por método de pago
          if (!totalsByMethod[method]) {
            totalsByMethod[method] = {
              total: 0,
              cantidad: 0,
            };
          }
          totalsByMethod[method].total += total;
          totalsByMethod[method].cantidad += 1;

          // Sumar al total del trip
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

        // Formatear la información del trip
        return {
          nombre: tripName,
          totalPasajes: tripPasajesVendidos,
          totalTramo: tripTotal,
          totalesPorMetodo: Object.keys(tripTotalsByMethod).map((method) => ({
            metodo: method,
            total: tripTotalsByMethod[method].total,
            cantidad: tripTotalsByMethod[method].cantidad,
          })),
        };
      });

      // Convertir el objeto totalsByMethod en un array
      const totalsByMethodArray = Object.keys(totalsByMethod).map((method) => ({
        metodo: method,
        total: totalsByMethod[method].total,
        cantidad: totalsByMethod[method].cantidad,
      }));

      // Formatear la respuesta
      const response = {
        nombre: branch.name,
        fecha: endDate && endDate.trim() !== "" ? `${date} al ${endDate}` : date,
        pasajesEmitidos: totalPasajesVendidos,
        reimpresiones: reimpresiones,
        totalesPorMetodo: totalsByMethodArray,
        totales: totalGeneral,
        tramos: tripsSummary,
      };

      res.json(response);
    } catch (error) {
      logger.error("Error en el controlador TripController:", error);
      res.status(500).json({ error: error.message });
    }
  },

  async getTripsByBranchAndWorker(req, res) {
    let { branch_id, date, endDate, worker_id:bodyWorkerId } = req.body;
    // Verifica si worker_id es undefined, null o 0
    let worker_id = bodyWorkerId || req.worker.id;
    // Validar si la sucursal o compañía existe
    const branch = await BranchRepository.findById(branch_id);
    if (!branch) {
      logger.error(
        `TripController->getTripsByBranchAndWorker: Sucursal no encontrada con ID ${branch_id}`
      );
      return res.status(404).json({ msg: "BranchNotFound" });
    }

    try {
      // Obtener los trips que no han finalizado
      const trips = await TripRepository.findTripsByBranchAndWorker(
        branch_id,
        date,
        endDate,
        worker_id
      );

      // Obtener fecha actual en zona horaria de Chile para comparación
      const now = new Date();
      const chileanDate = now.toLocaleDateString('es-CL', {
        timeZone: 'America/Santiago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).split('-').reverse().join('-'); // Formato: YYYY-MM-DD

      // Ordenar los trips según la lógica requerida:
      // 1. Viajes de otro día primero (date < chileanDate)
      // 2. Viajes del día actual ordenados por schedule
      // 3. Dentro de cada grupo, ordenar por schedule ASC
      const sortedTripsData = trips.sort((a, b) => {
        const isTodayA = a.date === chileanDate;
        const isTodayB = b.date === chileanDate;

        // Si A es de otro día y B es de hoy, A va primero
        if (!isTodayA && isTodayB) return -1;
        // Si B es de otro día y A es de hoy, B va primero
        if (isTodayA && !isTodayB) return 1;

        // Si ambos son del mismo día (ambos hoy o ambos otro día)
        // Ordenar por schedule ASC
        if (a.schedule < b.schedule) return -1;
        if (a.schedule > b.schedule) return 1;

        // Si tienen el mismo schedule, ordenar por fecha ASC
        if (a.date < b.date) return -1;
        if (a.date > b.date) return 1;

        return 0;
      });

      const mappedTrips = sortedTripsData.map((trip) => {
        // Sumar la cantidad de pasajeros (quantity) de los tickets asociados
        const passenger = trip.tickets.reduce(
          (sum, ticket) => sum + (parseInt(ticket.quantity, 10) || 0),
          0
        );
        const totalAmount = trip.tickets.reduce(
          (sum, ticket) => sum + (parseFloat(ticket.total) || 0),
          0
        );

        return {
          id: trip.id,
          date: trip.date,
          schedule: trip.schedule,
          arrival: trip.arrival,
          start: trip.start,
          end: trip.end,
          plate: trip.vehicle.plate,
          internal_number: trip.vehicle.internal_number,
          internalNumber: trip.vehicle.internal_number,
          vehicleImage: trip.vehicle.image,
          name: trip.route.name,
          origin: trip.route.origin.address,
          originImage: trip.route.origin.image,
          destination: trip.route.destination.address,
          destinationImage: trip.route.destination.image,
          passenger, // Usar la suma calculada
          totalAmount,
        };
      });

      const totalGeneral = mappedTrips.reduce(
        (sum, trip) => sum + (trip.totalAmount || 0),
        0
      );

      res.status(200).json({ trips: mappedTrips, totalGeneral });
    } catch (error) {
      logger.error(
        "Error en TripController->getTripsByBranchAndWorker:",
        error
      );
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = TripController;
