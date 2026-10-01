'use strict';

const { Op } = require('sequelize');
const { VehicleRoutePreference, Route, Location, Branch } = require('../models');

const VehicleRoutePreferenceRepository = {
  async findByVehicle(vehicleId, branchId = undefined, options = {}) {
    if (typeof branchId === 'object' && branchId !== null) {
      options = branchId;
      branchId = undefined;
    }

    const where = { vehicle_id: vehicleId };
    if (branchId !== undefined) {
      where.branch_id = branchId;
    }

    return VehicleRoutePreference.findAll({
      ...options,
      where,
      attributes: ['id', 'vehicle_id', 'branch_id', 'route_id', 'priority', 'createdAt', 'updatedAt'],
      include: [
        {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'name', 'image', 'address', 'company_id'],
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
            'status',
          ],
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
        },
      ],
      order: [['priority', 'ASC'], ['route_id', 'ASC']],
    });
  },

  async findByVehicles(vehicleIds, options = {}) {
    const normalizedVehicleIds = (Array.isArray(vehicleIds) ? vehicleIds : [])
      .map((vehicleId) => Number(vehicleId))
      .filter((vehicleId) => Number.isInteger(vehicleId) && vehicleId > 0);

    if (normalizedVehicleIds.length === 0) {
      return [];
    }

    return VehicleRoutePreference.findAll({
      ...options,
      where: {
        vehicle_id: { [Op.in]: normalizedVehicleIds },
      },
      attributes: ['id', 'vehicle_id', 'branch_id', 'route_id', 'priority', 'createdAt', 'updatedAt'],
      include: [
        {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'name', 'image', 'address', 'company_id'],
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
            'status',
          ],
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
        },
      ],
      order: [
        ['vehicle_id', 'ASC'],
        ['branch_id', 'ASC'],
        ['priority', 'ASC'],
        ['route_id', 'ASC'],
      ],
    });
  },

  async findByVehicleAndRoute(vehicleId, branchId, routeId, options = {}) {
    return VehicleRoutePreference.findOne({
      ...options,
      where: {
        vehicle_id: vehicleId,
        branch_id: branchId,
        route_id: routeId,
      },
    });
  },

  async create(data, options = {}) {
    return VehicleRoutePreference.create(data, options);
  },

  async deleteById(id, vehicleId, options = {}) {
    return VehicleRoutePreference.destroy({
      ...options,
      where: {
        id,
        vehicle_id: vehicleId,
      },
    });
  },

  async deleteByVehicleBranch(vehicleId, branchId, options = {}) {
    return VehicleRoutePreference.destroy({
      ...options,
      where: {
        vehicle_id: vehicleId,
        branch_id: branchId,
      },
    });
  },

  async deleteNotIncluded(vehicleId, branchId, routeIds, options = {}) {
    const where = { vehicle_id: vehicleId, branch_id: branchId };

    if (routeIds.length > 0) {
      where.route_id = { [Op.notIn]: routeIds };
    }

    return VehicleRoutePreference.destroy({
      ...options,
      where,
    });
  },
};

module.exports = VehicleRoutePreferenceRepository;
