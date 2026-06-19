const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const logger = require('../../config/logger'); // Logger para seguimiento
const { Vehicle } = require('../models'); // Importar el modelo Vehicle
const { VehicleRepository, StructureRepository } = require('../repositories');

const VehicleController = {
    // Obtener todos los vehículos
    async index(req, res) {
        logger.info(`${req.user.name} - Entra a buscar los vehículos`);

        try {
            const vehicles = await VehicleRepository.findAll();

            if (!vehicles.length) {
                return res.status(204).json({ msg: 'VehiclesNotFound' });
            }

            const mappedVehicles = vehicles.map(vehicle => ({
                id: vehicle.id,
                brand: vehicle.brand,
                model: vehicle.model,
                plate: vehicle.plate,
                internal_number: vehicle.internal_number,
                internalNumber: vehicle.internal_number,
                rut: vehicle.rut,
                seats: vehicle.seats,
                state: vehicle.state,
                image: vehicle.image,
                structure_id: vehicle.structure_id,
                structureId: vehicle.structure_id
            }));

            res.status(200).json({ vehicles: mappedVehicles });
        } catch (error) {
            const errorMsg = error.details
                ? error.details.map(detail => detail.message).join(', ')
                : error.message || 'Error desconocido';

            logger.error('VehicleController->index:' + errorMsg);
            return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Crear un nuevo vehículo
    async store(req, res) {
        logger.info(`${req.user.name} - Crea un nuevo vehículo`);
        logger.info('Datos recibidos al crear un vehículo');
        logger.info(JSON.stringify(req.body));

        const { brand, model, plate, internal_number, rut, seats, state, structure_id } = req.body;
        
        // Verificar si le empresa existe
        const structure = await StructureRepository.findById(structure_id);
        if (!structure) {
            logger.error(`VehicleController->store: Estructura no encontrada con ID ${structure_id}`);
            return res.status(404).json({ msg: 'StructureNotFound' });
        }

            // Verificar si ya existe un vehículo con el mismo rut, placa o número interno
            const existingVehicle = await VehicleRepository.existsByRutOrPlate(
                rut,
                plate,
                internal_number
            );
            logger.info(JSON.stringify(existingVehicle));
            if (existingVehicle) {
                logger.error(`El rut, placa o número interno ya está registrado en otro vehículo: ${existingVehicle.rut} o ${existingVehicle.plate} o ${existingVehicle.internal_number}`);
                return res.status(400).json({ 
                    error: 'DuplicateVehicleIdentifier', 
                    msg: 'El rut, la placa o el número interno ya está registrado en otro vehículo.' 
                });
            }

        try {
        
        const vehicle = await VehicleRepository.create(req.body, req.file);

            res.status(201).json({ vehicle: vehicle });
        } catch (error) {
            const errorMsg = error.details
                ? error.details.map(detail => detail.message).join(', ')
                : error.message || 'Error desconocido';

            logger.error('VehicleController->store:' + errorMsg);
            return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Obtener un vehículo por ID
    async show(req, res) {
        logger.info(`${req.user.name} - Busca un vehículo con ID ${req.body.id}`);

        try {
            const vehicle = await VehicleRepository.findById(req.body.id);

            if (!vehicle) {
                return res.status(404).json({ msg: 'VehicleNotFound' });
            }

            const mappedVehicle = {
                id: vehicle.id,
                brand: vehicle.brand,
                model: vehicle.model,
                plate: vehicle.plate,
                internal_number: vehicle.internal_number,
                internalNumber: vehicle.internal_number,
                rut: vehicle.rut,
                seats: vehicle.seats,
                state: vehicle.state,
                image: vehicle.image,
                structure_id: vehicle.structure_id,
                structureId: vehicle.structure_id,
            };

            res.status(200).json({ vehicle: mappedVehicle });
        } catch (error) {
            const errorMsg = error.details
                ? error.details.map(detail => detail.message).join(', ')
                : error.message || 'Error desconocido';

            logger.error('VehicleController->show:' + errorMsg);
            return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Actualizar un vehículo
    async update(req, res) {
        logger.info(`${req.user.name} - Actualiza el vehículo con ID ${req.body.id}`);
        logger.info('Datos recibidos al editar un vehículo');
        logger.info(JSON.stringify(req.body));

        const { id, brand, model, plate, internal_number, rut, seats, state, structure_id } = req.body;

        try {
            const vehicle = await VehicleRepository.findById(id);
            if (!vehicle) {
                return res.status(404).json({ msg: 'VehicleNotFound' });
            }

            // Verificar si el rut, la placa o el número interno ya existe en otro vehículo
            if (rut || plate || internal_number) {
                const existingVehicle = await VehicleRepository.existsByRutOrPlate(
                    rut,
                    plate,
                    internal_number,
                    id
                );

                if (existingVehicle) {
                    logger.error(`El rut, placa o número interno ya está registrado en otro vehículo: ${existingVehicle.rut} o ${existingVehicle.plate} o ${existingVehicle.internal_number}`);
                    return res.status(400).json({
                        error: 'DuplicateVehicleIdentifier',
                        msg: 'El rut, la placa o el número interno ya está registrado en otro vehículo.'
                    });
                }
            }

            if (structure_id) {
                // Verificar si le empresa existe
               const structure = await StructureRepository.findById(structure_id);
               if (!structure) {
                   logger.error(`VehicleController->store: Eestructura no encontrada con ID ${company_id}`);
                   return res.status(404).json({ msg: 'StructureNotFound' });
               }   
               }
            
            const vehicleUpdate = await VehicleRepository.update(vehicle, req.body, req.file);

            res.status(200).json({ vehicle: vehicle });
        } catch (error) {
            const errorMsg = error.details
                ? error.details.map(detail => detail.message).join(', ')
                : error.message || 'Error desconocido';

            logger.error('VehicleController->update:' + errorMsg);
            return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Eliminar un vehículo
    async destroy(req, res) {
        logger.info(`${req.user.name} - Elimina el vehículo con ID ${req.body.id}`);

        try {
            const vehicle = await VehicleRepository.findById(req.body.id);

            if (!vehicle) {
                return res.status(404).json({ msg: 'VehicleNotFound' });
            }

           const vehicleUpdate = await VehicleRepository.delete(vehicle);
            res.status(200).json({ msg: 'VehicleDeleted' });
        } catch (error) {
            const errorMsg = error.details
                ? error.details.map(detail => detail.message).join(', ')
                : error.message || 'Error desconocido';

            logger.error('VehicleController->destroy:' + errorMsg);
            return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },
};

module.exports = VehicleController;
