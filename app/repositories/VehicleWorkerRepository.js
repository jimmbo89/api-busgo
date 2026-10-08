const { VehicleWorker, Worker, Vehicle } = require('../models');
const { Op } = require('sequelize');

const VehicleWorkerRepository = {
    // Obtener todas las relaciones Branch-Vehicle con sus relaciones
    async findAll() {
        return await VehicleWorker.findAll({
            include: [
                { model: Worker, as: 'worker', attributes: ['id', 'name', 'image', 'email'] },
                { model: Vehicle, as: 'vehicle'}
            ]
        });
    },

    async findByVehicle(vehicleId) {
        return await VehicleWorker.findAll({
            where: {
                vehicle_id: vehicleId // Filtramos por el ID de la sucursal
            },
            include: [
                { 
                    model: Worker, 
                    as: 'worker',
                    attributes: ['id', 'name', 'image', 'email']
                }
            ]
        });
    },

    async findUnassignedWorkerIdsByVehicle(vehicleId, workerIds, options = {}) {
        const normalizedWorkerIds = Array.from(
            new Set(
                (Array.isArray(workerIds) ? workerIds : [])
                    .map((workerId) => Number(workerId))
                    .filter((workerId) => Number.isInteger(workerId) && workerId > 0)
            )
        );

        if (!normalizedWorkerIds.length) {
            return [];
        }

        const assignedWorkers = await VehicleWorker.findAll({
            ...options,
            where: {
                vehicle_id: vehicleId,
                worker_id: { [Op.in]: normalizedWorkerIds },
            },
            attributes: ['worker_id'],
            raw: true,
        });

        const assignedWorkerIds = new Set(
            assignedWorkers.map((vehicleWorker) => Number(vehicleWorker.worker_id))
        );

        return normalizedWorkerIds.filter(
            (workerId) => !assignedWorkerIds.has(workerId)
        );
    },

    async findByWorker(workerId, options = {}) {
        return await VehicleWorker.findAll({
            ...options,
            where: {
                ...(options.where || {}),
                worker_id: workerId,
            },
            include: options.include || [
                {
                    model: Vehicle,
                    as: 'vehicle',
                    attributes: [
                        'id',
                        'plate',
                        'internal_number',
                        'brand',
                        'model',
                        'image',
                        'state',
                        'seats',
                    ],
                },
            ],
        });
    },

    // Crear una nueva relación Branch-Vehicle
    async create(body) {      

        const { worker_id, vehicle_id } = body;
        return await VehicleWorker.create({
            worker_id,
            vehicle_id
        });
    },

    // Obtener una relación Branch-Vehicle por ID
    async findById(id) {
        return await VehicleWorker.findByPk(id, {
            include: [
                { model: Worker, as: 'worker', attributes: ['id', 'name'] },
                { model: Vehicle, as: 'vehicle', attributes: ['id', 'plate', 'internal_number', 'image'] }
            ]
        });
    },

    // Actualizar una relación Branch-Vehicle
    async update(vehicleWorker, body) {
        const fieldsToUpdate = ['worker_id', 'vehicle_id'];

            // Filtrar campos en req.body y construir el objeto updatedData
            const updatedData = Object.keys(body)
                .filter(key => fieldsToUpdate.includes(key) && body[key] !== undefined)
                .reduce((obj, key) => {
                    obj[key] = body[key];
                    return obj;
                }, {});

            // Actualizar la relación solo si hay datos para cambiar
            if (Object.keys(updatedData).length > 0) {
                await vehicleWorker.update(updatedData);
                logger.info(`Relación vehículo-worker actualizada exitosamente (ID: ${vehicleWorker.id})`);
            }

            return vehicleWorker;
    },

    // Eliminar una relación Branch-Vehicle por ID
    async delete(vehicleWorker) {
        return await vehicleWorker.destroy();
    },

    // Verificar si existe una relación por ID de sucursal y vehículo
    async existsVehicleWorker(workerId, vehicleId, excludeId = null, options = {}) {
        const whereCondition = excludeId
            ? { worker_id: workerId, vehicle_id: vehicleId, id: { [Op.ne]: excludeId } }
            : { worker_id: workerId, vehicle_id: vehicleId };
        return await VehicleWorker.findOne({
            ...options,
            where: whereCondition,
        });
    }
};

module.exports = VehicleWorkerRepository;
