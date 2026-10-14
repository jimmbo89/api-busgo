const { Op } = require("sequelize");
const {
  TripTemplate,
  Branch,
  User,
  Vehicle,
  Route,
  Location,
  TicketTemplate,
  sequelize
} = require("../models");
const logger = require("../../config/logger");

const normalizeJsonArray = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

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

  if (typeof value === "string" && value.trim() === "") {
    return [];
  }

  return [];
};

const normalizeSaleMode = (value) => {
  if (value === undefined || value === null || value === "") {
    return "normal";
  }

  return String(value).trim().toLowerCase();
};

const normalizeTemplatePayload = (templateData = {}, options = {}) => {
  const payload = { ...templateData };
  const hasWorkers = Object.prototype.hasOwnProperty.call(templateData, "workers");
  const hasSaleMode =
    Object.prototype.hasOwnProperty.call(templateData, "saleMode") ||
    Object.prototype.hasOwnProperty.call(templateData, "sale_mode");
  const hasTripStops =
    Object.prototype.hasOwnProperty.call(templateData, "trip_stops") ||
    Object.prototype.hasOwnProperty.call(templateData, "tripStops");
  const hasTripFares =
    Object.prototype.hasOwnProperty.call(templateData, "trip_fares") ||
    Object.prototype.hasOwnProperty.call(templateData, "tripFares");
  const hasTicketTemplate =
    Object.prototype.hasOwnProperty.call(templateData, "ticket_template_id") ||
    Object.prototype.hasOwnProperty.call(templateData, "ticketTemplateId");

  if (hasWorkers) {
    payload.workers = normalizeJsonArray(templateData.workers) ?? [];
  }

  if (hasSaleMode) {
    payload.saleMode = normalizeSaleMode(
      templateData.saleMode ?? templateData.sale_mode
    );
    delete payload.sale_mode;
  }

  if (hasTripStops) {
    payload.trip_stops = normalizeJsonArray(
      templateData.trip_stops ?? templateData.tripStops
    );
  }

  if (hasTripFares) {
    payload.trip_fares = normalizeJsonArray(
      templateData.trip_fares ?? templateData.tripFares
    );
  }

  if (hasTicketTemplate) {
    payload.ticket_template_id = templateData.ticket_template_id !== undefined
      ? templateData.ticket_template_id
      : templateData.ticketTemplateId;
    delete payload.ticketTemplateId;
  }

  if (options.forceDefaults) {
    if (!hasWorkers) {
      payload.workers = [];
    }

    if (!hasSaleMode) {
      payload.saleMode = "normal";
    }

    if (!hasTripStops) {
      payload.trip_stops = null;
    }

    if (!hasTripFares) {
      payload.trip_fares = null;
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

const hideDeletedTicketTemplateAssociation = (template) => {
  if (
    template?.ticket_template_id !== null &&
    template?.ticket_template_id !== undefined &&
    !template.ticketTemplate &&
    typeof template.setDataValue === 'function'
  ) {
    template.setDataValue('ticket_template_id', null);
  }

  return template;
};

const TripTemplateRepository = {
  async findAll(filters = {}) {
    const whereClause = {};
    const companyId = filters.company_id ?? filters.companyId;
    
    // Aplicar filtros si existen
    if (filters.branch_id) whereClause.branch_id = filters.branch_id;
    if (filters.active !== undefined) whereClause.active = filters.active;
    if (filters.route_id) whereClause.route_id = filters.route_id;
    if (filters.vehicle_id) whereClause.vehicle_id = filters.vehicle_id;
    if (filters.saleMode || filters.sale_mode) {
      whereClause.saleMode = normalizeSaleMode(filters.saleMode ?? filters.sale_mode);
    }

    const branchInclude = {
      model: Branch,
      as: "branch",
      attributes: ["id", "name", "address", "company_id"],
    };

    if (companyId !== undefined && companyId !== null) {
      branchInclude.where = { company_id: companyId };
      branchInclude.required = true;
    }

    const templates = await TripTemplate.findAll({
      attributes: [
        "id",
        "branch_id",
        "user_id",
        "vehicle_id",
        "route_id",
        "schedule",
        "duration",
        "price",
        "saleMode",
        "ticket_template_id",
        "recurrence_pattern",
        "days_of_week",
        "active",
        "workers",
        "trip_stops",
        "trip_fares",
      ],
      where: whereClause,
      include: [
        branchInclude,
        {
          model: Vehicle,
          as: "vehicle",
          attributes: ["id", "plate", "internal_number", "model", "seats", "image"],
        },
        {
          model: Route,
          as: "route",
          attributes: ["id", "code", "name"],
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
          model: TicketTemplate,
          as: "ticketTemplate",
          attributes: ["id", "name", "trip_type", "status"],
          where: { status: { [Op.ne]: "deleted" } },
          required: false,
        },
      ],
      order: [["schedule", "ASC"]],
    });

    return templates.map(hideDeletedTicketTemplateAssociation);
  },

  async findById(id) {
    const template = await TripTemplate.findByPk(id, {
      attributes: [
        "id",
        "branch_id",
        "user_id",
        "vehicle_id",
        "route_id",
        "schedule",
        "duration",
        "price",
        "saleMode",
        "ticket_template_id",
        "recurrence_pattern",
        "days_of_week",
        "active",
        "workers",
        "trip_stops",
        "trip_fares",
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
          attributes: ["id", "code", "name"],
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
          model: TicketTemplate,
          as: "ticketTemplate",
          attributes: ["id", "name", "trip_type", "status"],
          where: { status: { [Op.ne]: "deleted" } },
          required: false,
        },
      ],
    });

    return hideDeletedTicketTemplateAssociation(template);
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
        "saleMode",
        "ticket_template_id",
        "recurrence_pattern",
        "days_of_week",
        "active",
        "workers",
        "trip_stops",
        "trip_fares",
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
