const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const authConfig = require('../../config/auth');
const { Worker, User, Role, sequelize } = require('../models'); // Importar los modelos necesarios
const logger = require('../../config/logger'); // Logger para seguimiento
const { RoleRepository, WorkerRepository } = require('../repositories');
const WorkerService = require('../services/WorkerService');

const duplicateWorkerResponse = (res, conflictField = 'worker') => {
    const fieldName = conflictField.charAt(0).toUpperCase() + conflictField.slice(1);
    const messages = {
        email: 'El correo ya está registrado en otro trabajador.',
        rut: 'El rut ya está registrado en otro trabajador.',
        user: 'El usuario ya está registrado.',
        worker: 'El trabajador ya está registrado.',
    };

    return res.status(409).json({
        error: `Duplicate${fieldName}`,
        msg: messages[conflictField] || messages.worker,
    });
};

const uniqueConstraintField = (error) => {
    const fields = new Set([
        ...Object.keys(error?.fields || {}),
        ...(error?.errors || []).map(detail => detail.path),
    ]);

    if (fields.has('email')) return 'email';
    if (fields.has('rut')) return 'rut';
    return 'worker';
};

const workerBranchErrorDetails = {
    WorkerNotFound: 'El trabajador indicado no existe.',
    RoleNotFound: 'El rol indicado no existe.',
    BranchNotFound: 'La sucursal indicada no existe.',
    WorkerBranchActionsInvalid: 'El campo branches debe contener un JSON válido con las asociaciones.',
    WorkerBranchActionInvalid: 'Cada asociación debe indicar branch_id, role_id y una acción válida.',
    WorkerBranchAssociationIdNotAllowed: 'La acción associate no debe incluir association_id.',
    WorkerBranchAssociationIdRequired: 'Las acciones update y delete requieren association_id.',
    WorkerBranchCreateActionInvalid: 'Al crear un trabajador solo se permite la acción associate.',
    WorkerBranchRoleMismatch: 'El role_id de la asociación debe coincidir con el rol principal del trabajador.',
    WorkerBranchAssociationNotFound: 'La relación trabajador-sucursal indicada no existe o no pertenece al trabajador.',
    WorkerBranchAssociationBranchMismatch: 'La sucursal no corresponde a la relación indicada.',
    WorkerBranchAssociationRoleMismatch: 'El role_id no corresponde al rol actual de la relación que se desea eliminar.',
    WorkerBranchDuplicateOperation: 'No se puede procesar más de una acción sobre la misma relación.',
    WorkerMultipleActiveBranches: 'El trabajador solo puede tener una sucursal activa asociada.',
};

const getWorkerMutationStatus = (error) => {
    if (['WorkerNotFound', 'RoleNotFound', 'BranchNotFound', 'WorkerBranchAssociationNotFound'].includes(error.message)) {
        return 404;
    }

    if (error.message === 'WorkerMultipleActiveBranches') {
        return 409;
    }

    if (error.message.startsWith('WorkerBranch')) {
        return 400;
    }

    return 500;
};

const mapBranchWorkers = (branchWorkers = []) => branchWorkers.map((branchWorker) => ({
    id: branchWorker.branch?.id,
    branch_id: branchWorker.branch_id,
    name: branchWorker.branch?.name,
    image: branchWorker.branch?.image,
    address: branchWorker.branch?.address,
    rut: branchWorker.branch?.rut,
    phone: branchWorker.branch?.phone,
    company_id: branchWorker.branch?.company_id,
    companyName: branchWorker.branch?.company?.name,
    companyImage: branchWorker.branch?.company?.image,
    association_id: branchWorker.id,
    role_id: branchWorker.role_id,
}));

const WorkerController = {
    // Obtener todos los trabajadores
    async index(req, res) {
        logger.info(`${req.user.name} - Entra a buscar los trabajadores`);

        try {
            const workers = await WorkerRepository.findAll();

            if (!workers.length) {
                return res.status(204).json({ msg: 'WorkersNotFound' });
            }

            const mappedWorkers = workers.map(worker => ({
                branches: (worker.branchWorkers || [])
                    .filter(branchWorker => Number(branchWorker.role_id) === Number(worker.role_id))
                    .map(branchWorker => ({
                        id: branchWorker.branch?.id,
                        branch_id: branchWorker.branch_id,
                        name: branchWorker.branch?.name,
                        image: branchWorker.branch?.image,
                        address: branchWorker.branch?.address,
                        rut: branchWorker.branch?.rut,
                        phone: branchWorker.branch?.phone,
                        company_id: branchWorker.branch?.company_id,
                        companyName: branchWorker.branch?.company?.name,
                        companyImage: branchWorker.branch?.company?.image,
                        association_id: branchWorker.id,
                        role_id: branchWorker.role_id,
                    })),
                id: worker.id,
                userId: worker.user_id,
                user_id: worker.user_id,
                roleId: worker.role_id,
                role_id: worker.role_id,
                role: worker.role.name,
                name: worker.name,
                email: worker.email,
                phone: worker.phone,
                rut: worker.rut,
                address: worker.address,
                image: worker.image,
                user: worker.user.name, // Incluir los datos del usuario asociado
            }));

            res.status(200).json({ workers: mappedWorkers });
        } catch (error) {
            const errorMsg = error.details
            ? error.details.map(detail => detail.message).join(', ')
            : error.message || 'Error desconocido';
        
        logger.error('WorkerController->index:' + errorMsg);
        return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Crear un nuevo trabajador
    async store(req, res) {
        logger.info(`${req.user.name} - Crea un nuevo trabajador`);
        logger.info('Datos recibidos al crear un trabajador');
        logger.info(JSON.stringify(req.body));

        const { user_id, name, email, phone, rut, address, role_id, user } = req.body;

        // Verificar si ya existe un trabajador con el mismo email o rut
        const duplicateFields = await WorkerRepository.findDuplicateFields(email, rut, user);
        if (duplicateFields.email || duplicateFields.rut || duplicateFields.user) {
            const conflictField = duplicateFields.email
                ? 'email'
                : duplicateFields.rut
                    ? 'rut'
                    : 'user';

            logger.error(`El ${conflictField} ya está registrado al crear el trabajador`);
            return duplicateWorkerResponse(res, conflictField);
        }

            const role = await RoleRepository.findById(role_id);
            if (!role) {
                logger.error(`WorkerController->store: Rol no encontrado con ID ${role_id}`);
                return res.status(400).json({ msg: 'UserNotFound' });
            }

        try {
            const result = await WorkerService.create({
                body: req.body,
                file: req.file,
            });

            res.status(201).json({
                worker: result.worker,
                branches: mapBranchWorkers(result.branchWorkers),
            });
        } catch (error) {
            const persistenceError = error.cause || error;
            if (persistenceError.name === 'SequelizeUniqueConstraintError') {
                const conflictField = uniqueConstraintField(persistenceError);
                logger.warn(`Restricción única al crear trabajador (${conflictField})`);
                return duplicateWorkerResponse(res, conflictField);
            }

            const errorMsg = error.details
            ? error.details.map(detail => detail.message).join(', ')
            : error.message || 'Error desconocido';
        
            logger.error('WorkerController->store:' + errorMsg);
            const status = getWorkerMutationStatus(error);
            return res.status(status).json({
                error: status === 500
                    ? 'Error interno del servidor'
                    : 'No se pudo procesar la asociación del trabajador con la sucursal.',
                details: workerBranchErrorDetails[error.message] || errorMsg,
            });
        }
    },

    // Obtener un trabajador por ID
    async show(req, res) {
        logger.info(`${req.user.name} - Busca un trabajador con ID ${req.body.id}`);

        try {
            const worker = await WorkerRepository.findById(req.body.id);

            if (!worker) {
                return res.status(404).json({ msg: 'WorkerNotFound' });
            }

            const mappedWorker = {
                id: worker.id,
                userId: worker.user_id,
                user_id: worker.user_id,
                roleId: worker.role_id,
                role_id: worker.role_id,
                role: worker.role.name,
                name: worker.name,
                email: worker.email,
                phone: worker.phone,
                rut: worker.rut,
                address: worker.address,
                image: worker.image,
                user: worker.user.name,  // Incluir los datos del usuario asociado
            };

            res.status(200).json({ worker: mappedWorker });
        } catch (error) {
            const errorMsg = error.details
            ? error.details.map(detail => detail.message).join(', ')
            : error.message || 'Error desconocido';
        
        logger.error('WorkerController->show:' + errorMsg);
        return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Actualizar un trabajador
    async update(req, res) {
        logger.info(`${req.user.name} - Actualiza el trabajador con ID ${req.body.id}`);
        logger.info('Datos recibidos al editar un trabajador');
        logger.info(JSON.stringify(req.body));

        const { id, user_id, name, email, phone, rut, address, user, role_id } = req.body;

        const worker = await WorkerRepository.findById(id);
            if (!worker) {
                return res.status(400).json({ msg: 'WorkerNotFound' });
            }
            
            if (role_id) {
                const role = await RoleRepository.findById(role_id);
                if (!role) {
                    logger.error(`WorkerController->update: Rol no encontrado con ID ${role_id}`);
                    return res.status(400).json({ msg: 'UserNotFound' });
                }   
            }

            if (email || rut || user) {
                const validFields = {};

                // Solo agregar los campos definidos y válidos a la consulta
                if (email) validFields.email = email;
                if (rut) validFields.rut = rut;
                if (user) validFields.user = user;
        
                if (Object.keys(validFields).length > 0) {
                    const existingDevice = await WorkerRepository.existsByEmailOrRut(
                        validFields.email,
                        validFields.rut,
                        validFields.user,
                        id,
                        user_id || worker.user_id
                    );
        
                    if (existingDevice) {
                        logger.info('Email, User o Rut ya están registrados en otro dispositivo');
                        return res.status(409).json({ info: 'DuplicateWorker', msg: 'Email, user o Rut ya están registrados.' });
                    }
                }
            }

        try {

            const result = await WorkerService.update({
                id,
                body: req.body,
                file: req.file,
            });

            res.status(200).json({
                worker: result.worker,
                branches: mapBranchWorkers(result.branchWorkers),
            });
        } catch (error) {
            const persistenceError = error.cause || error;
            if (persistenceError.name === 'SequelizeUniqueConstraintError') {
                logger.warn('Restricción única al editar trabajador');
                return res.status(409).json({ info: 'DuplicateWorker', msg: 'Email, user o Rut ya están registrados.' });
            }

            const errorMsg = error.details
            ? error.details.map(detail => detail.message).join(', ')
            : error.message || 'Error desconocido';
        
        logger.error('WorkerController->update:' + errorMsg);
        const status = getWorkerMutationStatus(error);
        return res.status(status).json({
            error: status === 500
                ? 'Error interno del servidor'
                : 'No se pudo procesar la asociación del trabajador con la sucursal.',
            details: workerBranchErrorDetails[error.message] || errorMsg,
        });
        }
    },

    // Eliminar un trabajador
    async destroy(req, res) {
        logger.info(`${req.user.name} - Elimina el trabajador con ID ${req.body.id}`);

        try {
            const worker = await Worker.findByPk(req.body.id);

            if (!worker) {
                return res.status(400).json({ msg: 'WorkerNotFound' });
            }

            const workerDelete = WorkerRepository.delete(worker);
            res.status(200).json({ msg: 'WorkerDeleted' });
        } catch (error) {z
            const errorMsg = error.details
            ? error.details.map(detail => detail.message).join(', ')
            : error.message || 'Error desconocido';
        
        logger.error('WorkerController->destroy:' + errorMsg);
        return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },
};

module.exports = WorkerController;
