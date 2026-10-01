const { Op } = require('sequelize');
const logger = require('../../config/logger');
const { Route, Location } = require('../models');
const {
    RouteRepository,
    BranchRepository,
    BranchRouteRepository,
    LocationRepository,
} = require('../repositories');
const RouteService = require('../services/RouteService');

const routeAssociationErrorDetails = {
    RouteNotFound: 'La ruta indicada no existe.',
    BranchNotFound: 'La sucursal indicada no existe.',
    BranchRouteActionsInvalid:
        'El campo branches debe contener una lista válida de asociaciones.',
    BranchRouteActionInvalid:
        'Cada sucursal debe indicar una acción válida: associate o delete.',
    BranchRouteCreateActionInvalid:
        'Al crear una ruta solo se permite la acción associate.',
    BranchRouteAssociationIdNotAllowed:
        'La acción associate no debe incluir association_id.',
    BranchRouteAssociationIdRequired:
        'La acción delete requiere association_id.',
    BranchRouteDuplicateOperation:
        'No se puede procesar más de una acción para la misma sucursal en una solicitud.',
    BranchRouteAlreadyAssociated:
        'La ruta ya está asociada a la sucursal indicada.',
    BranchRouteAssociationNotFound:
        'La asociación indicada no pertenece a la ruta que se está editando.',
    BranchRouteAssociationBranchMismatch:
        'La sucursal no corresponde a la asociación indicada.',
};

const getRouteMutationStatus = (error) => {
    if (error.message === 'RouteNotFound' || error.message === 'BranchNotFound') {
        return 404;
    }

    if (error.message === 'BranchRouteAlreadyAssociated') {
        return 409;
    }

    if (error.message.startsWith('BranchRoute')) {
        return 400;
    }

    return 500;
};

const mapRoute = (route, branches = [], branchRoutes = []) => {
    const relationByBranchId = new Map(
        branchRoutes.map((branchRoute) => [Number(branchRoute.branch_id), branchRoute])
    );

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
        originAddress: route.origin?.address,
        originImage: route.origin?.image,
        destinationAddress: route.destination?.address,
        destinationImage: route.destination?.image,
        branches: branches.map((branch) => {
            const relation = relationByBranchId.get(Number(branch.id));

            return {
                id: branch.id,
                name: branch.name,
                image: branch.image,
                address: branch.address,
                rut: branch.rut,
                phone: branch.phone,
                company_id: branch.company_id,
                companyName: branch.company?.name,
                companyImage: branch.company?.image,
                branch_route_id: relation?.id || null,
                branch_route_price: relation?.price ?? null,
                branch_route_status: relation
                    ? 'ASSOCIATED_ACTIVE'
                    : 'NOT_ASSOCIATED',
                associated: Boolean(relation),
                association_active: Boolean(relation),
            };
        }),
    };
};

const getMappedRoute = async (routeId) => {
    const [route, branches, branchRoutes] = await Promise.all([
        RouteRepository.findById(routeId),
        BranchRepository.findAll(),
        BranchRouteRepository.findByRoute(routeId),
    ]);

    if (!route) {
        throw new Error('RouteNotFound');
    }

    return mapRoute(route, branches, branchRoutes);
};

const RouteController = {
    async index(req, res) {
        logger.info(`${req.user.name} - Entra a buscar las rutas`);

        try {
            const [routes, branches] = await Promise.all([
                RouteRepository.findAll(),
                BranchRepository.findAll(),
            ]);

            if (!routes.length) {
                return res.status(204).json({ msg: 'RoutesNotFound' });
            }

            const branchRoutes = await BranchRouteRepository.findByRoutes(
                routes.map((route) => route.id)
            );

            const mappedRoutes = routes.map((route) =>
                mapRoute(
                    route,
                    branches,
                    branchRoutes.filter(
                        (branchRoute) => Number(branchRoute.route_id) === Number(route.id)
                    )
                )
            );

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

        const { code, origin_id, destination_id } = req.body;

        try {
            const normalizedCode = RouteRepository.normalizeRouteCode(code);
            req.body.code = normalizedCode;

            const existingCode = await RouteRepository.existsByCode(normalizedCode);
            if (existingCode) {
                logger.error('El code ya estÃ¡ registrado en otra ruta:' + normalizedCode);
                return res.status(400).json({
                    error: 'DuplicateRouteCode',
                    msg: 'El cÃ³digo ya estÃ¡ registrado en otra ruta.',
                });
            }

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

            const route = await RouteService.create({ body: req.body });
            const mappedRoute = await getMappedRoute(route.id);

            return res.status(201).json({ route: mappedRoute });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('RouteController->store:' + errorMsg);
            const status = getRouteMutationStatus(error);
            return res.status(status).json({
                error: status === 500 ? 'ServerError' : 'Error de asociación de sucursal',
                details: routeAssociationErrorDetails[error.message] || errorMsg,
            });
        }
    },

    async show(req, res) {
        logger.info(`${req.user.name} - Busca una ruta con ID ${req.body.id}`);

        try {
            const route = await Route.findByPk(req.body.id, {
                attributes: ['id', 'code', 'name', 'origin_id', 'destination_id', 'distance', 'estimated', 'status'],
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

        const { id, code, name, origin_id, destination_id, distance, estimated, status } = req.body;

        try {
            const route = await RouteRepository.findById(id);
            if (!route) {
                return res.status(404).json({ msg: 'RouteNotFound' });
            }

            if (code !== undefined && code !== null) {
                const normalizedCode = RouteRepository.normalizeRouteCode(code);
                req.body.code = normalizedCode;

                const existingCode = await RouteRepository.existsByCode(normalizedCode, id);
                if (existingCode) {
                    logger.error('El code ya estÃ¡ registrado en otra ruta:' + normalizedCode);
                    return res.status(400).json({
                        error: 'DuplicateRouteCode',
                        msg: 'El cÃ³digo ya estÃ¡ registrado en otra ruta.',
                    });
                }
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

            const routeUpdate = await RouteService.update({
                id,
                body: req.body,
            });
            const mappedRoute = await getMappedRoute(routeUpdate.id);

            return res.status(200).json({
                route: mappedRoute,
            });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('RouteController->update:' + errorMsg);
            const status = getRouteMutationStatus(error);
            return res.status(status).json({
                error: status === 500 ? 'ServerError' : 'Error de asociación de sucursal',
                details: routeAssociationErrorDetails[error.message] || errorMsg,
            });
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
