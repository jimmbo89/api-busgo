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
const { VehicleRepository, RouteRepository, BranchRepository, TripWorkerRepository, TripRepository, TripTemplateRepository } = require("../repositories");

const TripTemplateController = {
  // Obtener todas las plantillas de viaje
  async index(req, res) {
    logger.info(`${req.user.name} - Busca todas las plantillas de viaje`);

    try {
      const filters = req.query; // Puedes pasar filtros como query params
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
        price: Number(template.price),
        recurrence_pattern: template.recurrence_pattern,
        days_of_week: template.days_of_week,
        active: template.active,
        workers: Array.isArray(template.workers)
          ? template.workers // Si ya es un array, úsalo directamente
          : JSON.parse(template.workers), // Si es una cadena JSON, parsearla,
        vehicleName: template.vehicle.plate, // Incluir los datos del vehículo asociado
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
        price: Number(template.price),
        recurrence_pattern: template.recurrence_pattern,
        days_of_week: template.days_of_week
          ? template.days_of_week.split(",").map(Number)
          : [],
        active: template.active,
        workers: Array.isArray(template.workers)
          ? template.workers // Si ya es un array, úsalo directamente
          : JSON.parse(template.workers), // Si es una cadena JSON, parsearla,
        branch_name: template.branch.name,
        vehicle_plate: template.vehicle.plate,
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

      res.status(201).json({ template: template });
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
        price: Number(template.price),
        recurrence_pattern: template.recurrence_pattern,
        days_of_week: template.days_of_week
          ? template.days_of_week.split(",").map(Number)
          : [],
        active: template.active,
        workers: Array.isArray(template.workers)
          ? template.workers // Si ya es un array, úsalo directamente
          : JSON.parse(template.workers), // Si es una cadena JSON, parsearla,
        branch_name: template.branch.name,
        vehicle_plate: template.vehicle.plate,
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

      // Mapear respuesta
      const mappedTemplate = {
        id: template.id,
        branch_id: template.branch_id,
        vehicle_id: template.vehicle_id,
        route_id: template.route_id,
        schedule: template.schedule,
        duration: template.duration,
        price: Number(template.price),
        recurrence_pattern: template.recurrence_pattern,
        days_of_week: template.days_of_week
          ? template.days_of_week.split(",").map(Number)
          : [],
        active: template.active,
        workers: Array.isArray(template.workers)
          ? template.workers // Si ya es un array, úsalo directamente
          : JSON.parse(template.workers), // Si es una cadena JSON, parsearla,
        branch_name: template.branch.name,
        vehicle_plate: template.vehicle.plate,
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
    let transaction = await sequelize.transaction();
    try {
      const templates = await TripTemplateRepository.findAll({
        active: true,
      });

      const today = new Date();
      const formattedToday = await TripTemplateController.formatDateToYYYYMMDD(today);

      logger.info(`Iniciando generación de viajes para ${formattedToday}`);
      logger.info(`Plantillas a procesar: ${templates.length}`);

      for (const template of templates) {
        try { // Nuevo try-catch interno para cada template
          const shouldGenerate = await TripTemplateController.shouldGenerateForDate(
            template,
            formattedToday
          );
          
          logger.info(
            `Template ${template.id} (${template.recurrence_pattern}) aplica para ${formattedToday}: ${shouldGenerate}`
          );

          if (shouldGenerate) {
            let arrival = await TripTemplateController.calculateArrivalTime(
              formattedToday,
              template.schedule,
              template.duration
            );

            if (!arrival) {
              logger.error(
                `No se pudo calcular hora de llegada para template ${template.id}`
              );
              continue;
            }

            // Verificar duplicados directamente con los campos relevantes
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
              logger.info(`Ya existe un viaje duplicado para template ${template.id} - Continuando...`);
              continue;
            }

            // Crear el viaje
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
                console.error('Error procesando workers:', error);
                // Puedes agregar aquí manejo de errores adicional
              }
            }
          }
        } catch (templateError) {
          logger.error(`Error procesando template ${template.id}: ${templateError.message}`);
          // Continuar con el siguiente template aunque este falle
          continue;
        }
      }

      await transaction.commit();
      res.status(201).json({ msg: "TemplatesGenerated" });
    } catch (error) {
      if (!transaction.finished) {
        await transaction.rollback();
      }
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
        logger.info("Validación fallida - parámetros inválidos");
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

      logger.info("Hora de llegada calculada:", formattedArrival);
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

      logger.info(`Validando template ${template.id} para día ${dayOfWeek}`);

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