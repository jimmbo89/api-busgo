const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const logger = require('../../config/logger'); // Logger para seguimiento
const { Vehicle } = require('../models'); // Importar el modelo Vehicle
const {
    VehicleRepository,
    StructureRepository,
    BranchVehicleRepository,
    VehicleRoutePreferenceRepository,
} = require('../repositories');
const VehicleService = require('../services/VehicleService');

const mapBranch = (relation) => ({
    id: relation.branch?.id,
    branch_id: relation.branch_id,
    name: relation.branch?.name,
    image: relation.branch?.image,
    address: relation.branch?.address,
    rut: relation.branch?.rut,
    phone: relation.branch?.phone,
    company_id: relation.branch?.company_id,
    companyName: relation.branch?.company?.name,
    companyImage: relation.branch?.company?.image,
    association_id: relation.id,
});

const mapRoute = (route) => (route
    ? {
        id: route.id,
        route_id: route.id,
        code: route.code,
        route_code: route.code,
        name: route.name,
        estimated: route.estimated,
        origin_id: route.origin_id,
        destination_id: route.destination_id,
        distance: route.distance,
        status: route.status,
        origin: route.origin
            ? {
                id: route.origin.id,
                address: route.origin.address,
                image: route.origin.image,
            }
            : null,
        destination: route.destination
            ? {
                id: route.destination.id,
                address: route.destination.address,
                image: route.destination.image,
            }
            : null,
    }
    : null);

const mapRoutePreference = (preference) => ({
    id: preference.id,
    vehicle_id: preference.vehicle_id,
    branch_id: preference.branch_id,
    route_id: preference.route_id,
    priority: preference.priority,
    branch: preference.branch
        ? {
            id: preference.branch.id,
            name: preference.branch.name,
            image: preference.branch.image,
            address: preference.branch.address,
            company_id: preference.branch.company_id,
        }
        : null,
    route: mapRoute(preference.route),
});

const mapVehicle = ({ vehicle, branchVehicles = [], preferences = [] }) => ({
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
    branches: branchVehicles.map(mapBranch),
    route_preferences: preferences.map(mapRoutePreference),
});

const vehicleAssociationErrorDetails = {
    VehicleNotFound: 'El vehículo indicado no existe.',
    BranchNotFound: 'Una de las sucursales indicadas no existe.',
    VehicleBranchActionsInvalid:
        'El campo branches debe contener una lista válida de asociaciones.',
    VehicleBranchActionInvalid:
        'Cada sucursal debe indicar una acción válida: associate o delete.',
    VehicleBranchCreateActionInvalid:
        'Al crear un vehículo solo se permite la acción associate.',
    VehicleBranchAssociationIdNotAllowed:
        'La acción associate no debe incluir association_id.',
    VehicleBranchAssociationIdRequired:
        'La acción delete requiere association_id.',
    VehicleBranchDuplicateOperation:
        'No se puede procesar más de una acción para la misma sucursal en una solicitud.',
    VehicleBranchAlreadyAssociated:
        'El vehículo ya está asociado a la sucursal indicada.',
    VehicleBranchAssociationNotFound:
        'La asociación indicada no pertenece al vehículo que se está editando.',
    VehicleBranchAssociationBranchMismatch:
        'La sucursal no corresponde a la asociación indicada.',
    VehicleRoutePreferenceActionsInvalid:
        'El campo route_preferences debe contener una lista válida de preferencias.',
    VehicleRoutePreferenceActionInvalid:
        'Cada preferencia debe indicar sucursal, ruta, prioridad entre 1 y 3 y una acción válida.',
    VehicleRoutePreferenceCreateActionInvalid:
        'Al crear un vehículo solo se permite la acción associate para las preferencias.',
    VehicleRoutePreferenceAssociationIdNotAllowed:
        'La acción associate no debe incluir association_id.',
    VehicleRoutePreferenceAssociationIdRequired:
        'Las acciones update y delete requieren association_id.',
    VehicleRoutePreferenceDuplicateOperation:
        'No se puede procesar más de una acción para la misma preferencia en una solicitud.',
    VehicleRoutePreferenceVehicleIdMismatch:
        'El vehicle_id de la preferencia no corresponde al vehículo que se está procesando.',
    VehicleRoutePreferenceAssociationNotFound:
        'La preferencia indicada no pertenece al vehículo que se está editando.',
    VehicleRoutePreferenceAssociationMismatch:
        'La preferencia indicada no corresponde a la sucursal o ruta enviada.',
    VehicleRoutePreferenceBranchNotAssociated:
        'La sucursal de la preferencia no está asociada al vehículo.',
    VehicleRoutePreferenceRouteNotFound:
        'La ruta indicada no existe.',
    VehicleRoutePreferenceRouteNotAvailableForBranch:
        'La ruta indicada no está asociada a la sucursal seleccionada.',
    VehicleRoutePreferenceAlreadyAssociated:
        'La ruta ya está configurada como preferente para la sucursal indicada.',
    VehicleRoutePreferencePriorityDuplicate:
        'La prioridad ya está utilizada para esa sucursal.',
    VehicleRoutePreferenceMaxRoutesExceeded:
        'El vehículo no puede tener más de tres rutas preferentes por sucursal.',
};

const isRoutePreferenceError = (message) =>
    message.startsWith('VehicleRoutePreference');

const getVehicleMutationStatus = (error) => {
    if (
        ['VehicleNotFound', 'BranchNotFound', 'VehicleBranchAssociationNotFound']
            .includes(error.message)
    ) {
        return 404;
    }

    if (error.message === 'VehicleBranchAlreadyAssociated') {
        return 409;
    }

    if (error.message === 'VehicleRoutePreferenceAlreadyAssociated') {
        return 409;
    }

    if (isRoutePreferenceError(error.message)) {
        if (error.message === 'VehicleRoutePreferenceRouteNotFound') {
            return 404;
        }

        return 422;
    }

    if (error.message.startsWith('VehicleBranch')) {
        return 400;
    }

    return 500;
};

const VehicleController = {
    // Obtener todos los vehículos
    async index(req, res) {
        logger.info(`${req.user.name} - Entra a buscar los vehículos`);

        try {
            const vehicles = await VehicleRepository.findAll();

            if (!vehicles.length) {
                return res.status(204).json({ msg: 'VehiclesNotFound' });
            }

            const vehicleIds = vehicles.map((vehicle) => vehicle.id);
            const [branchVehicles, routePreferences] = await Promise.all([
                BranchVehicleRepository.findByVehicles(vehicleIds),
                VehicleRoutePreferenceRepository.findByVehicles(vehicleIds),
            ]);

            const preferencesByVehicle = new Map();
            routePreferences.forEach((preference) => {
                const vehicleId = Number(preference.vehicle_id);
                const preferences = preferencesByVehicle.get(vehicleId) || [];
                preferences.push(mapRoutePreference(preference));
                preferencesByVehicle.set(vehicleId, preferences);
            });

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
                structureId: vehicle.structure_id,
                branches: branchVehicles
                    .filter(
                        (branchVehicle) =>
                            Number(branchVehicle.vehicle_id) === Number(vehicle.id)
                    )
                    .map(mapBranch),
                route_preferences: preferencesByVehicle.get(Number(vehicle.id)) || [],
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
        
            const result = await VehicleService.create({
                body: req.body,
                file: req.file,
            });

            const mappedVehicle = mapVehicle(result);
            res.status(201).json({
                msg: 'VehicleCreated',
                vehicle: mappedVehicle,
                // Se conserva el campo anterior para no romper consumidores actuales.
                branches: mappedVehicle.branches,
            });
        } catch (error) {
            const errorMsg = error.details
                ? error.details.map(detail => detail.message).join(', ')
                : error.message || 'Error desconocido';

            logger.error('VehicleController->store:' + errorMsg);
            const status = getVehicleMutationStatus(error);
            const friendlyDetails =
                vehicleAssociationErrorDetails[error.message] || errorMsg;
            return res.status(status).json({
                error: status === 500
                    ? 'Error interno del servidor'
                    : isRoutePreferenceError(error.message)
                        ? friendlyDetails
                        : 'No se pudo procesar la asociación del vehículo con las sucursales.',
                details: friendlyDetails,
            });
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
            
            const result = await VehicleService.update({
                id,
                body: req.body,
                file: req.file,
            });

            const mappedVehicle = mapVehicle(result);
            res.status(200).json({
                msg: 'VehicleUpdated',
                vehicle: mappedVehicle,
                // Se conserva el campo anterior para no romper consumidores actuales.
                branches: mappedVehicle.branches,
            });
        } catch (error) {
            const errorMsg = error.details
                ? error.details.map(detail => detail.message).join(', ')
                : error.message || 'Error desconocido';

            logger.error('VehicleController->update:' + errorMsg);
            const status = getVehicleMutationStatus(error);
            const friendlyDetails =
                vehicleAssociationErrorDetails[error.message] || errorMsg;
            return res.status(status).json({
                error: status === 500
                    ? 'Error interno del servidor'
                    : isRoutePreferenceError(error.message)
                        ? friendlyDetails
                        : 'No se pudo procesar la asociación del vehículo con las sucursales.',
                details: friendlyDetails,
            });
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
