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
    const branchId = normalizeId(item?.branch_id);
    const routeId = normalizeId(item?.route_id);
    const priority = normalizeId(item?.priority);
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

    if (
      !branchId ||
      !routeId ||
      !priority ||
      priority > 3 ||
      !['associate', 'update', 'delete'].includes(action)
    ) {
      throw new Error('VehicleRoutePreferenceActionInvalid');
    }

    if (action === 'associate' && associationId !== null) {
      throw new Error('VehicleRoutePreferenceAssociationIdNotAllowed');
    }

    if (['update', 'delete'].includes(action) && !associationId) {
      throw new Error('VehicleRoutePreferenceAssociationIdRequired');
    }

    const operationKey = associationId
      ? `association:${associationId}`
      : `${action}:${branchId}:${routeId}`;

    if (operationKeys.has(operationKey)) {
      throw new Error('VehicleRoutePreferenceDuplicateOperation');
    }
    operationKeys.add(operationKey);

    return {
      associationId,
      vehicleId,
      branchId,
      routeId,
      priority,
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

const ensureBranchesExist = async (operations) => {
  const branches = await Promise.all(
    operations.map((operation) => BranchRepository.findById(operation.branchId))
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

const ensurePreferenceBranchesExist = async (operations) => {
  const branchIds = [...new Set(operations.map((operation) => operation.branchId))];
  const branches = await Promise.all(
    branchIds.map((branchId) => BranchRepository.findById(branchId))
  );

  if (branches.some((branch) => !branch)) {
    throw new Error('BranchNotFound');
  }
};

const ensureRouteAvailableForBranch = async ({
  routeId,
  branchId,
  transaction,
  availableRoutesByBranch,
}) => {
  const route = await Route.findByPk(routeId, { transaction });
  if (!route) {
    throw new Error('VehicleRoutePreferenceRouteNotFound');
  }

  if (!availableRoutesByBranch.has(branchId)) {
    const branchRoutes = await BranchRouteRepository.findByBranch(branchId, {
      transaction,
    });
    availableRoutesByBranch.set(
      branchId,
      new Set(branchRoutes.map((branchRoute) => Number(branchRoute.route_id)))
    );
  }

  if (!availableRoutesByBranch.get(branchId).has(routeId)) {
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

  if (operations.length === 0) {
    return { preferenceById };
  }

  await ensurePreferenceBranchesExist(operations);

  operations.forEach((operation) => {
    if (operation.vehicleId !== null && operation.vehicleId !== vehicleId) {
      throw new Error('VehicleRoutePreferenceVehicleIdMismatch');
    }
  });

  const finalByKey = new Map();
  existingPreferences.forEach((preference) => {
    const branchId = Number(preference.branch_id);
    if (finalBranchIds.has(branchId)) {
      finalByKey.set(`${branchId}:${Number(preference.route_id)}`, {
        branchId,
        routeId: Number(preference.route_id),
        priority: Number(preference.priority),
        associationId: Number(preference.id),
      });
    }
  });

  const availableRoutesByBranch = new Map();

  for (const operation of operations.filter((item) => item.action === 'delete')) {
    const existing = preferenceById.get(operation.associationId);
    if (!existing) {
      throw new Error('VehicleRoutePreferenceAssociationNotFound');
    }

    if (
      Number(existing.branch_id) !== operation.branchId ||
      Number(existing.route_id) !== operation.routeId
    ) {
      throw new Error('VehicleRoutePreferenceAssociationMismatch');
    }

    finalByKey.delete(`${operation.branchId}:${operation.routeId}`);
  }

  for (const operation of operations.filter((item) => item.action === 'update')) {
    const existing = preferenceById.get(operation.associationId);
    if (!existing) {
      throw new Error('VehicleRoutePreferenceAssociationNotFound');
    }

    if (
      Number(existing.branch_id) !== operation.branchId ||
      Number(existing.route_id) !== operation.routeId
    ) {
      throw new Error('VehicleRoutePreferenceAssociationMismatch');
    }

    if (!finalBranchIds.has(operation.branchId)) {
      throw new Error('VehicleRoutePreferenceBranchNotAssociated');
    }

    await ensureRouteAvailableForBranch({
      routeId: operation.routeId,
      branchId: operation.branchId,
      transaction,
      availableRoutesByBranch,
    });

    finalByKey.set(`${operation.branchId}:${operation.routeId}`, {
      branchId: operation.branchId,
      routeId: operation.routeId,
      priority: operation.priority,
      associationId: operation.associationId,
    });
  }

  for (const operation of operations.filter((item) => item.action === 'associate')) {
    if (!finalBranchIds.has(operation.branchId)) {
      throw new Error('VehicleRoutePreferenceBranchNotAssociated');
    }

    await ensureRouteAvailableForBranch({
      routeId: operation.routeId,
      branchId: operation.branchId,
      transaction,
      availableRoutesByBranch,
    });

    const key = `${operation.branchId}:${operation.routeId}`;
    if (finalByKey.has(key)) {
      throw new Error('VehicleRoutePreferenceAlreadyAssociated');
    }

    finalByKey.set(key, {
      branchId: operation.branchId,
      routeId: operation.routeId,
      priority: operation.priority,
      associationId: null,
    });
  }

  const routesByBranch = new Map();
  const prioritiesByBranch = new Map();

  finalByKey.forEach((preference) => {
    const routes = routesByBranch.get(preference.branchId) || new Set();
    routes.add(preference.routeId);
    routesByBranch.set(preference.branchId, routes);

    const priorities = prioritiesByBranch.get(preference.branchId) || new Set();
    if (priorities.has(preference.priority)) {
      throw new Error('VehicleRoutePreferencePriorityDuplicate');
    }
    priorities.add(preference.priority);
    prioritiesByBranch.set(preference.branchId, priorities);
  });

  routesByBranch.forEach((routes) => {
    if (routes.size > 3) {
      throw new Error('VehicleRoutePreferenceMaxRoutesExceeded');
    }
  });

  return { preferenceById };
};

const applyPreferenceOperations = async ({
  vehicleId,
  operations,
  preferenceById,
  transaction,
}) => {
  for (const operation of operations.filter((item) => item.action === 'delete')) {
    await VehicleRoutePreferenceRepository.deleteById(
      operation.associationId,
      vehicleId,
      { transaction }
    );
  }

  const updateOperations = operations.filter((item) => item.action === 'update');

  // Usar valores temporales evita conflictos al intercambiar prioridades (1 <-> 2)
  // si la base de datos aplica una restricción única por sucursal.
  for (const [index, operation] of updateOperations.entries()) {
    const preference = preferenceById.get(operation.associationId);
    await preference.update(
      { priority: 1000 + index + 1 },
      { transaction }
    );
  }

  for (const operation of updateOperations) {
    const preference = preferenceById.get(operation.associationId);
    await preference.update(
      { priority: operation.priority },
      { transaction }
    );
  }

  for (const operation of operations.filter((item) => item.action === 'associate')) {
    await VehicleRoutePreferenceRepository.create(
      {
        vehicle_id: vehicleId,
        branch_id: operation.branchId,
        route_id: operation.routeId,
        priority: operation.priority,
      },
      { transaction }
    );
  }
};

const getVehiclePreferences = (vehicleId, transaction) =>
  VehicleRoutePreferenceRepository.findByVehicle(
    vehicleId,
    { transaction }
  );

const VehicleService = {
  async create({ body, file }) {
    const operations = normalizeOperations(body.branches);
    const preferenceOperations = parseRoutePreferences(body.route_preferences);
    validateCreateOperations(operations);
    validateCreatePreferenceOperations(preferenceOperations);

    return sequelize.transaction(async (transaction) => {
      await ensureBranchesExist(operations);

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
      const existingPreferences = [];
      const { preferenceById } = await validatePreferenceOperations({
        vehicleId: Number(vehicle.id),
        operations: preferenceOperations,
        existingPreferences,
        finalBranchIds,
        transaction,
      });

      await applyPreferenceOperations({
        vehicleId: vehicle.id,
        operations: preferenceOperations,
        preferenceById,
        transaction,
      });

      const savedBranchVehicles = await BranchVehicleRepository.findByVehicle(
        vehicle.id,
        { transaction }
      );
      const preferences = await getVehiclePreferences(vehicle.id, transaction);

      return { vehicle, branchVehicles: savedBranchVehicles, preferences };
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

      await ensureBranchesExist(operations);

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
      const { preferenceById } = await validatePreferenceOperations({
        vehicleId: Number(vehicle.id),
        operations: preferenceOperations,
        existingPreferences,
        finalBranchIds,
        transaction,
      });

      for (const operation of operations.filter((item) => item.action === 'delete')) {
        await VehicleRoutePreferenceRepository.deleteByVehicleBranch(
          vehicle.id,
          operation.branchId,
          { transaction }
        );
      }

      await applyUpdateOperations({
        vehicleId: vehicle.id,
        operations,
        existingRelations,
        transaction,
      });

      await applyPreferenceOperations({
        vehicleId: vehicle.id,
        operations: preferenceOperations,
        preferenceById,
        transaction,
      });

      const updatedVehicle = await VehicleRepository.update(
        vehicle,
        body,
        file,
        { transaction }
      );
      const branchVehicles = await BranchVehicleRepository.findByVehicle(
        vehicle.id,
        { transaction }
      );
      const preferences = await getVehiclePreferences(vehicle.id, transaction);

      return { vehicle: updatedVehicle, branchVehicles, preferences };
    });
  },
};

module.exports = VehicleService;
