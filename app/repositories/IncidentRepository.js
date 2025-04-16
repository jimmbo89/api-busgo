const { Op } = require("sequelize");
const { Incident, Branch, Worker, User, sequelize } = require("../models"); // Importa el modelo de Incident
const logger = require("../../config/logger");

const IncidentRepository = {
  async create(body) {
    const { branch_id, user_id, title, description, details, date } = body;

    try {
      const incident = await Incident.create({
        branch_id,
        user_id,
        title,
        description,
        details: JSON.stringify(details), // Convierte JSON a string
        date: date || new Date(), // Usa la fecha actual si no se proporciona
      });

      return incident;
    } catch (error) {
      logger.error(`Error en IncidentRepository->create: ${error.message}`);
      throw error;
    }
  },

  async index() {
    try {
      const incidents = await Incident.findAll({
        include: [
          {
            model: Branch,
            as: "branch", // Incluir persona si también es necesario
            atributes: ["id", "name", "image"],
          },
        ],
      });

      return incidents;
    } catch (error) {
      logger.error(`Error en IncidentRepository->index: ${error.message}`);
      throw error;
    }
  },

  async findById(id) {
    try {
      const incident = await Incident.findByPk(id, {
        include: [
          {
            model: Branch,
            as: "branch", // Incluir persona si también es necesario
            atributes: ["name", "image"],
          },
        ],
      });
      return incident;
    } catch (error) {
      logger.error(`Error en IncidentRepository->findById: ${error.message}`);
      throw error;
    }
  },

  async update(id, body) {
    try {
      const incident = await Incident.findByPk(id);
      if (!incident) return null;

      await incident.update({
        branch_id: body.branch_id || incident.branch_id,
        user_id: body.user_id || incident.user_id,
        title: body.title || incident.title,
        description: body.description || incident.description,
        details: body.details ? JSON.stringify(body.details) : incident.details,
        date: body.date || incident.date,
      });

      return incident;
    } catch (error) {
      logger.error(`Error en IncidentRepository->update: ${error.message}`);
      throw error;
    }
  },

  async delete(id) {
    try {
      const deleted = await Incident.destroy({ where: { id } });
      return deleted > 0;
    } catch (error) {
      logger.error(`Error en IncidentRepository->delete: ${error.message}`);
      throw error;
    }
  },

  async getIncidentsByBranchMonth(month, type, branchId = null) {
    try {
      const whereClause = {
        [Op.and]: [
          sequelize.where(
            sequelize.fn("DATE_FORMAT", sequelize.col("date"), "%Y-%m"),
            month
          ),
          //{ pay: 1 },
        ],
      };

      // Si el tipo es "Sucursal" y hay un branchId, filtrar por branch_id
      if (type === "Sucursal" && branchId) {
        whereClause[Op.and].push({ branch_id: branchId });
      }

      // Obtener las incidencias
      const incidents = await Incident.findAll({
        where: whereClause,
        include: [
          {
            model: Branch,
            as: "branch",
            attributes: ["name", "image"],
          },
        ],
      });

      return {
        totalIncidents: incidents.length,
        incidents, // Retorna el array completo
      };
    } catch (error) {
      logger.error(
        `Error en IncidentRepository->getIncidentsByBranchMonth: ${error.message}`
      );
      throw error;
    }
  },

  async getIncidentsByBranchAndDate( branch_id, startDate = null, endDate = null ) {
    try {
      let dateFilter = {};

      // Si no se proporcionan fechas, usar el día actual
      if (!startDate && !endDate) {
        const today = new Date().toISOString().split("T")[0]; // Formato YYYY-MM-DD

        dateFilter = {
          date: today,
        };
      } else {
        // Construir filtro basado en las fechas proporcionadas
        const filter = {};

        if (startDate) {
          filter[Op.gte] = startDate;
        }

        if (endDate) {
          filter[Op.lte] = endDate;
        }

        dateFilter = {
          date: filter,
        };
      }

      const whereClause = branch_id ? { ...dateFilter, branch_id } : dateFilter;

      const incidents = await Incident.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: "user",
            include: [
              {
                model: Worker,
                as: "worker",
              },
            ],
          },
        ],
        order: [["date", "DESC"]], // Ordenar por date en lugar de createdAt
      });

      return incidents;
    } catch (error) {
      logger.error(
        "Error in IncidentRepository.getIncidentsByBranchAndDate:",
        error
      );
      throw new Error("Failed to retrieve incidents");
    }
  },
};

module.exports = IncidentRepository;
