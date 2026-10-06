const { Op } = require('sequelize');
const logger = require('../../config/logger');
const { BranchRoute, Branch, Route, Location, RouteStop } = require('../models');

const BranchRouteRepository = {
    // Obtener todas las relaciones Branch-Vehicle con sus relaciones
    async findAll() {
        return await BranchRoute.findAll({
            include: [
                { model: Branch, as: 'branch', attributes: ['id', 'name', 'image'] },
                {
                    model: Route, as: 'route', attributes: ['id', 'code', 'name'],
                    include: [
                        {
                            model: Location,
                            as: 'origin',
                            attributes: ['id', 'address', 'image'],
                        },
                        {
                            model: Location,
                            as: 'destination',
                            attributes: ['id', 'address', 'image'],
                        },
                        {
                            model: RouteStop,
                            as: 'routeStops',
                            separate: true,
                            order: [['stop_order', 'ASC']],
                            attributes: [
                                'id',
                                'company_id',
                                'route_id',
                                'location_id',
                                'stop_order',
                                'distance_km',
                                'minutes_from_origin',
                                'allows_boarding',
                                'allows_alighting',
                                'active',
                            ],
                            include: [
                                {
                                    model: Location,
                                    as: 'location',
                                    attributes: ['id', 'address', 'image', 'city', 'country', 'active'],
                                },
                            ],
                        },
                    ],
                }
            ]
        });
    },

    async findByBranch(branchId, options = {}) {
        const queryOptions = {
            ...options,
            include: [
                {
                    model: Route,
                    as: 'route',
                    attributes: ['id', 'code', 'name', 'estimated', 'origin_id', 'destination_id', 'distance'],
                    include: [
                        {
                            model: Location,
                            as: 'origin',
                            attributes: ['id', 'address', 'image'],
                        },
                        {
                            model: Location,
                            as: 'destination',
                            attributes: ['id', 'address', 'image'],
                        },
                        {
                            model: RouteStop,
                            as: 'routeStops',
                            separate: true,
                            order: [['stop_order', 'ASC']],
                            attributes: [
                                'id',
                                'company_id',
                                'route_id',
                                'location_id',
                                'stop_order',
                                'distance_km',
                                'minutes_from_origin',
                                'allows_boarding',
                                'allows_alighting',
                                'active',
                            ],
                            include: [
                                {
                                    model: Location,
                                    as: 'location',
                                    attributes: ['id', 'address', 'image', 'city', 'country', 'active'],
                                },
                            ],
                        },
                    ],
                }
            ]
        };

        if (branchId) {
            queryOptions.where = {
                branch_id: branchId
            };
        }

        return await BranchRoute.findAll(queryOptions);
    },

    async findByRoute(routeId, options = {}) {
        return await BranchRoute.findAll({
            ...options,
            where: {
                route_id: routeId
            },
            attributes: ['id', 'branch_id', 'route_id', 'price'],
            order: [['branch_id', 'ASC']]
        });
    },

    async findByRoutes(routeIds) {
        const normalizedRouteIds = (Array.isArray(routeIds) ? routeIds : [])
            .map((routeId) => Number(routeId))
            .filter((routeId) => Number.isInteger(routeId) && routeId > 0);

        if (normalizedRouteIds.length === 0) {
            return [];
        }

        return await BranchRoute.findAll({
            where: {
                route_id: { [Op.in]: normalizedRouteIds },
            },
            attributes: ['id', 'branch_id', 'route_id', 'price'],
            include: [
                {
                    model: Branch,
                    as: 'branch',
                    attributes: ['id', 'name', 'image', 'address', 'rut', 'phone', 'company_id'],
                },
            ],
        });
    },

    async createMissingForRoute(routeId, branchIds, price = null) {
        const existingBranchRoutes = await BranchRoute.findAll({
            where: {
                route_id: routeId,
                branch_id: { [Op.in]: branchIds }
            },
            attributes: ['id', 'branch_id', 'route_id', 'price'],
            raw: true
        });

        const existingBranchIds = new Set(
            existingBranchRoutes.map((branchRoute) => Number(branchRoute.branch_id))
        );

        const branchIdsToCreate = branchIds.filter(
            (branchId) => !existingBranchIds.has(Number(branchId))
        );

        const branchRoutes = branchIdsToCreate.length > 0
            ? await BranchRoute.bulkCreate(
                branchIdsToCreate.map((branchId) => ({
                    branch_id: branchId,
                    route_id: routeId,
                    price
                }))
            )
            : [];

        return {
            branchRoutes,
            existingBranchRoutes
        };
    },

    async findByBranches(branchIds, options = {}) {
        const normalizedBranchIds = Array.from(
            new Set(
                (Array.isArray(branchIds) ? branchIds : [])
                    .map((branchId) => Number(branchId))
                    .filter((branchId) => Number.isInteger(branchId) && branchId > 0)
            )
        );

        if (normalizedBranchIds.length === 0) {
            return [];
        }

        return await BranchRoute.findAll({
            ...options,
            where: {
                branch_id: { [Op.in]: normalizedBranchIds }
            },
            include: [
                {
                    model: Branch,
                    as: 'branch',
                    attributes: ['id', 'name', 'image']
                },
                {
                    model: Route,
                    as: 'route',
                    attributes: [
                        'id',
                        'code',
                        'name',
                        'estimated',
                        'origin_id',
                        'destination_id',
                        'distance',
                        'status'
                    ],
                    include: [
                        {
                            model: Location,
                            as: 'origin',
                            attributes: ['id', 'address', 'image']
                        },
                        {
                            model: Location,
                            as: 'destination',
                            attributes: ['id', 'address', 'image']
                        }
                    ]
                }
            ],
            order: [['branch_id', 'ASC'], ['route_id', 'ASC']]
        });
    },

    async findRoutesByBranch(branchId) {
        return await BranchRoute.findAll({
            where: {
                branch_id: branchId
            },
            include: [
                {
                    model: Route,
                    as: 'route',
                    attributes: ['id', 'code', 'name', 'estimated', 'origin_id', 'destination_id', 'distance'],
                    include: [
                        {
                            model: Location,
                            as: 'origin',
                            attributes: ['id', 'address', 'image'],
                        },
                        {
                            model: Location,
                            as: 'destination',
                            attributes: ['id', 'address', 'image'],
                        },
                        {
                            model: RouteStop,
                            as: 'routeStops',
                            separate: true,
                            order: [['stop_order', 'ASC']],
                            attributes: [
                                'id',
                                'company_id',
                                'route_id',
                                'location_id',
                                'stop_order',
                                'distance_km',
                                'minutes_from_origin',
                                'allows_boarding',
                                'allows_alighting',
                                'active',
                            ],
                            include: [
                                {
                                    model: Location,
                                    as: 'location',
                                    attributes: ['id', 'address', 'image', 'city', 'country', 'active'],
                                },
                            ],
                        },
                    ],
                }
            ]
        });
    },

    async findById(id) {
        return await BranchRoute.findByPk(id, {
            include: [
                { model: Branch, as: 'branch', attributes: ['id', 'name'] },
                {
                    model: Route,
                    as: 'route',
                    attributes: ['id', 'code', 'name'],
                    include: [
                        {
                            model: RouteStop,
                            as: 'routeStops',
                            separate: true,
                            order: [['stop_order', 'ASC']],
                            attributes: [
                                'id',
                                'company_id',
                                'route_id',
                                'location_id',
                                'stop_order',
                                'distance_km',
                                'minutes_from_origin',
                                'allows_boarding',
                                'allows_alighting',
                                'active',
                            ],
                            include: [
                                {
                                    model: Location,
                                    as: 'location',
                                    attributes: ['id', 'address', 'image', 'city', 'country', 'active'],
                                },
                            ],
                        },
                    ],
                }
            ]
        });
    },

    async create(body, options = {}) {
        const { branch_id, route_id, price } = body;
        return await BranchRoute.create({
            branch_id: branch_id,
            route_id: route_id,
            price: price
        }, options);
    },

    async update(branchRoute, body, options = {}) {
        const fieldsToUpdate = ['branch_id', 'route_id', 'price'];

        // Filtrar campos en req.body y construir el objeto updatedData
        const updatedData = Object.keys(body)
            .filter(key => fieldsToUpdate.includes(key) && body[key] !== undefined)
            .reduce((obj, key) => {
                obj[key] = body[key];
                return obj;
            }, {});

        // Actualizar la relación solo si hay datos para cambiar
        if (Object.keys(updatedData).length > 0) {
            await branchRoute.update(updatedData, options);
            logger.info(`Relación sucursal-vehículo actualizada exitosamente (ID: ${branchRoute.id})`);
        }

        return branchRoute;
    },

    async delete(branchRoute, options = {}) {
        return await branchRoute.destroy(options);
    },
};

module.exports = BranchRouteRepository;
