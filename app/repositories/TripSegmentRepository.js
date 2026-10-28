'use strict';

const logger = require('../../config/logger');
const {
  TripSegment,
  Company,
  Trip,
  TripStop,
  RouteStop,
  Location,
  FareSegment,
} = require('../models');

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

const tripStopInclude = [
  {
    model: TripStop,
    as: 'originTripStop',
    include: [
      { model: Location, as: 'location' },
      { model: RouteStop, as: 'routeStop' },
    ],
  },
  {
    model: TripStop,
    as: 'destinationTripStop',
    include: [
      { model: Location, as: 'location' },
      { model: RouteStop, as: 'routeStop' },
    ],
  },
];

const TripSegmentRepository = {
  async findById(id, options = {}) {
    return TripSegment.findByPk(id, {
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name', 'rut'] },
        { model: Trip, as: 'trip', attributes: ['id', 'branch_id', 'vehicle_id', 'route_id', 'date'] },
        ...tripStopInclude,
        { model: FareSegment, as: 'sourceFareSegment' },
      ],
      ...options,
    });
  },

  async findByTrip(tripId, options = {}) {
    return TripSegment.findAll({
      where: { trip_id: tripId },
      include: tripStopInclude,
      order: [['id', 'ASC']],
      ...options,
    });
  },

  async findByTripAndStops(tripId, originTripStopId, destinationTripStopId, options = {}) {
    return TripSegment.findOne({
      where: {
        trip_id: tripId,
        origin_trip_stop_id: originTripStopId,
        destination_trip_stop_id: destinationTripStopId,
      },
      ...options,
    });
  },

  async findOrCreateFromFareSegment({
    tripId,
    companyId,
    fareSegment,
    transaction = null,
    sourceType = 'auto',
  }) {
    if (!fareSegment) return null;

    const transactionOptions = transaction ? { transaction } : {};
    const [originTripStop, destinationTripStop] = await Promise.all([
      TripStop.findOne({
        where: {
          trip_id: tripId,
          route_stop_id: fareSegment.origin_route_stop_id,
        },
        ...transactionOptions,
      }),
      TripStop.findOne({
        where: {
          trip_id: tripId,
          route_stop_id: fareSegment.destination_route_stop_id,
        },
        ...transactionOptions,
      }),
    ]);

    if (!originTripStop || !destinationTripStop) return null;

    const existingSegment = await this.findByTripAndStops(
      tripId,
      originTripStop.id,
      destinationTripStop.id,
      transactionOptions
    );
    if (existingSegment) return existingSegment;

    return this.create(
      {
        company_id: companyId,
        trip_id: tripId,
        origin_trip_stop_id: originTripStop.id,
        destination_trip_stop_id: destinationTripStop.id,
        source_fare_segment_id: fareSegment.id,
        currency: fareSegment.currency,
        valid_from: fareSegment.valid_from,
        valid_to: fareSegment.valid_to,
        priority: fareSegment.priority,
        active: fareSegment.active !== false,
        source_type: sourceType,
      },
      transactionOptions
    );
  },

  async create(body, options = {}) {
    return TripSegment.create({
      company_id: body.company_id,
      trip_id: body.trip_id,
      origin_trip_stop_id: body.origin_trip_stop_id,
      destination_trip_stop_id: body.destination_trip_stop_id,
      source_fare_segment_id: body.source_fare_segment_id ?? null,
      currency: body.currency ?? 'CLP',
      valid_from: body.valid_from ?? null,
      valid_to: body.valid_to ?? null,
      priority: body.priority ?? 0,
      active: body.active ?? true,
      source_type: body.source_type ?? 'manual',
    }, options);
  },

  async update(segment, body, options = {}) {
    const fields = [
      'company_id',
      'trip_id',
      'origin_trip_stop_id',
      'destination_trip_stop_id',
      'source_fare_segment_id',
      'currency',
      'valid_from',
      'valid_to',
      'priority',
      'active',
      'source_type',
    ];
    const requestedData = Object.keys(body)
      .filter((key) => fields.includes(key) && body[key] !== undefined)
      .reduce((result, key) => {
        result[key] = body[key];
        return result;
      }, {});
    const data = Object.keys(requestedData)
      .filter((key) => !valuesAreEqual(segment.get(key), requestedData[key]))
      .reduce((result, key) => {
        result[key] = requestedData[key];
        return result;
      }, {});

    if (Object.keys(data).length > 0) {
      await segment.update(data, options);
      logger.info(`TripSegment actualizado exitosamente (ID: ${segment.id})`);
    }
    return segment;
  },

  async delete(segment, options = {}) {
    return segment.destroy(options);
  },
};

module.exports = TripSegmentRepository;
