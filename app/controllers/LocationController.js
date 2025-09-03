const logger = require('../../config/logger'); // Logger para seguimiento
const { Location } = require('../models'); // Importar el modelo Location
const {LocationRepository, BranchRepository, BranchRouteRepository} = require('../repositories');

const LocationController = {
    // Obtener todas las ubicaciones
    async index(req, res) {
        logger.info(`${req.user.name} - Entra a buscar las ubicaciones`);

        try {
            const locations = await LocationRepository.findAll();

            if (!locations.length) {
                return res.status(204).json({ msg: 'LocationsNotFound' });
            }

            const mappedLocations = locations.map(location => ({
                id: location.id,
                latitude: location.latitude,
                longitude: location.longitude,
                address: location.address,
                country: location.country,
                city: location.city,
                image: location.image,
            }));

            res.status(200).json({ locations: mappedLocations });
        } catch (error) {
            const errorMsg = error.details
                ? error.details.map(detail => detail.message).join(', ')
                : error.message || 'Error desconocido';

            logger.error('LocationController->index:' + errorMsg);
            return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    async index_route(req, res) {
    logger.info(`${req.user.name} - Entra a buscar las ubicaciones (origen y destino)`);

    try {
        const { branch_id } = req.body;

        const branch = await BranchRepository.findById(branch_id);
      if (!branch) {
        logger.error(
          `LocationController->index_route: Sucursal no encontrada con ID ${branch_id}`
        );
        return res.status(400).json({ msg: "BranchNotFound" });
      }

        const { origins, destinations } = await LocationRepository.findOriginsAndDestinationsByBranch(branch_id);

        if (!origins.length && !destinations.length) {
            return res.status(204).json({ msg: 'LocationsNotFound' });
        }

        const branchRoutes = await BranchRouteRepository.findByBranch(branch_id);

        // Mapeo directo sin función auxiliar
        res.status(200).json({
            origins: origins.map(location => ({
                id: location.id,
                latitude: location.latitude,
                longitude: location.longitude,
                address: location.address,
                country: location.country,
                city: location.city,
                image: location.image,
            })),
            destinations: destinations.map(location => ({
                id: location.id,
                latitude: location.latitude,
                longitude: location.longitude,
                address: location.address,
                country: location.country,
                city: location.city,
                image: location.image,
            })),
            branchroutes: branchRoutes.map((branchRoute) => {
                const route = branchRoute.route;
                return {
                id: branchRoute.id,
                branchId: branchRoute.branch_id,
                branch_id: branchRoute.branch_id,
                routeId: branchRoute.route_id,
                route_id: branchRoute.route_id,
                origin_id: route.origin_id,
                destination_id: route.destination_id,
            }
            }),
        });

    } catch (error) {
        const errorMsg = error.details
            ? error.details.map(detail => detail.message).join(', ')
            : error.message || 'Error desconocido';

        logger.error('LocationController->index:' + errorMsg);
        return res.status(500).json({ error: 'ServerError', details: errorMsg });
    }
},
    // Crear una nueva ubicación
    async store(req, res) {
        logger.info(`${req.user.name} - Crea una nueva ubicación`);
        logger.info('Datos recibidos al crear una ubicación');
        logger.info(JSON.stringify(req.body));

        const { latitude, longitude, address, country, city } = req.body;

        try {

            // Verificar si ya existe un vehículo con el mismo rut
            const existingLocation = await LocationRepository.existsByAddress(address, country, city);
            if (existingLocation) {
                logger.error(`Dirección existente en esta: ${existingLocation.address}, ${existingLocation.country}, ${existingLocation.city}`);
                return res.status(400).json({ 
                    error: 'DuplicateAddress', 
                    msg: 'La direccion ya existe en esta ciudad y país.' 
                });
            }
            
            const location = await LocationRepository.create(req.body, req.file); 

            res.status(201).json({ location: location });
        } catch (error) {
            const errorMsg = error.details
                ? error.details.map(detail => detail.message).join(', ')
                : error.message || 'Error desconocido';

            logger.error('LocationController->store:' + errorMsg);
            return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Obtener una ubicación por ID
    async show(req, res) {
        logger.info(`${req.user.name} - Busca una ubicación con ID ${req.body.id}`);

        try {
            const location = await LocationRepository.findById(req.body.id);

            if (!location) {
                return res.status(404).json({ msg: 'LocationNotFound' });
            }

            const mappedLocation = {
                id: location.id,
                latitude: location.latitude,
                longitude: location.longitude,
                address: location.address,
                country: location.country,
                city: location.city,
                image: location.image,
            };

            res.status(200).json({ location: mappedLocation });
        } catch (error) {
            const errorMsg = error.details
                ? error.details.map(detail => detail.message).join(', ')
                : error.message || 'Error desconocido';

            logger.error('LocationController->show:' + errorMsg);
            return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Actualizar una ubicación
    async update(req, res) {
        logger.info(`${req.user.name} - Actualiza la ubicación con ID ${req.body.id}`);
        logger.info('Datos recibidos al editar una ubicación');
        logger.info(JSON.stringify(req.body));

        const { id, latitude, longitude, address, country, city } = req.body;


        try {
            const location = await Location.findByPk(id);
            if (!location) {
                return res.status(404).json({ msg: 'LocationNotFound' });
            }
            
            // Verificar si ya existe un vehículo con el mismo rut
            if (address || country || city) {
            const existingLocation = await LocationRepository.existsByAddress(address, country, city);
            if (existingLocation) {
                logger.error(`Direeción rxistente en esta: ${existingLocation.address}, ${existingLocation.country}, ${existingLocation.city}`);
                return res.status(400).json({ 
                    error: 'DuplicateAddress', 
                    msg: 'La direccion ya existe en esta ciudad y país.' 
                });
            } 
            }
            const locationUpdate = await LocationRepository.update(location, req.body, req.file);

            res.status(200).json({ location: locationUpdate });
        } catch (error) {
            const errorMsg = error.details
                ? error.details.map(detail => detail.message).join(', ')
                : error.message || 'Error desconocido';

            logger.error('LocationController->update:' + errorMsg);
            return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Eliminar una ubicación
    async destroy(req, res) {
        logger.info(`${req.user.name} - Elimina la ubicación con ID ${req.body.id}`);

        try {
            const location = await LocationRepository.findById(req.body.id);

            if (!location) {
                return res.status(404).json({ msg: 'LocationNotFound' });
            }

            const locationDelete = await LocationRepository.delete(location);

            res.status(200).json({ msg: 'LocationDeleted' });
        } catch (error) {
            const errorMsg = error.details
                ? error.details.map(detail => detail.message).join(', ')
                : error.message || 'Error desconocido';

            logger.error('LocationController->destroy:' + errorMsg);
            return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },
};

module.exports = LocationController;
