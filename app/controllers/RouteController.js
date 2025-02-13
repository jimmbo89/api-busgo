const { Op } = require('sequelize');
const logger = require('../../config/logger'); // Logger para seguimiento
const { Route, Location } = require('../models'); // Importar los modelos necesarios
const { RouteRepository } = require('../repositories');

const RouteController = {
    // Obtener todas las rutas
    async index(req, res) {
        logger.info(`${req.user.name} - Entra a buscar las rutas`);

        try {
            const routes = await RouteRepository.findAll();
            
            if (!routes.length) {
                return res.status(204).json({ msg: 'RoutesNotFound' });
            }
            
            // Mapear las rutas para devolver el formato requerido
            const mappedRoutes = routes.map(route => {
                return {
                    id: route.id,
                    name: route.name,
                    originId: route.origin_id,  // Cambiar el nombre del id de origen
                    origin_id: route.origin_id,  // Cambiar el nombre del id de origen
                    destinationId: route.destination_id,  // Cambiar el nombre del id de destino
                    destination_id: route.destination_id,  // Cambiar el nombre del id de destino
                    distance: route.distance,
                    estimated: route.estimated,
                    status: route.status,
                    originAddress: route.origin.address,  // Incluir solo la dirección de origen
                    originImage: route.origin.image,  // Incluir solo la dirección de origen
                    destinationAddress: route.destination.address,  // Incluir solo la dirección de destino
                    destinationImage: route.destination.image,  // Incluir solo la dirección de destino
                };
            });
            
            res.status(200).json({ routes: mappedRoutes });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('RouteController->index:' + errorMsg);
            return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Crear una nueva ruta
    async store(req, res) {
        logger.info(`${req.user.name} - Crea una nueva ruta`);
        logger.info('Datos recibidos al crear una ruta:');
        logger.info(JSON.stringify(req.body));

        const { name, origin_id, destination_id, distance, estimated, status } = req.body;

        try {
            const originLocation = await Location.findByPk(origin_id);
            if (!originLocation) {
                return res.status(404).json({ msg: 'OriginLocationhNotFound' });
            }

            const destinationLocation = await Location.findByPk(destination_id);
            if (!destinationLocation) {
                return res.status(404).json({ msg: 'DestinationLocationNotFound' });
            }

            const route = await RouteRepository.create(req.body);

            res.status(201).json({ 'route': route });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('RouteController->store:' + errorMsg);
            return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Obtener una ruta por ID
    async show(req, res) {
        logger.info(`${req.user.name} - Busca una ruta con ID ${req.body.id}`);

        try {
            const route = await Route.findByPk(req.body.id, {
                attributes: ['id', 'name', 'origin_id', 'destination_id', 'distance', 'estimated', 'status'],
                include: [
                    {
                        model: Location,
                        as: 'origin',
                        attributes: ['address', 'image'], // Incluir solo la dirección del origen
                    },
                    {
                        model: Location,
                        as: 'destination',
                        attributes: ['address', 'image'], // Incluir solo la dirección del destino
                    },
                ],
            });
    
            if (!route) {
                return res.status(404).json({ msg: 'RouteNotFound' });
            }
    
            // Mapear los datos para devolver solo lo necesario
            const mappedRoute = {
                id: route.id,
                name: route.name,
                originId: route.origin_id,  // Cambiar el nombre del id de origen
                destinationId: route.destination_id,  // Cambiar el nombre del id de destino
                distance: route.distance,
                estimated: route.estimated,
                status: route.status,
                originAddress: route.origin.address,  // Incluir solo la dirección de origen
                destinationAddress: route.destination.address,  // Incluir solo la dirección de destino
            };
    
            res.status(200).json({ route: mappedRoute });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('RouteController->show:' + errorMsg);
            return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Actualizar una ruta
    async update(req, res) {
        logger.info(`${req.user.name} - Actualiza la ruta con ID ${req.body.id}`);
        logger.info('Datos recibidos al editar una ruta:');
        logger.info(JSON.stringify(req.body));

        const { id, name, origin_id, destination_id, distance, estimated, status } = req.body;

        try {
            const route = await Route.findByPk(id);
            if (!route) {
                return res.status(404).json({ msg: 'RouteNotFound' });
            }

            if (origin_id) {
                const originLocation = await Location.findByPk(origin_id);
                if (!originLocation) {
                    return res.status(404).json({ msg: 'OriginLocationNotFound' });
                }
            }

            if (destination_id) {
                const destinationLocation = await Location.findByPk(destination_id);
                if (!destinationLocation) {
                    return res.status(404).json({ msg: 'DestinationLocationNotFound' });
                }
            }

            const fieldsToUpdate = ['name', 'origin_id', 'destination_id', 'distance', 'estimated', 'status'];
        
        // Filtrar campos en req.body y construir el objeto updatedData
        const updatedData = Object.keys(req.body)
            .filter(key => fieldsToUpdate.includes(key) && req.body[key] !== undefined)
            .reduce((obj, key) => {
                obj[key] = req.body[key];
                return obj;
            }, {});

            // Actualizar la ruta solo si hay datos para cambiar
            if (Object.keys(updatedData).length > 0) {
                await route.update(updatedData);
                logger.info(`Ruta actualizada exitosamente (ID: ${route.id})`);
            }
            res.status(200).json({ 'route': route });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('RouteController->update:' + errorMsg);
            return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Eliminar una ruta
    async destroy(req, res) {
        logger.info(`${req.user.name} - Elimina la ruta con ID ${req.body.id}`);

        try {
            const route = await Route.findByPk(req.body.id);

            if (!route) {
                return res.status(404).json({ msg: 'RouteNotFound' });
            }

            await route.destroy();
            res.status(200).json({ msg: 'RouteDeleted' });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('RouteController->destroy:' + errorMsg);
            return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },
};

module.exports = RouteController;
