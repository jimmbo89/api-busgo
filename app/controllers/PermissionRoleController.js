const { PermissionRole, Permission, Role, sequelize } = require("../models");
const logger = require("../../config/logger");
const { RoleRepository, PermissionRoleRepository, PermissionRepository } = require("../repositories");

const PermissionRoleController = {
  // Obtener todas las relaciones Permission-Role
  async index(req, res) {
    logger.info(
      `${req.user.name} - Busca todas las relaciones Permission-Role`
    );
    try {
      const permissionRoles = await PermissionRoleRepository.findAll();

      const mappedPermissionRoles = permissionRoles.map((permissionRole) => ({
        id: permissionRole.id,
        permissionId: permissionRole.permission.id,
        permission_id: permissionRole.permission.id,
        name: permissionRole.permission.name,
        module: permissionRole.permission.module,
        description: permissionRole.permission.description,
        roleId: permissionRole.role.id,
        role_id: permissionRole.role.id,
        roleName: permissionRole.role.name,
      }));

      res.status(200).json({ permissionRoles: mappedPermissionRoles });
    } catch (error) {
      const errorMsg = error.message || "Error desconocido";
      logger.error("PermissionRoleController->index: " + errorMsg);
      res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },

  async role_permissions(req, res) {
    logger.info(
      `${req.user.name} - Busca todas las relaciones Permission-Role`
    );

    const { role_id } = req.body;

    const role = await RoleRepository.findById(role_id);
    if (!role) {
      logger.error(
        `PermissionRoleController->store: Rol no encontrado con ID ${role_id}`
      );
      return res.status(404).json({ msg: "RoleNotFound" });
    }

    try {
      const permissionRoles = await PermissionRoleRepository.findByRole(role_id);

      const mappedPermissionRoles = permissionRoles.map((permissionRole) => ({
        id: permissionRole.id,
        permissionId: permissionRole.permission.id,
        permission_id: permissionRole.permission.id,
        name: permissionRole.permission.name,
        module: permissionRole.permission.module,
        description: permissionRole.permission.description,
        roleId: permissionRole.role.id,
        role_id: permissionRole.role.id,
        roleName: permissionRole.role.name,
      }));

      res.status(200).json({ permissionroles: mappedPermissionRoles });
    } catch (error) {
      const errorMsg = error.message || "Error desconocido";
      logger.error("PermissionRoleController->index: " + errorMsg);
      res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },

  // Crear una nueva relación Permission-Role
  async store(req, res) {
    logger.info(`${req.user.name} - Crea una nueva relación Permission-Role`);

    const { permission_id, role_id } = req.body;

    const permission = await PermissionRepository.findById(permission_id);
    if (!permission) {
      logger.error(
        `PermissionRoleController->store: Permiso no encontrado con ID ${permission_id}`
      );
      return res.status(404).json({ msg: "PermissionNotFound" });
    }

    const permissionrole = await PermissionRoleRepository.existsRolePermission(role_id, permission_id);
    if (permissionrole) {
      logger.error(
        `PermissionRoleController->store: la relación permiso rol ya existe con ID ${permissionrole}`
      );
      return res.status(404).json({ msg: "PermissionRoleExist" });
    }

    const role = await RoleRepository.findById(role_id);
    if (!role) {
      logger.error(
        `PermissionRoleController->store: Rol no encontrado con ID ${role_id}`
      );
      return res.status(404).json({ msg: "RoleNotFound" });
    }

    try {
      const permissionRole = await PermissionRoleRepository.create(req.body);
      res.status(201).json({ msg: "PermissionRoleCreated", permissionRole });
    } catch (error) {
      const errorMsg = error.message || "Error desconocido";
      logger.error("PermissionRoleController->store: " + errorMsg);
      res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },

  // Obtener una relación específica Permission-Role por ID
  async show(req, res) {
    logger.info(
      `${req.user.name} - Busca la relación Permission-Role con ID: ${req.body.id}`
    );

    try {
      const permissionRole = await PermissionRole.findByPk(req.body.id, {
        include: [
          { model: Permission, as: "permission", attributes: ["id", "name"] },
          { model: Role, as: "role", attributes: ["id", "name"] },
        ],
      });
      if (!permissionRole) {
        return res.status(404).json({ msg: "PermissionRoleNotFound" });
      }

      const mappedPermissionRole = {
        id: permissionRole.id,
        permissionId: permissionRole.permission.id,
        permission_id: permissionRole.permission.id,
        name: permissionRole.permission.name,
        module: permissionRole.permission.module,
        description: permissionRole.permission.description,
        roleId: permissionRole.role.id,
        role_id: permissionRole.role.id,
        roleName: permissionRole.role.name,
      };
      res.status(200).json({ permissionRole: mappedPermissionRole });
    } catch (error) {
      const errorMsg = error.message || "Error desconocido";
      logger.error("PermissionRoleController->show: " + errorMsg);
      res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },

  // Actualizar una relación Permission-Role
  async update(req, res) {
    logger.info(`${req.user.name} - Editando una relación Permission-Role`);

    const { permission_id, role_id } = req.body;
    try {
      const permissionRole = await PermissionRole.findByPk(req.body.id);
      if (!permissionRole) {
        logger.error(
          `PermissionRoleController->update: Relación no encontrada con ID ${req.body.id}`
        );
        return res.status(404).json({ msg: "PermissionRoleNotFound" });
      }

      if (permission_id) {
        const permission = await Permission.findByPk(permission_id);
        if (!permission) {
          logger.error(
            `PermissionRoleController->update: Permiso no encontrado con ID ${permission_id}`
          );
          return res.status(404).json({ msg: "PermissionNotFound" });
        }
      }

      if (role_id) {
        const role = await Role.findByPk(role_id);
        if (!role) {
          logger.error(
            `PermissionRoleController->update: Rol no encontrado con ID ${role_id}`
          );
          return res.status(404).json({ msg: "RoleNotFound" });
        }
      }

      const updatedData = {};
      if (permission_id) updatedData.permission_id = permission_id;
      if (role_id) updatedData.role_id = role_id;

      await permissionRole.update(updatedData);
      res.status(200).json({ msg: "PermissionRoleUpdated", permissionRole });
    } catch (error) {
      const errorMsg = error.message || "Error desconocido";
      logger.error("PermissionRoleController->update: " + errorMsg);
      res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },

  // Eliminar una relación Permission-Role
  async destroy(req, res) {
    logger.info(`${req.user.name} - Eliminando una relación Permission-Role`);

    try {
      const permissionRole = await PermissionRole.findByPk(req.body.id);
      if (!permissionRole) {
        logger.error(
          `PermissionRoleController->destroy: Relación no encontrada con ID ${req.body.id}`
        );
        return res.status(404).json({ msg: "PermissionRoleNotFound" });
      }

      await permissionRole.destroy();
      res.status(200).json({ msg: "PermissionRoleDeleted" });
    } catch (error) {
      const errorMsg = error.message || "Error desconocido";
      logger.error("PermissionRoleController->destroy: " + errorMsg);
      res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },
};

module.exports = PermissionRoleController;
