const { Op } = require("sequelize");
const { Structure, Sequelize } = require("../models"); // Aquí usamos el modelo Structure
const logger = require("../../config/logger"); // Logger para seguimiento

const StructureRepository = {
  // Obtener todas las estructuras
  async findAll() {
    return await Structure.findAll({
      attributes: [
        "id",
        "name",
        "description",
        "seatCount",
        "seats",
        "seatMap",
      ],
    });
  },

  /*async findAllPaginated(limit = 10, cursor = null, page = 1, search = '') {
    try {
      const whereCondition = {};

      if (cursor) {
        whereCondition.createdAt = { [Sequelize.Op.gt]: new Date(cursor) };
      }

      if (search) {
        whereCondition.name = { [Sequelize.Op.like]: `%${search}%` };
      }

      const safePage = Math.max(1, parseInt(page, 10)); // Asegura que page nunca sea menor que 1
      const offset = (safePage - 1) * limit;
      const structures = await Structure.findAll({
        where: whereCondition,
        attributes: [
          "id",
          "name",
          "description",
          "seatCount",
          "seats",
          "seatMap",
          "createdAt",
        ],
        order: [['createdAt', 'DESC']], // Ordenar por fecha de creación
        limit: parseInt(limit),
        offset: offset,
      });

      const total = await Structure.count({ where: whereCondition })
      const hasMore = structures.length > limit;
      if (hasMore) structures.pop(); // Quitar la extra

      /*const nextCursor = hasMore
        ? structures[structures.length - 1].createdAt.toISOString()
        : null;*/
      // nextCursor siempre será la fecha del último registro obtenido
      /*const nextCursor =
        structures.length > 0 ? structures[0].createdAt.toISOString() : cursor;
      return { structures, hasMore, total, nextCursor };
    } catch (error) {
      console.error("Error en findAllPaginated:", error);
      throw error;
    }
  },*/

  async findAllPaginated(limit = 10, cursor = null, page = 1, search = '') {
    try {
      // Validar que limit y page sean números válidos
      const parsedLimit = parseInt(limit, 10);
      const parsedPage = parseInt(page, 10);
    
      // Calcular el offset
      const offset = (parsedPage - 1) * parsedLimit;
  
      // Construir la condición WHERE
      const whereCondition = {};
  
      if (cursor) {
        whereCondition.createdAt = { [Sequelize.Op.lt]: new Date(cursor) };
      }
  
      if (search) {
        whereCondition[Op.or] = [
          { name: { [Op.like]: `%${search}%` } }, // Búsqueda insensible a mayúsculas/minúsculas
          { description: { [Op.like]: `%${search}%` } }, // Búsqueda insensible a mayúsculas/minúsculas
        ];
      }
  
      // Realizar la consulta
      const structures = await Structure.findAll({
        where: whereCondition,
        attributes: ['id', 'name', 'description', 'seatCount', 'seats', 'seatMap', 'createdAt'],
        order: [['createdAt', 'DESC']], // Ordenar por fecha de creación
        limit: parsedLimit,
        offset: offset,
      });
  
      // Obtener el total de elementos
      const total = await Structure.count({ where: whereCondition });
  
      // Calcular el cursor para la siguiente página
      const nextCursor = structures.length > 0
        ? structures[0].createdAt.toISOString()
        : null;
  
      return { structures, total, nextCursor };
    } catch (error) {
      logger.error("Error en findAllPaginated:", error);
      throw error;
    }
  },

  // Buscar una estructura por ID
  async findById(id) {
    return await Structure.findByPk(id, {
      attributes: [
        "id",
        "name",
        "description",
        "seatCount",
        "seats",
        "seatMap",
      ],
    });
  },

  // Buscar una estructura por nombre, excluyendo una estructura específica
  async existsByName(name, excludeId = null) {
    const whereCondition = excludeId
      ? { name, id: { [Op.ne]: excludeId } }
      : { name };
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
    const fieldsToUpdate = [
      "name",
      "description",
      "seatCount",
      "seats",
      "seatMap",
    ];

    const updatedData = Object.keys(body)
      .filter((key) => fieldsToUpdate.includes(key) && body[key] !== undefined)
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
