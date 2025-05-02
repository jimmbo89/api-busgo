const { Worker, TripWorker } = require("../models");
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
  TicketRepository,
  CompanyRepository,
  IncidentRepository,
  PromotionRepository,
} = require("../repositories");

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
            vehicleImage: trip.vehicle.image, // Incluir los datos del vehículo asociado
            name: trip.route.name, // Incluir los datos de la ruta asociada
            origin: trip.route.origin.address,
            originImage: trip.route.origin.image,
            destination: trip.route.destination.address,
            destinationImage: trip.route.destination.image,
            workers: await TripWorkerRepository.workersTrip(trip),
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
      const trips = await TripRepository.findDate(branch_id, workerId, date);

      if (!trips.length) {
        return res.status(204).json({ msg: "TripsNotFound" });
      }

      const mappedTrips = await Promise.all(
        trips.map(async (trip) => {
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
            vehicleImage: trip.vehicle.image, // Incluir los datos del vehículo asociado
            name: trip.route.name, // Incluir los datos de la ruta asociada
            origin: trip.route.origin.address,
            originImage: trip.route.origin.image,
            destination: trip.route.destination.address,
            destinationImage: trip.route.destination.image,
            workers: await TripWorkerRepository.workersTrip(trip),
            passengers: await TicketRepository.getpassengers(trip.id),
          };
        })
      );

      res.status(200).json({ trips: mappedTrips });
    } catch (error) {
      logger.error("TripController->index: " + error.message);
      res.status(500).json({ error: "ServerError", details: error.message });
    }
  },

  async getTripDate(req, res) {
    logger.info(
      `${req.user.name} - Entra a buscar los viajes de una fecha dada`
    );

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
      const trips = await TripRepository.findDate(branch_id, workerId, date);

      if (!trips.length) {
        return res.status(204).json({ msg: "TripsNotFound" });
      }

      const mappedTrips = await Promise.all(
        trips.map(async (trip) => {
          const reservedSeats = trip.tickets
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
            : []; // Si no existe structure.seatMap, devuelves un array vacío

          return {
            id: trip.id,
            trip_id: trip.id,
            date: trip.date,
            schedule: trip.schedule,
            arrival: trip.arrival,
            seats: trip.vehicle.seats,
            plate: trip.vehicle.plate,
            imageVehicle: trip.vehicle.image,
            name: trip.route.name, // Incluir los datos de la ruta asociada
            origin: trip.route.origin.address,
            price: trip.price,
            originImage: trip.route.origin.image,
            destination: trip.route.destination.address,
            destinationImage: trip.route.destination.image,
            reservedSeats,
            seatMap: seatMap,
          };
        })
      );

      const promotions = await PromotionRepository.findByActiveStatus(true);

      res.status(200).json({ trips: mappedTrips, promotions: promotions });
    } catch (error) {
      logger.error("TripController->getTripDate: " + error.message);
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
      const trips = await TripRepository.findDate(branch_id, workerId, date);

      if (!trips.length) {
        return res.status(204).json({ msg: "TripsNotFound" });
      }

      const mappedTrips = await Promise.all(
        trips.map(async (trip) => {
          const reservedSeats = trip.tickets
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
            : []; // Si no existe structure.seatMap, devuelves un array vacío
          return {
            id: trip.id,
            trip_id: trip.id,
            date: trip.date,
            schedule: trip.schedule,
            arrival: trip.arrival,
            seats: trip.vehicle.seats,
            plate: trip.vehicle.plate,
            imageVehicle: trip.vehicle.image,
            name: trip.route.name, // Incluir los datos de la ruta asociada
            origin: trip.route.origin.address,
            price: trip.price,
            originImage: trip.route.origin.image,
            destination: trip.route.destination.address,
            destinationImage: trip.route.destination.image,
            reservedSeats,
            seatMap: seatMap,
          };
        })
      );

      const promotions = await PromotionRepository.findByActiveStatus(true);

      res.status(200).json({ trips: mappedTrips, promotions: promotions });
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
      workers,
      price,
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
      let filteredWorkers = [];
      if (req.body.workers) {
        // Si no quedan personas después del filtrado, devolver un error
        if (req.body.workers === 0) {
          return res
            .status(400)
            .json({ msg: "No se han proporcionado trabajadores válidos." });
        }

        const workerIds = req.body.workers.map((worker) =>
          parseInt(worker.worker_id)
        );

        // Verificar personas, roles y hogares
        const [workers] = await Promise.all([
          Worker.findAll({ where: { id: workerIds } }),
        ]);
        // Comprobar si alguna entidad no existe
        const missingWorkers = workerIds.filter(
          (id) => !workers.find((p) => p.id === id)
        );

        if (missingWorkers.length) {
          logger.error(`No se encontraron trabajdores, los siguientes IDs: 
                            Workers: ${missingWorkers}`);
          return res
            .status(400)
            .json({ msg: "Datos no encontrados para algunas asociaciones." });
        }
      }

      trip = await TripRepository.create(req.body);

      if (req.body.workers.length > 0) {
        // Crear las asociaciones en paralelo
        for (const worker of req.body.workers) {
          const { worker_id } = worker;

          const workersTripAssociation = await TripWorker.create({
            trip_id: trip.id,
            worker_id,
            branch_id,
            date,
          });
        }
      }

      res.status(201).json({ trip: trip });
    } catch (error) {
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
        vehicleImage: trip.vehicle.image, // Incluir los datos del vehículo asociado
        routeName: trip.route.name, // Incluir los datos de la ruta asociada
        origin: trip.route.origin.address,
        originImage: trip.route.origin.image,
        destination: trip.route.destination.address,
        destinationImage: trip.route.destination.image,
      };

      res.status(200).json({ trip: mappedTrip });
    } catch (error) {
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";

      logger.error("TripController->show:" + errorMsg);
      return res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },

  async createDateTime(dateStr, timeStr) {
    if (!dateStr || !timeStr) return null;

    // Asegurar que el tiempo tenga segundos
    const formattedTime = timeStr.includes(":")
      ? `${timeStr}:00`
      : `${timeStr}:00:00`;

    return new Date(`${dateStr}T${formattedTime}`);
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

      if (branch_id) {
        const branch = await BranchRepository.findById(branch_id);
        if (!branch) {
          logger.error(
            `TripController->update: Sucursal no encontrada con ID ${branch_id}`
          );
          return res.status(400).json({ msg: "BranchNotFound" });
        }
      }

      if (req.body.workers) {
        // Si no quedan personas después del filtrado, devolver un error
        if (req.body.workers === 0) {
          return res
            .status(400)
            .json({ msg: "No se han proporcionado trabajadores válidos." });
        }

        const workerIds = req.body.workers.map((worker) =>
          parseInt(worker.worker_id)
        );

        // Verificar personas, roles y hogares
        const [workers] = await Promise.all([
          Worker.findAll({ where: { id: workerIds } }),
        ]);
        // Comprobar si alguna entidad no existe
        const missingWorkers = workerIds.filter(
          (id) => !workers.find((p) => p.id === id)
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
          description: `Realizó la salida del viaje ${trip.id} con un retrazo de (${humanReadable}).`,
          details: {
            actualStart: actualStart.toISOString()
            .replace('T', ' ')
            .substring(0, 19),
            scheduledStart,
            difference: humanReadable,
          },
          date: new Date(), // Fecha actual
        };
        logger.info(`actualStart ${actualStart}`);
        const formattedStart = actualStart.toISOString()
        .replace('T', ' ')
        .substring(0, 19); // Cortar los milisegundos

      // 4. Asignar al cuerpo de la petición
      req.body.start = formattedStart; // "2025-04-14 15:00:00"
          await IncidentRepository.create(incidentBody);
        }
      }
      if (end) {
        const today = new Date().toISOString().split("T")[0];
        const actualEnd = await TripController.createDateTime(today, end);
        const scheduledArrival = trip.arrival; // Asumiendo que trip.arrival es 'YYYY-MM-DD HH:mm:ss'

        const { difference, humanReadable, isDelayed } = await TripController.compareDates(
          scheduledArrival,
          actualEnd
        );

        if (isDelayed) {
          logger.info(`End es mayor que Arrival por ${humanReadable}.`);
          const incidentBody = {
            branch_id: trip.branch_id, // ID de la sucursal
            user_id: req.user.id, // ID del usuario que realiza la acción
            title: "Retraso en la llegada del viaje",
            description: `Hizo la llegada del viaje ${trip.id} (${humanReadable}).`,
            details: {
              actualEnd: actualEnd.toISOString()
          .replace('T', ' ')
          .substring(0, 19),
              arrival: trip.arrival,
              difference: humanReadable,
            },
            date: new Date(), // Fecha actual
          };
          const formattedEnd = actualEnd.toISOString()
          .replace('T', ' ')
          .substring(0, 19); // Cortar los milisegundos

        // 4. Asignar al cuerpo de la petición
        req.body.end = formattedEnd; // "2025-04-14 15:00:00"
          await IncidentRepository.create(incidentBody);
        }
      }
      const updatedTrip = await TripRepository.update(trip, req.body);

      if (req.body.workers) {
        await TripRepository.updateTripWorkers(trip, req.body);
      }

      res.status(200).json({ trip: updatedTrip });
    } catch (error) {
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";

      logger.error("TripController->update:" + errorMsg);
      return res.status(500).json({ error: "ServerError", details: errorMsg });
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
      const routes = await BranchRouteRepository.findByBranch(
        req.body.branch_id
      );
      const branchVehicles = await BranchVehicleRepository.findByBranch(
        req.body.branch_id
      );
      const branchWorkers = await BranchWorkerRepository.findByBranch(
        req.body.branch_id
      );

      // Mapeamos los resultados para obtener solo los IDs y nombres
      const mappedRoutes = routes.map((branchroute) => {
        return {
          id: branchroute.route_id,
          name: branchroute.route.name,
          originId: branchroute.route.origin_id,
          origin_id: branchroute.route.origin_id,
          destinationId: branchroute.route.destination_id,
          destination_id: branchroute.route.destination_id,
          originAddress: branchroute.route.origin.address,
          originImage: branchroute.route.origin.image,
          destinationAddress: branchroute.route.destination.address,
          destinationImage: branchroute.route.destination.image,
          price: branchroute.price,
          estimated: branchroute.route.estimated,
        };
      });
      const mappedBranchVehicles = branchVehicles.map((branchVehicle) => ({
        id: branchVehicle.vehicle_id,
        vehicleName: branchVehicle.vehicle.plate,
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
        fecha: endDate && endDate.trim() !== "" ? `${date} - ${endDate}` : date,
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
      const trips = await TripRepository.getTripsDateWorker(branch_id, date, endDate, workerId);

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
        fecha: endDate && endDate.trim() !== "" ? `${date} - ${endDate}` : date,
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
    let { branch_id, date, endDate, worker_id } = req.body;
    // Verifica si worker_id es undefined, null o 0
    if (worker_id === undefined || worker_id === null || worker_id === 0) {
      worker_id = req.worker.id;
    }
    // Validar si la sucursal o compañía existe
    const branch = await BranchRepository.findById(branch_id);
    if (!branch) {
      logger.error(
        `TripController->getTripsByBranchAndWorker: Sucursal no encontrada con ID ${branch_id}`
      );
      return res.status(404).json({ msg: "BranchNotFound" });
    }

    try {
      // Obtener los tickets vendidos en la fecha dada
      const trips = await TripRepository.findTripsByBranchAndWorker(
        branch_id,
        date,
        endDate,
        worker_id
      );
      const mappedTrips = trips.map((trip) => {
        // Sumar la cantidad de pasajeros (quantity) de los tickets asociados
        const passenger = trip.tickets.reduce(
          (sum, ticket) => sum + (parseInt(ticket.quantity, 10) || 0),
          0
        );

        return {
          id: trip.id,
          date: trip.date,
          start: trip.start,
          end: trip.end,
          vehicleName: trip.vehicle.plate,
          vehicleImage: trip.vehicle.image,
          name: trip.route.name,
          origin: trip.route.origin.address,
          originImage: trip.route.origin.image,
          destination: trip.route.destination.address,
          destinationImage: trip.route.destination.image,
          passenger, // Usar la suma calculada
        };
      });

      res.status(200).json({ trips: mappedTrips });
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
