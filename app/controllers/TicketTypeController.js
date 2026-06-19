const logger = require("../../config/logger");
const { TicketTypeRepository } = require("../repositories");

const TicketTypeController = {
  // Listar todos los tipos de pasaje
  async index(req, res) {
    logger.info(`${req.user.name} - Accediendo a la lista de tipos de pasaje`);

    try {
      const ticketTypes = await TicketTypeRepository.findAll();
      const mappedTicketTypes = ticketTypes.map((ticketType) => ({
        ...ticketType.toJSON(),
        adjustmentType: ticketType.adjustment_type,
        valueType: ticketType.value_type,
        adjustmentValue: ticketType.adjustment_value,
      }));
      res.status(200).json({ ticketTypes: mappedTicketTypes });
    } catch (error) {
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";
      logger.error("Error en TicketTypeController->index: " + errorMsg);
      res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },

  // Listar tipos de pasaje activos
  async index_true(req, res) {
    logger.info(`${req.user.name} - Accediendo a la lista de tipos de pasaje activos`);

    try {
      const ticketTypes = await TicketTypeRepository.findByActiveStatus(1); // 1 para activos
      const mappedTicketTypes = ticketTypes.map((ticketType) => ({
        ...ticketType.toJSON(),
        adjustmentType: ticketType.adjustment_type,
        valueType: ticketType.value_type,
        adjustmentValue: ticketType.adjustment_value,
      }));
      res.status(200).json({ 'tickettypes' : mappedTicketTypes });
    } catch (error) {
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";
      logger.error("Error en TicketTypeController->index_true: " + errorMsg);
      res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },

  // Crear un nuevo tipo de pasaje
  async store(req, res) {
    logger.info(`${req.user.name} - Creando un nuevo tipo de pasaje`);
    logger.info("datos recibidos al crear un tipo de pasajero");
    logger.info(JSON.stringify(req.body));

    const existingTicketType = await TicketTypeRepository.existsByName(
      req.body.name
    );

    if (existingTicketType) {
      logger.error("El nombre del Tipo de Pasaje ya existe: " + req.body.name);
      return res.status(400).json({
        error: "DuplicateName",
        msg: "El nombre del tipo de pasaje ya existe.",
      });
    }

    try {
      const ticketType = await TicketTypeRepository.create(req.body);
      res.status(201).json({
        msg: "TicketTypeCreated",
        ticketType: {
          ...ticketType.toJSON(),
          adjustmentType: ticketType.adjustment_type,
          valueType: ticketType.value_type,
          adjustmentValue: ticketType.adjustment_value,
        },
      });
    } catch (error) {
      logger.error("Error en TicketTypeController->store: " + error.message);
      res.status(500).json({ error: "ServerError" });
    }
  },

  // Mostrar un tipo de pasaje específico
  async show(req, res) {
    logger.info(`${req.user.name} - Accediendo a un tipo de pasaje específico`);

    try {
      const ticketType = await TicketTypeRepository.findById(req.body.id);
      if (!ticketType) {
        return res.status(204).json({ msg: "TicketTypeNotFound" });
      }

      res.status(200).json({
        'tickettype' : {
          ...ticketType.toJSON(),
          adjustmentType: ticketType.adjustment_type,
          valueType: ticketType.value_type,
          adjustmentValue: ticketType.adjustment_value,
        },
      });
    } catch (error) {
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";
      logger.error("TicketTypeController->show: " + errorMsg);
      res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },

  // Actualizar un tipo de pasaje
  async update(req, res) {
    logger.info(`${req.user.name} - Editando un tipo de pasaje`);
    logger.info("datos recibidos al editar un tipo de pasajero");
    logger.info(JSON.stringify(req.body));
    const { name, id } = req.body;
    
    try {
      const ticketType = await TicketTypeRepository.findById(id);
      if (!ticketType) {
        return res.status(204).json({ msg: "TicketTypeNotFound" });
      }

      if (name) {
        const existingTicketType = await TicketTypeRepository.existsByName(name, id);

        if (existingTicketType) {
          logger.error("El nombre ya existe en otro tipo de pasaje: " + name);
          return res.status(400).json({
            error: "DuplicateName",
            msg: "El nombre ya existe en otro tipo de pasaje.",
          });
        }
      }

      const updatedTicketType = await TicketTypeRepository.update(
        ticketType,
        req.body
      );

      res.status(200).json({
        msg: "TicketTypeUpdated",
        updatedTicketType: {
          ...updatedTicketType.toJSON(),
          adjustmentType: updatedTicketType.adjustment_type,
          valueType: updatedTicketType.value_type,
          adjustmentValue: updatedTicketType.adjustment_value,
        },
      });
    } catch (error) {
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";
      logger.error(
        `TicketTypeController->update: Error al actualizar el tipo de pasaje: ${errorMsg}`
      );
      res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },

  // Eliminar un tipo de pasaje
  async destroy(req, res) {
    logger.info(`${req.user.name} - Eliminando un tipo de pasaje`);

    try {
      const ticketType = await TicketTypeRepository.findById(req.body.id);
      if (!ticketType) {
        return res.status(204).json({ msg: "TicketTypeNotFound" });
      }

      await TicketTypeRepository.delete(ticketType);
      res.status(200).json({ msg: "TicketTypeDeleted" });
    } catch (error) {
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";
      logger.error(
        `TicketTypeController->destroy: Error al eliminar el tipo de pasaje: ${errorMsg}`
      );
      res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },

  // Obtener tipos de pasaje por estado activo
  async getByActiveStatus(req, res) {
    logger.info(`${req.user.name} - Buscando tipos de pasaje por estado activo`);

    try {
      const { active } = req.body;
      const ticketTypes = await TicketTypeRepository.findByActiveStatus(active);

      if (!ticketTypes || ticketTypes.length === 0) {
        return res.status(404).json({
          message: "No se encontraron tipos de pasaje para el estado especificado.",
        });
      }

      const mappedTicketTypes = ticketTypes.map((ticketType) => ({
        ...ticketType.toJSON(),
        adjustmentType: ticketType.adjustment_type,
        valueType: ticketType.value_type,
        adjustmentValue: ticketType.adjustment_value,
      }));

      return res.status(200).json({ ticketTypes: mappedTicketTypes });
    } catch (error) {
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";
      logger.error(
        "TicketTypeController->getByActiveStatus: " + errorMsg
      );
      res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },
};

module.exports = TicketTypeController;
