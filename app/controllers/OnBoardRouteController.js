'use strict';

const logger = require('../../config/logger');
const OnBoardRouteService = require('../services/OnBoardRouteService');
const OnBoardCommercialService = require('../services/OnBoardCommercialService');
const OnBoardWebService = require('../services/OnBoardWebService');

const contextErrors = new Set([
  'WorkerNotAuthenticated',
  'DeviceNotAuthenticated',
  'DeviceInactive',
  'DeviceVehicleNotAssigned',
  'WorkerCannotOperateVehicle',
  'WorkerNotAuthorizedForBranch',
]);

const routeErrors = new Set([
  'OnBoardRouteDataInvalid',
  'OnBoardRouteInactive',
  'OnBoardRouteUnavailableForVehicle',
  'OnBoardWebContextDataInvalid',
  'BranchNotCompatibleWithVehicle',
  'OnBoardWebDeviceVehicleMismatch',
  'OnBoardWebDeviceBranchMismatch',
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
    'El vehículo seleccionado no tiene sucursales operativas configuradas.',
  OnBoardWebContextDataInvalid:
    'Debe indicar una sucursal y un vehículo válidos para consultar la operación web.',
  BranchNotCompatibleWithVehicle:
    'El vehículo seleccionado no está asociado a la sucursal indicada.',
  OnBoardWebDeviceVehicleMismatch:
    'El dispositivo seleccionado no está asociado al vehículo indicado.',
  OnBoardWebDeviceBranchMismatch:
    'El dispositivo seleccionado no está registrado para la sucursal indicada.',
  OnBoardRouteDataInvalid: 'Debe indicar una ruta válida.',
  OnBoardRouteNotFound: 'La ruta indicada no existe.',
  OnBoardRouteInactive: 'La ruta indicada está inactiva.',
  OnBoardRouteUnavailableForVehicle:
    'La ruta indicada no está disponible para el vehículo asociado al dispositivo.',
};

const humanizedErrors = {
  WorkerNotAuthenticated: 'No se pudo identificar al trabajador autenticado.',
  DeviceNotAuthenticated: 'No se pudo identificar al dispositivo autenticado.',
  DeviceNotFound: 'El dispositivo indicado no existe.',
  DeviceInactive: 'El dispositivo está inactivo y no puede operar.',
  DeviceVehicleNotAssigned: 'El dispositivo no tiene un vehículo activo asociado.',
  WorkerCannotOperateVehicle:
    'El trabajador no está autorizado para operar el vehículo seleccionado.',
  WorkerNotAuthorizedForBranch:
    'El vehículo seleccionado no tiene sucursales operativas configuradas.',
  OnBoardWebContextDataInvalid:
    'La sucursal o el vehículo seleccionado no son válidos.',
  BranchNotCompatibleWithVehicle:
    'El vehículo seleccionado no pertenece a la sucursal indicada.',
  OnBoardWebDeviceVehicleMismatch:
    'El dispositivo seleccionado no está asociado al vehículo indicado.',
  OnBoardWebDeviceBranchMismatch:
    'El dispositivo seleccionado no está habilitado para la sucursal indicada.',
  OnBoardRouteDataInvalid: 'Debe indicar una ruta válida.',
  OnBoardRouteNotFound: 'La ruta indicada no existe.',
  OnBoardRouteInactive: 'La ruta indicada está inactiva.',
  OnBoardRouteUnavailableForVehicle:
    'La ruta indicada no está disponible para el vehículo seleccionado.',
};

const getErrorStatus = (error) => {
  if (error.message === 'DeviceNotFound') {
    return 404;
  }

  if (contextErrors.has(error.message)) {
    return error.message === 'DeviceNotAuthenticated' || error.message === 'WorkerNotAuthenticated'
      ? 401
      : 403;
  }

  if (error.message === 'OnBoardRouteNotFound') {
    return 404;
  }

  if (routeErrors.has(error.message)) {
    return 400;
  }

  return 500;
};

const OnBoardRouteController = {
  async availableRoutes(req, res) {
    try {
      const result = await OnBoardRouteService.findAvailable({
        worker: req.worker,
        device_id: req.device_id,
      });

      return res.status(200).json(result);
    } catch (error) {
      const status = getErrorStatus(error);
      logger.error(`OnBoardRouteController->availableRoutes: ${error.message}`);

      return res.status(status).json({
        error: status === 500
          ? 'Error interno del servidor'
          : humanizedErrors[error.message] || error.message,
        details:
          errorDetails[error.message] ||
          'Ocurrió un error al consultar las rutas disponibles. Intente nuevamente más tarde.',
      });
    }
  },

  async webContext(req, res) {
    try {
      const result = await OnBoardWebService.context({
        worker: req.worker,
      });

      return res.status(200).json(result);
    } catch (error) {
      const status = getErrorStatus(error);
      logger.error(`OnBoardRouteController->webContext: ${error.message}`);

      return res.status(status).json({
        error: status === 500
          ? 'Error interno del servidor'
          : humanizedErrors[error.message] || error.message,
        details:
          errorDetails[error.message] ||
          'Ocurrió un error al consultar las opciones de operación web. Intente nuevamente más tarde.',
      });
    }
  },

  async availableRoutesWeb(req, res) {
    try {
      const result = await OnBoardRouteService.findAvailableWeb({
        worker: req.worker,
        branch_id: req.body.branch_id,
        vehicle_id: req.body.vehicle_id,
        device_id: req.body.device_id,
      });

      return res.status(200).json(result);
    } catch (error) {
      const status = getErrorStatus(error);
      logger.error(`OnBoardRouteController->availableRoutesWeb: ${error.message}`);

      return res.status(status).json({
        error: status === 500
          ? 'Error interno del servidor'
          : humanizedErrors[error.message] || error.message,
        details:
          errorDetails[error.message] ||
          'Ocurrió un error al consultar las rutas disponibles para la operación web. Intente nuevamente más tarde.',
      });
    }
  },

  async routeSegments(req, res) {
    try {
      const result = await OnBoardCommercialService.findByRoute({
        worker: req.worker,
        device_id: req.device_id,
        route_id: req.body.route_id,
      });

      return res.status(200).json(result);
    } catch (error) {
      const status = getErrorStatus(error);
      logger.error(`OnBoardRouteController->routeSegments: ${error.message}`);

      return res.status(status).json({
        error: status === 500 ? 'ServerError' : error.message,
        details:
          errorDetails[error.message] ||
          'Ocurrió un error al consultar la información comercial de la ruta. Intente nuevamente más tarde.',
      });
    }
  },
};

module.exports = OnBoardRouteController;
