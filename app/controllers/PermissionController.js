const logger = require('../../config/logger'); // Importar el logger
const { PermissionRepository } = require('../repositories');

const PermissionController = {
    // Listar permisos
    async index(req, res) {
        logger.info(`${req.user.name} - Accediendo a la lista de permisos`);

        try {
            const permissions = await PermissionRepository.findAll();

            res.status(200).json({ 'permissions': permissions });
        } catch (error) {
            const errorMsg = error.details
                ? error.details.map(detail => detail.message).join(', ')
                : error.message || 'Error desconocido';
            logger.error('Error en PermissionController->index: ' + errorMsg);
            res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Crear un nuevo permiso
    async store(req, res) {
        logger.info(`${req.user.name} - Creando un nuevo permiso`);

        try {

            const permission = await PermissionRepository.create(req.body);
            res.status(201).json({ msg: 'PermissionCreated', permission });
        } catch (error) {
            const errorMsg = error.details
                ? error.details.map(detail => detail.message).join(', ')
                : error.message || 'Error desconocido';
            logger.error('PermissionController->store: ' + errorMsg);
            res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Mostrar un permiso específico
    async show(req, res) {
        logger.info(`${req.user.name} - Accediendo a un permiso específico`);

        try {
            const permission = await PermissionRepository.findById(req.body.id);
            if (!permission) {
                return res.status(404).json({ msg: 'PermissionNotFound' });
            }

            res.status(200).json({ 'permission': permission });
        } catch (error) {
            const errorMsg = error.details
                ? error.details.map(detail => detail.message).join(', ')
                : error.message || 'Error desconocido';
            logger.error('PermissionController->show: ' + errorMsg);
            res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Actualizar un permiso
    async update(req, res) {
        logger.info(`${req.user.name} - Editando un permiso`);

        try {
            const permission = await PermissionRepository.findById(req.body.id);
            if (!permission) {
                return res.status(404).json({ msg: 'PermissionNotFound' });
            }
            
            permissionUpdate = await PermissionRepository.update(permission, req.body);

            res.status(200).json({ msg: 'PermissionUpdated', permissionUpdate });
        } catch (error) {
            const errorMsg = error.details
                ? error.details.map(detail => detail.message).join(', ')
                : error.message || 'Error desconocido';
            logger.error(`PermissionController->update: Error al actualizar el permiso: ${errorMsg}`);
            res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Eliminar un permiso
    async destroy(req, res) {
        logger.info(`${req.user.name} - Eliminando un permiso`);

        try {
            const permission = await PermissionRepository.findById(req.body.id);
            if (!permission) {
                return res.status(404).json({ msg: 'PermissionNotFound' });
            }

            const permissionDelete = await PermissionRepository.delete(permission);
            res.status(200).json({ msg: 'PermissionDeleted' });
        } catch (error) {
            const errorMsg = error.details
                ? error.details.map(detail => detail.message).join(', ')
                : error.message || 'Error desconocido';
            logger.error(`PermissionController->destroy: Error al eliminar el permiso: ${errorMsg}`);
            res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },
}

module.exports = PermissionController;
