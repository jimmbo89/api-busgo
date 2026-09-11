const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const authConfig = require('../../config/auth');
const { Worker, User, Role, sequelize } = require('../models'); // Importar los modelos necesarios
const logger = require('../../config/logger'); // Logger para seguimiento
const { RoleRepository, WorkerRepository } = require('../repositories');

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

        const t = await sequelize.transaction(); // Inicia una transacción
        try {

            const worker = await WorkerRepository.create(req.body, req.file, t);

            // Hacer commit de la transacción
            await t.commit();

            res.status(201).json({ 'worker': worker });
        } catch (error) {
            // Revertir la transacción en caso de error
            if (!t.finished) {
                await t.rollback();
              }

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
        return res.status(500).json({ error: 'ServerError', details: errorMsg });
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

            const WorkerUpdate = await WorkerRepository.update(worker, req.body, req.file);

            res.status(200).json({ 'worker': WorkerUpdate });
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
        return res.status(500).json({ error: 'ServerError', details: errorMsg });
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
