const logger = require("../../config/logger"); // Logger para seguimiento
const { IncidentRepository, BranchRepository, CompanyRepository } = require("../repositories");

const padDatePart = (value) => String(value).padStart(2, "0");

const formatIncidentDateWithCreatedTime = (incident) => {
  const incidentDate =
    typeof incident.date === "string"
      ? incident.date
      : incident.date?.toISOString().slice(0, 10);

  const createdAt = incident.createdAt ? new Date(incident.createdAt) : null;

  if (!incidentDate || !createdAt || Number.isNaN(createdAt.getTime())) {
    return incident.date;
  }

  return `${incidentDate} ${padDatePart(createdAt.getHours())}:${padDatePart(
    createdAt.getMinutes()
  )}`;
};

const IncidentController = {
  /**
   * Crear una incidencia
   */
  async store(req, res) {
    logger.info(`${req.user.name} - Crea una nueva incidencia`);
    logger.info("Datos recibidos al crear una incidencia");
    logger.info(JSON.stringify(req.body));

    req.body.user_id = req.user.id;

    const branch = await BranchRepository.findById(req.body.branch_id);
    if (!branch) {
      logger.error(
        `IncidentController->store: Sucursal no encontrada con ID ${req.body.branch_id}`
      );
      return res.status(400).json({ msg: "BranchNotFound" });
    }

    try {
      const incident = await IncidentRepository.create(req.body);

      res.status(201).json({ incident });
    } catch (error) {
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";

      logger.error("IncidentController->store: " + errorMsg);
      return res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },

  async getIncidents(req, res) {
    logger.info(`${req.user.name} - entra a buscar las incidencias`);
    logger.info("Datos recibidos buscar las incidencias");
    logger.info(JSON.stringify(req.body));
    try {
      const { company_id, branch_id, startDate, endDate } = req.body;

      let incidents = [];

      if (company_id) {
        const company = await CompanyRepository.findById(company_id);
        if (!company) {
          logger.error(
            `IncidentController->getIncidents: Empresa no encontrada con ID ${company_id}`
          );
          return res.status(400).json({ msg: "CompanyNotFound" });
        }

        incidents = await IncidentRepository.getIncidentsByCompanyAndDate(
          company_id,
          startDate,
          endDate
        );
      } else {
        const branch = await BranchRepository.findById(branch_id);
        if (!branch) {
          logger.error(
            `IncidentController->getIncidents: Sucursal no encontrada con ID ${branch_id}`
          );
          return res.status(400).json({ msg: "BranchNotFound" });
        }

        incidents = await IncidentRepository.getIncidentsByBranchAndDate(
          branch_id,
          startDate,
          endDate
        );
      }

      logger.info('JSON.stringify(incidents)');
      logger.info(JSON.stringify(incidents));
      // Formatear la respuesta
      const formattedIncidents = incidents.map((incident) => {
        return {
          id: incident.id,
          title: incident.title,
          description: incident.description,
          date: formatIncidentDateWithCreatedTime(incident),
          details: incident.details,
          workerName: incident.user.worker.name,
          image: incident.user.worker.image,
          nameBranch: incident.branch?.name,
          imageBranch: incident.branch?.image,
          branchId: incident.branch_id,
          branch_id: incident.branch_id,
          workerId: incident.worker_id,
          worker_d: incident.worker_id,
        };
      });

      res.status(200).json({ incidents: formattedIncidents });
    } catch (error) {
      console.error("Error in incidentController.getIncidents:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
        errorDetails:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  },
  /**
   * Obtener todas las incidencias
   */
  async index(req, res) {
    try {
      const incidents = await IncidentRepository.index();
      const mappedIncidents = incidents.map((incident) => ({
        id: incident.id,
        user_id: incident.user_id,
        branch_id: incident.branch_id,
        userId: incident.user_id,
        branchId: incident.branch_id,
        nameBranch: incident.branch.name,
        data: JSON.parse(incident.data),
        title: incident.title,
        description: incident.description,
        date: incident.date, // Convertir la fecha a formato ISO
        // Otros campos que puedas necesitar
      }));
      res.status(200).json({ incidents: mappedIncidents });
    } catch (error) {
      logger.error("IncidentController->index: " + error.message);
      return res
        .status(500)
        .json({ error: "ServerError", details: error.message });
    }
  },

  /**
   * Obtener una incidencia por ID
   */
  async show(req, res) {
    const { id } = req.body;

    try {
      const incident = await IncidentRepository.findById(id);
      if (!incident) {
        return res.status(404).json({ msg: "IncidentNotFound" });
      }

      const mappedIncident = {
        id: incident.id,
        user_id: incident.user_id,
        branch_id: incident.branch_id,
        userId: incident.user_id,
        branchId: incident.branch_id,
        nameBranch: incident.branch.name,
        data: JSON.parse(incident.data),
        title: incident.title,
        description: incident.description,
        date: incident.date, // Convertir la fecha a formato ISO
      };

      res.status(200).json({ incident: mappedIncident });
    } catch (error) {
      logger.error("IncidentController->show: " + error.message);
      return res
        .status(500)
        .json({ error: "ServerError", details: error.message });
    }
  },

  /**
   * Actualizar una incidencia
   */
  async update(req, res) {
    const { id, branch_id } = req.body;

    if (branch_id) {
      const branch = await BranchRepository.findById(branch_id);
      if (!branch) {
        logger.error(
          `IncidentController->update: Sucursal no encontrada con ID ${branch_id}`
        );
        return res.status(400).json({ msg: "BranchNotFound" });
      }
    }

    try {
      const incident = await IncidentRepository.update(id, req.body);

      if (!incident) {
        return res.status(404).json({ msg: "IncidentNotFound" });
      }

      res.status(200).json(incident);
    } catch (error) {
      logger.error("IncidentController->update: " + error.message);
      return res
        .status(500)
        .json({ error: "ServerError", details: error.message });
    }
  },

  /**
   * Eliminar una incidencia
   */
  async delete(req, res) {
    const { id } = req.body;

    try {
      const success = await IncidentRepository.delete(id);
      if (!success) {
        return res.status(404).json({ msg: "IncidentNotFound" });
      }

      res.status(200).json({ msg: "IncidentDeleted" });
    } catch (error) {
      logger.error("IncidentController->delete: " + error.message);
      return res
        .status(500)
        .json({ error: "ServerError", details: error.message });
    }
  },

  /**
   * Obtener incidencias del mes actual por branch_id
   */
  async findByBranchAndMonth(req, res) {
    const { month, type, branch_id } = req.body;

    if (branch_id) {
      const branch = await BranchRepository.findById(branch_id);
      if (!branch) {
        logger.error(
          `IncidentController->findByBranchAndMonth: Sucursal no encontrada con ID ${branch_id}`
        );
        return res.status(400).json({ msg: "BranchNotFound" });
      }
    }

    try {
      const { incidents, totalIncidents } =
        await IncidentRepository.getIncidentsByBranchMonth(
          month,
          type,
          branch_id
        );
      mappedIncidents = incidents.map((incident) => ({
        id: incident.id,
        user_id: incident.user_id,
        branch_id: incident.branch_id,
        userId: incident.user_id,
        branchId: incident.branch_id,
        nameBranch: incident.branch.name,
        data: JSON.parse(incident.data),
        title: incident.title,
        description: incident.description,
        date: incident.date, // Convertir la fecha a formato ISO
        // Otros campos que puedas necesitar
      }));
      res.status(200).json({ incidents: mappedIncidents });
    } catch (error) {
      logger.error(
        "IncidentController->findByBranchAndMonth: " + error.message
      );
      return res
        .status(500)
        .json({ error: "ServerError", details: error.message });
    }
  },
};

module.exports = IncidentController;
