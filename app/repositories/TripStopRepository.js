const logger = require('../../config/logger');
const { TripStop, Company, Trip, RouteStop, Location, Route, Branch } = require('../models');

const TripStopRepository = {
  async findAll() {
    return await TripStop.findAll({
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name', 'rut'] },
        {
          model: Trip,
          as: 'trip',
          attributes: ['id', 'branch_id', 'vehicle_id', 'route_id', 'date', 'schedule', 'arrival', 'start', 'end', 'price'],
          include: [
            { model: Branch, as: 'branch', attributes: ['id', 'name', 'company_id'] },
            {
              model: Route,
              as: 'route',
              attributes: ['id', 'name', 'origin_id', 'destination_id', 'distance', 'estimated', 'status'],
            },
          ],
        },
        {
          model: RouteStop,
          as: 'routeStop',
          include: [
            {
              model: Location,
              as: 'location',
              attributes: ['id', 'address', 'country', 'city', 'image', 'active'],
            },
            {
              model: Route,
              as: 'route',
              attributes: ['id', 'name', 'origin_id', 'destination_id', 'distance', 'estimated', 'status'],
            },
          ],
        },
      ],
      order: [['trip_id', 'ASC'], ['stop_order', 'ASC']],
    });
  },

  async findById(id) {
    return await TripStop.findByPk(id, {
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name', 'rut'] },
        {
          model: Trip,
          as: 'trip',
          attributes: ['id', 'branch_id', 'vehicle_id', 'route_id', 'date', 'schedule', 'arrival', 'start', 'end', 'price'],
          include: [
            { model: Branch, as: 'branch', attributes: ['id', 'name', 'company_id'] },
            {
              model: Route,
              as: 'route',
              attributes: ['id', 'name', 'origin_id', 'destination_id', 'distance', 'estimated', 'status'],
            },
          ],
        },
        {
          model: RouteStop,
          as: 'routeStop',
          include: [
            {
              model: Location,
              as: 'location',
              attributes: ['id', 'address', 'country', 'city', 'image', 'active'],
            },
            {
              model: Route,
              as: 'route',
              attributes: ['id', 'name', 'origin_id', 'destination_id', 'distance', 'estimated', 'status'],
            },
          ],
        },
      ],
    });
  },

  async findByTrip(tripId) {
    return await TripStop.findAll({
      where: { trip_id: tripId },
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name', 'rut'] },
        {
          model: Trip,
          as: 'trip',
          attributes: ['id', 'branch_id', 'vehicle_id', 'route_id', 'date', 'schedule', 'arrival', 'start', 'end', 'price'],
          include: [
            { model: Branch, as: 'branch', attributes: ['id', 'name', 'company_id'] },
            {
              model: Route,
              as: 'route',
              attributes: ['id', 'name', 'origin_id', 'destination_id', 'distance', 'estimated', 'status'],
            },
          ],
        },
        {
          model: RouteStop,
          as: 'routeStop',
          include: [
            {
              model: Location,
              as: 'location',
              attributes: ['id', 'address', 'country', 'city', 'image', 'active'],
            },
            {
              model: Route,
              as: 'route',
              attributes: ['id', 'name', 'origin_id', 'destination_id', 'distance', 'estimated', 'status'],
            },
          ],
        },
      ],
      order: [['stop_order', 'ASC']],
    });
  },

  async findByCompany(companyId) {
    return await TripStop.findAll({
      where: { company_id: companyId },
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name', 'rut'] },
        {
          model: Trip,
          as: 'trip',
          attributes: ['id', 'branch_id', 'vehicle_id', 'route_id', 'date', 'schedule', 'arrival', 'start', 'end', 'price'],
          include: [
            { model: Branch, as: 'branch', attributes: ['id', 'name', 'company_id'] },
            {
              model: Route,
              as: 'route',
              attributes: ['id', 'name', 'origin_id', 'destination_id', 'distance', 'estimated', 'status'],
            },
          ],
        },
        {
          model: RouteStop,
          as: 'routeStop',
          include: [
            {
              model: Location,
              as: 'location',
              attributes: ['id', 'address', 'country', 'city', 'image', 'active'],
            },
            {
              model: Route,
              as: 'route',
              attributes: ['id', 'name', 'origin_id', 'destination_id', 'distance', 'estimated', 'status'],
            },
          ],
        },
      ],
      order: [['trip_id', 'ASC'], ['stop_order', 'ASC']],
    });
  },

  async create(body, options = {}) {
    const {
      company_id,
      trip_id,
      route_stop_id,
      stop_order,
      arrival_time,
      departure_time,
      can_board,
      can_alight,
      active,
      source_type,
    } = body;

    return await TripStop.create({
      company_id,
      trip_id,
      route_stop_id,
      stop_order,
      arrival_time: arrival_time ?? null,
      departure_time: departure_time ?? null,
      can_board: can_board ?? true,
      can_alight: can_alight ?? true,
      active: active ?? true,
      source_type: source_type ?? 'auto',
    }, options);
  },

  async update(tripStop, body, options = {}) {
    const fieldsToUpdate = [
      'company_id',
      'trip_id',
      'route_stop_id',
      'stop_order',
      'arrival_time',
      'departure_time',
      'can_board',
      'can_alight',
      'active',
      'source_type',
    ];

    const updatedData = Object.keys(body)
      .filter(key => fieldsToUpdate.includes(key) && body[key] !== undefined)
      .reduce((obj, key) => {
        obj[key] = body[key];
        return obj;
      }, {});

    if (Object.keys(updatedData).length > 0) {
      await tripStop.update(updatedData, options);
      logger.info(`TripStop actualizado exitosamente (ID: ${tripStop.id})`);
    }

    return tripStop;
  },

  async delete(tripStop, options = {}) {
    return await tripStop.destroy(options);
  },

  async deleteByTrip(tripId, options = {}) {
    return await TripStop.destroy({
      where: { trip_id: tripId },
      ...options,
    });
  },
};

module.exports = TripStopRepository;
