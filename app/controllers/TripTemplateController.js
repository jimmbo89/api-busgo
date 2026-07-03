const {
  TripTemplate,
  Branch,
  User,
  Vehicle,
  Route,
  Location,
  Trip,
  sequelize
} = require("../models");
const moment = require('moment');
const logger = require("../../config/logger");
const { VehicleRepository, RouteRepository, BranchRepository, TripWorkerRepository, TripRepository, TripTemplateRepository, TripStopRepository, RouteStopRepository, TripFareRepository, FareSegmentTicketTypeRepository } = require("../repositories");

const parseJsonArray = (value) => {
  if (Array.isArray(value)) return value;
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

const mapTripStops = (template) =>
  parseJsonArray(template.trip_stops).map((tripStop, index) => ({
    id: tripStop.id ?? null,
    route_stop_id: tripStop.route_stop_id,
    stop_order: tripStop.stop_order ?? index + 1,
    arrival_time: tripStop.arrival_time ?? null,
    departure_time: tripStop.departure_time ?? null,
    can_board: tripStop.can_board ?? true,
    can_alight: tripStop.can_alight ?? true,
    active: tripStop.active ?? true,
    source_type: tripStop.source_type ?? "auto",
  }));

const mapTripFares = (template) =>
  parseJsonArray(template.trip_fares).map((tripFare) => ({
    id: tripFare.id ?? null,
    fare_segment_ticket_type_id: tripFare.fare_segment_ticket_type_id ?? null,
    price: tripFare.price != null ? Number(tripFare.price) : null,
    base_price: tripFare.base_price != null ? Number(tripFare.base_price) : null,
    active: tripFare.active ?? true,
    source_type: tripFare.source_type ?? "auto",
  }));
const normalizeNullablePrice = (value) =>
  value !== undefined && value !== null ? Number(value) : null;

const buildGeneratedTripStopPayload = (trip, companyId, item, routeStop) => ({
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

const buildGeneratedTripFarePayload = (trip, companyId, item, fareSegmentTicketType) => {
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

const processTemplateGeneration = async (template, formattedToday) => {
  let transaction = null;

  try {
    if (!template || !template.active) {
      return { created: false, reason: "inactive" };
    }

    const shouldGenerate = await TripTemplateController.shouldGenerateForDate(
      template,
      formattedToday
    );

    if (!shouldGenerate) {
      return { created: false, reason: "not_applicable" };
    }

    const now = new Date();
    const [hoursStr, minutesStr] = template.schedule.split(":");
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    const tripDateTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hours,
      minutes,
      0,
      0
    );

    if (tripDateTime < now) {
      return { created: false, reason: "past_time" };
    }

    let arrival = await TripTemplateController.calculateArrivalTime(
      formattedToday,
      template.schedule,
      template.duration
    );

    if (!arrival) {
      return { created: false, reason: "arrival_not_generated" };
    }

    const existingTrip = await Trip.findOne({
      where: {
        date: formattedToday,
        schedule: template.schedule,
        branch_id: template.branch_id,
        vehicle_id: template.vehicle_id,
        route_id: template.route_id,
      },
      transaction,
    });

    if (existingTrip) {
      return { created: false, reason: "duplicate" };
    }

    transaction = await sequelize.transaction();

    const tripData = {
      date: formattedToday,
      schedule: template.schedule,
      arrival,
      branch_id: template.branch_id,
      vehicle_id: template.vehicle_id,
      route_id: template.route_id,
      price: template.price,
    };

    const trip = await TripRepository.create(tripData, { transaction });

    const templateTripStops = mapTripStops(template);
    const templateTripFares = mapTripFares(template);

    if (templateTripStops.length > 0) {
      for (const item of templateTripStops) {
        const routeStopId = Number(item.route_stop_id);
        const routeStop = await RouteStopRepository.findById(routeStopId);

        if (!routeStop) {
          throw new Error(`RouteStopNotFound:${routeStopId}`);
        }

        if (Number(routeStop.company_id) !== Number(template.branch.company_id)) {
          throw new Error("RouteStopCompanyMismatch");
        }

        if (Number(routeStop.route_id) !== Number(template.route_id)) {
          throw new Error("RouteStopRouteMismatch");
        }

        const tripStopPayload = buildGeneratedTripStopPayload(
          trip,
          template.branch.company_id,
          item,
          routeStop
        );

        await TripStopRepository.create(tripStopPayload, { transaction });
      }
    }

    if (templateTripFares.length > 0) {
      for (const item of templateTripFares) {
        const fareSegmentTicketTypeId = Number(item.fare_segment_ticket_type_id);
        const fareSegmentTicketType = await FareSegmentTicketTypeRepository.findById(
          fareSegmentTicketTypeId
        );

        if (!fareSegmentTicketType) {
          throw new Error(`FareSegmentTicketTypeNotFound:${fareSegmentTicketTypeId}`);
        }

        const fareSegment = fareSegmentTicketType.fareSegment;
        if (
          !fareSegment ||
          Number(fareSegment.company_id) !== Number(template.branch.company_id)
        ) {
          throw new Error("FareSegmentTicketTypeCompanyMismatch");
        }

        if (Number(fareSegment.route_id) !== Number(template.route_id)) {
          throw new Error("FareSegmentTicketTypeRouteMismatch");
        }

        const tripFarePayload = buildGeneratedTripFarePayload(
          trip,
          template.branch.company_id,
          item,
          fareSegmentTicketType
        );

        await TripFareRepository.create(tripFarePayload, { transaction });
      }
    }

    if (template.workers) {
      try {
        const workersArray = typeof template.workers === "string"
          ? JSON.parse(template.workers)
          : template.workers;

        if (Array.isArray(workersArray) && workersArray.length > 0) {
          await Promise.all(workersArray.map(async (worker) => {
            if (worker && worker.id) {
              await TripWorkerRepository.create({
                branch_id: template.branch_id,
                trip_id: trip.id,
                worker_id: worker.id,
                date: formattedToday,
              }, { transaction });
            }
          }));
        }
      } catch (error) {
        logger.error("Error procesando workers:", error);
      }
    }

    if (transaction && !transaction.finished) {
      await transaction.commit();
      transaction = null;
    }

    return { created: true, trip };
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
      transaction = null;
    }
    throw error;
  }
};

const TripTemplateController = {
  // Obtener todas las plantillas de viaje
  async index(req, res) {
    logger.info(`${req.user.name} - Busca todas las plantillas de viaje`);

    try {
      const filters = req.body; // Puedes pasar filtros como query params
      const templates = await TripTemplateRepository.findAll(filters);

      if (!templates.length) {
        return res.status(204).json({ msg: "TemplatesNotFound" });
      }

      const mappedTemplates = templates.map((template) => ({
        id: template.id,
        branch_id: template.branch_id,
        vehicle_id: template.vehicle_id,
        route_id: template.route_id,
        schedule: template.schedule,
        duration: template.duration,
        price: normalizeNullablePrice(template.price),
        recurrence_pattern: template.recurrence_pattern,
        days_of_week: template.days_of_week,
        active: template.active,
        workers: Array.isArray(template.workers)
          ? template.workers // Si ya es un array, úsalo directamente
          : JSON.parse(template.workers), // Si es una cadena JSON, parsearla,
        tripStops: mapTripStops(template),
        trip_stops: mapTripStops(template),
        tripFares: mapTripFares(template),
        trip_fares: mapTripFares(template),
        vehicleName: template.vehicle.plate, // Incluir los datos del vehículo asociado
        internal_number: template.vehicle.internal_number,
        internalNumber: template.vehicle.internal_number,
        vehicleImage: template.vehicle.image, // Incluir los datos del vehículo asociado
        name: template.route.name, // Incluir los datos de la ruta asociada
        origin: template.route.origin.address,
        originImage: template.route.origin.image,
        destination: template.route.destination.address,
        destinationImage: template.route.destination.image,
      }));

      res.status(200).json({ templates: mappedTemplates });
    } catch (error) {
      logger.error("TripTemplateController->index: " + error.message);
      res.status(500).json({ error: "ServerError", details: error.message });
    }
  },

  // Obtener plantillas activas por branch_id
  async getActiveByBranch(req, res) {
    const { branch_id } = req.body;
    logger.info(
      `${req.user.name} - Busca plantillas activas para branch ${branch_id}`
    );

    try {
      const branch = await BranchRepository.findById(branch_id);
      if (!branch) {
        logger.error(
          `TripController->update: Sucursal no encontrada con ID ${branch_id}`
        );
        return res.status(400).json({ msg: "BranchNotFound" });
      }

      const templates = await TripTemplateRepository.findAll({
        branch_id,
        active: true,
      });

      if (!templates.length) {
        return res.status(204).json({ msg: "ActiveTemplatesNotFound" });
      }

      const mappedTemplates = templates.map((template) => ({
        id: template.id,
        branch_id: template.branch_id,
        vehicle_id: template.vehicle_id,
        route_id: template.route_id,
        schedule: template.schedule,
        duration: template.duration,
        price: normalizeNullablePrice(template.price),
        recurrence_pattern: template.recurrence_pattern,
        days_of_week: template.days_of_week
          ? template.days_of_week.split(",").map(Number)
          : [],
        active: template.active,
        workers: Array.isArray(template.workers)
          ? template.workers // Si ya es un array, úsalo directamente
          : JSON.parse(template.workers), // Si es una cadena JSON, parsearla,
        tripStops: mapTripStops(template),
        trip_stops: mapTripStops(template),
        tripFares: mapTripFares(template),
        trip_fares: mapTripFares(template),
        branch_name: template.branch.name,
        vehicle_plate: template.vehicle.plate,
        internal_number: template.vehicle.internal_number,
        internalNumber: template.vehicle.internal_number,
        route_name: template.route.name,
        origin_address: template.route.origin.address,
        destination_address: template.route.destination.address,
      }));

      res.status(200).json({ templates: mappedTemplates });
    } catch (error) {
      logger.error(
        "TripTemplateController->getActiveByBranch: " + error.message
      );
      res.status(500).json({ error: "ServerError", details: error.message });
    }
  },

  // Crear una nueva plantilla de viaje
  async store(req, res) {
    logger.info(`${req.user.name} - Crea una nueva plantilla de viaje`);
    logger.info("datos recibidos al crear una plantilla de viaje");
    logger.info(JSON.stringify(req.body));

    const {
      schedule,
      branch_id,
      vehicle_id,
      route_id,
      workers,
      price,
      recurrence_pattern,
      days_of_week,
      active,
      duration,
    } = req.body;

    req.body.user_id = req.user.id; // Asignar el usuario que crea la plantilla

    try {
      // Validar branch
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

      // Crear la plantilla
      const template = await TripTemplateRepository.create(req.body);
      const refreshedTemplate = await TripTemplateRepository.findById(template.id);

      try {
        const formattedToday = await TripTemplateController.formatDateToYYYYMMDD(
          new Date()
        );
        await processTemplateGeneration(refreshedTemplate, formattedToday);
      } catch (generationError) {
        logger.error(
          "TripTemplateController->store: error generando viaje desde template: " +
            generationError.message
        );
      }

      res.status(201).json({
        template: {
          ...refreshedTemplate.toJSON(),
          tripStops: mapTripStops(refreshedTemplate),
          trip_stops: mapTripStops(refreshedTemplate),
          tripFares: mapTripFares(refreshedTemplate),
          trip_fares: mapTripFares(refreshedTemplate),
        },
      });
    } catch (error) {
      logger.error("TripTemplateController->store: " + error.message);
      res.status(500).json({
        error: "ServerError",
        details: error.message,
      });
    }
  },

  // Obtener una plantilla por ID
  async show(req, res) {
    const { id } = req.body;
    logger.info(`${req.user.name} - Busca plantilla con ID ${id}`);

    try {
      const template = await TripTemplateRepository.findById(id);

      if (!template) {
        return res.status(404).json({ msg: "TemplateNotFound" });
      }

      const mappedTemplate = {
        id: template.id,
        branch_id: template.branch_id,
        vehicle_id: template.vehicle_id,
        route_id: template.route_id,
        schedule: template.schedule,
        duration: template.duration,
        price: normalizeNullablePrice(template.price),
        recurrence_pattern: template.recurrence_pattern,
        days_of_week: template.days_of_week
          ? template.days_of_week.split(",").map(Number)
          : [],
        active: template.active,
        workers: Array.isArray(template.workers)
          ? template.workers // Si ya es un array, úsalo directamente
          : JSON.parse(template.workers), // Si es una cadena JSON, parsearla,
        tripStops: mapTripStops(template),
        trip_stops: mapTripStops(template),
        tripFares: mapTripFares(template),
        trip_fares: mapTripFares(template),
        branch_name: template.branch.name,
        vehicle_plate: template.vehicle.plate,
        internal_number: template.vehicle.internal_number,
        internalNumber: template.vehicle.internal_number,
        route_name: template.route.name,
        origin_address: template.route.origin.address,
        destination_address: template.route.destination.address,
      };

      res.status(200).json({ template: mappedTemplate });
    } catch (error) {
      logger.error("TripTemplateController->show: " + error.message);
      res.status(500).json({ error: "ServerError", details: error.message });
    }
  },

  // Actualizar una plantilla
  async update(req, res) {
    const { id } = req.body;
    logger.info(`${req.user.name} - Actualiza plantilla con ID ${id}`);
    logger.info("datos recibidos al editar una plantilla de viaje");
    logger.info(JSON.stringify(req.body));

    try {
      // Validar que la plantilla existe
      const existingTemplate = await TripTemplateRepository.findById(id);
      if (!existingTemplate) {
        return res.status(404).json({ msg: "TemplateNotFound" });
      }

      // Validar vehicle si se está actualizando
      if (req.body.vehicle_id) {
        const vehicle = await VehicleRepository.findById(req.body.vehicle_id);
        if (!vehicle) {
          return res.status(404).json({ msg: "VehicleNotFound" });
        }
      }

      // Validar route si se está actualizando
      if (req.body.route_id) {
        const route = await RouteRepository.findById(req.body.route_id);
        if (!route) {
          return res.status(404).json({ msg: "RouteNotFound" });
        }
      }

      // Actualizar la plantilla
      const template = await TripTemplateRepository.update(
        existingTemplate,
        req.body
      );

      try {
        const formattedToday = await TripTemplateController.formatDateToYYYYMMDD(
          new Date()
        );
        await processTemplateGeneration(template, formattedToday);
      } catch (generationError) {
        logger.error(
          "TripTemplateController->update: error generando viaje desde template: " +
            generationError.message
        );
      }

      // Mapear respuesta
      const mappedTemplate = {
        id: template.id,
        branch_id: template.branch_id,
        vehicle_id: template.vehicle_id,
        route_id: template.route_id,
        schedule: template.schedule,
        duration: template.duration,
        price: normalizeNullablePrice(template.price),
        recurrence_pattern: template.recurrence_pattern,
        days_of_week: template.days_of_week
          ? template.days_of_week.split(",").map(Number)
          : [],
        active: template.active,
        workers: Array.isArray(template.workers)
          ? template.workers // Si ya es un array, úsalo directamente
          : JSON.parse(template.workers), // Si es una cadena JSON, parsearla,
        tripStops: mapTripStops(template),
        trip_stops: mapTripStops(template),
        tripFares: mapTripFares(template),
        trip_fares: mapTripFares(template),
        branch_name: template.branch.name,
        vehicle_plate: template.vehicle.plate,
        internal_number: template.vehicle.internal_number,
        internalNumber: template.vehicle.internal_number,
        route_name: template.route.name,
        origin_address: template.route.origin.address,
        destination_address: template.route.destination.address,
      };

      res.status(200).json({ template: mappedTemplate });
    } catch (error) {
      logger.error("TripTemplateController->update: " + error.message);
      res.status(500).json({ error: "ServerError", details: error.message });
    }
  },

  // Eliminar una plantilla
  async destroy(req, res) {
    const { id } = req.body;
    logger.info(`${req.user.name} - Elimina plantilla con ID ${id}`);

    try {
      const result = await TripTemplateRepository.delete(id);

      if (result) {
        res.status(200).json({ msg: "TemplateDeleted" });
      } else {
        res.status(404).json({ msg: "TemplateNotFound" });
      }
    } catch (error) {
      logger.error("TripTemplateController->destroy: " + error.message);

      if (error.message.includes("existen viajes asociados")) {
        res.status(400).json({
          error: "CannotDelete",
          details: error.message,
        });
      } else {
        res.status(500).json({
          error: "ServerError",
          details: error.message,
        });
      }
    }
  },

  async generateTripsForDate(req, res) {
    try {
      const templates = await TripTemplateRepository.findAll({
        active: true,
      });

      const today = new Date();
      const formattedToday = await TripTemplateController.formatDateToYYYYMMDD(today);

      for (const template of templates) {
        try {
          await processTemplateGeneration(template, formattedToday);
        } catch (templateError) {
          continue;
        }
      }

      return res.status(201).json({ msg: "TemplatesGenerated" });
      //logger.info(`TripTemplateController->generateTripsForDate: inicio | fecha=${formattedToday} | plantillas=${templates.length}`);

      //logger.info(`Iniciando generación de viajes para ${formattedToday}`);
      //logger.info(`Plantillas a procesar: ${templates.length}`);

      for (const template of templates) {
        let transaction = null;
        try { // Nuevo try-catch interno para cada template
          const shouldGenerate = await TripTemplateController.shouldGenerateForDate(
            template,
            formattedToday
          );
          //logger.info(`TripTemplateController->generateTripsForDate: template=${template.id} | recurrence=${template.recurrence_pattern} | schedule=${template.schedule} | shouldGenerate=${shouldGenerate}`);
          
          //logger.info(`Template ${template.id} (${template.recurrence_pattern}) aplica para ${formattedToday}: ${shouldGenerate}`);

          if (shouldGenerate) {
             const now = new Date(); // Ej: Fri Oct 24 2025 17:48:00 GMT-0300

            // Parsear la hora del template
            const [hoursStr, minutesStr] = template.schedule.split(':');
            const hours = parseInt(hoursStr, 10);
            const minutes = parseInt(minutesStr, 10);

            // ✅ Crear fecha de salida EN LA ZONA LOCAL (Chile)
            const tripDateTime = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
              hours,
              minutes,
              0,
              0
            );
            //logger.info(`TripTemplateController->generateTripsForDate: template=${template.id} | now=${now.toISOString()} | tripDateTime=${tripDateTime.toISOString()}`);

            //logger.info(`Template ${template.id}: hora actual: ${now} | hora de salida: ${tripDateTime}`);

            // Comparar directamente (ambas en la misma zona)
            //logger.info(`TripTemplateController->generateTripsForDate: template=${template.id} | compare tripDateTime vs now`);
            if (tripDateTime < now) {
              //logger.info(`Template ${template.id}: hora de salida ${template.schedule} ya pasó hoy. Omitiendo.`);
              continue;
            }

            //logger.info(`TripTemplateController->generateTripsForDate: template=${template.id} pasando control horario`);
            let arrival = await TripTemplateController.calculateArrivalTime(
              formattedToday,
              template.schedule,
              template.duration
            );

            if (!arrival) {
              //logger.error(`No se pudo calcular hora de llegada para template ${template.id}`);
              continue;
            }

            // Verificar duplicados directamente con los campos relevantes
            //logger.info(`TripTemplateController->generateTripsForDate: template=${template.id} calculando duplicado`);
            const existingTrip = await Trip.findOne({
              where: {
                date: formattedToday,
                schedule: template.schedule,
                branch_id: template.branch_id,
                vehicle_id: template.vehicle_id,
                route_id: template.route_id
              },
              transaction // Incluir la transacción en la consulta
            });

            if (existingTrip) {
              //logger.info(`Ya existe un viaje duplicado para template ${template.id} - Continuando...`);
              continue;
            }

            transaction = await sequelize.transaction();

            // Crear el viaje
            //logger.info(`TripTemplateController->generateTripsForDate: template=${template.id} creando trip`);
            const tripData = {
              date: formattedToday,
              schedule: template.schedule,
              arrival: arrival,
              branch_id: template.branch_id,
              vehicle_id: template.vehicle_id,
              route_id: template.route_id,
              price: template.price,
            };

            const trip = await TripRepository.create(tripData, { transaction });
            //logger.info(`TripTemplateController->generateTripsForDate: trip creado desde template=${template.id} | trip_id=${trip.id}`);

            const templateTripStops = mapTripStops(template);
            const templateTripFares = mapTripFares(template);
            //logger.info(`TripTemplateController->generateTripsForDate: template=${template.id} tripStops=${templateTripStops.length}`);
            if (templateTripStops.length > 0) {
              for (const item of templateTripStops) {
                const routeStopId = Number(item.route_stop_id);
                const routeStop = await RouteStopRepository.findById(routeStopId);

                if (!routeStop) {
                  throw new Error(`RouteStopNotFound:${routeStopId}`);
                }

                if (Number(routeStop.company_id) !== Number(template.branch.company_id)) {
                  throw new Error("RouteStopCompanyMismatch");
                }

                if (Number(routeStop.route_id) !== Number(template.route_id)) {
                  throw new Error("RouteStopRouteMismatch");
                }

                const tripStopPayload = buildGeneratedTripStopPayload(
                  trip,
                  template.branch.company_id,
                  item,
                  routeStop
                );

                await TripStopRepository.create(tripStopPayload, { transaction });
              }
            }

            if (templateTripFares.length > 0) {
              for (const item of templateTripFares) {
                const fareSegmentTicketTypeId = Number(item.fare_segment_ticket_type_id);
                const fareSegmentTicketType = await FareSegmentTicketTypeRepository.findById(
                  fareSegmentTicketTypeId
                );

                if (!fareSegmentTicketType) {
                  throw new Error(`FareSegmentTicketTypeNotFound:${fareSegmentTicketTypeId}`);
                }

                const fareSegment = fareSegmentTicketType.fareSegment;
                if (
                  !fareSegment ||
                  Number(fareSegment.company_id) !== Number(template.branch.company_id)
                ) {
                  throw new Error("FareSegmentTicketTypeCompanyMismatch");
                }

                if (Number(fareSegment.route_id) !== Number(template.route_id)) {
                  throw new Error("FareSegmentTicketTypeRouteMismatch");
                }

                const tripFarePayload = buildGeneratedTripFarePayload(
                  trip,
                  template.branch.company_id,
                  item,
                  fareSegmentTicketType
                );

                await TripFareRepository.create(tripFarePayload, { transaction });
              }
            }

            if (template.workers) {
              try {
                // Convertir a array si es necesario
                const workersArray = typeof template.workers === 'string' 
                  ? JSON.parse(template.workers) 
                  : template.workers;

                // Verificar que sea un array válido
                if (Array.isArray(workersArray) && workersArray.length > 0) {
                  await Promise.all(workersArray.map(async (worker) => {
                    if (worker && worker.id) { // Validación adicional
                      await TripWorkerRepository.create({
                        branch_id: template.branch_id,
                        trip_id: trip.id,
                        worker_id: worker.id,
                        date: formattedToday
                      }, { transaction });
                    }
                  }));
                }
              } catch (error) {
                logger.error('Error procesando workers:', error);
                // Puedes agregar aquí manejo de errores adicional
              }
            }
          }
          if (transaction && !transaction.finished) {
            await transaction.commit();
            transaction = null;
          }
        } catch (templateError) {
          if (transaction && !transaction.finished) {
            await transaction.rollback();
            transaction = null;
          }
          //logger.error(`TripTemplateController->generateTripsForDate: error en template=${template?.id ?? "unknown"} | ${templateError.message}`);
          // Continuar con el siguiente template aunque este falle
          continue;
        }
      }

      //logger.info("TripTemplateController->generateTripsForDate: fin OK");
      res.status(201).json({ msg: "TemplatesGenerated" });
    } catch (error) {
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";

      logger.error("tripTemplateController->generateTripsForDate:" + errorMsg);
      return res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },

  async calculateArrivalTime(formattedToday, schedule, estimatedDuration) {
    try {
       // Validación mejorada (igual que en Vuetify)
      if (
        !schedule ||
        !estimatedDuration ||
        !schedule.match(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
      ) {
        //logger.info("Validación fallida - parámetros inválidos");
        return null;
      }

      // Usar fecha proporcionada o fecha actual si es null
      const baseDate = formattedToday
        ? new Date(formattedToday + "T00:00:00")
        : new Date();

      // Extraer horas y minutos del schedule
      const [hours, minutes] = schedule.split(":").map(Number);

      // Configurar la hora en la fecha base (en zona horaria local)
      const departureDate = new Date(baseDate);
      departureDate.setHours(hours, minutes, 0, 0);

      // Sumar los minutos estimados (asegurarse que es número)
      const durationMinutes = parseInt(estimatedDuration, 10);
      if (isNaN(durationMinutes)) {
        throw new Error("Duración debe ser un número");
      }

      const arrivalDate = new Date(
        departureDate.getTime() + durationMinutes * 60000
      );

      // Formatear a YYYY-MM-DD HH:MM:SS en hora local (igual que en Vuetify)
      const pad = (n) => n.toString().padStart(2, "0");
      const formattedArrival =
        `${arrivalDate.getFullYear()}-${pad(arrivalDate.getMonth() + 1)}-${pad(
          arrivalDate.getDate()
        )} ` +
        `${pad(arrivalDate.getHours())}:${pad(arrivalDate.getMinutes())}:00`;

      //logger.info("Hora de llegada calculada:", formattedArrival);
      return formattedArrival;
    } catch (error) {
      logger.error("Error calculando hora de llegada:", error);
      return null;
    }
  },

  // Funciones auxiliares
  // Añade esta función al mismo archivo (TripTemplateController.js)
  async formatDateToYYYYMMDD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  },

  /*async calculateArrivalTime(departure, durationMinutes) {
  const departureMoment = moment(departure);
  return departureMoment.add(durationMinutes, 'minutes').format('HH:mm');
},*/
  async shouldGenerateForDate(template, dateString) {
    try {
      // Convertir el string a Date (formato YYYY-MM-DD)
      const [year, month, day] = dateString.split("-");
      const date = new Date(year, month - 1, day); // mes es 0-based
      const dayOfWeek = date.getDay(); // 0 (domingo) a 6 (sábado)

      //logger.info(`Validando template ${template.id} para día ${dayOfWeek}`);

      switch (
        template.recurrence_pattern.toLowerCase() // case insensitive
      ) {
        case "daily":
          return true;
        case "weekdays":
          return dayOfWeek >= 1 && dayOfWeek <= 5;
        case "weekends":
          return dayOfWeek === 0 || dayOfWeek === 6;
        case "weekly":
          const days = template.days_of_week.split(",").map(Number);
          return days.includes(dayOfWeek);
        default:
          return false;
      }
    } catch (error) {
      logger.error("Error en shouldGenerateForDate:", error);
      return false;
    }
  },
};

module.exports = TripTemplateController;
