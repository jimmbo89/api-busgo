const PAYMENT_METHODS = Object.freeze({ Credito: 1, Debito: 2 });
const STATUS_CODES = Object.freeze({
  Pending: 0,
  Sent: 1,
  Canceled: 2,
  Processing: 3,
  Failed: 4,
  Completed: 5,
});
const STATUS_NAMES = Object.freeze(Object.fromEntries(
  Object.entries(STATUS_CODES).map(([name, code]) => [code, name])
));

function paymentMethodCode(method) {
  return Object.hasOwn(PAYMENT_METHODS, method) ? PAYMENT_METHODS[method] : null;
}

function normalizeStatus(value) {
  if (Number.isInteger(value) && Object.hasOwn(STATUS_NAMES, value)) return value;
  return typeof value === 'string' && Object.hasOwn(STATUS_CODES, value)
    ? STATUS_CODES[value]
    : null;
}

function parsePaymentResponse(data, expected, operation) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('TuuResponseInvalid');
  }

  const status = normalizeStatus(data.status);
  if (status === null
    || data.idempotencyKey !== expected.idempotencyKey
    || !Number.isSafeInteger(data.amount)
    || data.amount !== expected.amount) {
    throw new Error('TuuResponseMismatch');
  }

  if (operation === 'GET' && data.device !== expected.device) {
    throw new Error('TuuResponseMismatch');
  }

  if (operation === 'GET' && status === STATUS_CODES.Completed) {
    const sequence = data.sequenceNumber;
    if ((typeof sequence !== 'string' && typeof sequence !== 'number')
      || String(sequence).trim() === '') {
      throw new Error('TuuCompletedWithoutSequenceNumber');
    }
  }

  return {
    idempotencyKey: data.idempotencyKey,
    amount: data.amount,
    status,
    statusName: STATUS_NAMES[status],
    sequenceNumber: data.sequenceNumber == null ? null : String(data.sequenceNumber),
    transactionReference: data.transactionReference == null
      ? null
      : String(data.transactionReference),
    dteType: data.dteType ?? null,
    device: operation === 'GET' ? data.device : null,
    deviceId: operation === 'POST' ? data.deviceId ?? null : null,
  };
}

function buildCreateRequest(payment) {
  const method = paymentMethodCode(payment.method);
  if (method === null) throw new Error('InvalidPaymentMethod');
  if (!/^[a-zA-Z0-9-]{36}$/.test(payment.idempotencyKey)) {
    throw new Error('InvalidIdempotencyKey');
  }
  if (!Number.isSafeInteger(payment.amount)
    || payment.amount < 100 || payment.amount > 99999999) {
    throw new Error('InvalidAmount');
  }
  if (typeof payment.device !== 'string' || payment.device.trim() === '') {
    throw new Error('InvalidDevice');
  }

  return {
    IdempotencyKey: payment.idempotencyKey,
    Amount: payment.amount,
    Device: payment.device,
    //paymentMethod: method,
    Description: 'Compra de tickets',
    DteType: payment.dteType ?? 48,
    extraData: {
      exemptAmount: payment.exemptAmount ?? 0,
      customFields: payment.customFields ?? [],
      sourceName: 'POS Pagos',
      sourceVersion: 'v1.17v0.2',
    },
  };
}

module.exports = {
  PAYMENT_METHODS,
  STATUS_CODES,
  STATUS_NAMES,
  paymentMethodCode,
  normalizeStatus,
  parsePaymentResponse,
  buildCreateRequest,
};
