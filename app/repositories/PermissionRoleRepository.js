const { Op } = require("sequelize");
const { Permission, PermissionRole, Role } = require("../models"); // Aquí usamos el modelo Permission
const logger = require("../../config/logger"); // Logger para seguimiento

const PermissionRoleRepository = {
  // Obtener todos los permisos
  async findAll() {
    return await PermissionRole.findAll({
      include: [
        { model: Permission, as: "permission", attributes: ["id", "name"] },
        { model: Role, as: "role", attributes: ["id", "name"] },
      ],
    });
  },

  async findByRole(roleId) {
    return await PermissionRole.findAll({
      where: {
        role_id: roleId, // Filtramos por el ID de la sucursal
      },
      include: [
        {
          model: Permission,
          as: "permission",
          attributes: ["id", "name", "description", "module"],
        },
        { model: Role, as: "role", attributes: ["id", "name"] },
      ],
    });
  },

  // Buscar un permiso por ID
  async findById(id) {
    return await PermissionRole.findByPk(id, {
        include: [
            { model: Permission, as: "permission", attributes: ["id", "name"] },
            { model: Role, as: "role", attributes: ["id", "name"] },
          ],
    });
  },

  // Verificar si existe una relación por ID de sucursal y vehículo
  async existsRolePermission(roleId, permissionId, excludeId = null) {
    const whereCondition = excludeId
        ? { role_id: roleId, permission_id: permissionId, id: { [Op.ne]: excludeId } }
        : { role_id: roleId, permission_id: permissionId };
    return await PermissionRole.findOne({ where: whereCondition });
},

  // Crear un nuevo permiso
  async create(body) {
    const { role_id, permission_id } = body;

    const permissionrole = await PermissionRole.create({
      role_id,
      permission_id,
    });

    return permissionrole;
  },

  // Actualizar un permiso
  async update(permissionrole, body) {
    const fieldsToUpdate = ["role_id", "permission_id"];

    const updatedData = Object.keys(body)
      .filter((key) => fieldsToUpdate.includes(key) && body[key] !== undefined)
      .reduce((obj, key) => {
        obj[key] = body[key];
        return obj;
      }, {});

    if (Object.keys(updatedData).length > 0) {
      await permission.update(updatedData);
      logger.info(`Permiso del rol actualizado exitosamente (ID: ${permissionrole.id})`);
    }

    return await permissionrole.update(updatedData);
  },

  // Eliminar un permiso
  async delete(permissionrole) {
    return await permissionrole.destroy();
  },
};

module.exports = PermissionRoleRepository;
