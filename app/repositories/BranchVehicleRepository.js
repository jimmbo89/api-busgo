const { BranchVehicle, Branch, Vehicle, Worker, Role } = require('../models');
const { Op } = require('sequelize');

const BranchVehicleRepository = {
    // Obtener todas las relaciones Branch-Vehicle con sus relaciones
    async findAll() {
        return await BranchVehicle.findAll({
            include: [
                { model: Branch, as: 'branch', attributes: ['id', 'name'] },
                { model: Vehicle, as: 'vehicle'}
            ]
        });
    },

    async findByBranch(branchId, options = {}) {
        return await BranchVehicle.findAll({
            ...options,
            where: {
                branch_id: branchId // Filtramos por el ID de la sucursal
            },
            include: [
                {
                    model: Vehicle,
                    as: 'vehicle',
                    include: [{
                        model: Worker,
                        as: 'workers',
                        attributes: ['id', 'name', 'image'],
                        include: [
                            {
                                model: Role,
                                as: 'role',
                                attributes: ['id', 'name'],
                            },
                            {
                                model: Vehicle,
                                as: 'vehicles',
                                attributes: ['id'],
                                through: { attributes: [] },
                            },
                        ],
                        through: { attributes: [] },
                    }],
                }
            ]
        });
    },

    async findByVehicle(vehicleId, options = {}) {
        return await BranchVehicle.findAll({
            ...options,
            where: {
                vehicle_id: vehicleId
            },
            include: [
                {
                    model: Branch,
                    as: 'branch',
                    attributes: ['id', 'name', 'image', 'address']
                },
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
                }
            ],
            order: [['branch_id', 'ASC']]
        });
    },

    async findByVehicles(vehicleIds, options = {}) {
        const normalizedVehicleIds = (Array.isArray(vehicleIds) ? vehicleIds : [])
            .map((vehicleId) => Number(vehicleId))
            .filter((vehicleId) => Number.isInteger(vehicleId) && vehicleId > 0);

        if (normalizedVehicleIds.length === 0) {
            return [];
        }

        return await BranchVehicle.findAll({
            ...options,
            where: {
                vehicle_id: { [Op.in]: normalizedVehicleIds },
            },
            include: [
                {
                    model: Branch,
                    as: 'branch',
                    attributes: ['id', 'name', 'image', 'address', 'rut', 'phone', 'company_id'],
                    include: [
                        {
                            association: 'company',
                            attributes: ['id', 'name', 'image'],
                        },
                    ],
                },
            ],
            order: [['vehicle_id', 'ASC'], ['branch_id', 'ASC']],
        });
    },

    // Crear una nueva relación Branch-Vehicle
    async create(body, options = {}) {

        const { branch_id, vehicle_id } = body;
        return await BranchVehicle.create({
            branch_id,
            vehicle_id
        }, options);
    },

    // Obtener una relación Branch-Vehicle por ID
    async findById(id) {
        return await BranchVehicle.findByPk(id, {
            include: [
                { model: Branch, as: 'branch', attributes: ['id', 'name'] },
                { model: Vehicle, as: 'vehicle', attributes: ['id', 'plate', 'internal_number', 'image'] }
            ]
        });
    },

    // Actualizar una relación Branch-Vehicle
    async update(branchVehicle, body) {
        const fieldsToUpdate = ['branch_id', 'vehicle_id'];

            // Filtrar campos en req.body y construir el objeto updatedData
            const updatedData = Object.keys(body)
                .filter(key => fieldsToUpdate.includes(key) && body[key] !== undefined)
                .reduce((obj, key) => {
                    obj[key] = body[key];
                    return obj;
                }, {});

            // Actualizar la relación solo si hay datos para cambiar
            if (Object.keys(updatedData).length > 0) {
                await branchVehicle.update(updatedData);
                logger.info(`Relación sucursal-vehículo actualizada exitosamente (ID: ${branchVehicle.id})`);
            }

            return branchVehicle;
    },

    // Eliminar una relación Branch-Vehicle por ID
    async delete(branchVehicle, options = {}) {
        return await branchVehicle.destroy(options);
    },

    // Verificar si existe una relación por ID de sucursal y vehículo
    async existsBranchVehicle(branchId, vehicleId, excludeId = null, options = {}) {
        const whereCondition = excludeId
            ? { branch_id: branchId, vehicle_id: vehicleId, id: { [Op.ne]: excludeId } }
            : { branch_id: branchId, vehicle_id: vehicleId };
        return await BranchVehicle.findOne({ ...options, where: whereCondition });
    }
};

module.exports = BranchVehicleRepository;
