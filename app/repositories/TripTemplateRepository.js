const { Op } = require("sequelize");
const {
  TripTemplate,
  Branch,
  User,
  Vehicle,
  Route,
  Location,
  sequelize
} = require("../models");
const logger = require("../../config/logger");

const normalizeJsonArray = (value) => {
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

  return value ?? null;
};

const normalizeTemplatePayload = (templateData = {}, options = {}) => {
  const payload = { ...templateData };
  const hasWorkers = Object.prototype.hasOwnProperty.call(templateData, "workers");
  const hasTripStops =
    Object.prototype.hasOwnProperty.call(templateData, "trip_stops") ||
    Object.prototype.hasOwnProperty.call(templateData, "tripStops");

  if (hasWorkers) {
    payload.workers = normalizeJsonArray(templateData.workers) ?? [];
  }

  if (hasTripStops) {
    payload.trip_stops = normalizeJsonArray(
      templateData.trip_stops ?? templateData.tripStops
    );
  }

  if (options.forceDefaults) {
    if (!hasWorkers) {
      payload.workers = [];
    }

    if (!hasTripStops) {
      payload.trip_stops = null;
    }
  }

  return payload;
};

const resolveTripTemplateInstance = async (triptemplateOrId) => {
  if (
    triptemplateOrId &&
    typeof triptemplateOrId === "object" &&
    typeof triptemplateOrId.update === "function"
  ) {
    return triptemplateOrId;
  }

  return await TripTemplate.findByPk(triptemplateOrId);
};

const TripTemplateRepository = {
  async findAll(filters = {}) {
    const whereClause = {};
    
    // Aplicar filtros si existen
    if (filters.branch_id) whereClause.branch_id = filters.branch_id;
    if (filters.active !== undefined) whereClause.active = filters.active;
    if (filters.route_id) whereClause.route_id = filters.route_id;
    if (filters.vehicle_id) whereClause.vehicle_id = filters.vehicle_id;

    return await TripTemplate.findAll({
      attributes: [
        "id",
        "branch_id",
        "user_id",
        "vehicle_id",
        "route_id",
        "schedule",
        "duration",
        "price",
        "recurrence_pattern",
        "days_of_week",
        "active",
        "workers",
        "trip_stops",
      ],
      where: whereClause,
      include: [
        {
          model: Branch,
          as: "branch",
          attributes: ["id", "name", "address", "company_id"],
        },
        {
          model: Vehicle,
          as: "vehicle",
          attributes: ["id", "plate", "internal_number", "model", "seats", "image"],
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
      order: [["schedule", "ASC"]],
    });
  },

  async findById(id) {
    return await TripTemplate.findByPk(id, {
      attributes: [
        "id",
        "branch_id",
        "user_id",
        "vehicle_id",
        "route_id",
        "schedule",
        "duration",
        "price",
        "recurrence_pattern",
        "days_of_week",
        "active",
        "workers",
        "trip_stops",
        "createdAt",
        "updatedAt"
      ],
      include: [
        {
          model: Branch,
          as: "branch",
          attributes: ["id", "name", "address", "company_id"],
        },
        {
          model: Vehicle,
          as: "vehicle",
          attributes: ["id", "plate", "internal_number", "model", "seats", "image"],
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

  async create(templateData) {
    const transaction = await sequelize.transaction();
    
    try {
      const payload = normalizeTemplatePayload(templateData, {
        forceDefaults: true,
      });

      const template = await TripTemplate.create(payload, { transaction });

      await transaction.commit();
      logger.info(`TripTemplate creado exitosamente (ID: ${template.id})`);
      return template;
    } catch (error) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      logger.error(`Error creando TripTemplate: ${error.message}`);
      throw new Error("Error creando la plantilla de viaje");
    }
  },

  async update(triptemplate, updateData) {
    const transaction = await sequelize.transaction();
    
    try {
      const fieldsToUpdate = [
        "vehicle_id",
        "branch_id",
        "route_id",
        "schedule",
        "duration",
        "price",
        "recurrence_pattern",
        "days_of_week",
        "active",
        "workers",
        "trip_stops",
      ];

      const normalizedUpdateData = normalizeTemplatePayload(updateData);

      const updatedData = Object.keys(normalizedUpdateData)
        .filter(key => fieldsToUpdate.includes(key) && normalizedUpdateData[key] !== undefined)
        .reduce((obj, key) => {
          obj[key] = normalizedUpdateData[key];
          return obj;
        }, {});

      await triptemplate.update(updatedData, { transaction });
      await transaction.commit();
      
      logger.info(`TripTemplate actualizado (ID: ${triptemplate.id})`);
      return triptemplate;
    } catch (error) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      logger.error(`Error actualizando TripTemplate ID ${triptemplate.id}: ${error.message}`);
      throw new Error("Error actualizando la plantilla de viaje");
    }
  },

  async delete(id) {
    const transaction = await sequelize.transaction();
    
    try {
      const template = await TripTemplate.findByPk(id, { transaction });
      if (!template) {
        throw new Error("Plantilla de viaje no encontrada");
      }

      await template.destroy({ transaction });
      await transaction.commit();
      
      logger.info(`TripTemplate eliminado (ID: ${id})`);
      return true;
    } catch (error) {
      await transaction.rollback();
      logger.error(`Error eliminando TripTemplate ID ${id}: ${error.message}`);
      throw error;
    }
  },

  async findByRouteAndSchedule(routeId, schedule) {
    return await TripTemplate.findOne({
      where: {
        route_id: routeId,
        schedule: schedule
      }
    });
  },

  async activateTemplate(id) {
    return await this.update(id, { active: true });
  },

  async deactivateTemplate(id) {
    return await this.update(id, { active: false });
  },

  async updateWorkers(id, workers) {
    const triptemplate = await resolveTripTemplateInstance(id);
    if (!triptemplate) {
      throw new Error("Plantilla de viaje no encontrada");
    }

    return await this.update(triptemplate, { workers });
  },

  async updateTripStops(id, tripStops) {
    const triptemplate = await resolveTripTemplateInstance(id);
    if (!triptemplate) {
      throw new Error("Plantilla de viaje no encontrada");
    }

    return await this.update(triptemplate, { trip_stops: tripStops });
  },
};

module.exports = TripTemplateRepository;
