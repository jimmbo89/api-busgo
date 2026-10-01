'use strict';

const logger = require('../../config/logger');
const OnBoardGpsService = require('../services/OnBoardGpsService');

const errorDetails = {
  WorkerNotAuthenticated: 'No se pudo identificar al trabajador autenticado.',
  DeviceNotAuthenticated: 'No se pudo identificar al dispositivo autenticado.',
  DeviceNotFound: 'El dispositivo autenticado no existe.',
  DeviceInactive: 'El dispositivo autenticado está inactivo y no puede operar.',
  DeviceVehicleNotAssigned: 'El dispositivo no tiene un vehículo activo asociado.',
  WorkerCannotOperateVehicle:
    'El trabajador autenticado no está autorizado para operar el vehículo asociado.',
  WorkerNotAuthorizedForBranch:
    'El trabajador autenticado no está relacionado con ninguna de las sucursales asociadas al vehículo identificado por el dispositivo.',
  OnBoardGpsDataInvalid: 'Los datos de ubicación enviados no son válidos.',
  OnBoardTripNotFound: 'El viaje indicado no existe.',
  OnBoardTripSaleModeInvalid: 'El viaje indicado no corresponde a una operación ON_BOARD.',
  OnBoardTripDeviceMismatch: 'El viaje no corresponde al dispositivo autenticado.',
  OnBoardTripVehicleMismatch: 'El viaje no corresponde al vehículo del dispositivo.',
  OnBoardTripWorkerNotAssigned: 'El trabajador no está asignado al viaje indicado.',
  OnBoardTripNotStarted: 'El viaje todavía no ha iniciado.',
  OnBoardTripAlreadyFinished: 'El viaje ya finalizó y no admite nuevas ubicaciones.',
};

const humanizedErrors = {
  WorkerNotAuthorizedForBranch: 'Trabajador no autorizado para las sucursales del vehículo',
};

const clientErrors = new Set([
  'OnBoardGpsDataInvalid',
  'OnBoardTripSaleModeInvalid',
  'OnBoardTripDeviceMismatch',
  'OnBoardTripVehicleMismatch',
  'OnBoardTripWorkerNotAssigned',
  'OnBoardTripNotStarted',
  'OnBoardTripAlreadyFinished',
]);

const getErrorStatus = (error) => {
  if (error.message === 'OnBoardTripNotFound' || error.message === 'DeviceNotFound') {
    return 404;
  }

  if (error.message === 'WorkerNotAuthenticated' || error.message === 'DeviceNotAuthenticated') {
    return 401;
  }

  if (
    error.message === 'DeviceInactive' ||
    error.message === 'DeviceVehicleNotAssigned' ||
    error.message === 'WorkerCannotOperateVehicle' ||
    error.message === 'WorkerNotAuthorizedForBranch'
  ) {
    return 403;
  }

  if (clientErrors.has(error.message)) {
    return 400;
  }

  return 500;
};

const respondWithError = (action, error, res) => {
  const status = getErrorStatus(error);
  logger.error(`OnBoardGpsController->${action}: ${error.message}`);

  return res.status(status).json({
    error: status === 500
      ? 'Error interno del servidor'
      : humanizedErrors[error.message] || error.message,
    details:
      status === 500
        ? 'Ocurrió un error al procesar la ubicación del viaje. Intente nuevamente más tarde.'
        : errorDetails[error.message] || 'No se pudo procesar la ubicación indicada.',
  });
};

const OnBoardGpsController = {
  async store(req, res) {
    try {
      const { trip, location } = await OnBoardGpsService.create({
        worker: req.worker,
        device_id: req.device_id,
        body: req.body,
      });

      return res.status(201).json({
        msg: 'OnBoardGpsLocationCreated',
        details: 'La ubicación del viaje se registró correctamente.',
        trip: {
          id: trip.id,
          code: trip.code,
          sale_mode: trip.saleMode,
          start: trip.start,
          end: trip.end,
          locations: [
            {
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
            },
          ],
        },
      });
    } catch (error) {
      return respondWithError('store', error, res);
    }
  },

  async byTrip(req, res) {
    try {
      const result = await OnBoardGpsService.findByTrip({
        worker: req.worker,
        device_id: req.device_id,
        trip_id: req.body.trip_id,
      });

      return res.status(200).json(result);
    } catch (error) {
      return respondWithError('byTrip', error, res);
    }
  },
};

module.exports = OnBoardGpsController;
