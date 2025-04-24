const { BranchRoute, Branch, Route, sequelize } = require('../models');
const logger = require('../../config/logger');
const { BranchRouteRepository, BranchRepository } = require('../repositories');

const BranchRouteController = {
    // Obtener todas las relaciones Branch-Route
    async index(req, res) {
        logger.info(`${req.user.name} - Busca todas las relaciones Branch-Route`);
        try {
            const branchRoutes = await BranchRouteRepository.findAll();

            // Mapeamos los resultados para obtener solo los IDs y nombres
            const mappedBranchRoutes = branchRoutes.map(branchRoute => ({
                id: branchRoute.id,
                branchId: branchRoute.branch.id,
                branchName: branchRoute.branch.name,
                routeId: branchRoute.route.id,
                routeName: branchRoute.route.name,
                price: branchRoute.price
            }));

            res.status(200).json({ 'branchRoutes': mappedBranchRoutes });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('BranchRouteController->index: ' + errorMsg);
            res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    async branch_routes(req, res) {
        logger.info(`${req.user.name} - Busca todas las relaciones Branch-Route`);
        const { branch_id } = req.body;
        
        const branch = await BranchRepository.findById(branch_id);
        if (!branch) {
            logger.error(`BranchRouteController->branch_routes: Sucursal no encontrada con ID ${branch_id}`);
            return res.status(404).json({ msg: 'BranchNotFound' });
        }
        try {
            const branchRoutes = await BranchRouteRepository.findByBranch(branch_id, {
                order: [['created_at', 'ASC']] // ASC para más antiguo primero, DESC para más reciente primero
            });

            // Mapeamos los resultados para obtener solo los IDs y nombres
            const mappedBranchRoutes = branchRoutes.map((branchRoute) => {
                const route = branchRoute.route;
                return {
                id: branchRoute.id,
                branchId: branchRoute.branch_id,
                branch_id: branchRoute.branch_id,
                price: branchRoute.price,
                routeId: branchRoute.route_id,
                route_id: branchRoute.route_id,
                name: route.name,
                originName: route.origin.address,
                origin_id: route.origin_id,
                originImage: route.origin.image,
                destination_id: route.destination_id,
                destinationName: route.destination.address,
                destinationImage: route.destination.image,
            }
            });

            res.status(200).json({ 'branchRoutes': mappedBranchRoutes });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('BranchRouteController->index: ' + errorMsg);
            res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Crear una nueva relación Branch-Route
    async store(req, res) {
        logger.info(`${req.user.name} - Crea una nueva relación Branch-Route`);

        const { branch_id, route_id, price } = req.body;

        const branch = await Branch.findByPk(branch_id);
        if (!branch) {
            logger.error(`BranchRouteController->store: Sucursal no encontrada con ID ${branch_id}`);
            return res.status(404).json({ msg: 'BranchNotFound' });
        }

        const route = await Route.findByPk(route_id);
        if (!route) {
            logger.error(`BranchRouteController->store: Ruta no encontrada con ID ${route_id}`);
            return res.status(404).json({ msg: 'RouteNotFound' });
        }

        try {
            const branchRoute = await BranchRoute.create({
                branch_id: branch_id,
                route_id: route_id,
                price: price
            });
            res.status(201).json({ msg: 'BranchRouteCreated', branchRoute });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('BranchRouteController->store: ' + errorMsg);
            res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Obtener una relación específica Branch-Route por ID
    async show(req, res) {
        logger.info(`${req.user.name} - Busca la relación Branch-Route con ID: ${req.body.id}`);

        try {
            const branchRoute = await BranchRoute.findByPk(req.body.id, {
                include: [
                    { model: Branch, as: 'branch', attributes: ['id', 'name'] },
                    { model: Route, as: 'route', attributes: ['id', 'name'] }
                ]
            });
            if (!branchRoute) {
                return res.status(404).json({ msg: 'BranchRouteNotFound' });
            }

            // Mapeamos los resultados para obtener solo los IDs y nombres
            const mappedBranchRoute = {
                id: branchRoute.id,
                branchId: branchRoute.branch.id,
                branchName: branchRoute.branch.name,
                routeId: branchRoute.route.id,
                routeName: branchRoute.route.name,
                price: branchRoute.price
            };
            res.status(200).json({ 'branchRoute': mappedBranchRoute });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('BranchRouteController->show: ' + errorMsg);
            res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Actualizar una relación Branch-Route
    async update(req, res) {
        logger.info(`${req.user.name} - Editando una relación Branch-Route`);

        const { branch_id, route_id, price } = req.body;
        try {
            const branchRoute = await BranchRoute.findByPk(req.body.id);
            if (!branchRoute) {
                logger.error(`BranchRouteController->update: Relación no encontrada con ID ${req.body.id}`);
                return res.status(404).json({ msg: 'BranchRouteNotFound' });
            }

            if (branch_id) {
                const branch = await Branch.findByPk(branch_id);
                if (!branch) {
                    logger.error(`BranchRouteController->update: Sucursal no encontrada con ID ${branch_id}`);
                    return res.status(404).json({ msg: 'BranchNotFound' });
                }
            }

            if (route_id) {
                const route = await Route.findByPk(route_id);
                if (!route) {
                    logger.error(`BranchRouteController->update: Ruta no encontrada con ID ${route_id}`);
                    return res.status(404).json({ msg: 'RouteNotFound' });
                }
            }

            const fieldsToUpdate = ['branch_id', 'route_id', 'price'];

            // Filtrar campos en req.body y construir el objeto updatedData
            const updatedData = Object.keys(req.body)
                .filter(key => fieldsToUpdate.includes(key) && req.body[key] !== undefined)
                .reduce((obj, key) => {
                    obj[key] = req.body[key];
                    return obj;
                }, {});

            // Actualizar la relación solo si hay datos para cambiar
            if (Object.keys(updatedData).length > 0) {
                await branchRoute.update(updatedData);
                logger.info(`Relación sucursal-ruta actualizada exitosamente (ID: ${branchRoute.id})`);
            }
            res.status(200).json({ msg: 'BranchRouteUpdated', branchRoute });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('BranchRouteController->update: ' + errorMsg);
            res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Eliminar una relación Branch-Route
    async destroy(req, res) {
        logger.info(`${req.user.name} - Eliminando una relación Branch-Route`);

        try {
            const branchRoute = await BranchRoute.findByPk(req.body.id);
            if (!branchRoute) {
                logger.error(`BranchRouteController->destroy: Relación no encontrada con ID ${req.body.id}`);
                return res.status(404).json({ msg: 'BranchRouteNotFound' });
            }

            await branchRoute.destroy();
            res.status(200).json({ msg: 'BranchRouteDeleted' });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('BranchRouteController->destroy: ' + errorMsg);
            res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    }
};

module.exports = BranchRouteController;
