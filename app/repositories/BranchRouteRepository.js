const logger = require('../../config/logger');
const { BranchRoute, Branch, Route, Location, RouteStop } = require('../models');

const BranchRouteRepository = {
    // Obtener todas las relaciones Branch-Vehicle con sus relaciones
    async findAll() {
        return await BranchRoute.findAll({
            include: [
                { model: Branch, as: 'branch', attributes: ['id', 'name', 'image'] },
                {
                    model: Route, as: 'route', attributes: ['id', 'name'],
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
                    attributes: ['id', 'name', 'estimated', 'origin_id', 'destination_id', 'distance'],
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

    async findById(id) {
        return await BranchRoute.findByPk(id, {
            include: [
                { model: Branch, as: 'branch', attributes: ['id', 'name'] },
                {
                    model: Route,
                    as: 'route',
                    attributes: ['id', 'name'],
                    include: [
                        {
                            model: RouteStop,
                            as: 'routeStops',
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

    async create(body) {
        const { branch_id, route_id, price } = body;
        return await BranchRoute.create({
            branch_id: branch_id,
            route_id: route_id,
            price: price
        });
    },

    async update(branchRoute, body) {
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
            await branchRoute.update(updatedData);
            logger.info(`Relación sucursal-vehículo actualizada exitosamente (ID: ${branchRoute.id})`);
        }

        return branchRoute;
    },
};

module.exports = BranchRouteRepository;
