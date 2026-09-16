const crypto = require('node:crypto');
const { STATUS_CODES, STATUS_NAMES } = require('./TuuRemotePaymentContract');
const { ticketWebPaymentMessage } = require('./TicketWebMessages');

const LIVE_STATES = ['RESERVED', 'DISPATCHING', 'UNKNOWN', 'PENDING'];
const TERMINAL_STATES = ['FAILED', 'COMPLETED'];
const REPLAYABLE_START_STATES = [...LIVE_STATES, 'COMPLETED'];

function formatTuuLastError(error) {
  return error?.providerCode
    ? `TUU_ERROR:${error.providerCode}:${error.message || ''}`
    : error?.message;
}

class TicketWebPaymentError extends Error {
  constructor(status, msg, details) {
    super(msg);
    this.status = status;
    this.msg = msg;
    this.details = details;
  }
}

const valueOf = (item) => item && typeof item.get === 'function'
  ? item.get({ plain: true })
  : item;

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
};

const requestFingerprint = (body) => {
  const fields = [
    'branch_id', 'trip_id', 'date', 'method', 'quantity', 'price', 'total', 'seats',
    'adults', 'minors', 'pay', 'device', 'fare_segment_id', 'ticketItems',
    'tickettypes', 'ticketType', 'promotions',
  ];
  const stable = Object.fromEntries(fields
    .filter((key) => body[key] !== undefined)
    .map((key) => [key, body[key]]));
  return crypto.createHash('sha256').update(JSON.stringify(canonicalize(stable))).digest('hex');
};

function prepareCardSale(body, trip, userId) {
  if (!['Credito', 'Debito'].includes(body.method)) {
    throw new TicketWebPaymentError(400, 'InvalidPaymentMethod');
  }
  if (!Array.isArray(body.seats) || body.seats.some((seat) => !Number.isInteger(Number(seat)) || Number(seat) <= 0)) {
    throw new TicketWebPaymentError(400, 'InvalidSeats');
  }
  const seats = body.seats.map(Number);
  if (new Set(seats).size !== seats.length) throw new TicketWebPaymentError(400, 'DuplicateSeats');
  const capacity = Number(trip.vehicle?.seats ?? 0);
  if (capacity > 0 && seats.some((seat) => seat > capacity)) {
    throw new TicketWebPaymentError(400, 'InvalidSeats');
  }
  if (Array.isArray(body.promotions) && body.promotions.length > 0) {
    throw new TicketWebPaymentError(400, 'TicketWebCardPromotionsUnavailable');
  }

  const requestItems = body.ticketItems ?? body.tickettypes ?? body.ticketType;
  if (!Array.isArray(requestItems) || requestItems.length === 0) {
    throw new TicketWebPaymentError(400, 'TicketWebCardRequiresFareItems');
  }

  const tripFares = Array.isArray(trip.tripFares) ? trip.tripFares : [];
  const ticketItems = requestItems.map((rawItem) => {
    const item = valueOf(rawItem) || {};
    const tripFareId = Number(item.trip_fare_id ?? item.tripFareId);
    const tripFare = tripFares.find((candidate) => Number(candidate.id) === tripFareId);
    const quantity = Number(item.quantity ?? item.cant ?? 1);
    if (!tripFare || tripFare.active === false || !Number.isInteger(quantity) || quantity < 1) {
      throw new TicketWebPaymentError(400, 'TicketWebCardFareUnavailable');
    }
    if (Number(tripFare.trip_id) !== Number(trip.id)) {
      throw new TicketWebPaymentError(400, 'TicketWebCardFareMismatch');
    }
    const fareSegment = tripFare.fareSegmentTicketType?.fareSegment;
    if (!fareSegment || fareSegment.active === false) {
      throw new TicketWebPaymentError(400, 'TicketWebCardFareUnavailable');
    }
    const unitPrice = Number(tripFare.price);
    const basePrice = Number(tripFare.base_price ?? unitPrice);
    const currency = tripFare.fareSegmentTicketType?.fareSegment?.currency;
    if (!Number.isSafeInteger(unitPrice) || unitPrice < 0 || !Number.isFinite(basePrice) || currency !== 'CLP') {
      throw new TicketWebPaymentError(400, 'TicketWebCardFareAmountInvalid');
    }
    const fareType = tripFare.fareSegmentTicketType;
    const ticketType = fareType?.ticketType;
    return {
      id: null,
      ticket_type_id: item.ticket_type_id ?? fareType?.ticket_type_id ?? null,
      trip_fare_id: tripFare.id,
      ticket_type_name: item.ticket_type_name ?? item.ticketTypeName ?? ticketType?.name ?? fareType?.ticketTypeName ?? null,
      ticket_type_description: item.ticket_type_description ?? item.ticketTypeDescription ?? ticketType?.description ?? fareType?.ticketTypeDescription ?? null,
      quantity,
      base_price: basePrice,
      unit_price: unitPrice,
      subtotal: unitPrice * quantity,
      currency: 'CLP',
      active: true,
      source_type: 'auto',
    };
  });

  const quantity = ticketItems.reduce((sum, item) => sum + item.quantity, 0);
  const amount = ticketItems.reduce((sum, item) => sum + item.subtotal, 0);
  if (quantity !== Number(body.quantity) || amount !== Number(body.total)) {
    throw new TicketWebPaymentError(409, 'TicketWebCardSaleAmountChanged', {
      amount,
      quantity,
    });
  }
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > 99999999 || (amount > 0 && amount < 100)) {
    throw new TicketWebPaymentError(400, 'TicketWebCardAmountOutOfRange');
  }

  const fareSegmentIds = [...new Set(ticketItems.map((item) => {
    const fare = tripFares.find((candidate) => Number(candidate.id) === Number(item.trip_fare_id));
    return Number(fare?.fareSegmentTicketType?.fareSegment?.id);
  }).filter((id) => Number.isInteger(id) && id > 0))];
  const requestedFareSegmentId = body.fare_segment_id == null ? null : Number(body.fare_segment_id);
  if (requestedFareSegmentId !== null && !fareSegmentIds.includes(requestedFareSegmentId)) {
    throw new TicketWebPaymentError(400, 'TicketWebCardFareMismatch');
  }
  const rootFareSegmentId = requestedFareSegmentId == null
    ? (fareSegmentIds.length === 1 ? fareSegmentIds[0] : null)
    : requestedFareSegmentId;
  const normalizedTripDate = String(trip.date).slice(0, 10);
  if (String(body.date).slice(0, 10) !== normalizedTripDate) {
    throw new TicketWebPaymentError(409, 'TicketWebCardTripDateChanged');
  }

  return {
    branch_id: Number(body.branch_id),
    user_id: Number(userId),
    trip_id: Number(trip.id),
    fare_segment_id: rootFareSegmentId,
    method: body.method,
    status: Number.isInteger(Number(body.status)) ? Number(body.status) : 0,
    quantity,
    price: Number((amount / quantity).toFixed(2)),
    total: amount,
    seats,
    date: normalizedTripDate,
    adults: body.adults == null ? null : Number(body.adults),
    minors: body.minors == null ? null : Number(body.minors),
    pay: body.pay == null ? null : Number(body.pay),
    promotions: null,
    ticketItems,
    fare_segment_ids: fareSegmentIds,
    idempotency_key: body.idempotencyKey,
    device: typeof body.device === 'string' ? body.device.trim() : '',
    amount,
  };
}

function createTuuTicketWebService(overrides = {}) {
  const dependencies = () => {
    if (overrides.models) return overrides;
    const models = require('../models');
    const repositories = require('../repositories');
    return {
      models,
      ...repositories,
      TuuRepository: repositories.TuuRepository,
    };
  };

  async function withAttemptTransaction(callback) {
    const { models } = dependencies();
    const transaction = await models.sequelize.transaction();
    try {
      const value = await callback(transaction, dependencies());
      await transaction.commit();
      return value;
    } catch (error) {
      if (!transaction.finished) await transaction.rollback();
      throw error;
    }
  }

  async function reserve(body, userId, fingerprintBody = body) {
    const { models, TripRepository, TicketRepository } = dependencies();
    const fingerprint = requestFingerprint(fingerprintBody);
    const idempotencyKey = body.idempotencyKey || crypto.randomUUID();
    const saleBody = { ...body, idempotencyKey };
    const verifyExisting = (attempt) => {
      if (Number(attempt.user_id) !== Number(userId)) {
        throw new TicketWebPaymentError(404, 'TicketWebPaymentNotFound');
      }
      if (attempt.fingerprint !== fingerprint) {
        throw new TicketWebPaymentError(409, 'IdempotencyKeyReusedWithDifferentSale');
      }
      return { attempt, isNew: false };
    };

    try {
      return await withAttemptTransaction(async (transaction, deps) => {
      const trip = await deps.TripRepository.findByIdWithTickets(body.trip_id, {
        transaction,
        lock: transaction.LOCK?.UPDATE,
      });
      if (!trip) throw new TicketWebPaymentError(400, 'TripNotFound');
      if (Number(trip.branch_id) !== Number(body.branch_id)) {
        throw new TicketWebPaymentError(400, 'TripBranchMismatch');
      }

      const existing = await models.TicketWebPayment.findOne({
        where: { idempotency_key: idempotencyKey },
        transaction,
        lock: transaction.LOCK?.UPDATE,
      });
      if (existing) {
        return verifyExisting(existing);
      }

      // If the initial HTTP response was lost, the browser has no key to send
      // back. Reuse its latest matching non-failed attempt so that a retry
      // cannot issue a second TUU request. A confirmed failure may be retried
      // as a new attempt with a new key.
      if (!body.idempotencyKey) {
        const previousAttempt = await models.TicketWebPayment.findOne({
          where: { user_id: Number(userId), fingerprint },
          order: [['createdAt', 'DESC']],
          transaction,
          lock: transaction.LOCK?.UPDATE,
        });
        if (previousAttempt && REPLAYABLE_START_STATES.includes(previousAttempt.dispatch_state)) {
          return verifyExisting(previousAttempt);
        }
      }

      const snapshot = prepareCardSale(saleBody, trip, userId);
      if (snapshot.amount === 0) {
        throw new TicketWebPaymentError(400, 'TuuPaymentNotRequired');
      }
      const device = await models.Device.findOne({
        where: { serial: snapshot.device, branch_id: Number(body.branch_id), status: 1 },
        transaction,
        lock: transaction.LOCK?.UPDATE,
      });
      if (!device) throw new TicketWebPaymentError(400, 'TuuDeviceNotActiveForBranch');

      const now = new Date();
      const Op = models.Sequelize.Op;
      const pendingWhere = {
        device: snapshot.device,
        dispatch_state: { [Op.in]: LIVE_STATES },
      };
      const pendingCount = await models.TicketWebPayment.count({ where: pendingWhere, transaction });
      if (pendingCount >= 5) throw new TicketWebPaymentError(429, 'TuuDeviceQueueFull');
      const recentDispatch = await models.TicketWebPayment.findOne({
        where: {
          device: snapshot.device,
          dispatched_at: { [Op.gte]: new Date(now.getTime() - 60000) },
        },
        transaction,
        lock: transaction.LOCK?.UPDATE,
      });
      if (recentDispatch) throw new TicketWebPaymentError(429, 'TuuDeviceRateLimit');

      const conflicts = snapshot.fare_segment_ids.length
        ? await TicketRepository.checkReservedSeatsBySegment(
          snapshot.trip_id,
          snapshot.seats,
          snapshot.fare_segment_ids,
          null,
          { transaction }
        )
        : await TicketRepository.checkReservedSeats(snapshot.trip_id, snapshot.seats, null, { transaction });
      if (conflicts.length) {
        throw new TicketWebPaymentError(409, 'SeatsAlreadyReserved', { seats: conflicts });
      }

      const attempt = await models.TicketWebPayment.create({
        idempotency_key: snapshot.idempotency_key,
        fingerprint,
        branch_id: snapshot.branch_id,
        trip_id: snapshot.trip_id,
        user_id: snapshot.user_id,
        device: snapshot.device,
        method: snapshot.method,
        amount: snapshot.amount,
        seats: snapshot.seats,
        fare_segment_ids: snapshot.fare_segment_ids,
        sale_snapshot: snapshot,
        dispatch_state: 'RESERVED',
        // Reservar la cuota local junto con el asiento evita que dos
        // solicitudes simultáneas entren al POS antes del primer POST.
        dispatched_at: now,
      }, { transaction });
      return { attempt, isNew: true };
      });
    } catch (error) {
      if (error.name !== 'SequelizeUniqueConstraintError' && error.original?.code !== 'ER_DUP_ENTRY') {
        throw error;
      }
      const existing = await models.TicketWebPayment.findOne({
        where: { idempotency_key: idempotencyKey },
      });
      if (!existing) throw error;
      return verifyExisting(existing);
    }
  }

  async function claimDispatch(attemptId) {
    return withAttemptTransaction(async (transaction, deps) => {
      const attemptPreview = await deps.models.TicketWebPayment.findByPk(attemptId, {
        transaction,
        lock: transaction.LOCK?.UPDATE,
      });
      if (!attemptPreview || attemptPreview.dispatch_state !== 'RESERVED') return null;

      const device = await deps.models.Device.findOne({
        where: { serial: attemptPreview.device, status: 1 },
        transaction,
        lock: transaction.LOCK?.UPDATE,
      });
      if (!device) {
        await attemptPreview.update({
          dispatch_state: 'FAILED',
          last_error: 'TuuDeviceNotActiveForBranch',
        }, { transaction });
        return null;
      }
      const Op = deps.models.Sequelize.Op;
      const recentAttempt = await deps.models.TicketWebPayment.findOne({
        where: {
          device: attemptPreview.device,
          id: { [Op.ne]: attemptPreview.id },
          dispatched_at: { [Op.gte]: new Date(Date.now() - 60000) },
        },
        transaction,
      });
      if (recentAttempt) return null;

      const attempt = await deps.models.TicketWebPayment.findByPk(attemptId, {
        transaction,
        lock: transaction.LOCK?.UPDATE,
      });
      if (!attempt || attempt.dispatch_state !== 'RESERVED') return null;
      await attempt.update({ dispatch_state: 'DISPATCHING', dispatched_at: new Date(), last_error: null }, { transaction });
      return attempt;
    });
  }

  async function saveProviderResult(attemptId, payment, localState, lastError = null) {
    const { models } = dependencies();
    const update = {
      dispatch_state: localState,
      checked_at: new Date(),
      last_error: lastError,
    };
    if (payment) {
      update.tuu_status = payment.status;
      update.tuu_sequence_number = payment.sequenceNumber;
      update.transaction_reference = payment.transactionReference;
    }
    await models.TicketWebPayment.update(update, {
      // A late POST response or simultaneous poll must never undo finalization.
      where: {
        id: attemptId,
        dispatch_state: { [models.Sequelize.Op.notIn]: TERMINAL_STATES },
      },
    });
    return models.TicketWebPayment.findByPk(attemptId);
  }

  async function dispatch(attempt) {
    const claimed = await claimDispatch(attempt.id);
    if (!claimed) return dependencies().models.TicketWebPayment.findByPk(attempt.id);
    try {
      const payment = await dependencies().TuuRepository.createRemotePayment({
        idempotencyKey: claimed.idempotency_key,
        amount: claimed.amount,
        device: claimed.device,
        method: claimed.method,
        dteType: 48,
        exemptAmount: 0,
        customFields: [],
      });
      // POST confirma la creación de la solicitud. Solo el GET de consulta
      // determina el resultado terminal del cobro.
      const unverifiedTerminal = [
        STATUS_CODES.Failed,
        STATUS_CODES.Canceled,
        STATUS_CODES.Completed,
      ].includes(payment.status);
      const postResult = unverifiedTerminal ? { ...payment, status: null } : payment;
      return saveProviderResult(claimed.id, postResult, 'PENDING');
    } catch (error) {
      return saveProviderResult(
        claimed.id,
        null,
        error.uncertain ? 'UNKNOWN' : 'FAILED',
        formatTuuLastError(error)
      );
    }
  }

  async function loadOwnedAttempt(idempotencyKey, userId) {
    const attempt = await dependencies().models.TicketWebPayment.findOne({
      where: { idempotency_key: idempotencyKey, user_id: Number(userId) },
    });
    if (!attempt) throw new TicketWebPaymentError(404, 'TicketWebPaymentNotFound');
    return attempt;
  }

  async function emitTicket(attemptId, payment) {
    const { models, TicketRepository, TicketItemRepository, TuuRepository } = dependencies();
    return withAttemptTransaction(async (transaction, deps) => {
      const attempt = await deps.models.TicketWebPayment.findByPk(attemptId, {
        transaction,
        lock: transaction.LOCK?.UPDATE,
      });
      if (!attempt) throw new TicketWebPaymentError(404, 'TicketWebPaymentNotFound');
      if (attempt.ticket_id) return deps.TicketRepository.findById(attempt.ticket_id);
      if (attempt.dispatch_state === 'COMPLETED') {
        throw new TicketWebPaymentError(410, 'TicketWebPaymentTicketNoLongerAvailable');
      }
      if (payment.status !== STATUS_CODES.Completed
        || payment.amount !== Number(attempt.amount)
        || payment.idempotencyKey !== attempt.idempotency_key
        || payment.device !== attempt.device
        || !payment.sequenceNumber) {
        throw new TicketWebPaymentError(502, 'TuuCompletedPaymentMismatch');
      }

      const snapshot = attempt.sale_snapshot;
      const ticket = await deps.TicketRepository.create({
        ...snapshot,
        transactionStatus: true,
        extraData: {
          tuuPayment: {
            idempotencyKey: attempt.idempotency_key,
            sequenceNumber: payment.sequenceNumber,
            transactionReference: payment.transactionReference,
          },
        },
      }, { transaction });
      await deps.TicketItemRepository.sync(ticket.id, snapshot.ticketItems, {
        transaction,
        preserveServerPriceSnapshot: true,
      });
      await deps.TuuRepository.create({
        ticket_id: ticket.id,
        amount: attempt.amount,
        device: attempt.device,
        description: 'Compra de tickets',
        dteType: 48,
        idempotencyKey: attempt.idempotency_key,
        status: STATUS_NAMES[payment.status],
        exemptAmount: 0,
        customFields: [],
      }, { transaction });
      const codeData = {
        id: ticket.id,
        method: ticket.method,
        quantity: ticket.quantity,
        price: ticket.price,
        total: ticket.total,
        date: ticket.date,
        trip_id: ticket.trip_id,
        seats: ticket.seats,
        ticketItems: snapshot.ticketItems,
      };
      await deps.TicketRepository.generateTicketCodes(codeData, ticket, { transaction });
      await attempt.update({
        dispatch_state: 'COMPLETED',
        tuu_status: payment.status,
        tuu_sequence_number: payment.sequenceNumber,
        transaction_reference: payment.transactionReference,
        ticket_id: ticket.id,
        checked_at: new Date(),
        last_error: null,
      }, { transaction });
      return ticket;
    });
  }

  async function present(attempt, completedTicket = null) {
    let ticket = completedTicket;
    if (!ticket && attempt.dispatch_state === 'COMPLETED' && attempt.ticket_id) {
      ticket = await dependencies().TicketRepository.findById(attempt.ticket_id);
    }
    const providerStatus = attempt.tuu_status == null
      ? null
      : STATUS_NAMES[Number(attempt.tuu_status)];
    const status = attempt.dispatch_state === 'COMPLETED'
      ? 'Completed'
      : attempt.dispatch_state === 'UNKNOWN'
        ? 'Unknown'
        : attempt.dispatch_state === 'FAILED'
          ? providerStatus || 'Failed'
          : 'Pending';
    return {
      httpStatus: attempt.dispatch_state === 'COMPLETED' ? 200
        : attempt.dispatch_state === 'FAILED' ? 402 : 202,
      body: {
        message: ticketWebPaymentMessage(attempt, providerStatus),
        payment: {
          idempotencyKey: attempt.idempotency_key,
          status,
          providerStatus,
          amount: Number(attempt.amount),
          sequenceNumber: attempt.tuu_sequence_number,
        },
        ticket,
      },
    };
  }

  async function start(body, userId, fingerprintBody = body) {
    const deps = dependencies();
    const reservation = await reserve(body, userId, fingerprintBody);
    let attempt = reservation.attempt;
    if (reservation.isNew) {
      attempt = await dispatch(attempt);
      return present(attempt);
    }
    if (attempt.dispatch_state === 'RESERVED') {
      attempt = await dispatch(attempt);
    }
    return present(attempt);
  }

  async function status(idempotencyKey, userId) {
    let attempt = await loadOwnedAttempt(idempotencyKey, userId);
    if (TERMINAL_STATES.includes(attempt.dispatch_state)) return present(attempt);
    if (attempt.dispatch_state === 'RESERVED') {
      attempt = await dispatch(attempt);
      return present(attempt);
    }

    try {
      const payment = await dependencies().TuuRepository.getRemotePayment({
        idempotencyKey: attempt.idempotency_key,
        amount: Number(attempt.amount),
        device: attempt.device,
      });
      const terminal = payment.status === STATUS_CODES.Failed || payment.status === STATUS_CODES.Canceled;
      if (payment.status === STATUS_CODES.Completed) {
        await saveProviderResult(attempt.id, payment, 'PENDING');
        const ticket = await emitTicket(attempt.id, payment);
        return present(await dependencies().models.TicketWebPayment.findByPk(attempt.id), ticket);
      }
      attempt = await saveProviderResult(attempt.id, payment, terminal ? 'FAILED' : 'PENDING');
      return present(attempt);
    } catch (error) {
      attempt = await saveProviderResult(
        attempt.id,
        null,
        'UNKNOWN',
        formatTuuLastError(error)
      );
      return present(attempt);
    }
  }

  async function reconcilePending() {
    const { models } = dependencies();
    const attempts = await models.TicketWebPayment.findAll({
      where: { dispatch_state: { [models.Sequelize.Op.in]: LIVE_STATES } },
      order: [['createdAt', 'ASC']],
    });
    const summary = { checked: 0, completed: 0, failed: 0, pending: 0, errors: 0 };

    // The caller may be the periodic backend worker rather than the browser.
    // Reuse the same GET verification and idempotent ticket-emission path.
    for (const attempt of attempts) {
      try {
        const result = await status(attempt.idempotency_key, attempt.user_id);
        summary.checked += 1;
        if (result.body.payment.status === 'Completed') summary.completed += 1;
        else if (result.body.payment.status === 'Failed' || result.body.payment.status === 'Canceled') summary.failed += 1;
        else summary.pending += 1;
      } catch {
        summary.errors += 1;
      }
    }

    return summary;
  }

  return { start, status, reconcilePending };
}

const service = createTuuTicketWebService();
service.prepareCardSale = prepareCardSale;
service.requestFingerprint = requestFingerprint;
service.TicketWebPaymentError = TicketWebPaymentError;
service.createTuuTicketWebService = createTuuTicketWebService;

module.exports = service;
