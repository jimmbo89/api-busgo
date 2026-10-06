'use strict';

const logger = require('../../config/logger');
const OnBoardRoutePreferenceService = require('../services/OnBoardRoutePreferenceService');

const errorDetails = {
  VehicleNotFound: 'El vehículo indicado no existe.',
  BranchNotFound: 'La sucursal indicada no existe.',
  BranchRequired: 'La sucursal indicada no es válida.',
  VehicleNotAssociatedWithBranch:
    'El vehículo no está asociado a la sucursal indicada.',
  RouteNotFound: 'Una o más rutas indicadas no existen.',
  RouteNotAvailableForBranch:
    'Una o más rutas no están asociadas a la sucursal indicada.',
  RouteNotAvailableForVehicleBranches:
    'Una o más rutas no están asociadas a las sucursales del vehículo.',
  OnBoardRoutePreferencesInvalid:
    'Debe enviar una lista válida de preferencias para el vehículo.',
  OnBoardRoutePreferenceInvalid:
    'Cada preferencia debe indicar una ruta válida.',
  OnBoardRoutePreferenceDuplicateRoute:
    'No se puede repetir una ruta dentro de las preferencias del mismo vehículo.',
};

const getErrorStatus = (error) => {
  if (
    ['VehicleNotFound', 'BranchNotFound', 'RouteNotFound'].includes(error.message)
  ) {
    return 404;
  }

  if (
    error.message.startsWith('OnBoardRoutePreference') ||
    [
      'BranchRequired',
      'VehicleNotAssociatedWithBranch',
      'RouteNotAvailableForBranch',
      'RouteNotAvailableForVehicleBranches',
    ]
      .includes(error.message)
  ) {
    return 400;
  }

  return 500;
};

const mapRoute = (route) => (route
  ? {
      id: route.id,
      route_id: route.id,
      code: route.code,
      route_code: route.code,
      name: route.name,
      estimated: route.estimated,
      origin_id: route.origin_id,
      destination_id: route.destination_id,
      distance: route.distance,
      status: route.status,
      origin: route.origin
        ? {
            id: route.origin.id,
            address: route.origin.address,
            image: route.origin.image,
          }
        : null,
      destination: route.destination
        ? {
            id: route.destination.id,
            address: route.destination.address,
            image: route.destination.image,
          }
        : null,
    }
  : null);

const mapPreference = (preference) => ({
  id: preference.id,
  vehicle_id: preference.vehicle_id,
  route_id: preference.route_id,
  route: mapRoute(preference.route),
});

const mapResult = ({ vehicle, branch, preferences }) => ({
  vehicle: {
    id: vehicle.id,
    plate: vehicle.plate,
    internal_number: vehicle.internal_number,
  },
  branch: branch
    ? {
        id: branch.id,
        name: branch.name,
        image: branch.image,
        address: branch.address,
        company_id: branch.company_id,
      }
    : null,
  preferences: preferences.map(mapPreference),
});

const OnBoardRoutePreferenceController = {
  async byVehicle(req, res) {
    try {
      const result = await OnBoardRoutePreferenceService.findByVehicle(
        req.body.vehicle_id,
        req.body.branch_id
      );

      return res.status(200).json(mapResult(result));
    } catch (error) {
      const status = getErrorStatus(error);
      logger.error(`OnBoardRoutePreferenceController->byVehicle: ${error.message}`);

      return res.status(status).json({
        error: status === 500 ? 'Error interno del servidor' : 'No se pudieron consultar las preferencias de rutas.',
        details:
          errorDetails[error.message] ||
          'Ocurrió un error al consultar las preferencias de rutas. Intente nuevamente más tarde.',
      });
    }
  },

  async update(req, res) {
    try {
      const result = await OnBoardRoutePreferenceService.replace({
        vehicle_id: req.body.vehicle_id,
        branch_id: req.body.branch_id,
        preferences: req.body.preferences,
      });

      return res.status(200).json({
        msg: 'Las preferencias de rutas del vehículo fueron actualizadas correctamente.',
        ...mapResult(result),
      });
    } catch (error) {
      const status = getErrorStatus(error);
      logger.error(`OnBoardRoutePreferenceController->update: ${error.message}`);

      return res.status(status).json({
        error: status === 500 ? 'Error interno del servidor' : 'No se pudieron actualizar las preferencias de rutas.',
        details:
          errorDetails[error.message] ||
          'Ocurrió un error al actualizar las preferencias de rutas. Intente nuevamente más tarde.',
      });
    }
  },
};

module.exports = OnBoardRoutePreferenceController;
