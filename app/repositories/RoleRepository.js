const { Op } = require('sequelize');
const { Role } = require('../models'); // Aquí usamos el modelo Role
const logger = require('../../config/logger'); // Logger para seguimiento

const RoleRepository = {
  // Obtener todos los roles
  async findAll() {
    return await Role.findAll({
      attributes: ['id', 'name', 'description', 'type'],
    });
  },

  // Buscar un rol por ID
  async findById(id) {
    return await Role.findByPk(id, {
      attributes: ['id', 'name', 'description', 'type'],
    });
  },

  // Buscar un rol por nombre, excluyendo un rol específico
  async existsByName(name, excludeId = null) {
    const whereCondition = excludeId ? { name, id: { [Op.ne]: excludeId } } : { name };
    return await Role.findOne({ where: whereCondition });
  },

  // Crear un nuevo rol
  async create(body) {
    const { name, description, type } = body;

    const role = await Role.create({
      name,
      description,
      type,
    });

    return role;
  },

  // Actualizar un rol
  async update(role, body) {
    const fieldsToUpdate = ['name', 'description', 'type'];

    const updatedData = Object.keys(body)
      .filter(key => fieldsToUpdate.includes(key) && body[key] !== undefined)
      .reduce((obj, key) => {
        obj[key] = body[key];
        return obj;
      }, {});

    if (Object.keys(updatedData).length > 0) {
      await role.update(updatedData);
      logger.info(`Rol actualizado exitosamente (ID: ${role.id})`);
    }

    return role;
  },

  // Eliminar un rol
  async delete(role) {
    return await role.destroy();
  },

  // Buscar un rol por ID
  async findByType(type) {
    return await Role.findAll({
        where: { type },
        attributes: ['id', 'name', 'description', 'type'],
      });
  },

};

module.exports = RoleRepository;
