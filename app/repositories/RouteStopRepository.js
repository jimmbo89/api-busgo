const logger = require('../../config/logger');
const { RouteStop, Company, Route, Location } = require('../models');

const RouteStopRepository = {
  async findAll() {
    return await RouteStop.findAll({
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name', 'rut'] },
        {
          model: Route,
          as: 'route',
          attributes: ['id', 'name', 'origin_id', 'destination_id', 'distance', 'estimated', 'status'],
        },
        {
          model: Location,
          as: 'location',
          attributes: ['id', 'address', 'country', 'city', 'image', 'active'],
        },
      ],
      order: [['route_id', 'ASC'], ['stop_order', 'ASC']],
    });
  },

  async findById(id) {
    return await RouteStop.findByPk(id, {
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name', 'rut'] },
        {
          model: Route,
          as: 'route',
          attributes: ['id', 'name', 'origin_id', 'destination_id', 'distance', 'estimated', 'status'],
        },
        {
          model: Location,
          as: 'location',
          attributes: ['id', 'address', 'country', 'city', 'image', 'active'],
        },
      ],
    });
  },

  async findByRoute(routeId) {
    return await RouteStop.findAll({
      where: { route_id: routeId },
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name', 'rut'] },
        {
          model: Route,
          as: 'route',
          attributes: ['id', 'name', 'origin_id', 'destination_id', 'distance', 'estimated', 'status'],
        },
        {
          model: Location,
          as: 'location',
          attributes: ['id', 'address', 'country', 'city', 'image', 'active'],
        },
      ],
      order: [['stop_order', 'ASC']],
    });
  },

  async findByCompany(companyId) {
    return await RouteStop.findAll({
      where: { company_id: companyId },
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name', 'rut'] },
        {
          model: Route,
          as: 'route',
          attributes: ['id', 'name', 'origin_id', 'destination_id', 'distance', 'estimated', 'status'],
        },
        {
          model: Location,
          as: 'location',
          attributes: ['id', 'address', 'country', 'city', 'image', 'active'],
        },
      ],
      order: [['route_id', 'ASC'], ['stop_order', 'ASC']],
    });
  },

  async create(body) {
    const {
      company_id,
      route_id,
      location_id,
      stop_order,
      distance_km,
      minutes_from_origin,
      allows_boarding,
      allows_alighting,
      active,
    } = body;

    return await RouteStop.create({
      company_id,
      route_id,
      location_id,
      stop_order,
      distance_km: distance_km ?? 0,
      minutes_from_origin: minutes_from_origin ?? 0,
      allows_boarding: allows_boarding ?? true,
      allows_alighting: allows_alighting ?? true,
      active: active ?? true,
    });
  },

  async update(routeStop, body) {
    const fieldsToUpdate = [
      'company_id',
      'route_id',
      'location_id',
      'stop_order',
      'distance_km',
      'minutes_from_origin',
      'allows_boarding',
      'allows_alighting',
      'active',
    ];

    const updatedData = Object.keys(body)
      .filter(key => fieldsToUpdate.includes(key) && body[key] !== undefined)
      .reduce((obj, key) => {
        obj[key] = body[key];
        return obj;
      }, {});

    if (Object.keys(updatedData).length > 0) {
      await routeStop.update(updatedData);
      logger.info(`RouteStop actualizado exitosamente (ID: ${routeStop.id})`);
    }

    return routeStop;
  },

  async delete(routeStop) {
    return await routeStop.destroy();
  },
};

module.exports = RouteStopRepository;
