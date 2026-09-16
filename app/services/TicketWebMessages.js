'use strict';

const TICKET_WEB_ERROR_MESSAGES = Object.freeze({
  InvalidPaymentMethod: 'Selecciona efectivo, crédito o débito para continuar.',
  InvalidSeats: 'Revisa los asientos seleccionados e intenta nuevamente.',
  DuplicateSeats: 'La solicitud contiene asientos repetidos. Selecciona cada asiento una sola vez.',
  TicketWebCardPromotionsUnavailable: 'Las promociones no están disponibles para pagos con tarjeta. Revisa la tarifa seleccionada.',
  TicketWebCardRequiresFareItems: 'No pudimos identificar las tarifas de los pasajes. Actualiza la venta e intenta nuevamente.',
  TicketWebCardFareUnavailable: 'Una de las tarifas seleccionadas ya no está disponible. Actualiza la venta antes de continuar.',
  TicketWebCardFareMismatch: 'La tarifa seleccionada no corresponde a este viaje. Actualiza la venta antes de continuar.',
  TicketWebCardFareAmountInvalid: 'No pudimos validar el monto de la tarifa seleccionada. Actualiza la venta o contacta soporte.',
  TicketWebCardSaleAmountChanged: 'El total de la venta cambió. Revisa el nuevo monto antes de volver a pagar.',
  TicketWebCardAmountOutOfRange: 'El monto de la venta está fuera del rango permitido para pagar con tarjeta.',
  TicketWebCardTripDateChanged: 'La fecha del viaje cambió. Actualiza la venta antes de continuar.',
  TicketWebPaymentNotFound: 'No encontramos esta solicitud de pago. Verifica la venta o contacta soporte.',
  IdempotencyKeyReusedWithDifferentSale: 'La solicitud de pago no coincide con esta venta. No vuelvas a iniciar el cobro; contacta soporte.',
  TripNotFound: 'El viaje seleccionado ya no está disponible. Actualiza la lista de viajes e intenta nuevamente.',
  TripBranchMismatch: 'El viaje seleccionado no corresponde a esta sucursal. Actualiza la venta antes de continuar.',
  BranchNotFound: 'La sucursal seleccionada ya no está disponible. Actualiza la página e intenta nuevamente.',
  TuuPaymentNotRequired: 'Esta venta no requiere un cobro con tarjeta. Puedes continuar sin iniciar un pago en el POS.',
  TuuDeviceNotActiveForBranch: 'El POS seleccionado no está activo para esta sucursal. Contacta al administrador para revisar su configuración.',
  TuuDeviceQueueFull: 'El POS tiene solicitudes de pago pendientes. Espera a que se libere antes de iniciar otra.',
  TuuDeviceRateLimit: 'Este POS recibió una solicitud de pago recientemente. Espera antes de volver a intentarlo.',
  SeatsAlreadyReserved: 'Uno o más asientos ya están ocupados o reservados. Selecciona otros asientos antes de continuar.',
  TicketWebPaymentTicketNoLongerAvailable: 'El pago fue confirmado, pero no pudimos recuperar el ticket. No vuelvas a pagar; contacta soporte.',
  TuuCompletedPaymentMismatch: 'TUU confirmó el pago, pero no pudimos validar los datos para emitir el ticket. No vuelvas a pagar; contacta soporte.',
  FareSegmentNotFound: 'La tarifa seleccionada ya no está disponible. Actualiza la información del viaje.',
  FareSegmentRouteMismatch: 'La tarifa seleccionada no corresponde a la ruta del viaje.',
  FareSegmentCompanyMismatch: 'La tarifa seleccionada no está disponible para esta sucursal.',
});

const TUU_PAYMENT_METHOD_UNSUPPORTED = 'Device settings do not support the payment method entered.';
const TUU_DEVICE_NOT_ASSOCIATED_WITH_API_KEY = "Device for API-Key doesn't exist";

// Códigos publicados por TUU en la guía de Pago remoto. El texto de este mapa
// es el único que se muestra al usuario; el mensaje original queda interno.
const TUU_PROVIDER_MESSAGES = Object.freeze({
  'MR-000': 'TUU no autorizó la operación. Verifica la cuenta configurada y contacta al administrador.',
  'MR-100': 'El POS seleccionado no está asociado a la API key configurada en TUU. Verifica que el dispositivo y la clave pertenezcan al mismo comercio. No se emitió el ticket.',
  'MR-110': 'El monto de la venta es inferior al mínimo permitido por TUU.',
  'MR-120': 'El monto de la venta supera el máximo permitido por TUU.',
  'MR-130': 'El tipo de documento tributario enviado no es reconocido por TUU.',
  'MR-140': 'Falta el monto exento requerido para el tipo de documento enviado.',
  'MR-141': 'El monto exento no coincide con el monto de la venta.',
  'MR-150': 'El monto exento debe ser menor que el monto de la venta.',
  'MR-151': 'El monto exento enviado no es válido.',
  'MR-160': 'La solicitud de pago no existe en TUU. No se emitió el ticket.',
  'MR-161': 'El número de serie del POS no existe en TUU.',
  'MR-170': 'TUU no pudo consultar su base de datos. Intenta nuevamente más tarde.',
  'MR-180': 'La cola de solicitudes del POS está llena. Espera antes de volver a intentarlo.',
  'I-02': 'La longitud de un campo personalizado no es válida.',
  'I-03': 'La longitud de un campo personalizado no es válida.',
  'I-04': 'Los campos adicionales contienen caracteres no permitidos.',
  'INT-MIDDLEWARE-429': 'Se alcanzó el límite de solicitudes de TUU. Espera antes de volver a intentarlo.',
  'KEY-002': 'La API key no fue enviada a TUU. Contacta al administrador.',
  'KEY-003': 'La API key configurada no es válida para TUU. Verifica la credencial del comercio.',
  'RP-000': 'La clave de idempotencia no es válida.',
  'RP-001': 'La clave de idempotencia debe tener entre 1 y 36 caracteres.',
  'RP-003': 'El nombre de origen contiene caracteres no permitidos.',
  'RP-004': 'La versión de origen contiene caracteres no permitidos.',
  'RP-005': 'No se permite el monto exento para el tipo de documento enviado.',
  'RP-006': 'El monto exento no coincide con el total de la transacción.',
  'RP-007': 'Uno de los nombres de campos personalizados está reservado por TUU.',
  'RP-008': 'No se envió el método de pago a TUU.',
  'RP-010': 'La cantidad de campos personalizados supera el máximo permitido.',
  'RP-011': 'El monto exento debe ser menor que el total de la transacción.',
  'RP-012': 'El monto exento supera el total permitido para la transacción.',
  'RP-015': 'La longitud de un campo personalizado no es válida; debe estar entre 1 y 28 caracteres.',
  'RP-017': 'El monto de la venta supera el máximo permitido por TUU.',
  'RP-018': 'La propina debe ser menor que el total de la transacción.',
  'RP-019': 'La propina supera el máximo permitido por TUU.',
  'RP-020': 'El método de pago no está permitido para esta operación.',
  'RP-021': 'El vuelto debe ser menor que el total de la transacción.',
  'RP-022': 'El vuelto supera el máximo permitido por TUU.',
  'RP-025': 'El método de pago enviado no es válido.',
  'RP-026': 'Hay nombres de campos personalizados repetidos.',
  'RP-027': 'La suma de los montos supera el máximo permitido por TUU.',
  'RP-028': 'El monto debe ser igual o superior a 100.',
  'RP-029': 'No se encontró la configuración del POS en TUU.',
  'RP-030': 'La configuración del POS no permite ingresar propina.',
  'RP-031': 'La configuración del POS no permite ingresar vuelto.',
  'RP-032': 'La configuración del POS no permite el método de pago seleccionado. Verifica la configuración de crédito y débito del terminal. No se emitió el ticket.',
  'RP-100': 'TUU requiere autorización para realizar esta operación.',
  'RP-101': 'No se encontró la cuenta de pagos configurada en TUU.',
  'RP-102': 'La autenticación de TUU no es válida. Contacta al administrador.',
  'RP-200': 'No existe una solicitud de pago para la clave indicada.',
  'MR-191': 'La clave de idempotencia ya está siendo utilizada por otra solicitud.',
  'MR-203': 'La solicitud de pago todavía está en proceso en TUU. Consulta su estado antes de iniciar otra.',
});

function providerErrorFromLastError(lastError) {
  if (typeof lastError !== 'string') return null;
  const structured = lastError.match(/^TUU_ERROR:([A-Za-z0-9-]+):(.*)$/s);
  if (structured) return { code: structured[1], rawMessage: structured[2] };
  return { code: null, rawMessage: lastError };
}

function translatedProviderMessage(lastError) {
  const providerError = providerErrorFromLastError(lastError);
  if (!providerError) return null;
  if (providerError.code && TUU_PROVIDER_MESSAGES[providerError.code]) {
    return TUU_PROVIDER_MESSAGES[providerError.code];
  }
  if (providerError.rawMessage === TUU_PAYMENT_METHOD_UNSUPPORTED) {
    return null;
  }
  if (providerError.rawMessage === TUU_DEVICE_NOT_ASSOCIATED_WITH_API_KEY) {
    return TUU_PROVIDER_MESSAGES['MR-100'];
  }
  return null;
}

function ticketWebErrorMessage(code) {
  return TICKET_WEB_ERROR_MESSAGES[code]
    || 'No pudimos completar la venta. Revisa la información e intenta nuevamente. Si el problema continúa, contacta soporte.';
}

function ticketWebPaymentMessage(attempt, providerStatus) {
  if (attempt.dispatch_state === 'COMPLETED') {
    return 'El pago fue confirmado y el ticket está emitido.';
  }

  const translatedTuuError = translatedProviderMessage(attempt.last_error);
  if (translatedTuuError) {
    return translatedTuuError;
  }

  if (attempt.dispatch_state === 'UNKNOWN') {
    if (providerStatus === 'Completed') {
      return 'TUU confirmó el pago, pero el ticket todavía no está disponible. No vuelvas a pagar; consulta nuevamente con esta misma venta o contacta soporte.';
    }
    return 'Aún no pudimos confirmar el resultado del pago. No inicies otro cobro; vuelve a consultar el estado de esta misma venta.';
  }

  if (attempt.dispatch_state === 'FAILED') {
    if (providerStatus === 'Canceled') {
      return 'El pago fue cancelado en el POS. No se emitió el ticket.';
    }
    if (providerStatus === 'Failed') {
      return 'El pago no se completó en el POS. No se emitió el ticket. Revisa el medio de pago antes de iniciar otra solicitud.';
    }
    if (attempt.last_error === TUU_PAYMENT_METHOD_UNSUPPORTED) {
      const method = attempt.method === 'Credito' ? 'crédito' : 'débito';
      return `La configuración del POS no permite pagos con tarjeta de ${method}. Contacta al administrador para revisar el terminal. No se emitió el ticket.`;
    }
    if (attempt.last_error === TUU_DEVICE_NOT_ASSOCIATED_WITH_API_KEY) {
      return TUU_PROVIDER_MESSAGES['MR-100'];
    }
    if (attempt.last_error === 'TuuDeviceNotActiveForBranch') {
      return TICKET_WEB_ERROR_MESSAGES.TuuDeviceNotActiveForBranch;
    }
    return 'No se pudo iniciar el pago en el POS. No se emitió el ticket. Contacta al administrador antes de volver a intentarlo.';
  }

  if (attempt.tuu_status == null) {
    return 'Estamos iniciando la solicitud en el POS. Mantén esta venta abierta y no la envíes nuevamente.';
  }
  return 'La solicitud de pago está en el POS. Completa la operación en el terminal; el ticket se emitirá cuando el pago sea confirmado.';
}

module.exports = {
  ticketWebErrorMessage,
  ticketWebPaymentMessage,
};
