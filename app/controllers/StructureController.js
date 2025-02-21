const logger = require("../../config/logger"); // Importa el logger
const { StructureRepository } = require("../repositories");

const StructureController = {
  // Listar estructuras
  async index(req, res) {
    logger.info(`${req.user.name} - Accediendo a la lista de estructuras`);

    try {
      const structures = await StructureRepository.findAll();

      // Mapeo de las estructuras para asegurarnos que `seats` y `seatMap` sean tratados como arrays
      const mappedStructures = structures.map((structure) => {
        return {
          ...structure.dataValues, // Copiar todos los valores originales
          seats: Array.isArray(structure.seats)
                    ? structure.seats // Si ya es un array, lo usas directamente
                    : JSON.parse(structure.seats),
          seatMap: Array.isArray(structure.seatMap)
                    ? structure.seatMap // Si ya es un array, lo usas directamente
                    : JSON.parse(structure.seatMap), // Lo mismo para seatMap
        };
      });

      res.status(200).json({ structures: mappedStructures });
    } catch (error) {
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";
      logger.error("Error en StructureController->index: " + errorMsg);
      res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },

  /*async index_cursor(req, res) {
    logger.info(`${req.user.name} - Accediendo a la lista de estructuras`);
    logger.info(JSON.stringify(req.body));
    try {
      const { limit = 10, cursor, search, page } = req.body;
      // Validar que limit y page sean números válidos
    const parsedLimit = parseInt(limit, 10);
    const parsedPage = parseInt(page, 10);
      const { structures, hasMore, total, nextCursor } = await StructureRepository.findAllPaginated(
        limit,
        cursor,
        page,
        search
      );

      // Mapeo de las estructuras para asegurarnos que `seats` y `seatMap` sean tratados como arrays
      const mappedStructures = structures.map((structure) => {
        return {
          ...structure.dataValues, // Copiar todos los valores originales
          seats: Array.isArray(structure.seats)
                    ? structure.seats // Si ya es un array, lo usas directamente
                    : JSON.parse(structure.seats),
          seatMap: Array.isArray(structure.seatMap)
                    ? structure.seatMap // Si ya es un array, lo usas directamente
                    : JSON.parse(structure.seatMap), // Lo mismo para seatMap
        };
      });

      res.status(200).json({ structures: mappedStructures, hasMore, total, nextCursor });
    } catch (error) {
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";
      logger.error("Error en StructureController->index_cursor: " + errorMsg);
      res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },*/

  async index_cursor(req, res) {
    logger.info(`${req.user.name} - Accediendo a la lista de estructuras`);
    logger.info(JSON.stringify(req.body));
  
    try {
      const { limit = 10, cursor = null, page = 1, search = '' } = req.body;
  
      // Validar que limit y page sean números válidos
      const parsedLimit = parseInt(limit, 10);
      const parsedPage = parseInt(page, 10);
  
      // Obtener los datos paginados
      const { structures, total, nextCursor } = await StructureRepository.findAllPaginated(
        parsedLimit,
        cursor,
        parsedPage,
        search
      );
  
      // Mapear las estructuras para asegurarnos de que seats y seatMap sean arrays
      const mappedStructures = structures.map((structure) => {
        return {
          ...structure.dataValues,
          seats: Array.isArray(structure.seats) ? structure.seats : JSON.parse(structure.seats),
          seatMap: Array.isArray(structure.seatMap) ? structure.seatMap : JSON.parse(structure.seatMap),
        };
      });
  
      // Devolver la respuesta
      res.status(200).json({ structures: mappedStructures, total, nextCursor });
    } catch (error) {
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";
      logger.error("Error en StructureController->index_cursor: " + errorMsg);
      res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },
  // Crear una nueva estructura
  async store(req, res) {
    logger.info(`${req.user.name} - Creando una nueva estructura`);
    logger.info("Datos recibidos al crear una structura");
    logger.info(JSON.stringify(req.body));

    try {
      const structure = await StructureRepository.create(req.body);
      res.status(201).json({ msg: "StructureCreated", structure });
    } catch (error) {
      logger.error("Error en StructureController->store: " + error.message);
      res.status(500).json({ error: "ServerError" });
    }
  },

  // Mostrar una estructura específica
  async show(req, res) {
    logger.info(`${req.user.name} - Accediendo a una estructura específica`);

    try {
      const structure = await StructureRepository.findById(req.body.id);
      if (!structure) {
        return res.status(204).json({ msg: "StructureNotFound" });
      }

      res.status(200).json({ structure });
    } catch (error) {
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";
      logger.error("StructureController->show: " + errorMsg);
      res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },

  // Actualizar una estructura
  async update(req, res) {
    logger.info(`${req.user.name} - Editando una estructura`);

    try {
      const structure = await StructureRepository.findById(req.body.id);
      if (!structure) {
        return res.status(204).json({ msg: "StructureNotFound" });
      }

      const structureUpdate = await StructureRepository.update(
        structure,
        req.body
      );
      res.status(200).json({ msg: "StructureUpdated", structureUpdate });
    } catch (error) {
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";
      logger.error(
        `StructureController->update: Error al actualizar la estructura: ${errorMsg}`
      );
      res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },

  // Eliminar una estructura
  async destroy(req, res) {
    logger.info(`${req.user.name} - Eliminando una estructura`);

    try {
      const structure = await StructureRepository.findById(req.body.id);
      if (!structure) {
        return res.status(204).json({ msg: "StructureNotFound" });
      }

      await StructureRepository.delete(structure);
      res.status(200).json({ msg: "StructureDeleted" });
    } catch (error) {
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";
      logger.error(
        `StructureController->destroy: Error al eliminar la estructura: ${errorMsg}`
      );
      res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },

  // Buscar estructuras por un tipo específico (si es necesario)
  async getStructuresByType(req, res) {
    logger.info(
      `${req.user.name} - Buscando estructuras por tipo ${req.body.type}`
    );

    try {
      const { type } = req.body; // Tipo de estructura que se pasa como parámetro
      const structures = await StructureRepository.findByType(type);

      if (!structures || structures.length === 0) {
        return res
          .status(404)
          .json({
            message: "No se encontraron estructuras para el tipo especificado.",
          });
      }

      return res.status(200).json({ structures });
    } catch (error) {
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";
      logger.error("StructureController->getStructuresByType: " + errorMsg);
      res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },
};

module.exports = StructureController;
