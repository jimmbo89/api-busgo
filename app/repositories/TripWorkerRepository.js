const { Op } = require("sequelize");
const { TripWorker, Branch, Trip, Worker, Route, BranchWorker, Role} = require("../models");
const logger = require("../../config/logger"); // Logger para seguimiento

const TripWorkerRepository = {
  async findAll() {
    return await TripWorker.findAll({
      attributes: ["id", "branch_id", "trip_id", "worker_id", "date"],
      include: [
        {
          model: Branch,
          as: "branch",
          attributes: ["id", "name"],
        },
        {
          model: Trip,
          as: "trip",
          attributes: ["id", "date", "schedule", "start", "end"],
          include: [
            {
              model: Route,
              as: "route",
              attributes: ["id", "name"],
            },
          ],
        },
        {
          model: Worker,
          as: "worker",
          attributes: ["id", "name"], // Aquí agregas los atributos que necesites de Worker
        },
      ],
    });
  },

  async findById(id) {
    return await TripWorker.findByPk(id, {
      attributes: ["id", "branch_id", "trip_id", "worker_id", "date"],
      include: [
        {
          model: Branch,
          as: "branch",
          attributes: ["id", "name"],
        },
        {
          model: Trip,
          as: "trip",
          attributes: ["id", "date", "schedule", "start", "end"],
          include: [
            {
              model: Route,
              as: "route",
              attributes: ["id", "name"],
            },
          ],
        },
        {
          model: Worker,
          as: "worker",
          attributes: ["id", "name"],
        },
      ],
    });
  },

  async create(body) {
    const { branch_id, trip_id, worker_id, date } = body;
    logger.info(`Creando relación TripWorker con ID: ${branch_id}`);

    try {
      const tripWorker = await TripWorker.create({
        branch_id,
        trip_id,
        worker_id,
        date,
      });

      logger.info(
        `Relación TripWorker creada exitosamente (ID: ${tripWorker.id})`
      );
      return tripWorker;
    } catch (error) {
      logger.error(`Error creando la relación TripWorker: ${error.message}`);
      throw new Error("Error creando la relación TripWorker");
    }
  },

  async update(tripWorker, body) {
    const fieldsToUpdate = ["branch_id", "trip_id", "worker_id", "date"];

    const updatedData = Object.keys(body)
      .filter((key) => fieldsToUpdate.includes(key) && body[key] !== undefined)
      .reduce((obj, key) => {
        obj[key] = body[key];
        return obj;
      }, {});

    if (Object.keys(updatedData).length > 0) {
      try {
        await tripWorker.update(updatedData);
        logger.info(
          `Relación TripWorker actualizada exitosamente (ID: ${tripWorker.id})`
        );
      } catch (error) {
        logger.error(
          `Error actualizando la relación TripWorker: ${error.message}`
        );
        throw new Error("Error actualizando la relación TripWorker");
      }
    }

    return tripWorker;
  },

  async delete(tripWorker) {
    try {
      await tripWorker.destroy();
      logger.info(
        `Relación TripWorker eliminada exitosamente (ID: ${tripWorker.id})`
      );
    } catch (error) {
      logger.error(`Error eliminando la relación TripWorker: ${error.message}`);
      throw new Error("Error eliminando la relación TripWorker");
    }
  },

  async existsByUpdatedFields(updatedFields, currentId = null) {
    const whereClause = {
      date: updatedFields.date,
      branch_id: updatedFields.branch_id,
      trip_id: updatedFields.trip_id,
      worker_id: updatedFields.worker_id,
    };

    // Si estás en modo edición, excluye el registro actual del chequeo
    if (currentId) {
      whereClause.id = { [Op.ne]: currentId }; // Excluir el registro con el ID actual
    }

    // Verificar si existe un registro duplicado
    const existingTripWorker = await TripWorker.findOne({ where: whereClause });

    return !!existingTripWorker; // Devuelve `true` si existe un duplicado, `false` si no
  },
  async workersTrip(trip) {
    const workersTrip = await TripWorker.findAll({
      where: { trip_id: trip.id },
      include: [
        {
          model: Worker,
          as: "worker",
          include: [
            {
              model: BranchWorker,
              as: "branchWorkers", // El alias de la relación entre Worker y BranchWorker
              where: { branch_id: trip.branch_id }, // Filtramos por el branch_id que necesitamos
              include: [
                {
                  model: Role,
                  as: "role", // El alias de la relación entre BranchWorker y Role
                  attributes: ["id", "name"], // Asegúrate de seleccionar los atributos relevantes del modelo Role
                },
              ],
            },
          ],
        },
      ],
    });

    // Devolver las personas mapeadas
    let worker = workersTrip.map((workerTrip) => {
        // Asegúrate de que 'branchWorkers' no sea undefined
        const branchWorker = workerTrip.worker.branchWorkers ? workerTrip.worker.branchWorkers[0] : null;
    
        return {
          id: workerTrip.worker_id,
          name: workerTrip.worker.name,
          image: workerTrip.worker.image,
          roleId: branchWorker ? branchWorker.role_id : null,  // Comprobación de null
          roleName: branchWorker ? branchWorker.role.name : null, // Comprobación de null
        };
      });

    return worker;
  },

};

module.exports = TripWorkerRepository;
