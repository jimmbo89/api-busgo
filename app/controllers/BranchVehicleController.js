const logger = require('../../config/logger');
const { BranchVehicleRepository, BranchRepository, VehicleRepository } = require('../repositories');

const BranchVehicleController = {
    // Obtener todas las relaciones Branch-Vehicle
    async index(req, res) {
        logger.info(`${req.user.name} - Busca todas las relaciones Branch-Vehicle`);
        try {
            const branchVehicles = await BranchVehicleRepository.findAll();

            // Mapeamos los resultados para obtener solo los IDs y nombres
            const mappedBranchVehicles = branchVehicles.map(branchVehicle => ({
                id: branchVehicle.id,
                branchId: branchVehicle.branch_id,
                branchName: branchVehicle.branch.name,
                vehicleId: branchVehicle.vehicle_id,
                vehicle_id: branchVehicle.vehicle_id,
                vehicleName: branchVehicle.vehicle.plate,
                internal_number: branchVehicle.vehicle.internal_number,
                internalNumber: branchVehicle.vehicle.internal_number
            }));

            res.status(200).json({ 'branchVehicles': mappedBranchVehicles });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('BranchVehicleController->index: ' + errorMsg);
            res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    async branch_vehicles(req, res) {
        logger.info(`${req.user.name} - Busca todas las relaciones Branch-Vehicle`);
        const { branch_id } = req.body;
        
            const branch = await BranchRepository.findById(branch_id);
            if (!branch) {
                logger.error(`BranchVehicleController->branch_vehicles: Sucursal no encontrada con ID ${branch_id}`);
                return res.status(404).json({ msg: 'BranchNotFound' });
            }
        try {
            const branchVehicles = await BranchVehicleRepository.findByBranch(branch_id);

            // Mapeamos los resultados para obtener solo los IDs y nombres
            const mappedBranchVehicles = branchVehicles.map(branchVehicle => ({
                id: branchVehicle.id,
                branchId: branchVehicle.branch_id,
                branch_id: branchVehicle.branch_id,
                vehicleId: branchVehicle.vehicle_id,
                vehicle_id: branchVehicle.vehicle_id,
                plate: branchVehicle.vehicle.plate,
                internal_number: branchVehicle.vehicle.internal_number,
                internalNumber: branchVehicle.vehicle.internal_number,
                brand: branchVehicle.vehicle.brand,
                model: branchVehicle.vehicle.model,
                image: branchVehicle.vehicle.image,
                seats: branchVehicle.vehicle.seats,
            }));

            res.status(200).json({ 'branchVehicles': mappedBranchVehicles });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('BranchVehicleController->index: ' + errorMsg);
            res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Crear una nueva relación Branch-Vehicle
    async store(req, res) {
        logger.info(`${req.user.name} - Crea una nueva relación Branch-Vehicle`);
        const {branch_id, vehicle_id} = req.body;
        try {
            const branch = await BranchRepository.findById(branch_id);
            if (!branch) {
                logger.error(`BranchVehicleController->store: Sucursal no encontrada con ID ${branch_id}`);
                return res.status(404).json({ msg: 'BranchNotFound' });
            }

            const vehicle = await VehicleRepository.findById(vehicle_id);
            if (!vehicle) {
                logger.error(`BranchVehicleController->store: Vehículo no encontrado con ID ${vehicle_id}`);
                return res.status(404).json({ msg: 'VehicleNotFound' });
            }

            // Verificar si ya existe un vehículo con el mismo rut
            const existingBranchVehicle = await BranchVehicleRepository.existsBranchVehicle(branch_id, vehicle_id);
            if (existingBranchVehicle) {
                logger.error(`Relación Sucursal Vehículo existente: ${existingBranchVehicle.branch_id}, ${existingBranchVehicle.vehicle_id}`);
                return res.status(400).json({ 
                    error: 'DuplicateRelación', 
                    msg: 'Relaión existente sucursal vehiculo.' 
                });
            }

            const branchVehicle = await BranchVehicleRepository.create(req.body);

            res.status(201).json({ msg: 'BranchVehicleCreated', branchVehicle });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('BranchVehicleController->store: ' + errorMsg);
            res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Obtener una relación específica Branch-Vehicle por ID
    async show(req, res) {
        logger.info(`${req.user.name} - Busca la relación Branch-Vehicle con ID: ${req.body.id}`);

        try {
            const branchVehicle = await BranchVehicleRepository.findById(req.body.id);
            if (!branchVehicle) {
                return res.status(404).json({ msg: 'BranchVehicleNotFound' });
            }

            // Mapeamos los resultados para obtener solo los IDs y nombres
            const mappedBranchVehicle = {
                id: branchVehicle.id,
                branchId: branchVehicle.branch_id,
                branchName: branchVehicle.branch.name,
                vehicleId: branchVehicle.vehicle_id,
                vehicleName: branchVehicle.vehicle.plate,
                internal_number: branchVehicle.vehicle.internal_number,
                internalNumber: branchVehicle.vehicle.internal_number
            };
            res.status(200).json({ 'branchVehicle': mappedBranchVehicle });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('BranchVehicleController->show: ' + errorMsg);
            res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Actualizar una relación Branch-Vehicle
    async update(req, res) {
        logger.info(`${req.user.name} - Editando una relación Branch-Vehicle`);

        const { id, branch_id, vehicle_id } = req.body;
        try {
            const branchVehicle = await BranchVehicleRepository.findById(req.body.id);
            if (!branchVehicle) {
                logger.error(`BranchVehicleController->update: Relación no encontrada con ID ${req.body.id}`);
                return res.status(404).json({ msg: 'BranchVehicleNotFound' });
            }

            if (branch_id) {
                const branch = await BranchRepository.findById(branch_id);
                if (!branch) {
                    logger.error(`BranchVehicleController->update: Sucursal no encontrada con ID ${branch_id}`);
                    return res.status(404).json({ msg: 'BranchNotFound' });
                }
            }

            if (vehicle_id) {
                const vehicle = await VehicleRepository.findById(vehicle_id);
                if (!vehicle) {
                    logger.error(`BranchVehicleController->update: Vehículo no encontrado con ID ${vehicle_id}`);
                    return res.status(404).json({ msg: 'VehicleNotFound' });
                }
            }

            // Verificar si ya existe esa relación
          if (vehicle_id || branch_id) {
              const existingBranchVehicle = await BranchVehicleRepository.existsBranchVehicle(branch_id, vehicle_id, id);
            if (existingBranchVehicle) {
                logger.error(`Relación Sucursal Vehículo existente: ${existingBranchVehicle.branch_id}, ${existingBranchVehicle.vehicle_id}`);
                return res.status(400).json({ 
                    error: 'DuplicateRelación', 
                    msg: 'Relaión existente sucursal vehiculo.' 
                });
            }
          }

            const branchVehicleUpdate = await BranchVehicleRepository.update(branchVehicle, req.body);

            res.status(200).json({ msg: 'BranchVehicleUpdated', branchVehicleUpdate });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('BranchVehicleController->update: ' + errorMsg);
            res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Eliminar una relación Branch-Vehicle
    async destroy(req, res) {
        logger.info(`${req.user.name} - Eliminando una relación Branch-Vehicle`);

        try {
            const branchVehicle = await BranchVehicleRepository.findById(req.body.id);
            if (!branchVehicle) {
                logger.error(`BranchVehicleController->destroy: Relación no encontrada con ID ${req.body.id}`);
                return res.status(404).json({ msg: 'BranchVehicleNotFound' });
            }

            await branchVehicle.destroy();
            res.status(200).json({ msg: 'BranchVehicleDeleted' });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('BranchVehicleController->destroy: ' + errorMsg);
            res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    }
};

module.exports = BranchVehicleController;
