const logger = require('../../config/logger');
const { TripStop, Company, Trip, RouteStop, Location, Route, Branch } = require('../models');

const valuesAreEqual = (currentValue, incomingValue) => {
  if (currentValue === null || currentValue === undefined || incomingValue === null || incomingValue === undefined) {
    return (currentValue === null || currentValue === undefined) &&
      (incomingValue === null || incomingValue === undefined);
  }

  if (currentValue instanceof Date || incomingValue instanceof Date) {
    const currentTime = new Date(currentValue).getTime();
    const incomingTime = new Date(incomingValue).getTime();
    if (Number.isFinite(currentTime) && Number.isFinite(incomingTime)) {
      return currentTime === incomingTime;
    }
  }

  if (typeof currentValue === 'boolean' || typeof incomingValue === 'boolean') {
    return Boolean(currentValue) === Boolean(incomingValue);
  }

  const currentNumber = Number(currentValue);
  const incomingNumber = Number(incomingValue);
  const areNumeric = [currentValue, incomingValue].every((value) =>
    typeof value === 'number' ||
    (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)))
  );

  return areNumeric
    ? currentNumber === incomingNumber
    : String(currentValue) === String(incomingValue);
};

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
        {
          model: Location,
          as: 'location',
          attributes: ['id', 'latitude', 'longitude', 'address', 'country', 'city', 'image', 'active'],
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
        {
          model: Location,
          as: 'location',
          attributes: ['id', 'latitude', 'longitude', 'address', 'country', 'city', 'image', 'active'],
        },
      ],
    });
  },

  async findByTrip(tripId, options = {}) {
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
        {
          model: Location,
          as: 'location',
          attributes: ['id', 'latitude', 'longitude', 'address', 'country', 'city', 'image', 'active'],
        },
      ],
      order: [['stop_order', 'ASC']],
      ...options,
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
        {
          model: Location,
          as: 'location',
          attributes: ['id', 'latitude', 'longitude', 'address', 'country', 'city', 'image', 'active'],
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
      location_id,
      distance_km,
      minutes_from_origin,
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
      route_stop_id: route_stop_id ?? null,
      location_id: location_id ?? null,
      distance_km: distance_km ?? 0,
      minutes_from_origin: minutes_from_origin ?? 0,
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
      'location_id',
      'distance_km',
      'minutes_from_origin',
      'stop_order',
      'arrival_time',
      'departure_time',
      'can_board',
      'can_alight',
      'active',
      'source_type',
    ];

    const requestedData = Object.keys(body)
      .filter(key => fieldsToUpdate.includes(key) && body[key] !== undefined)
      .reduce((obj, key) => {
        obj[key] = body[key];
        return obj;
      }, {});
    const updatedData = Object.keys(requestedData)
      .filter((key) => !valuesAreEqual(tripStop.get(key), requestedData[key]))
      .reduce((obj, key) => {
        obj[key] = requestedData[key];
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
