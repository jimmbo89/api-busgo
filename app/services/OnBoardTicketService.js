'use strict';

const { Transaction } = require('sequelize');
const logger = require('../../config/logger');
const {
  sequelize,
  TripWorker,
  Ticket,
  FareSegment,
} = require('../models');
const {
  TicketRepository,
  TicketItemRepository,
  TripRepository,
} = require('../repositories');
const OnBoardContextService = require('./OnBoardContextService');
const OnBoardTripService = require('./OnBoardTripService');

const isActive = (value) => value === true || Number(value) === 1;

const roundMoney = (value) => Number(Number(value || 0).toFixed(2));

const normalizeId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

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

const normalizePaymentMethod = (value) => {
  const normalized = String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const methods = {
    efectivo: 'Efectivo',
    debito: 'Debito',
    credito: 'Credito',
  };

  return methods[normalized] || null;
};

const getTicketItems = (body) => {
  const items = body.ticketItems ?? body.tickettypes ?? body.ticketType;
  return Array.isArray(items) ? items : [];
};

const resolveTripFare = (trip, item) => {
  const requestedId = Number(
    item.trip_fare_id ??
      item.tripFareId ??
      item.fare_segment_ticket_type_id ??
      item.id
  );

  if (!Number.isInteger(requestedId) || requestedId <= 0) {
    throw new Error('OnBoardTicketFareRequired');
  }

  const tripFares = Array.isArray(trip.tripFares) ? trip.tripFares : [];
  const tripFare = tripFares.find(
    (candidate) =>
      Number(candidate.id) === requestedId ||
      Number(candidate.fare_segment_ticket_type_id) === requestedId
  );

  if (!tripFare) {
    throw new Error('OnBoardTicketFareNotAvailable');
  }

  if (!isActive(tripFare.active)) {
    throw new Error('OnBoardTicketFareInactive');
  }

  const fareSegmentTicketType = tripFare.fareSegmentTicketType;
  const fareSegment = fareSegmentTicketType?.fareSegment;
  const ticketType = fareSegmentTicketType?.ticketType;

  if (
    !fareSegmentTicketType ||
    !isActive(fareSegmentTicketType.active) ||
    !fareSegment ||
    !isActive(fareSegment.active) ||
    !ticketType ||
    !isActive(ticketType.active)
  ) {
    throw new Error('OnBoardTicketFareUnavailable');
  }

  const requestedTicketTypeId = Number(
    item.ticket_type_id ?? item.ticketTypeId ?? 0
  );
  if (
    requestedTicketTypeId > 0 &&
    requestedTicketTypeId !== Number(fareSegmentTicketType.ticket_type_id)
  ) {
    throw new Error('OnBoardTicketPassengerTypeMismatch');
  }

  return {
    tripFare,
    fareSegmentTicketType,
    fareSegment,
    ticketType,
  };
};

const normalizeTicketItems = (trip, rawItems) => {
  const normalizedByTripFare = new Map();
  let fareSegmentId = null;
  let fareSegment = null;

  for (const rawItem of rawItems) {
    const item = rawItem || {};
    const quantity = Number(item.quantity ?? item.cant ?? 0);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error('OnBoardTicketItemQuantityInvalid');
    }

    const resolved = resolveTripFare(trip, item);
    const currentFareSegmentId = Number(resolved.fareSegment.id);
    if (!fareSegmentId) {
      fareSegmentId = currentFareSegmentId;
      fareSegment = resolved.fareSegment;
    } else if (fareSegmentId !== currentFareSegmentId) {
      throw new Error('OnBoardTicketMultipleSegments');
    }

    const tripFareId = Number(resolved.tripFare.id);
    const basePrice = Number(
      resolved.tripFare.base_price ??
        resolved.fareSegmentTicketType.base_price ??
        resolved.tripFare.price ??
        0
    );
    const unitPrice = Number(
      resolved.tripFare.price ??
        resolved.tripFare.base_price ??
        resolved.fareSegmentTicketType.base_price ??
        0
    );

    if (
      !Number.isFinite(basePrice) ||
      !Number.isFinite(unitPrice) ||
      basePrice < 0 ||
      unitPrice < 0
    ) {
      throw new Error('OnBoardTicketFareAmountInvalid');
    }

    const previous = normalizedByTripFare.get(tripFareId);
    const itemQuantity = (previous?.quantity || 0) + quantity;

    normalizedByTripFare.set(tripFareId, {
      id: null,
      ticket_type_id: Number(resolved.fareSegmentTicketType.ticket_type_id),
      trip_fare_id: tripFareId,
      ticket_type_name: resolved.ticketType.name,
      ticket_type_description: resolved.ticketType.description,
      quantity: itemQuantity,
      base_price: basePrice,
      unit_price: unitPrice,
      subtotal: roundMoney(unitPrice * itemQuantity),
      currency: resolved.fareSegment.currency || 'CLP',
      active: true,
      source_type: 'auto',
    });
  }

  return {
    fareSegmentId,
    fareSegment,
    ticketItems: Array.from(normalizedByTripFare.values()),
  };
};

const getTripStopByRouteStopId = (trip, routeStopId) => {
  const normalizedRouteStopId = Number(routeStopId);
  return (Array.isArray(trip.tripStops) ? trip.tripStops : []).find(
    (tripStop) => Number(tripStop.route_stop_id) === normalizedRouteStopId
  );
};

const validateSegmentProgress = async ({ trip, fareSegment, transaction }) => {
  const originTripStop = getTripStopByRouteStopId(
    trip,
    fareSegment?.origin_route_stop_id
  );
  const destinationTripStop = getTripStopByRouteStopId(
    trip,
    fareSegment?.destination_route_stop_id
  );

  if (!originTripStop || !destinationTripStop) {
    throw new Error('OnBoardTicketStopsUnavailable');
  }

  if (!isActive(originTripStop.active) || !isActive(originTripStop.can_board)) {
    throw new Error('OnBoardTicketOriginStopUnavailable');
  }

  if (
    !isActive(destinationTripStop.active) ||
    !isActive(destinationTripStop.can_alight)
  ) {
    throw new Error('OnBoardTicketDestinationStopUnavailable');
  }

  const originOrder = Number(originTripStop.stop_order);
  const destinationOrder = Number(destinationTripStop.stop_order);
  if (
    !Number.isInteger(originOrder) ||
    !Number.isInteger(destinationOrder) ||
    destinationOrder <= originOrder
  ) {
    throw new Error('OnBoardTicketSegmentOrderInvalid');
  }

  const soldTickets = await Ticket.findAll({
    where: { trip_id: trip.id },
    attributes: ['id', 'fare_segment_id'],
    include: [
      {
        model: FareSegment,
        as: 'fareSegment',
        attributes: ['id', 'origin_route_stop_id'],
        required: false,
      },
    ],
    transaction,
  });

  const highestSoldOriginOrder = soldTickets.reduce((highestOrder, ticket) => {
    const ticketOriginStop = getTripStopByRouteStopId(
      trip,
      ticket.fareSegment?.origin_route_stop_id
    );
    const ticketOriginOrder = Number(ticketOriginStop?.stop_order);

    return Number.isInteger(ticketOriginOrder)
      ? Math.max(highestOrder, ticketOriginOrder)
      : highestOrder;
  }, 0);

  if (highestSoldOriginOrder > 0 && originOrder < highestSoldOriginOrder) {
    throw new Error('OnBoardTicketSegmentRegression');
  }
};

const loadTripWithTickets = async (tripId, transaction) => {
  const trip = await TripRepository.findByIdWithTickets(tripId, {
    transaction,
    lock: transaction.LOCK?.UPDATE,
  });

  if (!trip) {
    throw new Error('OnBoardTicketTripNotFound');
  }

  return trip;
};

const resolveOrCreateTrip = async ({
  worker,
  context,
  body,
  transaction,
}) => {
  const requestedTripId = normalizeId(body.trip_id);
  const requestedRouteId = normalizeId(body.route_id);
  const requestedBranchId = normalizeId(body.branch_id);

  if (requestedTripId) {
    const trip = await loadTripWithTickets(requestedTripId, transaction);

    if (requestedRouteId && Number(trip.route_id) !== requestedRouteId) {
      throw new Error('OnBoardTicketRouteMismatch');
    }

    return { trip, created: false };
  }

  if (!requestedRouteId) {
    throw new Error('OnBoardTicketRouteRequired');
  }

  if (!requestedBranchId) {
    throw new Error('OnBoardTicketBranchRequired');
  }

  const activeTrips = await TripRepository.findActiveOnBoard({
    workerId: Number(worker.id),
    vehicleId: context.vehicle.id,
    routeId: requestedRouteId,
    branchIds: [requestedBranchId],
    date: getCurrentDate(),
    options: {
      transaction,
      lock: transaction.LOCK?.UPDATE,
    },
  });

  if (activeTrips.length > 0) {
    const trip = await loadTripWithTickets(activeTrips[0].id, transaction);
    return { trip, created: false };
  }

  const createdTrip = await OnBoardTripService.createWithinTransaction({
    worker,
    context,
    branch_id: requestedBranchId,
    route_id: requestedRouteId,
    transaction,
  });
  const trip = await loadTripWithTickets(createdTrip.trip.id, transaction);

  return { trip, created: true };
};

const OnBoardTicketService = {
  async create({ worker, user_id, device_id, body, channel = 'device' }) {
    const paymentMethod = normalizePaymentMethod(body.method);
    if (!paymentMethod) {
      throw new Error('OnBoardTicketPaymentMethodInvalid');
    }

    const channelName = channel === 'web' ? 'ON_BOARD_WEB' : 'ON_BOARD_DEVICE';
    logger.info(
      `${channelName} ticket request: worker_id=${worker?.id || 'unknown'}, route_id=${body.route_id || 'none'}, trip_id=${body.trip_id || 'none'}`
    );

    return sequelize.transaction(
      {
        isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE,
      },
      async (transaction) => {
        const context = channel === 'web'
          ? await OnBoardContextService.resolveWeb({
              worker,
              branch_id: body.branch_id,
              vehicle_id: body.vehicle_id,
              device_id: body.device_id,
              options: { transaction },
            })
          : await OnBoardContextService.resolve({
              worker,
              device_id,
              options: { transaction },
            });

        const { trip, created } = await resolveOrCreateTrip({
          worker,
          context,
          body,
          transaction,
        });

        logger.info(
          `${channelName} trip ${created ? 'created' : 'reused'}: trip_id=${trip.id}, route_id=${trip.route_id}, vehicle_id=${trip.vehicle_id}`
        );

        if (String(trip.saleMode || '').toLowerCase() !== 'on_board') {
          throw new Error('OnBoardTicketSaleModeInvalid');
        }

        if (
          context.device &&
          trip.device_id !== null &&
          Number(trip.device_id) !== Number(context.device.id)
        ) {
          logger.info(
            `ON_BOARD ticket using an active trip created by another associated device: trip_id=${trip.id}, trip_device_id=${trip.device_id}, operation_device_id=${context.device.id}`
          );
        }

        if (Number(trip.vehicle_id) !== Number(context.vehicle.id)) {
          throw new Error('OnBoardTicketVehicleMismatch');
        }

        if (Number(body.branch_id || trip.branch_id) !== Number(trip.branch_id)) {
          throw new Error('OnBoardTicketBranchMismatch');
        }

        if (!trip.start) {
          throw new Error('OnBoardTicketTripNotStarted');
        }

        if (trip.end) {
          throw new Error('OnBoardTicketTripFinished');
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
          throw new Error('OnBoardTicketWorkerNotAssigned');
        }

        const rawItems = getTicketItems(body);
        if (rawItems.length === 0) {
          throw new Error('OnBoardTicketItemsRequired');
        }

        const { fareSegmentId, fareSegment, ticketItems } = normalizeTicketItems(
          trip,
          rawItems
        );

        await validateSegmentProgress({
          trip,
          fareSegment,
          transaction,
        });

        if (
          body.fare_segment_id !== undefined &&
          body.fare_segment_id !== null &&
          Number(body.fare_segment_id) !== fareSegmentId
        ) {
          throw new Error('OnBoardTicketFareSegmentMismatch');
        }

        const calculatedQuantity = ticketItems.reduce(
          (sum, item) => sum + item.quantity,
          0
        );
        const calculatedTotal = roundMoney(
          ticketItems.reduce((sum, item) => sum + item.subtotal, 0)
        );
        const requestedQuantity = Number(body.quantity);
        const requestedTotal = Number(body.total);

        if (requestedQuantity !== calculatedQuantity) {
          logger.warn(
            `ON_BOARD ticket quantity mismatch: trip_id=${trip.id}, requested=${requestedQuantity}, calculated=${calculatedQuantity}`
          );
        }

        if (roundMoney(requestedTotal) !== calculatedTotal) {
          logger.warn(
            `ON_BOARD ticket total mismatch: trip_id=${trip.id}, requested=${requestedTotal}, calculated=${calculatedTotal}`
          );
        }

        const providedTicketId =
          body.id !== undefined && body.id !== null && body.id !== ''
            ? String(body.id)
            : null;

        const ticketBody = {
          branch_id: trip.branch_id,
          user_id,
          trip_id: trip.id,
          fare_segment_id: fareSegmentId,
          method: paymentMethod,
          status: body.status ?? 0,
          quantity: requestedQuantity,
          price: Number(body.price),
          total: requestedTotal,
          seats: Array.isArray(body.seats) ? body.seats : [],
          date: trip.date,
          adults: body.adults ?? null,
          minors: body.minors ?? null,
          pay: body.pay ?? 1,
          transactionStatus:
            paymentMethod === 'Debito' || paymentMethod === 'Credito'
              ? true
              : null,
          extraData: body.extraData ?? null,
          transactionTip: body.transactionTip ?? null,
          transactionCashback: body.transactionCashback ?? null,
          promotions: body.promotions ?? null,
          sequenceNumber: providedTicketId || body.sequenceNumber || null,
          qr: providedTicketId,
          barcode: providedTicketId,
        };

        const ticket = await TicketRepository.create(ticketBody, {
          transaction,
        });

        await TicketItemRepository.sync(ticket.id, ticketItems, {
          transaction,
        });

        await TicketRepository.generateTicketCodes(
          {
            id: ticket.id,
            sequenceNumber: ticket.sequenceNumber,
            trip_id: ticket.trip_id,
            ticketItems,
          },
          ticket,
          { transaction }
        );

        return {
          ticketId: ticket.id,
          calculatedQuantity,
          calculatedTotal,
        };
      }
    );
  },
};

module.exports = OnBoardTicketService;
