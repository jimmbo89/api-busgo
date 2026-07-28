const { Op } = require('sequelize');
const logger = require('../../config/logger');
const { Route, Location } = require('../models');
const { RouteRepository, BranchRepository, LocationRepository } = require('../repositories');

const RouteController = {
    async index(req, res) {
        logger.info(`${req.user.name} - Entra a buscar las rutas`);

        try {
            const routes = await RouteRepository.findAll();

            if (!routes.length) {
                return res.status(204).json({ msg: 'RoutesNotFound' });
            }

            const mappedRoutes = routes.map(route => {
                return {
                    id: route.id,
                    code: route.code,
                    name: route.name,
                    originId: route.origin_id,
                    origin_id: route.origin_id,
                    destinationId: route.destination_id,
                    destination_id: route.destination_id,
                    distance: route.distance,
                    estimated: route.estimated,
                    status: route.status,
                    originAddress: route.origin.address,
                    originImage: route.origin.image,
                    destinationAddress: route.destination.address,
                    destinationImage: route.destination.image,
                };
            });

            res.status(200).json({ routes: mappedRoutes });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('RouteController->index:' + errorMsg);
            return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    async getAvailableRoutesByBranch(req, res) {
        const { branch_id } = req.body;

        logger.info(`${req.user.name} - Buscando rutas no asociadas para la branch ${branch_id}`);

        try {
            const routesToReturn = await RouteRepository.findUnassociatedRoutesByBranchId(branch_id);

            if (!routesToReturn.length) {
                return res.status(204).json({ msg: 'RoutesNotFound' });
            }

            const mappedRoutes = routesToReturn.map(route => ({
                id: route.id,
                code: route.code,
                name: route.name,
                originId: route.origin_id,
                origin_id: route.origin_id,
                destinationId: route.destination_id,
                destination_id: route.destination_id,
                distance: route.distance,
                estimated: route.estimated,
                status: route.status,
                originAddress: route.origin.address,
                originImage: route.origin.image,
                destinationAddress: route.destination.address,
                destinationImage: route.destination.image,
            }));

            res.status(200).json({ routes: mappedRoutes });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('RouteController->getAvailableRoutesByBranch: ' + errorMsg);
            return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    async store(req, res) {
        logger.info(`${req.user.name} - Crea una nueva ruta`);
        logger.info('Datos recibidos al crear una ruta:');
        logger.info(JSON.stringify(req.body));

        const { origin_id, destination_id } = req.body;

        try {
            const originLocation = await Location.findByPk(origin_id);
            if (!originLocation) {
                return res.status(404).json({ msg: 'OriginLocationhNotFound' });
            }

            const destinationLocation = await Location.findByPk(destination_id);
            if (!destinationLocation) {
                return res.status(404).json({ msg: 'DestinationLocationNotFound' });
            }

            if (Number(origin_id) === Number(destination_id)) {
                return res.status(400).json({
                    msg: 'RouteOriginDestinationSame',
                    details: 'Origen y destino no pueden ser iguales',
                });
            }

            const existingRoute = await RouteRepository.existsByOriginAndDestination(origin_id, destination_id);
            if (existingRoute) {
                return res.status(400).json({
                    msg: 'DuplicateRoute',
                    details: 'Ya existe una ruta con ese origen y destino',
                });
            }

            const route = await RouteRepository.create(req.body);

            return res.status(201).json({ route: route });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('RouteController->store:' + errorMsg);
            return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    async show(req, res) {
        logger.info(`${req.user.name} - Busca una ruta con ID ${req.body.id}`);

        try {
            const route = await Route.findByPk(req.body.id, {
                attributes: ['id', 'name', 'origin_id', 'destination_id', 'distance', 'estimated', 'status'],
                include: [
                    {
                        model: Location,
                        as: 'origin',
                        attributes: ['address', 'image'],
                    },
                    {
                        model: Location,
                        as: 'destination',
                        attributes: ['address', 'image'],
                    },
                ],
            });

            if (!route) {
                return res.status(404).json({ msg: 'RouteNotFound' });
            }

            const mappedRoute = {
                id: route.id,
                code: route.code,
                name: route.name,
                originId: route.origin_id,
                destinationId: route.destination_id,
                distance: route.distance,
                estimated: route.estimated,
                status: route.status,
                originAddress: route.origin.address,
                destinationAddress: route.destination.address,
            };

            res.status(200).json({ route: mappedRoute });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('RouteController->show:' + errorMsg);
            return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    async update(req, res) {
        logger.info(`${req.user.name} - Actualiza la ruta con ID ${req.body.id}`);
        logger.info('Datos recibidos al editar una ruta:');
        logger.info(JSON.stringify(req.body));

        const { id, name, origin_id, destination_id, distance, estimated, status } = req.body;

        try {
            const route = await RouteRepository.findById(id);
            if (!route) {
                return res.status(404).json({ msg: 'RouteNotFound' });
            }

            if (origin_id !== undefined && origin_id !== null) {
                const originLocation = await LocationRepository.findById(origin_id);
                if (!originLocation) {
                    return res.status(404).json({ msg: 'OriginLocationNotFound' });
                }
            }

            if (destination_id !== undefined && destination_id !== null) {
                const destinationLocation = await LocationRepository.findById(destination_id);
                if (!destinationLocation) {
                    return res.status(404).json({ msg: 'DestinationLocationNotFound' });
                }
            }

            const nextOriginId = origin_id !== undefined ? origin_id : route.origin_id;
            const nextDestinationId = destination_id !== undefined ? destination_id : route.destination_id;

            if (Number(nextOriginId) === Number(nextDestinationId)) {
                return res.status(400).json({
                    msg: 'RouteOriginDestinationSame',
                    details: 'Origen y destino no pueden ser iguales',
                });
            }

            const existingRoute = await RouteRepository.existsByOriginAndDestination(
                nextOriginId,
                nextDestinationId,
                route.id
            );
            if (existingRoute) {
                return res.status(400).json({
                    msg: 'DuplicateRoute',
                    details: 'Ya existe una ruta con ese origen y destino',
                });
            }

            const routeData = {};
            if (name !== undefined) routeData.name = name;
            if (origin_id !== undefined) routeData.origin_id = origin_id;
            if (destination_id !== undefined) routeData.destination_id = destination_id;
            if (distance !== undefined) routeData.distance = distance;
            if (estimated !== undefined) routeData.estimated = estimated;
            if (status !== undefined) routeData.status = status;

            let routeUpdate = null;
            if (Object.keys(routeData).length > 0) {
                routeUpdate = await RouteRepository.update(route, routeData);
            } else {
                routeUpdate = route;
            }

            return res.status(200).json({
                route: routeUpdate,
            });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('RouteController->update:' + errorMsg);
            return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    async destroy(req, res) {
        logger.info(`${req.user.name} - Elimina la ruta con ID ${req.body.id}`);

        try {
            const route = await RouteRepository.findById(req.body.id);

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
