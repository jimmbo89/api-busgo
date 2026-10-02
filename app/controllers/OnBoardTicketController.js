'use strict';

const logger = require('../../config/logger');
const {
  TicketRepository,
} = require('../repositories');
const { mapTicketSaleResponse } = require('./TicketController');
const OnBoardTicketService = require('../services/OnBoardTicketService');

const contextErrors = new Set([
  'WorkerNotAuthenticated',
  'DeviceNotAuthenticated',
  'DeviceInactive',
  'DeviceVehicleNotAssigned',
  'WorkerCannotOperateVehicle',
  'WorkerNotAuthorizedForBranch',
]);

const notFoundErrors = new Set([
  'DeviceNotFound',
  'OnBoardTicketTripNotFound',
]);

const forbiddenErrors = new Set([
  'OnBoardTicketWorkerNotAssigned',
]);

const conflictErrors = new Set([
  'OnBoardTicketTripFinished',
  'OnBoardTicketSegmentRegression',
]);

const operationErrors = new Set([
  'OnBoardWebContextDataInvalid',
  'OnBoardWebDeviceVehicleMismatch',
  'OnBoardWebDeviceBranchMismatch',
  'BranchNotCompatibleWithVehicle',
  'RouteNotAvailableForBranch',
]);

const errorDetails = {
  WorkerNotAuthenticated: 'No se pudo identificar al trabajador autenticado.',
  DeviceNotAuthenticated: 'No se pudo identificar el dispositivo autenticado.',
  DeviceNotFound: 'El dispositivo autenticado no existe.',
  DeviceInactive: 'El dispositivo autenticado está inactivo y no puede vender.',
  DeviceVehicleNotAssigned:
    'El dispositivo no tiene un vehículo activo asociado.',
  WorkerCannotOperateVehicle:
    'El trabajador autenticado no está autorizado para operar el vehículo.',
  WorkerNotAuthorizedForBranch:
    'El trabajador autenticado no está relacionado con ninguna de las sucursales asociadas al vehículo identificado por el dispositivo.',
  OnBoardTicketTripNotFound: 'El viaje indicado no existe.',
  OnBoardTicketRouteRequired:
    'Debe indicar la ruta cuando no se proporciona un viaje existente.',
  OnBoardTicketBranchRequired:
    'Debe indicar la sucursal cuando no se proporciona un viaje existente.',
  OnBoardTicketTripCreationDataInvalid:
    'No fue posible determinar la sucursal y la ruta para crear el viaje.',
  OnBoardTicketRouteMismatch:
    'La ruta enviada no corresponde al viaje indicado.',
  OnBoardWebContextDataInvalid:
    'Debe indicar una sucursal y un vehículo válidos para la venta web.',
  OnBoardWebDeviceVehicleMismatch:
    'El dispositivo seleccionado no está asociado al vehículo indicado.',
  OnBoardWebDeviceBranchMismatch:
    'El dispositivo seleccionado no está habilitado para la sucursal indicada.',
  BranchNotCompatibleWithVehicle:
    'La sucursal seleccionada no está asociada al vehículo indicado.',
  RouteNotAvailableForBranch:
    'La ruta seleccionada no está asociada a la sucursal indicada.',
  OnBoardTicketSaleModeInvalid:
    'El viaje indicado no corresponde a una venta con modalidad a bordo.',
  OnBoardTicketDeviceMismatch:
    'El viaje no está asociado al dispositivo autenticado.',
  OnBoardTicketVehicleMismatch:
    'El viaje no corresponde al vehículo identificado por el dispositivo.',
  OnBoardTicketBranchMismatch:
    'La sucursal enviada no corresponde a la sucursal del viaje.',
  OnBoardTicketTripNotStarted:
    'No se puede registrar la venta porque el viaje aún no ha iniciado.',
  OnBoardTicketTripFinished:
    'No se puede registrar la venta porque el viaje ya finalizó.',
  OnBoardTicketWorkerNotAssigned:
    'El trabajador autenticado no está asignado a este viaje.',
  OnBoardTicketItemsRequired:
    'Debe indicar al menos un tipo de pasaje para registrar la venta.',
  OnBoardTicketFareRequired:
    'Cada tipo de pasaje debe indicar una tarifa del viaje.',
  OnBoardTicketFareNotAvailable:
    'La tarifa seleccionada no pertenece al viaje indicado.',
  OnBoardTicketFareInactive:
    'La tarifa seleccionada está inactiva.',
  OnBoardTicketFareUnavailable:
    'La tarifa o el tipo de pasajero seleccionado no está disponible.',
  OnBoardTicketPassengerTypeMismatch:
    'El tipo de pasajero no corresponde a la tarifa seleccionada.',
  OnBoardTicketItemQuantityInvalid:
    'La cantidad de uno de los tipos de pasaje no es válida.',
  OnBoardTicketFareAmountInvalid:
    'La tarifa seleccionada no tiene un valor válido.',
  OnBoardTicketMultipleSegments:
    'Todos los tipos de pasaje de una venta deben pertenecer al mismo tramo.',
  OnBoardTicketFareSegmentMismatch:
    'El tramo enviado no corresponde a las tarifas seleccionadas.',
  OnBoardTicketStopsUnavailable:
    'Las paradas del tramo seleccionado no pertenecen a la configuración activa del viaje.',
  OnBoardTicketOriginStopUnavailable:
    'La parada seleccionada no está habilitada como punto de subida para este viaje.',
  OnBoardTicketDestinationStopUnavailable:
    'La parada seleccionada no está habilitada como destino para este viaje.',
  OnBoardTicketSegmentOrderInvalid:
    'El destino debe encontrarse después del origen dentro de la ruta.',
  OnBoardTicketSegmentRegression:
    'No se puede vender desde una parada anterior al avance ya registrado en el viaje.',
  OnBoardTicketPaymentMethodInvalid:
    'El medio de pago debe ser Efectivo, Debito o Credito.',
};

const humanizedErrors = {
  WorkerNotAuthorizedForBranch:
    'El trabajador no está autorizado para operar en las sucursales del vehículo.',
  OnBoardTicketSegmentRegression:
    'No se puede vender desde una parada anterior al avance ya registrado en el viaje.',
  OnBoardTicketStopsUnavailable:
    'Las paradas del tramo seleccionado no están disponibles para este viaje.',
  OnBoardTicketOriginStopUnavailable:
    'La parada seleccionada no está habilitada como punto de subida.',
  OnBoardTicketDestinationStopUnavailable:
    'La parada seleccionada no está habilitada como destino.',
  OnBoardTicketSegmentOrderInvalid:
    'El destino debe estar después del origen en la ruta.',
  OnBoardTicketRouteRequired:
    'Debes indicar la ruta cuando no se proporciona un viaje existente.',
  OnBoardTicketBranchRequired:
    'Debes indicar la sucursal cuando no se proporciona un viaje existente.',
  OnBoardTicketRouteMismatch:
    'La ruta enviada no corresponde al viaje indicado.',
  OnBoardWebContextDataInvalid:
    'La sucursal o el vehículo seleccionado no son válidos para la venta web.',
  OnBoardWebDeviceVehicleMismatch:
    'El dispositivo seleccionado no está asociado al vehículo indicado.',
  OnBoardWebDeviceBranchMismatch:
    'El dispositivo seleccionado no está habilitado para la sucursal indicada.',
  BranchNotCompatibleWithVehicle:
    'La sucursal seleccionada no pertenece al vehículo indicado.',
  RouteNotAvailableForBranch:
    'La ruta seleccionada no está disponible para la sucursal indicada.',
};

const getErrorStatus = (error) => {
  if (contextErrors.has(error.message)) {
    return error.message === 'DeviceNotAuthenticated' ||
      error.message === 'WorkerNotAuthenticated'
      ? 401
      : 403;
  }

  if (notFoundErrors.has(error.message)) {
    return 404;
  }

  if (forbiddenErrors.has(error.message)) {
    return 403;
  }

  if (conflictErrors.has(error.message)) {
    return 409;
  }

  if (operationErrors.has(error.message)) {
    return 400;
  }

  if (error.message.startsWith('OnBoardTicket')) {
    return 400;
  }

  return 500;
};

const OnBoardTicketController = {
  async store(req, res) {
    try {
      const result = await OnBoardTicketService.create({
        worker: req.worker,
        user_id: req.user?.id,
        device_id: req.device_id,
        body: req.body,
      });

      const ticket = await TicketRepository.findById(result.ticketId);

      return res.status(201).json({ ticket: mapTicketSaleResponse(ticket) });
    } catch (error) {
      const status = getErrorStatus(error);
      logger.error(`OnBoardTicketController->store: ${error.message}`);

      return res.status(status).json({
        error: status === 500
          ? 'Error interno del servidor'
          : humanizedErrors[error.message] ||
            errorDetails[error.message] ||
            error.message,
        details:
          errorDetails[error.message] ||
          'Ocurrió un error al registrar la venta a bordo. Intente nuevamente más tarde.',
      });
    }
  },

  async storeWeb(req, res) {
    try {
      const result = await OnBoardTicketService.create({
        worker: req.worker,
        user_id: req.user?.id,
        device_id: req.device_id,
        body: req.body,
        channel: 'web',
      });

      const ticket = await TicketRepository.findById(result.ticketId);

      return res.status(201).json({ ticket: mapTicketSaleResponse(ticket) });
    } catch (error) {
      const status = getErrorStatus(error);
      logger.error(`OnBoardTicketController->storeWeb: ${error.message}`);

      return res.status(status).json({
        error: status === 500
          ? 'Error interno del servidor'
          : humanizedErrors[error.message] ||
            errorDetails[error.message] ||
            error.message,
        details:
          errorDetails[error.message] ||
          'Ocurrió un error al registrar la venta a bordo web. Intente nuevamente más tarde.',
      });
    }
  },
};

module.exports = OnBoardTicketController;
