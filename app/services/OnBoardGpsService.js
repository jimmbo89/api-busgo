'use strict';

const {
  sequelize,
  TripWorker,
} = require('../models');
const {
  TripLocationRepository,
  TripRepository,
} = require('../repositories');
const OnBoardContextService = require('./OnBoardContextService');

const normalizeId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const normalizeCoordinate = (value) => {
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
};

const resolveCapturedAt = (value) => {
  if (value === undefined || value === null || value === '') {
    return new Date();
  }

  const capturedAt = new Date(value);
  if (Number.isNaN(capturedAt.getTime())) {
    throw new Error('OnBoardGpsDataInvalid');
  }

  return capturedAt;
};

const resolveTripContext = async ({
  worker,
  device_id,
  trip_id,
  transaction,
  requireActive = false,
}) => {
  const tripId = normalizeId(trip_id);
  if (!tripId) {
    throw new Error('OnBoardGpsDataInvalid');
  }

  const context = await OnBoardContextService.resolve({
    worker,
    device_id,
    options: { transaction },
  });
  const trip = await TripRepository.findById(tripId, { transaction });

  if (!trip) {
    throw new Error('OnBoardTripNotFound');
  }

  if (String(trip.saleMode || '').toLowerCase() !== 'on_board') {
    throw new Error('OnBoardTripSaleModeInvalid');
  }

  if (Number(trip.device_id) !== Number(context.device.id)) {
    throw new Error('OnBoardTripDeviceMismatch');
  }

  if (Number(trip.vehicle_id) !== Number(context.vehicle.id)) {
    throw new Error('OnBoardTripVehicleMismatch');
  }

  const tripWorker = await TripWorker.findOne({
    where: {
      trip_id: trip.id,
      branch_id: trip.branch_id,
      worker_id: Number(worker.id),
    },
    transaction,
  });

  if (!tripWorker) {
    throw new Error('OnBoardTripWorkerNotAssigned');
  }

  if (requireActive) {
    if (!trip.start) {
      throw new Error('OnBoardTripNotStarted');
    }

    if (trip.end) {
      throw new Error('OnBoardTripAlreadyFinished');
    }
  }

  return { context, trip };
};

const mapLocation = (location) => ({
  id: location.id,
  device_id: location.device_id,
  deviceId: location.device_id,
  vehicle_id: location.vehicle_id,
  vehicleId: location.vehicle_id,
  latitude: location.latitude,
  longitude: location.longitude,
  accuracy: location.accuracy,
  captured_at: location.captured_at,
  capturedAt: location.captured_at,
});

const OnBoardGpsService = {
  async create({ worker, device_id, body }) {
    const tripId = normalizeId(body?.trip_id);
    const latitude = normalizeCoordinate(body?.latitude);
    const longitude = normalizeCoordinate(body?.longitude);

    if (!tripId || latitude === null || longitude === null) {
      throw new Error('OnBoardGpsDataInvalid');
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new Error('OnBoardGpsDataInvalid');
    }

    const accuracy = body.accuracy === undefined || body.accuracy === null
      ? null
      : normalizeCoordinate(body.accuracy);

    if (accuracy !== null && accuracy < 0) {
      throw new Error('OnBoardGpsDataInvalid');
    }

    return sequelize.transaction(async (transaction) => {
      const { context, trip } = await resolveTripContext({
        worker,
        device_id,
        trip_id: tripId,
        transaction,
        requireActive: true,
      });

      const location = await TripLocationRepository.create(
        {
          trip_id: trip.id,
          device_id: context.device.id,
          vehicle_id: context.vehicle.id,
          latitude,
          longitude,
          accuracy,
          captured_at: resolveCapturedAt(body.captured_at),
        },
        { transaction }
      );

      return { trip, location };
    });
  },

  async findByTrip({ worker, device_id, trip_id }) {
    const { trip } = await resolveTripContext({
      worker,
      device_id,
      trip_id,
      requireActive: false,
    });
    const locations = await TripLocationRepository.findByTrip(trip.id);

    return {
      trip: {
        id: trip.id,
        code: trip.code,
        sale_mode: trip.saleMode,
        start: trip.start,
        end: trip.end,
        locations: locations.map(mapLocation),
      },
    };
  },
};

module.exports = OnBoardGpsService;
