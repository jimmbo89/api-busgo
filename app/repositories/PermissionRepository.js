const { Op } = require('sequelize');
const { Permission } = require('../models'); // Aquí usamos el modelo Permission
const logger = require('../../config/logger'); // Logger para seguimiento

const PermissionRepository = {
  // Obtener todos los permisos
  async findAll() {
    return await Permission.findAll({
      attributes: ['id', 'name', 'description', 'module'],
    });
  },

  async findByRole(roleId) {
    return await Permission.findAll({
      attributes: ['id', 'name', 'description', 'module'],
    });
  },

  // Buscar un permiso por ID
  async findById(id) {
    return await Permission.findByPk(id, {
      attributes: ['id', 'name', 'description', 'module'],
    });
  },

  // Buscar un permiso por nombre, excluyendo un permiso específico
  async existsByName(name, excludeId = null) {
    const whereCondition = excludeId ? { name, id: { [Op.ne]: excludeId } } : { name };
    return await Permission.findOne({ where: whereCondition });
  },

  // Crear un nuevo permiso
  async create(body) {
    const { name, description, module } = body;

    const permission = await Permission.create({
      name,
      description,
      module,
    });

    return permission;
  },

  // Actualizar un permiso
  async update(permission, body) {
    const fieldsToUpdate = ['name', 'description', 'module'];

    const updatedData = Object.keys(body)
      .filter(key => fieldsToUpdate.includes(key) && body[key] !== undefined)
      .reduce((obj, key) => {
        obj[key] = body[key];
        return obj;
      }, {});

    if (Object.keys(updatedData).length > 0) {
      await permission.update(updatedData);
      logger.info(`Permiso actualizado exitosamente (ID: ${permission.id})`);
    }

    return await permission.update(updatedData);
  },

  // Eliminar un permiso
  async delete(permission) {
    return await permission.destroy();
  },
};

module.exports = PermissionRepository;
