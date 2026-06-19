const { Op } = require('sequelize');
const { TicketType } = require('../models'); // Usamos el modelo TicketType
const logger = require('../../config/logger'); // Logger para seguimiento

const TicketTypeRepository = {
  // Obtener todos los tipos de pasaje
  async findAll() {
    return await TicketType.findAll({
      attributes: ['id', 'name', 'description', 'adjustment_type', 'value_type', 'adjustment_value', 'active'],
    });
  },

  // Buscar un tipo de pasaje por ID
  async findById(id) {
    return await TicketType.findByPk(id, {
      attributes: ['id', 'name', 'description', 'adjustment_type', 'value_type', 'adjustment_value', 'active'],
    });
  },

  // Buscar un tipo de pasaje por nombre, excluyendo un tipo específico
  async existsByName(name, excludeId = null) {
    const whereCondition = excludeId ? { name, id: { [Op.ne]: excludeId } } : { name };
    return await TicketType.findOne({ where: whereCondition });
  },

  // Crear un nuevo tipo de pasaje
  async create(body) {
    const { name, description, adjustment_type, value_type, adjustment_value, active } = body;

    const ticketType = await TicketType.create({
      name,
      description,
      adjustment_type: adjustment_type || 'descuento',
      value_type: value_type || 'monto',
      adjustment_value: adjustment_value ?? 0,
      active,
    });

    return ticketType;
  },

  // Actualizar un tipo de pasaje
  async update(ticketType, body) {
    const fieldsToUpdate = ['name', 'description', 'adjustment_type', 'value_type', 'adjustment_value', 'active'];

    const updatedData = Object.keys(body)
      .filter((key) => fieldsToUpdate.includes(key) && body[key] !== undefined)
      .reduce((obj, key) => {
        obj[key] = body[key];
        return obj;
      }, {});

    if (Object.keys(updatedData).length > 0) {
      await ticketType.update(updatedData);
      logger.info(`Tipo de pasaje actualizado exitosamente (ID: ${ticketType.id})`);
    }

    return ticketType;
  },

  // Eliminar un tipo de pasaje
  async delete(ticketType) {
    return await ticketType.destroy();
  },

  // Buscar tipos de pasaje por estado activo
  async findByActiveStatus(active) {
    return await TicketType.findAll({
      where: { active },
      attributes: ['id', 'name', 'description', 'adjustment_type', 'value_type', 'adjustment_value', 'active'],
    });
  },
};

module.exports = TicketTypeRepository;
