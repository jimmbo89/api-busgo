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

    const { branch_id } = req.body;
    const branch = await BranchRepository.findById(branch_id);
    if (!branch) {
      logger.error(
        `TripController->index_branch_date: Sucursal no encontrada con ID ${branch_id}`
      );
      return res.status(400).json({ msg: "BranchNotFound" });
    }

    try {
      const trips = await TripRepository.findDate(branch_id);

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

    const { ticket_id, branch_id } = req.body;
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
      const trips = await TripRepository.findDate(req.body.branch_id);

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
          const seatMap = Array.isArray(trip.vehicle.structure.seatMap)
            ? trip.vehicle.structure.seatMap // Si ya es un array, lo usas directamente
            : JSON.parse(trip.vehicle.structure.seatMap);
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

      res.status(200).json({ trips: mappedTrips });
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

  // Actualizar un viaje
  async update(req, res) {
    logger.info(`${req.user.name} - Actualiza el viaje con ID ${req.body.id}`);
    logger.info("datos recibidos al editar un viaje");
    logger.info(JSON.stringify(req.body));

    const {
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
};

module.exports = TripController;
