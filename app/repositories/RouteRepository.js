const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const { Route, Location, Sequelize, Branch, BranchRoute, RouteStop } = require('../models');
const logger = require('../../config/logger');

const RouteRepository = {
  async findAll() {
    return await Route.findAll({
      attributes: ['id', 'name', 'origin_id', 'destination_id', 'distance', 'estimated', 'status'],
      order: [['createdAt', 'ASC']],
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
    });
  },

  async findById(id) {
    return await Route.findByPk(id, {
      attributes: ['id', 'name', 'origin_id', 'destination_id', 'distance', 'estimated', 'status'],
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
    });
  },

  async existsByName(name, excludeId = null) {
    const whereCondition = excludeId ? { name, id: { [Op.ne]: excludeId } } : { name };
    return await Route.findOne({ where: whereCondition });
  },

  async existsByOriginAndDestination(origin_id, destination_id, excludeId = null) {
    if (
      origin_id === undefined ||
      origin_id === null ||
      destination_id === undefined ||
      destination_id === null
    ) {
      return null;
    }

    const whereCondition = {
      origin_id,
      destination_id,
    };

    if (excludeId !== null && excludeId !== undefined) {
      whereCondition.id = { [Op.ne]: excludeId };
    }

    return await Route.findOne({ where: whereCondition });
  },

  async create(body) {
    const { name, origin_id, destination_id, distance, estimated, status } = body;

    const route = await Route.create({
      name,
      origin_id,
      destination_id,
      distance,
      estimated,
      status,
    });

    return route;
  },

  async update(route, body) {
    const fieldsToUpdate = ['name', 'origin_id', 'destination_id', 'distance', 'estimated', 'status'];

    const updatedData = Object.keys(body)
      .filter(key => fieldsToUpdate.includes(key) && body[key] !== undefined)
      .reduce((obj, key) => {
        obj[key] = body[key];
        return obj;
      }, {});

    if (Object.keys(updatedData).length > 0) {
      await route.update(updatedData);
      logger.info(`Ruta actualizada exitosamente (ID: ${route.id})`);
    }

    return route;
  },

  async delete(route) {
    return await route.destroy();
  },

  async findAssociatedRoutesByBranchId(branchId) {
    return await Route.findAll({
      attributes: ['origin_id'],
      include: [
        {
          model: Branch,
          as: 'branches',
          where: { id: branchId },
          attributes: [],
          through: { attributes: [] },
        },
      ],
      raw: true,
    });
  },

  async findUnassociatedRoutesByBranchId(branchId) {
    const associatedRouteIds = await BranchRoute.findAll({
      where: { branch_id: branchId },
      attributes: ['route_id'],
      raw: true,
    });

    const routeIds = associatedRouteIds.map((item) => item.route_id);
    const whereClause = routeIds.length > 0
      ? { id: { [Op.notIn]: routeIds } }
      : {};

    return await Route.findAll({
      where: whereClause,
      attributes: ['id', 'name', 'origin_id', 'destination_id', 'distance', 'estimated', 'status'],
      order: [['createdAt', 'ASC']],
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
    });
  },

  async findByOriginIds(originIds) {
    if (!originIds.length) return [];

    return await Route.findAll({
      where: { origin_id: originIds },
      attributes: ['id', 'name', 'origin_id', 'destination_id', 'distance', 'estimated', 'status'],
      order: [['createdAt', 'ASC']],
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
    });
  },

  async findRoutesWithUnusedOrigins() {
    const usedOriginIdsResult = await Route.findAll({
      attributes: ['origin_id'],
      include: [
        {
          model: Branch,
          as: 'branches',
          attributes: [],
          through: { attributes: [] },
          required: true,
        },
      ],
      where: {
        origin_id: { [Op.ne]: null }
      },
      raw: true,
    });

    logger.info('origenes empleados ya');
    logger.info(JSON.stringify(usedOriginIdsResult));
    const usedOriginIds = usedOriginIdsResult.map(r => r.origin_id);

    const whereClause = usedOriginIds.length > 0
      ? { origin_id: { [Op.notIn]: usedOriginIds } }
      : {};

    return await Route.findAll({
      where: whereClause,
      attributes: ['id', 'name', 'origin_id', 'destination_id', 'distance', 'estimated', 'status'],
      order: [['createdAt', 'ASC']],
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
      ],
    });
  },
};

module.exports = RouteRepository;
