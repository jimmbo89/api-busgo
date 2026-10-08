'use strict';

const logger = require('../../config/logger');
const OnBoardTripService = require('../services/OnBoardTripService');

const contextErrors = new Set([
  'WorkerNotAuthenticated',
  'DeviceNotAuthenticated',
  'DeviceInactive',
  'DeviceVehicleNotAssigned',
  'WorkerCannotOperateVehicle',
  'WorkerNotAuthorizedForBranch',
]);

const businessErrors = new Set([
  'OnBoardActiveTripDataInvalid',
  'OnBoardWebContextDataInvalid',
  'OnBoardTripDataInvalid',
  'BranchNotCompatibleWithVehicle',
  'OnBoardWebDeviceVehicleMismatch',
  'OnBoardWebDeviceBranchMismatch',
  'OnBoardRouteInactive',
  'OnBoardRouteUnavailableForVehicle',
  'RouteNotAvailableForBranch',
  'OnBoardTripOperationInvalid',
  'OnBoardTripSaleModeInvalid',
  'OnBoardTripDeviceMismatch',
  'OnBoardTripVehicleMismatch',
  'OnBoardTripNotStarted',
]);

const conflictErrors = new Set([
  'OnBoardTripAlreadyStarted',
  'OnBoardTripAlreadyFinished',
]);

const errorDetails = {
  WorkerNotAuthenticated: 'No se pudo identificar al trabajador autenticado.',
  DeviceNotAuthenticated: 'No se pudo identificar al dispositivo autenticado.',
  DeviceNotFound: 'El dispositivo autenticado no existe.',
  DeviceInactive: 'El dispositivo autenticado está inactivo y no puede operar.',
  DeviceVehicleNotAssigned: 'El dispositivo no tiene un vehículo activo asociado.',
  WorkerCannotOperateVehicle:
    'El trabajador autenticado no está autorizado para operar el vehículo asociado al dispositivo.',
  WorkerNotAuthorizedForBranch:
    'El vehículo identificado por el dispositivo no tiene sucursales operativas configuradas.',
  OnBoardTripDataInvalid:
    'Debe indicar una sucursal y una ruta válidas para crear el viaje.',
  OnBoardActiveTripDataInvalid:
    'Debe indicar una ruta válida para consultar los viajes iniciados.',
  OnBoardWebContextDataInvalid:
    'Debe indicar una sucursal y un vehículo válidos para consultar los viajes iniciados.',
  OnBoardRouteNotFound: 'La ruta indicada no existe.',
  OnBoardRouteInactive: 'La ruta indicada está inactiva.',
  OnBoardRouteUnavailableForVehicle:
    'La ruta indicada no está disponible para el vehículo seleccionado.',
  OnBoardWebDeviceVehicleMismatch:
    'El dispositivo seleccionado no está asociado al vehículo indicado.',
  OnBoardWebDeviceBranchMismatch:
    'El dispositivo seleccionado no está habilitado para la sucursal indicada.',
  BranchNotCompatibleWithVehicle:
    'La sucursal seleccionada no está asociada al vehículo identificado por el dispositivo.',
  RouteNotAvailableForBranch:
    'La ruta seleccionada no está asociada a la sucursal indicada. Seleccione una ruta compatible con esa sucursal.',
  OnBoardTripOperationInvalid: 'La operación indicada no es válida.',
  OnBoardTripNotFound: 'El viaje indicado no existe.',
  OnBoardTripSaleModeInvalid:
    'El viaje indicado no corresponde a una venta con modalidad a bordo.',
  OnBoardTripDeviceMismatch:
    'El viaje no está asociado al dispositivo autenticado.',
  OnBoardTripVehicleMismatch:
    'El viaje no corresponde al vehículo identificado por el dispositivo.',
  OnBoardTripWorkerNotAssigned:
    'El trabajador autenticado no está asignado a este viaje.',
  OnBoardTripAlreadyStarted: 'El viaje ya fue iniciado.',
  OnBoardTripAlreadyFinished: 'El viaje ya fue finalizado.',
  OnBoardTripNotStarted: 'No se puede finalizar un viaje que aún no ha iniciado.',
};

const humanizedErrors = {
  WorkerNotAuthorizedForBranch:
    'El vehículo identificado por el dispositivo no tiene sucursales operativas configuradas.',
  OnBoardActiveTripDataInvalid:
    'Debes indicar una ruta válida para consultar los viajes iniciados.',
  OnBoardWebContextDataInvalid:
    'Debes indicar una sucursal y un vehículo válidos para consultar los viajes iniciados.',
  OnBoardRouteNotFound: 'La ruta indicada no existe.',
  OnBoardRouteInactive: 'La ruta indicada está inactiva.',
  OnBoardRouteUnavailableForVehicle:
    'La ruta indicada no está disponible para el vehículo seleccionado.',
  OnBoardWebDeviceVehicleMismatch:
    'El dispositivo seleccionado no está asociado al vehículo indicado.',
  OnBoardWebDeviceBranchMismatch:
    'El dispositivo seleccionado no está habilitado para la sucursal indicada.',
};

const getErrorStatus = (error) => {
  if (contextErrors.has(error.message)) {
    return error.message === 'DeviceNotAuthenticated' || error.message === 'WorkerNotAuthenticated'
      ? 401
      : 403;
  }

  if (error.message === 'DeviceNotFound') {
    return 404;
  }

  if (error.message === 'OnBoardRouteNotFound') {
    return 404;
  }

  if (businessErrors.has(error.message)) {
    return 400;
  }

  if (error.message === 'OnBoardTripNotFound') {
    return 404;
  }

  if (error.message === 'OnBoardTripWorkerNotAssigned') {
    return 403;
  }

  if (conflictErrors.has(error.message)) {
    return 409;
  }

  return 500;
};

const OnBoardTripController = {
  async active(req, res) {
    try {
      const result = await OnBoardTripService.findActive({
        worker: req.worker,
        token_device_id: req.device_id,
        branch_id: req.body.branch_id,
        vehicle_id: req.body.vehicle_id,
        device_id: req.body.device_id,
        route_id: req.body.route_id,
      });

      return res.status(200).json({
        route: result.route,
        exists: result.exists,
        count: result.count,
        trips: result.trips.map((trip) => {
          const tripWorker = trip.tripworkers?.[0] || null;

          return {
            id: trip.id,
            code: trip.code,
            date: trip.date,
            schedule: trip.schedule,
            arrival: trip.arrival,
            start: trip.start,
            end: trip.end,
            branch_id: trip.branch_id,
            vehicle_id: trip.vehicle_id,
            route_id: trip.route_id,
            device_id: trip.device_id,
            saleMode: trip.saleMode,
            finish_method: trip.finish_method,
            trip_worker_id: tripWorker?.id || null,
            worker_id: tripWorker?.worker_id || null,
            worker: tripWorker?.worker || null,
            branch: trip.branch || null,
            vehicle: trip.vehicle || null,
            device: trip.device || null,
            route: trip.route || null,
          };
        }),
      });
    } catch (error) {
      const status = getErrorStatus(error);
      logger.error(`OnBoardTripController->active: ${error.message}`);

      return res.status(status).json({
        error: status === 500
          ? 'Error interno del servidor'
          : humanizedErrors[error.message] || error.message,
        details:
          errorDetails[error.message] ||
          'Ocurrió un error al consultar los viajes iniciados. Intente nuevamente más tarde.',
      });
    }
  },

  async store(req, res) {
    try {
      const result = await OnBoardTripService.create({
        worker: req.worker,
        device_id: req.device_id,
        branch_id: req.body.branch_id,
        route_id: req.body.route_id,
      });

      return res.status(201).json({
        msg: 'OnBoardTripCreated',
        trip: result.trip,
        tripWorker: result.tripWorker,
        tripStops: result.tripStops,
        tripFares: result.tripFares,
      });
    } catch (error) {
      const status = getErrorStatus(error);
      logger.error(`OnBoardTripController->store: ${error.message}`);

      return res.status(status).json({
        error: status === 500
          ? 'Error interno del servidor'
          : humanizedErrors[error.message] || error.message,
        details:
          errorDetails[error.message] ||
          'Ocurrió un error al crear el viaje. Intente nuevamente más tarde.',
      });
    }
  },

  async update(req, res) {
    try {
      const result = await OnBoardTripService.update({
        worker: req.worker,
        device_id: req.device_id,
        trip_id: req.body.trip_id,
        action: req.body.action,
      });

      const message = result.action === 'START'
        ? 'El viaje a bordo fue iniciado correctamente.'
        : 'El viaje a bordo fue finalizado correctamente.';

      logger.info(
        `ON_BOARD trip ${result.trip.id} actualizado: ${result.action}`
      );

      return res.status(200).json({
        msg: result.action === 'START' ? 'OnBoardTripStarted' : 'OnBoardTripFinished',
        details: message,
        trip: result.trip,
      });
    } catch (error) {
      const status = getErrorStatus(error);
      logger.error(`OnBoardTripController->update: ${error.message}`);

      return res.status(status).json({
        error: status === 500 ? 'ServerError' : error.message,
        details:
          errorDetails[error.message] ||
          'Ocurrió un error al actualizar el viaje. Intente nuevamente más tarde.',
      });
    }
  },
};

module.exports = OnBoardTripController;
