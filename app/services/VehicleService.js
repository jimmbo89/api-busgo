'use strict';

const { Transaction } = require('sequelize');
const { sequelize, Route } = require('../models');
const {
  BranchRepository,
  BranchVehicleRepository,
  DeviceRepository,
  DeviceVehicleRepository,
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

const updateLock = Transaction.LOCK.UPDATE;

const parseDeviceOperations = (devices) => {
  if (devices === undefined || devices === null) {
    return [];
  }

  let parsedDevices = devices;
  if (typeof devices === 'string') {
    try {
      parsedDevices = JSON.parse(devices);
    } catch (error) {
      throw new Error('VehicleDeviceActionsInvalid');
    }
  }

  if (!Array.isArray(parsedDevices)) {
    throw new Error('VehicleDeviceActionsInvalid');
  }

  const deviceIds = new Set();

  return parsedDevices.map((item) => {
    const deviceId = normalizeId(item?.device_id);
    const hasAssociationId =
      item?.association_id !== undefined &&
      item?.association_id !== null &&
      item?.association_id !== '';
    const associationId =
      item?.association_id === undefined ||
      item?.association_id === null ||
      item?.association_id === ''
        ? null
        : normalizeId(item.association_id);
    const hasVehicleId =
      item?.vehicle_id !== undefined &&
      item?.vehicle_id !== null &&
      item?.vehicle_id !== '';
    const vehicleId =
      item?.vehicle_id === undefined ||
      item?.vehicle_id === null ||
      item?.vehicle_id === ''
        ? null
        : normalizeId(item.vehicle_id);
    const action = String(item?.action || '').trim().toLowerCase();

    if (!deviceId || !['associate', 'delete'].includes(action)) {
      throw new Error('VehicleDeviceActionInvalid');
    }

    if (hasAssociationId && !associationId) {
      throw new Error('VehicleDeviceAssociationIdInvalid');
    }

    if (hasVehicleId && !vehicleId) {
      throw new Error('VehicleDeviceVehicleIdInvalid');
    }

    if (deviceIds.has(deviceId)) {
      throw new Error('VehicleDeviceDuplicateOperation');
    }
    deviceIds.add(deviceId);

    if (action === 'associate' && associationId !== null) {
      throw new Error('VehicleDeviceAssociationIdNotAllowed');
    }

    if (action === 'delete' && !associationId) {
      throw new Error('VehicleDeviceAssociationIdRequired');
    }

    return { deviceId, associationId, vehicleId, action };
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

const validateCreateDeviceOperations = (operations) => {
  if (operations.some((operation) => operation.action !== 'associate')) {
    throw new Error('VehicleDeviceCreateActionInvalid');
  }

  if (operations.some((operation) => operation.associationId !== null)) {
    throw new Error('VehicleDeviceAssociationIdNotAllowed');
  }

  if (operations.some((operation) => operation.vehicleId !== null)) {
    throw new Error('VehicleDeviceVehicleIdNotAllowed');
  }
};

const validateDeviceVehicleIds = (vehicleId, operations) => {
  operations.forEach((operation) => {
    if (operation.vehicleId !== null && operation.vehicleId !== vehicleId) {
      throw new Error('VehicleDeviceVehicleIdMismatch');
    }
  });
};

const createDeviceConflictError = (deviceId, relation) => {
  const error = new Error('VehicleDeviceAlreadyAssociated');
  error.deviceId = deviceId;
  error.assignedVehicleId = Number(relation.vehicle_id);
  error.assignedVehiclePlate = relation.vehicle?.plate || null;
  return error;
};

const validateDeviceOperations = async ({
  vehicleId,
  operations,
  finalBranchIds,
  existingRelations = [],
  transaction,
}) => {
  if (operations.length === 0) {
    return new Map();
  }

  const associationOperations = operations.filter(
    (operation) => operation.action === 'associate'
  );

  if (associationOperations.length > 0 && finalBranchIds.size === 0) {
    throw new Error('VehicleDevicesRequireBranch');
  }

  validateDeviceVehicleIds(vehicleId, operations);

  const relationById = new Map(
    existingRelations.map((relation) => [Number(relation.id), relation])
  );
  operations
    .filter((operation) => operation.action === 'delete')
    .forEach((operation) => {
      const relation = relationById.get(operation.associationId);
      if (!relation) {
        throw new Error('VehicleDeviceAssociationNotFound');
      }

      if (Number(relation.vehicle_id) !== vehicleId) {
        throw new Error('VehicleDeviceAssociationVehicleMismatch');
      }

      if (Number(relation.device_id) !== operation.deviceId) {
        throw new Error('VehicleDeviceAssociationDeviceMismatch');
      }
    });

  const deviceIds = [...new Set(operations.map((operation) => operation.deviceId))];
  const devices = await DeviceRepository.findByIds(deviceIds, {
    transaction,
    lock: updateLock,
  });
  const deviceById = new Map(
    devices.map((device) => [Number(device.id), device])
  );

  for (const deviceId of deviceIds) {
    if (!deviceById.has(deviceId)) {
      const error = new Error('VehicleDeviceNotFound');
      error.deviceId = deviceId;
      throw error;
    }
  }

  const existingDeviceRelations = await DeviceVehicleRepository.findByDevices(
    deviceIds,
    { transaction, lock: updateLock }
  );
  const relationByDeviceId = new Map();
  existingDeviceRelations.forEach((relation) => {
    const deviceId = Number(relation.device_id);
    if (!relationByDeviceId.has(deviceId)) {
      relationByDeviceId.set(deviceId, relation);
    }
  });

  for (const operation of associationOperations) {
    const device = deviceById.get(operation.deviceId);
    const deviceBranchId = normalizeId(device.branch_id);

    if (!finalBranchIds.has(deviceBranchId)) {
      const error = new Error('VehicleDeviceBranchNotAvailable');
      error.deviceId = operation.deviceId;
      error.branchId = deviceBranchId;
      throw error;
    }

    const existingRelation = relationByDeviceId.get(operation.deviceId);
    if (existingRelation) {
      throw createDeviceConflictError(operation.deviceId, existingRelation);
    }
  }

  return deviceById;
};

const deleteDeviceRelation = async (relation, transaction) => {
  if (relation.active) {
    await DeviceVehicleRepository.update(
      relation,
      { active: false },
      { transaction }
    );
  }

  await DeviceVehicleRepository.delete(relation, { transaction });
};

const applyCreateDeviceOperations = async ({
  vehicleId,
  operations,
  deviceById,
  transaction,
}) => {
  for (const operation of operations) {
    const device = deviceById.get(operation.deviceId);
    await DeviceVehicleRepository.create(
      {
        device_id: operation.deviceId,
        vehicle_id: vehicleId,
        branch_id: device.branch_id,
        active: true,
      },
      { transaction }
    );
  }
};

const applyUpdateDeviceOperations = async ({
  operations,
  relationById,
  deviceById,
  vehicleId,
  transaction,
}) => {
  for (const operation of operations) {
    const relation = relationById.get(operation.associationId);

    if (operation.action === 'delete') {
      await deleteDeviceRelation(relation, transaction);
      continue;
    }

    const device = deviceById.get(operation.deviceId);
    await DeviceVehicleRepository.create(
      {
        device_id: operation.deviceId,
        vehicle_id: vehicleId,
        branch_id: device.branch_id,
        active: true,
      },
      { transaction }
    );
  }
};

const getAutomaticallyClearedDeviceRelations = ({
  existingRelations,
  finalBranchIds,
  explicitDeleteIds,
}) => existingRelations.filter((relation) => {
  if (explicitDeleteIds.has(Number(relation.id))) {
    return false;
  }

  const deviceBranchId = normalizeId(
    relation.device?.branch_id ?? relation.branch_id
  );
  return !finalBranchIds.has(deviceBranchId);
});

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

const getVehicleDevices = (vehicleId, transaction) =>
  DeviceVehicleRepository.findByVehicles([vehicleId], {
    transaction,
    where: { active: true },
  });

const getBranchRoutes = (branchVehicles, transaction) =>
  BranchRouteRepository.findByBranches(
    branchVehicles.map((relation) => Number(relation.branch_id)),
    { transaction }
  );

const VehicleService = {
  async create({ body, file }) {
    const operations = normalizeOperations(body.branches);
    const deviceOperations = parseDeviceOperations(body.devices);
    const preferenceOperations = parseRoutePreferences(body.route_preferences);
    validateCreateOperations(operations);
    validateCreateDeviceOperations(deviceOperations);
    validateCreatePreferenceOperations(preferenceOperations);

    if (deviceOperations.length > 0 && operations.length === 0) {
      throw new Error('VehicleDevicesRequireBranch');
    }

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
      const deviceById = await validateDeviceOperations({
        vehicleId: Number(vehicle.id),
        operations: deviceOperations,
        finalBranchIds,
        transaction,
      });
      await applyCreateDeviceOperations({
        vehicleId: vehicle.id,
        operations: deviceOperations,
        deviceById,
        transaction,
      });
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
      const devices = await getVehicleDevices(vehicle.id, transaction);

      return {
        vehicle,
        branchVehicles: savedBranchVehicles,
        branchRoutes,
        preferences,
        devices,
        clearedDeviceIds: [],
      };
    });
  },

  async update({ id, body, file }) {
    const operations = normalizeOperations(body.branches);
    const deviceOperations = parseDeviceOperations(body.devices);
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
      const existingDeviceRelations = await DeviceVehicleRepository.findByVehicle(
        vehicle.id,
        { transaction, lock: updateLock }
      );
      const deviceById = await validateDeviceOperations({
        vehicleId: Number(vehicle.id),
        operations: deviceOperations,
        finalBranchIds,
        existingRelations: existingDeviceRelations,
        transaction,
      });
      const relationByDeviceAssociationId = new Map(
        existingDeviceRelations.map((relation) => [Number(relation.id), relation])
      );
      const explicitDeleteIds = new Set(
        deviceOperations
          .filter((operation) => operation.action === 'delete')
          .map((operation) => operation.associationId)
      );
      const automaticallyClearedRelations = getAutomaticallyClearedDeviceRelations({
        existingRelations: existingDeviceRelations,
        finalBranchIds,
        explicitDeleteIds,
      });
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

      for (const relation of automaticallyClearedRelations) {
        await deleteDeviceRelation(relation, transaction);
      }
      await applyUpdateDeviceOperations({
        operations: deviceOperations,
        relationById: relationByDeviceAssociationId,
        deviceById,
        vehicleId: vehicle.id,
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
      const devices = await getVehicleDevices(vehicle.id, transaction);

      return {
        vehicle: updatedVehicle,
        branchVehicles,
        branchRoutes,
        preferences,
        devices,
        clearedDeviceIds: [
          ...new Set(
            automaticallyClearedRelations.map(
              (relation) => Number(relation.device_id)
            )
          ),
        ],
      };
    });
  },
};

module.exports = VehicleService;
