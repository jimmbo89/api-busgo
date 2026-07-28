const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const { Route, Location, Sequelize, Branch, BranchRoute, RouteStop, sequelize } = require('../models');
const logger = require('../../config/logger');

const normalizeRouteCode = (code) =>
  typeof code === 'string' ? code.trim().toUpperCase() : code;

const RouteRepository = {
  async findAll() {
    return await Route.findAll({
      attributes: ['id', 'code', 'name', 'origin_id', 'destination_id', 'distance', 'estimated', 'status'],
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
      attributes: ['id', 'code', 'name', 'origin_id', 'destination_id', 'distance', 'estimated', 'status'],
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

  normalizeRouteCode,

  async existsByCode(code, excludeId = null) {
    const normalizedCode = normalizeRouteCode(code);
    const whereCondition = excludeId
      ? { code: normalizedCode, id: { [Op.ne]: excludeId } }
      : { code: normalizedCode };

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

  async create(body, options = {}) {
    const { code, name, origin_id, destination_id, distance, estimated, status } = body;

    const transaction = options.transaction || await sequelize.transaction();
    const ownsTransaction = !options.transaction;

    try {
      const route = await Route.create({
        code: normalizeRouteCode(code),
        name,
        origin_id,
        destination_id,
        distance,
        estimated,
        status,
      }, { transaction });

      if (ownsTransaction) {
        await transaction.commit();
      }

      return route;
    } catch (error) {
      if (ownsTransaction && transaction && !transaction.finished) {
        await transaction.rollback();
      }
      logger.error(`Error creando ruta: ${error.message}`);
      throw error;
    }
  },

  async update(route, body) {
    const fieldsToUpdate = ['code', 'name', 'origin_id', 'destination_id', 'distance', 'estimated', 'status'];

    const updatedData = Object.keys(body)
      .filter(key => fieldsToUpdate.includes(key) && body[key] !== undefined)
      .reduce((obj, key) => {
        obj[key] = key === 'code' ? normalizeRouteCode(body[key]) : body[key];
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
      attributes: ['id', 'code', 'name', 'origin_id', 'destination_id', 'distance', 'estimated', 'status'],
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
      attributes: ['id', 'code', 'name', 'origin_id', 'destination_id', 'distance', 'estimated', 'status'],
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
      attributes: ['id', 'code', 'name', 'origin_id', 'destination_id', 'distance', 'estimated', 'status'],
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
