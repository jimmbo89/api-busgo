'use strict';

const { TripLocation } = require('../models');

const TripLocationRepository = {
  async create(body, options = {}) {
    return TripLocation.create(
      {
        trip_id: body.trip_id,
        device_id: body.device_id,
        vehicle_id: body.vehicle_id,
        latitude: body.latitude,
        longitude: body.longitude,
        accuracy: body.accuracy ?? null,
        captured_at: body.captured_at,
      },
      options
    );
  },

  async findByTrip(tripId, options = {}) {
    return TripLocation.findAll({
      ...options,
      where: {
        ...(options.where || {}),
        trip_id: tripId,
      },
      order: options.order || [['captured_at', 'ASC'], ['id', 'ASC']],
    });
  },
};

module.exports = TripLocationRepository;
