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
    const priority = normalizeId(preference?.priority);

    if (!routeId || !priority) {
      throw new Error('OnBoardRoutePreferenceInvalid');
    }

    if (routeIds.has(routeId)) {
      throw new Error('OnBoardRoutePreferenceDuplicateRoute');
    }

    routeIds.add(routeId);
    return { routeId, priority };
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

const ensureRoutesExist = async (routeIds, branchId, transaction) => {
  if (routeIds.length === 0) {
    return;
  }

  const routes = await Route.findAll({
    where: {
      id: { [Op.in]: routeIds },
    },
    attributes: ['id'],
    transaction,
  });

  if (routes.length !== routeIds.length) {
    throw new Error('RouteNotFound');
  }

  const branchRoutes = await BranchRouteRepository.findByBranch(branchId, {
    transaction,
  });
  const availableRouteIds = new Set(
    branchRoutes.map((branchRoute) => Number(branchRoute.route_id))
  );

  if (routeIds.some((routeId) => !availableRouteIds.has(routeId))) {
    throw new Error('RouteNotAvailableForBranch');
  }
};

const OnBoardRoutePreferenceService = {
  async findByVehicle(vehicleId, branch_id) {
    const normalizedVehicleId = normalizeId(vehicleId);
    const normalizedBranchId = normalizeId(branch_id);
    const vehicle = normalizedVehicleId
      ? await Vehicle.findByPk(normalizedVehicleId)
      : null;

    if (!vehicle) {
      throw new Error('VehicleNotFound');
    }

    if (!normalizedBranchId) {
      throw new Error('BranchRequired');
    }

    const branch = await ensureBranchExists(normalizedBranchId);
    await ensureVehicleBelongsToBranch(
      normalizedVehicleId,
      normalizedBranchId
    );

    const preferences = await VehicleRoutePreferenceRepository.findByVehicle(
      normalizedVehicleId,
      normalizedBranchId
    );

    return { vehicle, branch, preferences };
  },

  async replace({ vehicle_id, branch_id, preferences }) {
    const vehicleId = normalizeId(vehicle_id);
    const branchId = normalizeId(branch_id);
    const normalizedPreferences = normalizePreferences(preferences);

    if (!vehicleId) {
      throw new Error('VehicleNotFound');
    }

    if (!branchId) {
      throw new Error('BranchRequired');
    }

    return sequelize.transaction(async (transaction) => {
      const vehicle = await Vehicle.findByPk(vehicleId, { transaction });
      if (!vehicle) {
        throw new Error('VehicleNotFound');
      }

      const branch = await ensureBranchExists(branchId, transaction);
      await ensureVehicleBelongsToBranch(vehicleId, branchId, transaction);

      const routeIds = normalizedPreferences.map((preference) => preference.routeId);
      await ensureRoutesExist(routeIds, branchId, transaction);

      const existingPreferences = await VehicleRoutePreferenceRepository.findByVehicle(
        vehicleId,
        branchId,
        { transaction, lock: transaction.LOCK.UPDATE }
      );
      const existingByRouteId = new Map(
        existingPreferences.map((preference) => [Number(preference.route_id), preference])
      );

      for (const preference of normalizedPreferences) {
        const existing = existingByRouteId.get(preference.routeId);

        if (existing) {
          await existing.update(
            { priority: preference.priority },
            { transaction }
          );
        } else {
          await VehicleRoutePreferenceRepository.create(
            {
              vehicle_id: vehicleId,
              branch_id: branchId,
              route_id: preference.routeId,
              priority: preference.priority,
            },
            { transaction }
          );
        }
      }

      await VehicleRoutePreferenceRepository.deleteNotIncluded(
        vehicleId,
        branchId,
        routeIds,
        { transaction }
      );

      const savedPreferences = await VehicleRoutePreferenceRepository.findByVehicle(
        vehicleId,
        branchId,
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
