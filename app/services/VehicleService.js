'use strict';

const { sequelize, Route } = require('../models');
const {
  BranchRepository,
  BranchVehicleRepository,
  VehicleRepository,
  BranchRouteRepository,
  VehicleRoutePreferenceRepository,
} = require('../repositories');

const normalizeId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const parseRoutePreferences = (routePreferences) => {
  if (routePreferences === undefined || routePreferences === null) {
    return [];
  }

  let parsedPreferences = routePreferences;
  if (typeof routePreferences === 'string') {
    try {
      parsedPreferences = JSON.parse(routePreferences);
    } catch (error) {
      throw new Error('VehicleRoutePreferenceActionsInvalid');
    }
  }

  if (!Array.isArray(parsedPreferences)) {
    throw new Error('VehicleRoutePreferenceActionsInvalid');
  }

  const operationKeys = new Set();

  return parsedPreferences.map((item) => {
    const routeId = normalizeId(item?.route_id);
    const associationId =
      item?.association_id === undefined ||
      item?.association_id === null ||
      item?.association_id === ''
        ? null
        : normalizeId(item.association_id);
    const vehicleId =
      item?.vehicle_id === undefined ||
      item?.vehicle_id === null ||
      item?.vehicle_id === ''
        ? null
        : normalizeId(item.vehicle_id);
    const action = String(item?.action || '').trim().toLowerCase();

    if (!routeId || !['associate', 'delete'].includes(action)) {
      throw new Error('VehicleRoutePreferenceActionInvalid');
    }

    if (action === 'associate' && associationId !== null) {
      throw new Error('VehicleRoutePreferenceAssociationIdNotAllowed');
    }

    if (action === 'delete' && !associationId) {
      throw new Error('VehicleRoutePreferenceAssociationIdRequired');
    }

    const operationKey = associationId
      ? `association:${associationId}`
      : `${action}:${routeId}`;

    if (operationKeys.has(operationKey)) {
      throw new Error('VehicleRoutePreferenceDuplicateOperation');
    }
    operationKeys.add(operationKey);

    return {
      associationId,
      vehicleId,
      routeId,
      action,
    };
  });
};

const normalizeOperations = (branches) => {
  if (branches === undefined || branches === null) {
    return [];
  }

  let parsedBranches = branches;
  if (typeof branches === 'string') {
    try {
      parsedBranches = JSON.parse(branches);
    } catch (error) {
      throw new Error('VehicleBranchActionsInvalid');
    }
  }

  if (!Array.isArray(parsedBranches)) {
    throw new Error('VehicleBranchActionsInvalid');
  }

  const branchIds = new Set();

  return parsedBranches.map((item) => {
    const branchId = normalizeId(item?.branch_id);
    const associationId =
      item?.association_id === undefined ||
      item?.association_id === null ||
      item?.association_id === ''
        ? null
        : normalizeId(item.association_id);
    const action = String(item?.action || '').trim().toLowerCase();

    if (!branchId || !['associate', 'delete'].includes(action)) {
      throw new Error('VehicleBranchActionInvalid');
    }

    if (branchIds.has(branchId)) {
      throw new Error('VehicleBranchDuplicateOperation');
    }
    branchIds.add(branchId);

    if (action === 'associate' && associationId !== null) {
      throw new Error('VehicleBranchAssociationIdNotAllowed');
    }

    if (action === 'delete' && !associationId) {
      throw new Error('VehicleBranchAssociationIdRequired');
    }

    return { branchId, associationId, action };
  });
};

const ensureBranchesExist = async (operations, transaction) => {
  const branches = await Promise.all(
    operations.map((operation) =>
      BranchRepository.findById(operation.branchId, { transaction })
    )
  );

  if (branches.some((branch) => !branch)) {
    throw new Error('BranchNotFound');
  }
};

const validateCreateOperations = (operations) => {
  if (operations.some((operation) => operation.action !== 'associate')) {
    throw new Error('VehicleBranchCreateActionInvalid');
  }

  if (operations.some((operation) => operation.associationId !== null)) {
    throw new Error('VehicleBranchAssociationIdNotAllowed');
  }
};

const validateCreatePreferenceOperations = (operations) => {
  if (operations.some((operation) => operation.action !== 'associate')) {
    throw new Error('VehicleRoutePreferenceCreateActionInvalid');
  }

  if (operations.some((operation) => operation.associationId !== null)) {
    throw new Error('VehicleRoutePreferenceAssociationIdNotAllowed');
  }
};

const validateUpdateOperations = ({ operations, existingRelations }) => {
  const relationById = new Map(
    existingRelations.map((relation) => [Number(relation.id), relation])
  );
  const branchIdsWithRelations = new Set(
    existingRelations.map((relation) => Number(relation.branch_id))
  );

  operations.forEach((operation) => {
    if (operation.action === 'associate') {
      if (branchIdsWithRelations.has(operation.branchId)) {
        throw new Error('VehicleBranchAlreadyAssociated');
      }
      return;
    }

    const relation = relationById.get(operation.associationId);
    if (!relation) {
      throw new Error('VehicleBranchAssociationNotFound');
    }

    if (Number(relation.branch_id) !== operation.branchId) {
      throw new Error('VehicleBranchAssociationBranchMismatch');
    }
  });
};

const applyCreateOperations = async ({ vehicleId, operations, transaction }) => {
  for (const operation of operations) {
    await BranchVehicleRepository.create(
      {
        branch_id: operation.branchId,
        vehicle_id: vehicleId,
      },
      { transaction }
    );
  }
};

const applyUpdateOperations = async ({
  vehicleId,
  operations,
  existingRelations,
  transaction,
}) => {
  if (operations.length === 0) {
    return;
  }

  validateUpdateOperations({ operations, existingRelations });

  const relationById = new Map(
    existingRelations.map((relation) => [Number(relation.id), relation])
  );

  for (const operation of operations.filter((item) => item.action === 'delete')) {
    await BranchVehicleRepository.delete(
      relationById.get(operation.associationId),
      { transaction }
    );
  }

  for (const operation of operations.filter((item) => item.action === 'associate')) {
    await BranchVehicleRepository.create(
      {
        branch_id: operation.branchId,
        vehicle_id: vehicleId,
      },
      { transaction }
    );
  }
};

const getFinalBranchIds = (existingRelations, operations) => {
  const branchIds = new Set(
    existingRelations.map((relation) => Number(relation.branch_id))
  );

  operations.forEach((operation) => {
    if (operation.action === 'delete') {
      branchIds.delete(operation.branchId);
    } else {
      branchIds.add(operation.branchId);
    }
  });

  return branchIds;
};

const ensureRoutesAvailableForVehicleBranches = async ({
  routeIds,
  branchIds,
  transaction,
}) => {
  const uniqueRouteIds = [...new Set(routeIds)];
  if (uniqueRouteIds.length === 0) {
    return;
  }

  const routes = await Route.findAll({
    where: { id: uniqueRouteIds },
    attributes: ['id'],
    transaction,
  });

  if (routes.length !== uniqueRouteIds.length) {
    throw new Error('VehicleRoutePreferenceRouteNotFound');
  }

  const branchRoutes = await BranchRouteRepository.findByBranches(
    [...branchIds],
    { transaction }
  );
  const availableRouteIds = new Set(
    branchRoutes.map((branchRoute) => Number(branchRoute.route_id))
  );

  if (uniqueRouteIds.some((routeId) => !availableRouteIds.has(routeId))) {
    throw new Error('VehicleRoutePreferenceRouteNotAvailableForBranch');
  }
};

const validatePreferenceOperations = async ({
  vehicleId,
  operations,
  existingPreferences,
  finalBranchIds,
  transaction,
}) => {
  const preferenceById = new Map(
    existingPreferences.map((preference) => [Number(preference.id), preference])
  );

  operations.forEach((operation) => {
    if (operation.vehicleId !== null && operation.vehicleId !== vehicleId) {
      throw new Error('VehicleRoutePreferenceVehicleIdMismatch');
    }
  });

  for (const operation of operations.filter((item) => item.action === 'delete')) {
    const existing = preferenceById.get(operation.associationId);
    if (!existing) {
      throw new Error('VehicleRoutePreferenceAssociationNotFound');
    }

    if (Number(existing.route_id) !== operation.routeId) {
      throw new Error('VehicleRoutePreferenceAssociationMismatch');
    }

  }

  await ensureRoutesAvailableForVehicleBranches({
    routeIds: operations
      .filter((item) => item.action === 'associate')
      .map((operation) => operation.routeId),
    branchIds: finalBranchIds,
    transaction,
  });

};

const applyPreferenceOperations = async ({
  vehicleId,
  operations,
  transaction,
}) => {
  for (const operation of operations.filter((item) => item.action === 'delete')) {
    await VehicleRoutePreferenceRepository.deleteById(
      operation.associationId,
      vehicleId,
      { transaction }
    );
  }

  for (const operation of operations.filter((item) => item.action === 'associate')) {
    const existing = await VehicleRoutePreferenceRepository.findByVehicleAndRoute(
      vehicleId,
      operation.routeId,
      { transaction, lock: transaction.LOCK.UPDATE }
    );

    if (!existing) {
      await VehicleRoutePreferenceRepository.create(
        {
          vehicle_id: vehicleId,
          route_id: operation.routeId,
          branch_id: null,
          priority: null,
        },
        { transaction }
      );
    }
  }
};

const getVehiclePreferences = (vehicleId, transaction) =>
  VehicleRoutePreferenceRepository.findByVehicle(vehicleId, { transaction });

const getBranchRoutes = (branchVehicles, transaction) =>
  BranchRouteRepository.findByBranches(
    branchVehicles.map((relation) => Number(relation.branch_id)),
    { transaction }
  );

const VehicleService = {
  async create({ body, file }) {
    const operations = normalizeOperations(body.branches);
    const preferenceOperations = parseRoutePreferences(body.route_preferences);
    validateCreateOperations(operations);
    validateCreatePreferenceOperations(preferenceOperations);

    return sequelize.transaction(async (transaction) => {
      await ensureBranchesExist(operations, transaction);

      const vehicle = await VehicleRepository.create(body, file, {
        transaction,
      });

      await applyCreateOperations({
        vehicleId: vehicle.id,
        operations,
        transaction,
      });

      const branchVehicles = await BranchVehicleRepository.findByVehicle(
        vehicle.id,
        { transaction }
      );
      const finalBranchIds = new Set(
        branchVehicles.map((relation) => Number(relation.branch_id))
      );
      await validatePreferenceOperations({
        vehicleId: Number(vehicle.id),
        operations: preferenceOperations,
        existingPreferences: [],
        finalBranchIds,
        transaction,
      });

      await applyPreferenceOperations({
        vehicleId: vehicle.id,
        operations: preferenceOperations,
        transaction,
      });

      const savedBranchVehicles = await BranchVehicleRepository.findByVehicles(
        [vehicle.id],
        { transaction }
      );
      const branchRoutes = await getBranchRoutes(savedBranchVehicles, transaction);
      const preferences = await getVehiclePreferences(vehicle.id, transaction);

      return {
        vehicle,
        branchVehicles: savedBranchVehicles,
        branchRoutes,
        preferences,
      };
    });
  },

  async update({ id, body, file }) {
    const operations = normalizeOperations(body.branches);
    const preferenceOperations = parseRoutePreferences(body.route_preferences);

    return sequelize.transaction(async (transaction) => {
      const vehicle = await VehicleRepository.findById(id, { transaction });
      if (!vehicle) {
        throw new Error('VehicleNotFound');
      }

      await ensureBranchesExist(operations, transaction);

      const existingRelations = await BranchVehicleRepository.findByVehicle(
        vehicle.id,
        { transaction }
      );

      validateUpdateOperations({ operations, existingRelations });

      const finalBranchIds = getFinalBranchIds(existingRelations, operations);
      const existingPreferences = await getVehiclePreferences(
        vehicle.id,
        transaction
      );
      await validatePreferenceOperations({
        vehicleId: Number(vehicle.id),
        operations: preferenceOperations,
        existingPreferences,
        finalBranchIds,
        transaction,
      });

      await applyUpdateOperations({
        vehicleId: vehicle.id,
        operations,
        existingRelations,
        transaction,
      });

      await applyPreferenceOperations({
        vehicleId: vehicle.id,
        operations: preferenceOperations,
        transaction,
      });

      const updatedVehicle = await VehicleRepository.update(
        vehicle,
        body,
        file,
        { transaction }
      );
      const branchVehicles = await BranchVehicleRepository.findByVehicles(
        [vehicle.id],
        { transaction }
      );
      const branchRoutes = await getBranchRoutes(branchVehicles, transaction);
      const preferences = await getVehiclePreferences(vehicle.id, transaction);

      return { vehicle: updatedVehicle, branchVehicles, branchRoutes, preferences };
    });
  },
};

module.exports = VehicleService;
