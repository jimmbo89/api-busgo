const { BranchVehicle, Branch, Vehicle } = require('../models');
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

    async findByBranch(branchId) {
        return await BranchVehicle.findAll({
            where: {
                branch_id: branchId // Filtramos por el ID de la sucursal
            },
            include: [
                { 
                    model: Vehicle, 
                    as: 'vehicle'
                }
            ]
        });
    },

    // Crear una nueva relación Branch-Vehicle
    async create(body) {      

        const { branch_id, vehicle_id } = body;
        return await BranchVehicle.create({
            branch_id,
            vehicle_id
        });
    },

    // Obtener una relación Branch-Vehicle por ID
    async findById(id) {
        return await BranchVehicle.findByPk(id, {
            include: [
                { model: Branch, as: 'branch', attributes: ['id', 'name'] },
                { model: Vehicle, as: 'vehicle', attributes: ['id', 'plate', 'image'] }
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
    async delete(branchVehicle) {
        return await branchVehicle.destroy();
    },

    // Verificar si existe una relación por ID de sucursal y vehículo
    async existsBranchVehicle(branchId, vehicleId, excludeId = null) {
        const whereCondition = excludeId
            ? { branch_id: branchId, vehicle_id: vehicleId, id: { [Op.ne]: excludeId } }
            : { branch_id: branchId, vehicle_id: vehicleId };
        return await BranchVehicle.findOne({ where: whereCondition });
    }
};

module.exports = BranchVehicleRepository;
