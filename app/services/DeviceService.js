'use strict';

const { sequelize } = require('../models');
const {
  BranchVehicleRepository,
  DeviceRepository,
  DeviceVehicleRepository,
} = require('../repositories');

const normalizeId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const isActive = (value) => value === true || Number(value) === 1;

const normalizeOperations = (vehicles) => {
  if (vehicles === undefined || vehicles === null) {
    return [];
  }

  let parsedVehicles = vehicles;
  if (typeof vehicles === 'string') {
    try {
      parsedVehicles = JSON.parse(vehicles);
    } catch (error) {
      throw new Error('DeviceVehicleActionsInvalid');
    }
  }

  if (!Array.isArray(parsedVehicles)) {
    throw new Error('DeviceVehicleActionsInvalid');
  }

  const operationKeys = new Set();
  const vehicleIds = new Set();

  return parsedVehicles.map((item) => {
    const vehicleId = normalizeId(item?.vehicle_id);
    const associationId =
      item?.association_id === undefined ||
      item?.association_id === null ||
      item?.association_id === ''
        ? null
        : normalizeId(item.association_id);
    const action = String(item?.action || '').trim().toLowerCase();

    if (!vehicleId || !['associate', 'activate', 'deactivate', 'delete'].includes(action)) {
      throw new Error('DeviceVehicleActionInvalid');
    }

    if (vehicleIds.has(vehicleId)) {
      throw new Error('DeviceVehicleDuplicateOperation');
    }
    vehicleIds.add(vehicleId);

    if (action === 'associate' && associationId !== null) {
      throw new Error('DeviceVehicleAssociationIdNotAllowed');
    }

    if (action !== 'associate' && !associationId) {
      throw new Error('DeviceVehicleAssociationIdRequired');
    }

    const operationKey = `${vehicleId}:${associationId || 'new'}`;
    if (operationKeys.has(operationKey)) {
      throw new Error('DeviceVehicleDuplicateOperation');
    }
    operationKeys.add(operationKey);

    return {
      vehicleId,
      associationId,
      action,
      active:
        action === 'activate'
          ? true
          : action === 'deactivate' || action === 'delete'
            ? false
            : item?.active === undefined
              ? true
              : Boolean(item.active),
    };
  });
};

const ensureVehiclesBelongToBranch = async ({ branchId, operations, transaction }) => {
  const branchVehicles = await BranchVehicleRepository.findByBranch(branchId, {
    transaction,
  });
  const vehicleIds = new Set(
    branchVehicles
      .map((branchVehicle) => Number(branchVehicle.vehicle_id))
      .filter((vehicleId) => Number.isInteger(vehicleId) && vehicleId > 0)
  );

  operations.forEach((operation) => {
    if (!vehicleIds.has(operation.vehicleId)) {
      throw new Error('VehicleNotAvailableForBranch');
    }
  });
};

const ensureActiveLimit = ({ operations, existingRelations = [] }) => {
  const operationByAssociationId = new Map(
    operations
      .filter((operation) => operation.associationId)
      .map((operation) => [operation.associationId, operation])
  );
  let activeRelations = existingRelations
    .filter((relation) => isActive(relation.active))
    .filter((relation) => {
    const operation = operationByAssociationId.get(Number(relation.id));
    if (!operation) {
      return true;
    }

    return (
      ['associate', 'activate'].includes(operation.action) &&
      operation.active
    );
  }).length;

  operations.forEach((operation) => {
    if (
      !['associate', 'activate'].includes(operation.action) ||
      operation.active === false
    ) {
      return;
    }

    const existingRelation = existingRelations.find(
      (relation) => Number(relation.vehicle_id) === operation.vehicleId
    );

    if (!existingRelation || !isActive(existingRelation.active)) {
      activeRelations += 1;
    }
  });

  if (activeRelations > 1) {
    throw new Error('ActiveDeviceVehicleConflict');
  }
};

const validateUpdateOperations = ({ operations, existingRelations }) => {
  const relationById = new Map(
    existingRelations.map((relation) => [Number(relation.id), relation])
  );

  operations.forEach((operation) => {
    if (operation.action === 'associate') {
      return;
    }

    const relation = relationById.get(operation.associationId);
    if (!relation) {
      throw new Error('DeviceVehicleAssociationNotFound');
    }

    if (Number(relation.vehicle_id) !== operation.vehicleId) {
      throw new Error('DeviceVehicleAssociationVehicleMismatch');
    }
  });
};

const applyCreateOperations = async ({
  deviceId,
  branchId,
  operations,
  transaction,
}) => {
  for (const operation of operations) {
    await DeviceVehicleRepository.create(
      {
        device_id: deviceId,
        vehicle_id: operation.vehicleId,
        branch_id: branchId,
        active: operation.active,
      },
      { transaction }
    );
  }
};

const validateCreateOperations = (operations) => {
  if (operations.some((operation) => operation.action !== 'associate')) {
    throw new Error('DeviceVehicleCreateActionInvalid');
  }

  if (operations.some((operation) => operation.associationId !== null)) {
    throw new Error('DeviceVehicleAssociationIdNotAllowed');
  }

  ensureActiveLimit({ operations });
};

const applyUpdateOperations = async ({
  deviceId,
  branchId,
  operations,
  existingRelations,
  transaction,
}) => {
  if (operations.length === 0) {
    return;
  }

  validateUpdateOperations({ operations, existingRelations });
  ensureActiveLimit({ operations, existingRelations });

  const relationById = new Map(
    existingRelations.map((relation) => [Number(relation.id), relation])
  );
  const relationByVehicleId = new Map(
    existingRelations.map((relation) => [Number(relation.vehicle_id), relation])
  );

  const deactivations = operations.filter(
    (operation) => operation.action === 'deactivate'
  );
  const deletions = operations.filter(
    (operation) => operation.action === 'delete'
  );
  const associations = operations.filter((operation) =>
    ['associate', 'activate'].includes(operation.action)
  );

  for (const operation of deactivations) {
    await DeviceVehicleRepository.update(
      relationById.get(operation.associationId),
      { active: false },
      { transaction }
    );
  }

  for (const operation of deletions) {
    const relation = relationById.get(operation.associationId);
    if (isActive(relation.active)) {
      await DeviceVehicleRepository.update(
        relation,
        { active: false },
        { transaction }
      );
    }
    await DeviceVehicleRepository.delete(relation, { transaction });
  }

  for (const operation of associations) {
    const existingRelation = relationByVehicleId.get(operation.vehicleId);
    if (existingRelation) {
      await DeviceVehicleRepository.update(
        existingRelation,
        {
          branch_id: branchId,
          active: operation.active,
        },
        { transaction }
      );
      continue;
    }

    await DeviceVehicleRepository.create(
      {
        device_id: deviceId,
        vehicle_id: operation.vehicleId,
        branch_id: branchId,
        active: operation.active,
      },
      { transaction }
    );
  }
};

const DeviceService = {
  async create({ body, file }) {
    const branchId = normalizeId(body.branch_id);
    const operations = normalizeOperations(body.vehicles);
    validateCreateOperations(operations);

    return sequelize.transaction(async (transaction) => {
      await ensureVehiclesBelongToBranch({
        branchId,
        operations,
        transaction,
      });

      const device = await DeviceRepository.create(body, file, {
        transaction,
      });

      await applyCreateOperations({
        deviceId: device.id,
        branchId,
        operations,
        transaction,
      });

      const deviceVehicles = await DeviceVehicleRepository.findByDevice(
        device.id,
        { transaction }
      );

      return { device, deviceVehicles };
    });
  },

  async update({ id, body, file }) {
    const operations = normalizeOperations(body.vehicles);

    return sequelize.transaction(async (transaction) => {
      const device = await DeviceRepository.findById(id, { transaction });
      if (!device) {
        throw new Error('DeviceNotFound');
      }

      const branchId = normalizeId(body.branch_id) || normalizeId(device.branch_id);
      const existingRelations = await DeviceVehicleRepository.findByDevice(
        device.id,
        { transaction }
      );

      await ensureVehiclesBelongToBranch({
        branchId,
        operations,
        transaction,
      });

      await applyUpdateOperations({
        deviceId: device.id,
        branchId,
        operations,
        existingRelations,
        transaction,
      });

      const updatedDevice = await DeviceRepository.update(
        device,
        body,
        file,
        { transaction }
      );
      const deviceVehicles = await DeviceVehicleRepository.findByDevice(
        device.id,
        { transaction }
      );

      return { device: updatedDevice, deviceVehicles };
    });
  },
};

module.exports = DeviceService;
