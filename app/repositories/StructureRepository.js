const { Op } = require('sequelize');
const { Structure, Sequelize } = require('../models'); // Aquí usamos el modelo Structure
const logger = require('../../config/logger'); // Logger para seguimiento

const StructureRepository = {
  // Obtener todas las estructuras
  async findAll() {
    return await Structure.findAll({
      attributes: ['id', 'name', 'description', 'seatCount', 'seats', 'seatMap'],
    });
  },

  async findAllPaginated(limit = 10, cursor = null) {
    try {
      const whereCondition = {};

      if (cursor) {
        whereCondition.createdAt = { [Sequelize.Op.lt]: new Date(cursor) };
      }

      const structures = await Structure.findAll({
        where: whereCondition,
        attributes: ['id', 'name', 'description', 'seatCount', 'seats', 'seatMap', 'createdAt'],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit) + 1, // +1 para determinar si hay más
      });

      const hasMore = structures.length > limit;
      if (hasMore) structures.pop(); // Quitar la extra

      const nextCursor = hasMore
        ? structures[structures.length - 1].createdAt.toISOString()
        : null;

      return { structures, hasMore, nextCursor };
    } catch (error) {
      console.error("Error en findAllPaginated:", error);
      throw error;
    }
  },

  // Buscar una estructura por ID
  async findById(id) {
    return await Structure.findByPk(id, {
      attributes: ['id', 'name', 'description', 'seatCount', 'seats', 'seatMap'],
    });
  },

  // Buscar una estructura por nombre, excluyendo una estructura específica
  async existsByName(name, excludeId = null) {
    const whereCondition = excludeId ? { name, id: { [Op.ne]: excludeId } } : { name };
    return await Structure.findOne({ where: whereCondition });
  },

  // Crear una nueva estructura
  async create(body) {
    const { name, description, seatCount, seats, seatMap } = body;

    const structure = await Structure.create({
      name,
      description,
      seatCount,
      seats,
      seatMap,
    });

    return structure;
  },

  // Actualizar una estructura existente
  async update(structure, body) {
    const fieldsToUpdate = ['name', 'description', 'seatCount', 'seats', 'seatMap'];

    const updatedData = Object.keys(body)
      .filter(key => fieldsToUpdate.includes(key) && body[key] !== undefined)
      .reduce((obj, key) => {
        obj[key] = body[key];
        return obj;
      }, {});

    if (Object.keys(updatedData).length > 0) {
      await structure.update(updatedData);
      logger.info(`Estructura actualizada exitosamente (ID: ${structure.id})`);
    }

    return structure;
  },

  // Eliminar una estructura
  async delete(structure) {
    return await structure.destroy();
  },
};

module.exports = StructureRepository;
