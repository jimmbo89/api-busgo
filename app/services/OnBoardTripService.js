'use strict';

const { Op } = require('sequelize');
const {
  sequelize,
  TripWorker,
  TripStop,
  TripFare,
  RouteStop,
  FareSegment,
  FareSegmentTicketType,
  TicketType,
} = require('../models');
const {
  TripRepository,
  RouteRepository,
  BranchVehicleRepository,
  BranchRouteRepository,
  TripSegmentRepository,
} = require('../repositories');
const OnBoardContextService = require('./OnBoardContextService');

const normalizeId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const isActive = (value) => value === true || Number(value) === 1;

const getCurrentDate = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.TZ || 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const values = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      values[part.type] = part.value;
    }
  }

  return `${values.year}-${values.month}-${values.day}`;
};

const formatDateTimeParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.TZ || 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const values = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      values[part.type] = part.value;
    }
  }

  const dateValue = `${values.year}-${values.month}-${values.day}`;
  const timeValue = `${values.hour}:${values.minute}`;

  return {
    date: dateValue,
    time: timeValue,
    dateTime: `${dateValue} ${values.hour}:${values.minute}:${values.second}`,
  };
};

const initializeTrip = async ({ trip, estimatedMinutes, transaction }) => {
  if (trip.start) {
    throw new Error('OnBoardTripAlreadyStarted');
  }

  if (trip.end) {
    throw new Error('OnBoardTripAlreadyFinished');
  }

  const startDate = new Date();
  const startValues = formatDateTimeParts(startDate);
  let arrival = null;

  const normalizedEstimatedMinutes = Number(estimatedMinutes);
  if (
    Number.isFinite(normalizedEstimatedMinutes) &&
    normalizedEstimatedMinutes >= 0
  ) {
    arrival = formatDateTimeParts(
      new Date(startDate.getTime() + normalizedEstimatedMinutes * 60000)
    ).dateTime;
  }

  await trip.update(
    {
      schedule: startValues.time,
      start: startValues.dateTime,
      arrival,
    },
    { transaction }
  );

  return trip;
};

const createRouteConfiguration = async ({
  tripId,
  routeId,
  currentDate,
  transaction,
}) => {
  const routeStops = await RouteStop.findAll({
    where: {
      route_id: routeId,
      active: true,
    },
    order: [['stop_order', 'ASC']],
    transaction,
  });

  const fareSegments = await FareSegment.findAll({
    where: {
      route_id: routeId,
      active: true,
      [Op.and]: [
        {
          [Op.or]: [
            { valid_from: null },
            { valid_from: { [Op.lte]: currentDate } },
          ],
        },
        {
          [Op.or]: [
            { valid_to: null },
            { valid_to: { [Op.gte]: currentDate } },
          ],
        },
      ],
    },
    attributes: [
      'id',
      'company_id',
      'origin_route_stop_id',
      'destination_route_stop_id',
      'currency',
      'valid_from',
      'valid_to',
      'priority',
      'active',
    ],
    include: [
      {
        model: RouteStop,
        as: 'originRouteStop',
        attributes: ['id'],
        where: {
          route_id: routeId,
          active: true,
        },
        required: true,
      },
      {
        model: RouteStop,
        as: 'destinationRouteStop',
        attributes: ['id'],
        where: {
          route_id: routeId,
          active: true,
        },
        required: true,
      },
      {
        model: FareSegmentTicketType,
        as: 'fareSegmentTicketTypes',
        where: { active: true },
        required: true,
        attributes: ['id', 'ticket_type_id', 'base_price'],
        include: [
          {
            model: TicketType,
            as: 'ticketType',
            where: { active: true },
            required: true,
            attributes: ['id'],
          },
        ],
      },
    ],
    transaction,
  });

  const tripStops = await TripStop.bulkCreate(
    routeStops.map((routeStop) => ({
      company_id: routeStop.company_id,
      trip_id: tripId,
      route_stop_id: routeStop.id,
      location_id: routeStop.location_id,
      distance_km: routeStop.distance_km,
      minutes_from_origin: routeStop.minutes_from_origin,
      stop_order: routeStop.stop_order,
      arrival_time: null,
      departure_time: null,
      can_board: routeStop.allows_boarding,
      can_alight: routeStop.allows_alighting,
      active: true,
      source_type: 'auto',
    })),
    { transaction }
  );

  const tripStopsByRouteStopId = new Map(
    tripStops.map((tripStop) => [Number(tripStop.route_stop_id), tripStop])
  );
  const tripSegmentsByFareSegmentId = new Map();
  const tripFarePayload = [];

  for (const fareSegment of fareSegments) {
    const originTripStop = tripStopsByRouteStopId.get(
      Number(fareSegment.origin_route_stop_id)
    );
    const destinationTripStop = tripStopsByRouteStopId.get(
      Number(fareSegment.destination_route_stop_id)
    );

    if (!originTripStop || !destinationTripStop) {
      throw new Error('OnBoardTripConfigurationInvalid');
    }

    for (const fareSegmentTicketType of fareSegment.fareSegmentTicketTypes || []) {
      const ticketTypeId = normalizeId(
        fareSegmentTicketType.ticket_type_id ?? fareSegmentTicketType.ticketType?.id
      );
      if (!ticketTypeId) {
        throw new Error('OnBoardTripConfigurationInvalid');
      }

      let tripSegment = tripSegmentsByFareSegmentId.get(Number(fareSegment.id));
      if (!tripSegment) {
        tripSegment = await TripSegmentRepository.create(
          {
            company_id: fareSegment.company_id,
            trip_id: tripId,
            origin_trip_stop_id: originTripStop.id,
            destination_trip_stop_id: destinationTripStop.id,
            source_fare_segment_id: fareSegment.id,
            currency: fareSegment.currency || 'CLP',
            valid_from: fareSegment.valid_from ?? null,
            valid_to: fareSegment.valid_to ?? null,
            priority: fareSegment.priority ?? 0,
            active: fareSegment.active,
            source_type: 'auto',
          },
          { transaction }
        );
        tripSegmentsByFareSegmentId.set(Number(fareSegment.id), tripSegment);
      }

      const basePrice = Number(fareSegmentTicketType.base_price || 0);
      tripFarePayload.push({
        company_id: fareSegment.company_id,
        trip_id: tripId,
        // Se conserva la relación legacy para no romper consumidores existentes.
        fare_segment_ticket_type_id: fareSegmentTicketType.id,
        trip_segment_id: tripSegment.id,
        ticket_type_id: ticketTypeId,
        base_price: basePrice,
        price: basePrice,
        active: true,
        source_type: 'auto',
      });
    }
  }

  const tripFares = await TripFare.bulkCreate(tripFarePayload, { transaction });

  return {
    tripStops,
    tripSegments: Array.from(tripSegmentsByFareSegmentId.values()),
    tripFares,
  };
};

const createOnBoardTripWithContext = async ({
  worker,
  context,
  branchId,
  routeId,
  transaction,
}) => {
  const vehicleBranches = await BranchVehicleRepository.findByVehicle(
    context.vehicle.id,
    { transaction }
  );
  const branchBelongsToVehicle = vehicleBranches.some(
    (branchVehicle) => Number(branchVehicle.branch_id) === branchId
  );

  if (!branchBelongsToVehicle) {
    throw new Error('BranchNotCompatibleWithVehicle');
  }

  const branchRoutes = await BranchRouteRepository.findByBranch(branchId, {
    transaction,
  });
  const branchRoute = branchRoutes.find(
    (currentBranchRoute) => Number(currentBranchRoute.route_id) === routeId
  );

  if (!branchRoute) {
    throw new Error('RouteNotAvailableForBranch');
  }

  const currentDate = getCurrentDate();
  const trip = await TripRepository.create(
    {
      date: currentDate,
      schedule: null,
      arrival: null,
      start: null,
      end: null,
      branch_id: branchId,
      vehicle_id: context.vehicle.id,
      route_id: routeId,
      device_id: context.device?.id ?? null,
      saleMode: 'on_board',
      finish_method: null,
      price: null,
    },
    { transaction }
  );

  const tripWorker = await TripWorker.create(
    {
      branch_id: branchId,
      trip_id: trip.id,
      worker_id: Number(worker.id),
      date: currentDate,
    },
    { transaction }
  );

  const { tripStops, tripSegments, tripFares } = await createRouteConfiguration({
    tripId: trip.id,
    routeId,
    currentDate,
    transaction,
  });

  await initializeTrip({
    trip,
    estimatedMinutes: branchRoute.route?.estimated,
    transaction,
  });

  const tripWithTicketTemplate = await TripRepository.findById(trip.id, {
    transaction,
  });

  return {
    trip: tripWithTicketTemplate || trip,
    tripWorker,
    tripStops,
    tripSegments,
    tripFares,
  };
};

const OnBoardTripService = {
  async findActive({
    worker,
    token_device_id,
    branch_id,
    vehicle_id,
    device_id,
    route_id,
  }) {
    const workerId = normalizeId(worker?.id);
    const routeId = normalizeId(route_id);
    const tokenDeviceId = normalizeId(token_device_id);

    if (!workerId || !routeId) {
      throw new Error('OnBoardActiveTripDataInvalid');
    }

    const route = await RouteRepository.findById(routeId);
    if (!route) {
      throw new Error('OnBoardRouteNotFound');
    }

    if (!isActive(route.status)) {
      throw new Error('OnBoardRouteInactive');
    }

    const context = tokenDeviceId
      ? await OnBoardContextService.resolve({
          worker,
          device_id: tokenDeviceId,
        })
      : await OnBoardContextService.resolveWeb({
          worker,
          branch_id,
          vehicle_id,
          device_id,
        });

    const branchRoutes = await BranchRouteRepository.findByBranches(
      context.authorizedBranchIds
    );
    const routeAvailable = branchRoutes.some(
      (branchRoute) => Number(branchRoute.route_id) === routeId
    );

    if (!routeAvailable) {
      throw new Error('OnBoardRouteUnavailableForVehicle');
    }

    const trips = await TripRepository.findActiveOnBoard({
      workerId,
      vehicleId: context.vehicle.id,
      routeId,
      branchIds: context.authorizedBranchIds,
      date: getCurrentDate(),
    });

    return {
      route: {
        id: route.id,
        code: route.code,
        name: route.name,
      },
      exists: trips.length > 0,
      count: trips.length,
      trips,
    };
  },

  async create({ worker, device_id, branch_id, route_id }) {
    const branchId = normalizeId(branch_id);
    const routeId = normalizeId(route_id);

    if (!branchId || !routeId) {
      throw new Error('OnBoardTripDataInvalid');
    }

    return sequelize.transaction(async (transaction) => {
      const context = await OnBoardContextService.resolve({
        worker,
        device_id,
        options: { transaction },
      });

      return createOnBoardTripWithContext({
        worker,
        context,
        branchId,
        routeId,
        transaction,
      });
    });
  },

  async createWithinTransaction({
    worker,
    context,
    branch_id,
    route_id,
    transaction,
  }) {
    const branchId = normalizeId(branch_id);
    const routeId = normalizeId(route_id);

    if (!branchId || !routeId) {
      throw new Error('OnBoardTicketTripCreationDataInvalid');
    }

    return createOnBoardTripWithContext({
      worker,
      context,
      branchId,
      routeId,
      transaction,
    });
  },

  async update({ worker, device_id, trip_id, action }) {
    const tripId = normalizeId(trip_id);
    const normalizedAction = String(action || '').trim().toUpperCase();

    if (!tripId || !['START', 'FINISH'].includes(normalizedAction)) {
      throw new Error('OnBoardTripOperationInvalid');
    }

    return sequelize.transaction(async (transaction) => {
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

      if (normalizedAction === 'START') {
        await initializeTrip({
          trip,
          estimatedMinutes: trip.route?.estimated,
          transaction,
        });
      } else {
        if (!trip.start) {
          throw new Error('OnBoardTripNotStarted');
        }

        if (trip.end) {
          throw new Error('OnBoardTripAlreadyFinished');
        }

        await trip.update(
          {
            end: formatDateTimeParts().dateTime,
            finish_method: 'MANUAL',
          },
          { transaction }
        );
      }

      return {
        action: normalizedAction,
        trip,
      };
    });
  },
};

module.exports = OnBoardTripService;
