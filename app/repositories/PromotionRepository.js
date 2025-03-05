const { Op } = require('sequelize');
const { Promotion } = require('../models'); // Usamos el modelo Promotion
const logger = require('../../config/logger'); // Logger para seguimiento

const PromotionRepository = {
  // Obtener todas las promociones
  async findAll() {
    return await Promotion.findAll({
      attributes: ['id', 'name', 'description', 'percentage', 'active'],
    });
  },

  // Buscar una promoción por ID
  async findById(id) {
    return await Promotion.findByPk(id, {
      attributes: ['id', 'name', 'description', 'percentage', 'active'],
    });
  },

  // Buscar una promoción por nombre, excluyendo una promoción específica
  async existsByName(name, excludeId = null) {
    const whereCondition = excludeId ? { name, id: { [Op.ne]: excludeId } } : { name };
    return await Promotion.findOne({ where: whereCondition });
  },

  // Crear una nueva promoción
  async create(body) {
    const { name, description, percentage, active } = body;

    const promotion = await Promotion.create({
      name,
      description,
      percentage,
      active,
    });

    return promotion;
  },

  // Actualizar una promoción
  async update(promotion, body) {
    const fieldsToUpdate = ['name', 'description', 'percentage', 'active'];

    const updatedData = Object.keys(body)
      .filter((key) => fieldsToUpdate.includes(key) && body[key] !== undefined)
      .reduce((obj, key) => {
        obj[key] = body[key];
        return obj;
      }, {});

    if (Object.keys(updatedData).length > 0) {
      await promotion.update(updatedData);
      logger.info(`Promoción actualizada exitosamente (ID: ${promotion.id})`);
    }

    return promotion;
  },

  // Eliminar una promoción
  async delete(promotion) {
    return await promotion.destroy();
  },

  // Buscar promociones por estado activo
  async findByActiveStatus(active) {
    return await Promotion.findAll({
      where: { active },
      attributes: ['id', 'name', 'description', 'percentage', 'active'],
    });
  },
};

module.exports = PromotionRepository;