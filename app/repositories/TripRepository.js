const { Sequelize, Op } = require("sequelize");
const {
  Trip,
  Branch,
  Vehicle,
  Route,
  Location,
  TripWorker,
  Worker,
  Ticket,
  Structure,
  Company,
  sequelize,
} = require("../models");
const logger = require("../../config/logger"); // Logger para seguimiento

const TripRepository = {
  async findAll() {
    return await Trip.findAll({
      attributes: [
        "id",
        "date",
        "schedule",
        "arrival",
        "start",
        "end",
        "branch_id",
        "vehicle_id",
        "route_id",
        "price",
      ],
      include: [
        {
          model: Branch,
          as: "branch",
          attributes: ["id", "name"],
        },
        {
          model: Vehicle,
          as: "vehicle",
          attributes: ["id", "plate", "seats", "image"],
          include: [
            {
              model: Structure,
              as: "structure",
            },
          ],
        },
        {
          model: Route,
          as: "route",
          attributes: ["id", "name"],
          include: [
            {
              model: Location, // Relación con el modelo de origen
              as: "origin",
              attributes: ["id", "address", "image"], // Atributos a incluir de la tabla de origen
            },
            {
              model: Location, // Relación con el modelo de destino
              as: "destination",
              attributes: ["id", "address", "image"], // Atributos a incluir de la tabla de destino
            },
          ],
        },
      ],
    });
  },

  async findDate(branchId, workerId = null, date = null, ticket_id = null) {
    const today = new Date();
    const formattedToday = today.toLocaleDateString('es-CL', {
        timeZone: 'America/Santiago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).split('-').reverse().join('-');
    const searchDate = date || formattedToday;
    // Construir el objeto `where` dinámicamente
    const whereClause = {
      branch_id: branchId, // Filtra por branch_id (siempre aplicado)
    };

    if (workerId) {
        whereClause[Op.or] = [
        // Viajes del día actual (fecha normal)
        { date: { [Op.eq]: searchDate } },
        
        // Viajes que:
        // 1) empezaron antes de hoy
        // 2) no han terminado (end es null)
        // 3) arrival coincide con searchDate (hoy)
        {
          [Op.and]: [
            { start: { [Op.lte]: today } },
            { end: { [Op.is]: null } },
            Sequelize.where(
              Sequelize.fn('DATE', Sequelize.col('arrival')),
              { [Op.eq]: searchDate }
            )
          ]
        }
      ];
    } else {
      // Si no hay workerId, solo filtramos por fecha
      whereClause.date = { [Op.eq]: searchDate };
    }
    return await Trip.findAll({
      attributes: [
        "id",
        "date",
        "schedule",
        "arrival",
        "start",
        "end",
        "branch_id",
        "vehicle_id",
        "route_id",
        "price",
      ],
      where: whereClause, // Usar el objeto `where` construido dinámicamente
       order: [['date', 'ASC'], ['schedule', 'ASC']],
      include: [
        {
          model: Branch,
          as: "branch",
          attributes: ["id", "name"],
        },
        {
          model: Vehicle,
          as: "vehicle",
          attributes: ["id", "plate", "seats", "image"],
          include: [
            {
              model: Structure,
              as: "structure",
            },
          ],
        },
        {
          model: Route,
          as: "route",
          attributes: ["id", "name"],
          include: [
            {
              model: Location, // Relación con el modelo de origen
              as: "origin",
              attributes: ["id", "address", "image"], // Atributos a incluir de la tabla de origen
            },
            {
              model: Location, // Relación con el modelo de destino
              as: "destination",
              attributes: ["id", "address", "image"], // Atributos a incluir de la tabla de destino
            },
          ],
        },
        {
          model: Ticket, // Incluir los tickets relacionados
          as: "tickets",
          attributes: ["id", "seats", "qr_status", "quantity"], // Suponiendo que los asientos están en el campo 'seat_numbers' (como un array)
        },
        {
          model: Worker, // Incluir los trabajadores relacionados
          as: "workers",
          attributes: ["id", "name"], // Atributos que deseas incluir de Worker
          through: { attributes: [] }, // Excluir atributos de la tabla intermedia (TripWorker)
          where: workerId ? { id: workerId } : {}, // Filtro por workerId (si se proporciona)
        },
      ],
    });
  },

  async findDateWeb(branchId, workerId = null, date = null, ticket_id = null) {
  // Zona horaria fija para Chile
  const timeZone = 'America/Santiago';

  // Función auxiliar para formatear fecha en 'YYYY-MM-DD' en la zona horaria dada
  const formatDate = (d) => {
    return new Date(d).toLocaleDateString('sv-SE', { timeZone }); // 'sv-SE' da YYYY-MM-DD
  };

  const today = new Date();
  const startDate = formatDate(today);
  const endDate = formatDate(new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)); // +30 días
  // Si se pasa una fecha específica, usamos solo esa (como antes)
  const useRange = !date;
  const searchDate = date || startDate;

  const whereClause = {
    branch_id: branchId,
  };

  if (workerId) {
    if (useRange) {
      // Rango de fechas + lógica de viajes activos
      whereClause[Op.or] = [
        // Viajes programados en el rango de fechas
        {
          date: {
            [Op.gte]: startDate,
            [Op.lte]: endDate,
          },
        },
        // Viajes activos (sin end) cuyo arrival está en el rango
        {
          [Op.and]: [
            { start: { [Op.lte]: new Date(endDate) } }, // start <= fin del rango
            { end: { [Op.is]: null } },
            Sequelize.where(
              Sequelize.fn('DATE', Sequelize.col('arrival')),
              {
                [Op.gte]: startDate,
                [Op.lte]: endDate,
              }
            ),
          ],
        },
      ];
    } else {
      // Comportamiento original si se pasa una fecha específica
      whereClause[Op.or] = [
        { date: { [Op.eq]: searchDate } },
        {
          [Op.and]: [
            { start: { [Op.lte]: today } },
            { end: { [Op.is]: null } },
            Sequelize.where(
              Sequelize.fn('DATE', Sequelize.col('arrival')),
              { [Op.eq]: searchDate }
            ),
          ],
        },
      ];
    }
  } else {
    // Sin workerId: solo viajes con campo `date` en el rango
    if (useRange) {
      whereClause.date = {
        [Op.gte]: startDate,
        [Op.lte]: endDate,
      };
    } else {
      whereClause.date = { [Op.eq]: searchDate };
    }
  }

  return await Trip.findAll({
    attributes: [
      "id",
      "date",
      "schedule",
      "arrival",
      "start",
      "end",
      "branch_id",
      "vehicle_id",
      "route_id",
      "price",
    ],
    where: whereClause,
    order: [['date', 'ASC'], ['schedule', 'ASC']],
    include: [
      {
        model: Branch,
        as: "branch",
        attributes: ["id", "name"],
      },
      {
        model: Vehicle,
        as: "vehicle",
        attributes: ["id", "plate", "seats", "image"],
        include: [
          {
            model: Structure,
            as: "structure",
          },
        ],
      },
      {
        model: Route,
        as: "route",
        attributes: ["id", "name"],
        include: [
          {
            model: Location,
            as: "origin",
            attributes: ["id", "address", "image"],
          },
          {
            model: Location,
            as: "destination",
            attributes: ["id", "address", "image"],
          },
        ],
      },
      {
        model: Ticket,
        as: "tickets",
        attributes: ["id", "seats", "qr_status", "quantity"],
      },
      {
        model: Worker,
        as: "workers",
        attributes: ["id", "name"],
        through: { attributes: [] },
        where: workerId ? { id: workerId } : {},
      },
    ],
  });
},

  async findById(id) {
    return await Trip.findByPk(id, {
      attributes: [
        "id",
        "date",
        "schedule",
        "arrival",
        "start",
        "end",
        "branch_id",
        "vehicle_id",
        "route_id",
        "price",
      ],
      include: [
        {
          model: Branch,
          as: "branch",
          attributes: ["id", "name"],
        },
        {
          model: Vehicle,
          as: "vehicle",
          attributes: ["id", "plate", "image"],
          include: [
            {
              model: Structure,
              as: "structure",
            },
          ],
        },
        {
          model: Route,
          as: "route",
          attributes: ["id", "name"],
          include: [
            {
              model: Location, // Relación con el modelo de origen
              as: "origin",
              attributes: ["id", "address", "image"], // Atributos a incluir de la tabla de origen
            },
            {
              model: Location, // Relación con el modelo de destino
              as: "destination",
              attributes: ["id", "address", "image"], // Atributos a incluir de la tabla de destino
            },
          ],
        },
      ],
    });
  },

  async create(body) {
    //logger.info("Creando viaje...");
    //logger.info(body);
    const {
      date,
      schedule,
      arrival,
      start,
      end,
      branch_id,
      vehicle_id,
      route_id,
      price,
    } = body;

    try {
      const trip = await Trip.create({
        date,
        schedule,
        arrival,
        start,
        end,
        branch_id,
        vehicle_id,
        route_id,
        price,
      });

      logger.info(`Viaje creado exitosamente (ID: ${trip.id})`);
      return trip;
    } catch (error) {
      logger.error(`Error creando el viaje: ${error.message}`);
      throw new Error("Error creando el viaje");
    }
  },

  async update(trip, body) {
    const fieldsToUpdate = [
      "date",
      "schedule",
      "arrival",
      "start",
      "end",
      "branch_id",
      "vehicle_id",
      "route_id",
      "price",
    ];

    const updatedData = Object.keys(body)
      .filter((key) => fieldsToUpdate.includes(key) && body[key] !== undefined)
      .reduce((obj, key) => {
        obj[key] = body[key];
        return obj;
      }, {});

    if (Object.keys(updatedData).length > 0) {
      try {
        await trip.update(updatedData);
        logger.info(`Viaje actualizado exitosamente (ID: ${trip.id})`);
      } catch (error) {
        logger.error(`Error actualizando el viaje: ${error.message}`);
        throw new Error("Error actualizando el viaje");
      }
    }

    return trip;
  },

  async delete(trip) {
    try {
      await trip.destroy();
      logger.info(`Viaje eliminado exitosamente (ID: ${trip.id})`);
    } catch (error) {
      logger.error(`Error eliminando el viaje: ${error.message}`);
      throw new Error("Error eliminando el viaje");
    }
  },

  /*async existsByUpdatedFields(trip, updatedFields) {
    const whereClause = {};

    // Solo verificamos campos que son diferentes a los originales
    if (updatedFields.date !== undefined && updatedFields.date !== trip.date) {
        whereClause.date = updatedFields.date;
    }
    if (updatedFields.schedule !== undefined && updatedFields.schedule !== trip.schedule) {
        whereClause.schedule = updatedFields.schedule;
    }
    if (updatedFields.branch_id !== undefined && updatedFields.branch_id !== trip.branch_id) {
        whereClause.branch_id = updatedFields.branch_id;
    }
    if (updatedFields.vehicle_id !== undefined && updatedFields.vehicle_id !== trip.vehicle_id) {
        whereClause.vehicle_id = updatedFields.vehicle_id;
    }
    if (updatedFields.route_id !== undefined && updatedFields.route_id !== trip.route_id) {
        whereClause.route_id = updatedFields.route_id;
    }

    // Si hay campos modificados, buscamos si ya existe otro viaje con esos valores
    if (Object.keys(whereClause).length > 0) {
        whereClause.id = { [Op.ne]: trip.id }; // Excluir el viaje actual

        const existingTrip = await Trip.findOne({ where: whereClause });
        return existingTrip; // Si existe, significa que hay un duplicado
    }

    return null; // No hay cambios relevantes, no hay duplicado
},*/
async existsByUpdatedFields(trip, updatedFields) {
    const whereClause = {};

    // Solo verificamos campos que son diferentes a los originales
    if (updatedFields.date !== undefined && updatedFields.date !== trip.date) {
        whereClause.date = updatedFields.date;
    } else {
        whereClause.date = trip.date; // Mantener el valor original si no cambia
    }
    
    if (updatedFields.schedule !== undefined && updatedFields.schedule !== trip.schedule) {
        whereClause.schedule = updatedFields.schedule;
    } else {
        whereClause.schedule = trip.schedule; // Mantener el valor original si no cambia
    }
    
    if (updatedFields.branch_id !== undefined && updatedFields.branch_id !== trip.branch_id) {
        whereClause.branch_id = updatedFields.branch_id;
    } else {
        whereClause.branch_id = trip.branch_id; // Mantener el valor original si no cambia
    }
    
    if (updatedFields.vehicle_id !== undefined && updatedFields.vehicle_id !== trip.vehicle_id) {
        whereClause.vehicle_id = updatedFields.vehicle_id;
    } else {
        whereClause.vehicle_id = trip.vehicle_id; // Mantener el valor original si no cambia
    }
    
    if (updatedFields.route_id !== undefined && updatedFields.route_id !== trip.route_id) {
        whereClause.route_id = updatedFields.route_id;
    } else {
        whereClause.route_id = trip.route_id; // Mantener el valor original si no cambia
    }

    // Siempre excluir el viaje actual
    whereClause.id = { [Op.ne]: trip.id };

    const existingTrip = await Trip.findOne({ where: whereClause });
    return existingTrip;
},
  async updateTripWorkers(trip, body) {
    try {
      let { id: trip_id, branch_id, date, workers } = body; // Extraer los datos necesarios del body
      if (!date) {
        date = trip.date;
      }
      if (!branch_id) {
        branch_id = trip.branch_id;
      }
      // Obtener las relaciones actuales con sus IDs y worker_id
      const currentWorkers = await TripWorker.findAll({
        where: { trip_id, branch_id, date },
        attributes: ["id", "worker_id"], // Incluye el ID de la relación
      });

      // Crear un mapa: { worker_id: id }
      const currentWorkerMap = currentWorkers.reduce((map, worker) => {
        map[worker.worker_id] = worker.id; // Relacionar worker_id con el ID de la relación
        return map;
      }, {});

      // Obtener los IDs de los trabajadores del array recibido
      const newWorkerIds = workers.map((worker) => worker.worker_id);

      // Determinar los `worker_id` a eliminar (presentes en la base de datos, pero no en el array recibido)
      const workersToRemove = Object.keys(currentWorkerMap)
        .filter((worker_id) => !newWorkerIds.includes(parseInt(worker_id)))
        .map((worker_id) => currentWorkerMap[worker_id]); // Obtener el ID de la relación

      // Determinar los `worker_id` a agregar (presentes en el array recibido, pero no en la base de datos)
      const workersToAdd = newWorkerIds.filter(
        (worker_id) => !currentWorkerMap[worker_id]
      );

      // Eliminar relaciones obsoletas por ID
      if (workersToRemove.length > 0) {
        await TripWorker.destroy({
          where: {
            id: workersToRemove, // Elimina por ID directamente
          },
        });
      }

      // Agregar nuevas relaciones
      if (workersToAdd.length > 0) {
        const newRelations = workersToAdd.map((worker_id) => ({
          trip_id,
          branch_id,
          date,
          worker_id,
        }));
        await TripWorker.bulkCreate(newRelations);
      }

      logger.info("Trip workers actualizado correctamente.");
    } catch (error) {
      logger.error("Error actualizando trip workers:", error);
    }
  },

  async getTripsDate(type, id, date, endDate) {
    try {
      const whereClause = {};
      if (endDate && endDate.trim() !== "") {
        whereClause.date = {
          [Op.between]: [date, endDate], // Rango de fechas (inclusive)
        };
      } else {
        // Filtrar por una sola fecha si no se proporciona endDate
        whereClause.date = date;
      }

      if (type === "Company") {
        whereClause["$branch.company_id$"] = id;
      } else if (type === "Sucursal") {
        whereClause.branch_id = id;
      }

      const trips = await Trip.findAll({
        where: whereClause,
        include: [
          {
            model: Branch,
            as: "branch",
            include: [
              {
                model: Company,
                as: "company",
              },
            ],
          },
          {
            model: Ticket,
            as: "tickets",
          },
          {
            model: Route,
            as: "route",
            attributes: ["id", "name"],
            include: [
              {
                model: Location, // Relación con el modelo de origen
                as: "origin",
                attributes: ["id", "address", "image"], // Atributos a incluir de la tabla de origen
              },
              {
                model: Location, // Relación con el modelo de destino
                as: "destination",
                attributes: ["id", "address", "image"], // Atributos a incluir de la tabla de destino
              },
            ],
          },
        ],
      });

      return trips;
    } catch (error) {
      logger.error("Error al obtener los viajes y tickets:", error);
      throw error; // Re-lanzar el error para que pueda ser manejado en el nivel superior
    }
  },

  async getTripsDateWorker(branchId, date, endDate, workerId) {
    try {
      const whereClause = {
        branch_id: branchId // Siempre filtramos por sucursal
      };

      // Manejo de fechas
      if (endDate && endDate.trim() !== "") {
        whereClause.date = {
          [Op.between]: [date, endDate], // Rango de fechas (inclusive)
        };
      } else {
        whereClause.date = date;
      }

      const trips = await Trip.findAll({
        where: whereClause,
        include: [
          {
            model: Branch,
            as: "branch",
            include: [
              {
                model: Company,
                as: "company",
              },
            ],
          },
          {
            model: Ticket,
            as: "tickets",
          },
          {
            model: Route,
            as: "route",
            attributes: ["id", "name"],
            include: [
              {
                model: Location,
                as: "origin",
                attributes: ["id", "address", "image"],
              },
              {
                model: Location,
                as: "destination",
                attributes: ["id", "address", "image"],
              },
            ],
          },
          {
            model: TripWorker,
            as: "tripworkers",
            where: { worker_id: workerId }, // Filtramos por el trabajador
            required: true, // INNER JOIN para asegurar que existe la relación
          }
        ],
        order: [['date', 'ASC'], ['schedule', 'ASC']] // Ordenamos por fecha y hora de salida
      });

      return trips;
    } catch (error) {
      logger.error("Error al obtener los viajes y tickets:", error);
      throw error;
    }
  },

  async findTripsByBranchAndWorker(branchId, date, endDate, workerId) {
    const whereClause = {
      branch_id: branchId, // Siempre filtramos por branch_id
    };
    if (endDate && endDate.trim() !== "") {
      whereClause.date = {
        [Op.between]: [date, endDate], // Rango de fechas (inclusive)
      };
    } else {
      // Filtrar por una sola fecha si no se proporciona endDate
      whereClause.date = date;
    }
    return await Trip.findAll({
      include: [
        {
          model: Ticket,
          as: "tickets",
          attributes: ["quantity"], // No seleccionamos columnas individuales de Ticket
          required: true,
        },
        {
          model: TripWorker, // Asume que TripWorker es el modelo de la tabla de unión
          as: "tripworkers",
          where: { branch_id: branchId, worker_id: workerId }, // Aplicar la condición directamente en la tabla de unión
          attributes: [], // No seleccionamos columnas individuales de TripWorker
          required: true,
        },
        {
          model: Vehicle,
          as: "vehicle",
          attributes: ["id", "plate", "image"],
        },
        {
          model: Route,
          as: "route",
          attributes: ["id", "name"],
          include: [
            {
              model: Location, // Relación con el modelo de origen
              as: "origin",
              attributes: ["id", "address", "image"], // Atributos a incluir de la tabla de origen
            },
            {
              model: Location, // Relación con el modelo de destino
              as: "destination",
              attributes: ["id", "address", "image"], // Atributos a incluir de la tabla de destino
            },
          ],
        },
      ],
      where: whereClause,
    });
  },
};

module.exports = TripRepository;
