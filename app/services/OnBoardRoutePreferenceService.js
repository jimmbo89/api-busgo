'use strict';

const { Op } = require('sequelize');
const { sequelize, Vehicle, Route, Branch } = require('../models');
const {
  VehicleRoutePreferenceRepository,
  BranchVehicleRepository,
  BranchRouteRepository,
} = require('../repositories');

const normalizeId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const normalizePreferences = (preferences) => {
  if (!Array.isArray(preferences)) {
    throw new Error('OnBoardRoutePreferencesInvalid');
  }

  const routeIds = new Set();

  return preferences.map((preference) => {
    const routeId = normalizeId(preference?.route_id);

    if (!routeId) {
      throw new Error('OnBoardRoutePreferenceInvalid');
    }

    if (routeIds.has(routeId)) {
      throw new Error('OnBoardRoutePreferenceDuplicateRoute');
    }

    routeIds.add(routeId);
    return { routeId };
  });
};

const ensureBranchExists = async (branchId, transaction) => {
  const branch = await Branch.findByPk(branchId, { transaction });
  if (!branch) {
    throw new Error('BranchNotFound');
  }

  return branch;
};

const ensureVehicleBelongsToBranch = async (vehicleId, branchId, transaction) => {
  const branchVehicles = await BranchVehicleRepository.findByVehicle(
    vehicleId,
    { transaction }
  );

  if (!branchVehicles.some((relation) => Number(relation.branch_id) === branchId)) {
    throw new Error('VehicleNotAssociatedWithBranch');
  }
};

const ensureRoutesExist = async (routeIds, vehicleId, transaction) => {
  if (routeIds.length === 0) {
    return;
  }

  const routes = await Route.findAll({
    where: { id: { [Op.in]: routeIds } },
    attributes: ['id'],
    transaction,
  });

  if (routes.length !== routeIds.length) {
    throw new Error('RouteNotFound');
  }

  const branchVehicles = await BranchVehicleRepository.findByVehicle(
    vehicleId,
    { transaction }
  );
  const branchIds = branchVehicles.map((relation) => Number(relation.branch_id));
  const branchRoutes = await BranchRouteRepository.findByBranches(branchIds, {
    transaction,
  });
  const availableRouteIds = new Set(
    branchRoutes.map((branchRoute) => Number(branchRoute.route_id))
  );

  if (routeIds.some((routeId) => !availableRouteIds.has(routeId))) {
    throw new Error('RouteNotAvailableForVehicleBranches');
  }
};

const OnBoardRoutePreferenceService = {
  async findByVehicle(vehicleId, branch_id) {
    const normalizedVehicleId = normalizeId(vehicleId);
    const normalizedBranchId =
      branch_id === undefined || branch_id === null ? null : normalizeId(branch_id);
    const vehicle = normalizedVehicleId
      ? await Vehicle.findByPk(normalizedVehicleId)
      : null;

    if (!vehicle) {
      throw new Error('VehicleNotFound');
    }

    let branch = null;
    if (branch_id !== undefined && branch_id !== null) {
      if (!normalizedBranchId) {
        throw new Error('BranchRequired');
      }

      branch = await ensureBranchExists(normalizedBranchId);
      await ensureVehicleBelongsToBranch(normalizedVehicleId, normalizedBranchId);
    }

    const preferences = await VehicleRoutePreferenceRepository.findByVehicle(
      normalizedVehicleId
    );

    return { vehicle, branch, preferences };
  },

  async replace({ vehicle_id, branch_id, preferences }) {
    const vehicleId = normalizeId(vehicle_id);
    const normalizedBranchId =
      branch_id === undefined || branch_id === null ? null : normalizeId(branch_id);
    const normalizedPreferences = normalizePreferences(preferences);

    if (!vehicleId) {
      throw new Error('VehicleNotFound');
    }

    if (branch_id !== undefined && branch_id !== null && !normalizedBranchId) {
      throw new Error('BranchRequired');
    }

    return sequelize.transaction(async (transaction) => {
      const vehicle = await Vehicle.findByPk(vehicleId, { transaction });
      if (!vehicle) {
        throw new Error('VehicleNotFound');
      }

      let branch = null;
      if (normalizedBranchId) {
        branch = await ensureBranchExists(normalizedBranchId, transaction);
        await ensureVehicleBelongsToBranch(vehicleId, normalizedBranchId, transaction);
      }

      const routeIds = normalizedPreferences.map((preference) => preference.routeId);
      await ensureRoutesExist(routeIds, vehicleId, transaction);

      const existingPreferences = await VehicleRoutePreferenceRepository.findByVehicle(
        vehicleId,
        { transaction, lock: transaction.LOCK.UPDATE }
      );
      const existingByRouteId = new Map(
        existingPreferences.map((preference) => [Number(preference.route_id), preference])
      );

      for (const preference of normalizedPreferences) {
        if (!existingByRouteId.has(preference.routeId)) {
          await VehicleRoutePreferenceRepository.create(
            {
              vehicle_id: vehicleId,
              route_id: preference.routeId,
              branch_id: null,
              priority: null,
            },
            { transaction }
          );
        }
      }

      await VehicleRoutePreferenceRepository.deleteNotIncluded(
        vehicleId,
        routeIds,
        { transaction }
      );

      const savedPreferences = await VehicleRoutePreferenceRepository.findByVehicle(
        vehicleId,
        { transaction }
      );

      return {
        vehicle,
        branch,
        preferences: savedPreferences,
      };
    });
  },
};

module.exports = OnBoardRoutePreferenceService;
