const { VehicleWorker, Vehicle, Worker, sequelize } = require('../models');
const logger = require('../../config/logger');
const { VehicleWorkerRepository, VehicleRepository, WorkerRepository } = require('../repositories');

const VehicleWorkerController = {
    // Obtener todas las relaciones Vehicle-Worker
    async index(req, res) {
        logger.info(`${req.user.name} - Busca todas las relaciones Vehicle-Worker`);
        try {
            const vehicleWorkers = await VehicleWorkerRepository.findAll();

            // Mapeamos los resultados para obtener solo los IDs y nombres
            const mappedVehicleWorkers = vehicleWorkers.map(vehicleWorker => ({
                id: vehicleWorker.id,
                vehicleId: vehicleWorker.vehicle_id,
                vehiclePlate: vehicleWorker.vehicle.plate,
                internal_number: vehicleWorker.vehicle.internal_number,
                internalNumber: vehicleWorker.vehicle.internal_number,
                workerId: vehicleWorker.worker_id,
                workerName: vehicleWorker.worker.name
            }));

            res.status(200).json({ 'vehicleWorkers': mappedVehicleWorkers });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('VehicleWorkerController->index: ' + errorMsg);
            res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    async vehicle_workers(req, res) {
        logger.info(`${req.user.name} - Busca todas las relaciones Vehicle-Workers`);
        const { vehicle_id } = req.body;

        const vehicle = await VehicleRepository.findById(vehicle_id);
        if (!vehicle) {
            logger.error(`VehicleWorkerController->store: Vehículo no encontrado con ID ${vehicle_id}`);
            return res.status(404).json({ msg: 'VehicleNotFound' });
        }
        try {
            const vehicleWorkers = await VehicleWorkerRepository.findByVehicle(vehicle_id);

            // Mapeamos los resultados para obtener solo los IDs y nombres
            const mappedVehicleWorkers = vehicleWorkers.map(vehicleWorker => ({
                id: vehicleWorker.id,
                vehicleId: vehicleWorker.vehicle_id,
                vehicle_id: vehicleWorker.vehicle_id,
                workerId: vehicleWorker.worker_id,
                worker_id: vehicleWorker.worker_id,
                name: vehicleWorker.worker.name,
                email: vehicleWorker.worker.email,
                image: vehicleWorker.worker.image
            }));

            res.status(200).json({ 'vehicleWorkers': mappedVehicleWorkers });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('VehicleWorkerController->vehicle_workers: ' + errorMsg);
            res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Crear una nueva relación Vehicle-Worker
    async store(req, res) {
        logger.info(`${req.user.name} - Crea una nueva relación Vehicle-Worker`);

        const { vehicle_id, worker_id } = req.body;

        const vehicle = await VehicleRepository.findById(vehicle_id);
        if (!vehicle) {
            logger.error(`VehicleWorkerController->store: Vehículo no encontrado con ID ${vehicle_id}`);
            return res.status(404).json({ msg: 'VehicleNotFound' });
        }

        const worker = await WorkerRepository.findById(worker_id);
        if (!worker) {
            logger.error(`VehicleWorkerController->store: Trabajador no encontrado con ID ${worker_id}`);
            return res.status(404).json({ msg: 'WorkerNotFound' });
        }

        try {
            const vehicleWorker = await VehicleWorkerRepository.create(req.body);
            res.status(201).json({ msg: 'VehicleWorkerCreated', vehicleWorker });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('VehicleWorkerController->store: ' + errorMsg);
            res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Obtener una relación específica Vehicle-Worker por ID
    async show(req, res) {
        logger.info(`${req.user.name} - Busca la relación Vehicle-Worker con ID: ${req.body.id}`);

        try {
            const vehicleWorker = await VehicleRepository.findById();
            if (!vehicleWorker) {
                return res.status(404).json({ msg: 'VehicleWorkerNotFound' });
            }

            // Mapeamos los resultados para obtener solo los IDs y nombres
            const mappedVehicleWorker = {
                id: vehicleWorker.id,
                vehicleId: vehicleWorker.vehicle_id,
                vehiclePlate: vehicleWorker.vehicle.plate,
                internal_number: vehicleWorker.vehicle.internal_number,
                internalNumber: vehicleWorker.vehicle.internal_number,
                workerId: vehicleWorker.worker_id,
                workerName: vehicleWorker.worker.name
            };
            res.status(200).json({ 'vehicleWorker': mappedVehicleWorker });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('VehicleWorkerController->show: ' + errorMsg);
            res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Actualizar una relación Vehicle-Worker
    async update(req, res) {
        logger.info(`${req.user.name} - Editando una relación Vehicle-Worker`);

        const { vehicle_id, worker_id } = req.body;
        try {
            const vehicleWorker = await VehicleWorkerRepository.findById(req.body.id);
            if (!vehicleWorker) {
                logger.error(`VehicleWorkerController->update: Relación no encontrada con ID ${req.body.id}`);
                return res.status(404).json({ msg: 'VehicleWorkerNotFound' });
            }

            if (vehicle_id) {
                const vehicle = await VehicleRepository.findById(vehicle_id);
                if (!vehicle) {
                    logger.error(`VehicleWorkerController->update: Vehículo no encontrado con ID ${vehicle_id}`);
                    return res.status(404).json({ msg: 'VehicleNotFound' });
                }
            }

            if (worker_id) {
                const worker = await WorkerRepository.findById(worker_id);
                if (!worker) {
                    logger.error(`VehicleWorkerController->update: Trabajador no encontrado con ID ${worker_id}`);
                    return res.status(404).json({ msg: 'WorkerNotFound' });
                }
            }

            const fieldsToUpdate = ['vehicle_id', 'worker_id'];

            // Filtrar campos en req.body y construir el objeto updatedData
            const updatedData = Object.keys(req.body)
                .filter(key => fieldsToUpdate.includes(key) && req.body[key] !== undefined)
                .reduce((obj, key) => {
                    obj[key] = req.body[key];
                    return obj;
                }, {});

            // Actualizar la relación solo si hay datos para cambiar
            if (Object.keys(updatedData).length > 0) {
                await vehicleWorker.update(updatedData);
                logger.info(`Relación vehículo-trabajador actualizada exitosamente (ID: ${vehicleWorker.id})`);
            }
            res.status(200).json({ msg: 'VehicleWorkerUpdated', vehicleWorker });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('VehicleWorkerController->update: ' + errorMsg);
            res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Eliminar una relación Vehicle-Worker
    async destroy(req, res) {
        logger.info(`${req.user.name} - Eliminando una relación Vehicle-Worker`);

        try {
            const vehicleWorker = await VehicleWorkerRepository.findById(req.body.id);
            if (!vehicleWorker) {
                logger.error(`VehicleWorkerController->destroy: Relación no encontrada con ID ${req.body.id}`);
                return res.status(404).json({ msg: 'VehicleWorkerNotFound' });
            }

            const vehicleWorkerDeleted = await VehicleWorkerRepository.delete(vehicleWorker);
            res.status(200).json({ msg: 'VehicleWorkerDeleted' });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('VehicleWorkerController->destroy: ' + errorMsg);
            res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    }
};

module.exports = VehicleWorkerController;
