'use strict';

const { Op } = require('sequelize');
const { VehicleRoutePreference, Route, Location } = require('../models');

const VehicleRoutePreferenceRepository = {
  async findByVehicle(vehicleId, options = {}) {
    return VehicleRoutePreference.findAll({
      ...options,
      where: { vehicle_id: vehicleId },
      attributes: ['id', 'vehicle_id', 'route_id', 'createdAt', 'updatedAt'],
      include: [{
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
      order: [['route_id', 'ASC']],
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
      attributes: ['id', 'vehicle_id', 'route_id', 'createdAt', 'updatedAt'],
      include: [{
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
        ['route_id', 'ASC'],
      ],
    });
  },

  async findByVehicleAndRoute(vehicleId, routeId, options = {}) {
    return VehicleRoutePreference.findOne({
      ...options,
      where: {
        vehicle_id: vehicleId,
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

  async deleteNotIncluded(vehicleId, routeIds, options = {}) {
    const where = { vehicle_id: vehicleId };

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
