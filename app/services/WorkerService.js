'use strict';

const { sequelize, Worker, Branch, Role } = require('../models');
const {
  BranchWorkerRepository,
  WorkerRepository,
} = require('../repositories');

const normalizeId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
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
      throw new Error('WorkerBranchActionsInvalid');
    }
  }

  if (!Array.isArray(parsedBranches)) {
    throw new Error('WorkerBranchActionsInvalid');
  }

  return parsedBranches.map((item) => {
    const branchId = normalizeId(item?.branch_id);
    const roleId = normalizeId(item?.role_id);
    const associationId =
      item?.association_id === undefined ||
      item?.association_id === null ||
      item?.association_id === ''
        ? null
        : normalizeId(item.association_id);
    const action = String(item?.action || '').trim().toLowerCase();

    if (!branchId || !roleId || !['associate', 'update', 'delete'].includes(action)) {
      throw new Error('WorkerBranchActionInvalid');
    }

    if (action === 'associate' && associationId !== null) {
      throw new Error('WorkerBranchAssociationIdNotAllowed');
    }

    if (action !== 'associate' && !associationId) {
      throw new Error('WorkerBranchAssociationIdRequired');
    }

    return { branchId, roleId, associationId, action };
  });
};

const ensureRoleExists = async (roleId, transaction) => {
  const role = await Role.findByPk(roleId, { transaction });
  if (!role) {
    throw new Error('RoleNotFound');
  }
};

const ensureBranchesExist = async (operations, transaction) => {
  const branchIds = [...new Set(operations.map((operation) => operation.branchId))];
  if (branchIds.length === 0) {
    return;
  }

  const branches = await Branch.findAll({
    where: { id: branchIds },
    attributes: ['id'],
    transaction,
  });

  if (branches.length !== branchIds.length) {
    throw new Error('BranchNotFound');
  }
};

const validateCreateOperations = (operations, roleId) => {
  if (operations.length > 1) {
    throw new Error('WorkerMultipleActiveBranches');
  }

  operations.forEach((operation) => {
    if (operation.action !== 'associate') {
      throw new Error('WorkerBranchCreateActionInvalid');
    }

    if (operation.roleId !== roleId) {
      throw new Error('WorkerBranchRoleMismatch');
    }
  });
};

const validateUpdateOperations = ({ operations, existingRelations, finalRoleId }) => {
  const relationById = new Map(
    existingRelations.map((relation) => [Number(relation.id), relation])
  );
  const operationAssociationIds = new Set();

  operations.forEach((operation) => {
    if (operation.associationId) {
      if (operationAssociationIds.has(operation.associationId)) {
        throw new Error('WorkerBranchDuplicateOperation');
      }
      operationAssociationIds.add(operation.associationId);
    }

    if (operation.action === 'associate') {
      if (operation.roleId !== finalRoleId) {
        throw new Error('WorkerBranchRoleMismatch');
      }
      return;
    }

    const relation = relationById.get(operation.associationId);
    if (!relation) {
      throw new Error('WorkerBranchAssociationNotFound');
    }

    if (Number(relation.branch_id) !== operation.branchId) {
      throw new Error('WorkerBranchAssociationBranchMismatch');
    }

    if (
      operation.action === 'delete' &&
      Number(relation.role_id) !== operation.roleId
    ) {
      throw new Error('WorkerBranchAssociationRoleMismatch');
    }

    if (
      operation.action === 'update' &&
      operation.roleId !== finalRoleId
    ) {
      throw new Error('WorkerBranchRoleMismatch');
    }
  });

  const deletedAssociationIds = new Set(
    operations
      .filter((operation) => operation.action === 'delete')
      .map((operation) => operation.associationId)
  );
  const remainingRelations = existingRelations.filter(
    (relation) => !deletedAssociationIds.has(Number(relation.id))
  );
  const associationCount = operations.filter(
    (operation) => operation.action === 'associate'
  ).length;

  if (remainingRelations.length + associationCount > 1) {
    throw new Error('WorkerMultipleActiveBranches');
  }
};

const applyCreateOperations = async ({ workerId, operations, transaction }) => {
  for (const operation of operations) {
    await BranchWorkerRepository.create(
      {
        worker_id: workerId,
        branch_id: operation.branchId,
        role_id: operation.roleId,
      },
      { transaction }
    );
  }
};

const applyUpdateOperations = async ({
  workerId,
  operations,
  existingRelations,
  finalRoleId,
  roleChanged,
  transaction,
}) => {
  const relationById = new Map(
    existingRelations.map((relation) => [Number(relation.id), relation])
  );

  for (const operation of operations.filter((item) => item.action === 'delete')) {
    await BranchWorkerRepository.delete(
      relationById.get(operation.associationId),
      { transaction }
    );
  }

  for (const operation of operations.filter((item) => item.action === 'update')) {
    await BranchWorkerRepository.update(
      relationById.get(operation.associationId),
      { role_id: operation.roleId },
      { transaction }
    );
  }

  for (const operation of operations.filter((item) => item.action === 'associate')) {
    await BranchWorkerRepository.create(
      {
        worker_id: workerId,
        branch_id: operation.branchId,
        role_id: operation.roleId,
      },
      { transaction }
    );
  }

  if (roleChanged) {
    await BranchWorkerRepository.updateRoleForWorker(
      workerId,
      finalRoleId,
      { transaction }
    );
  }
};

const WorkerService = {
  async create({ body, file }) {
    const roleId = normalizeId(body.role_id);
    const operations = normalizeOperations(body.branches);
    validateCreateOperations(operations, roleId);

    return sequelize.transaction(async (transaction) => {
      await ensureRoleExists(roleId, transaction);
      await ensureBranchesExist(operations, transaction);

      const worker = await WorkerRepository.create(body, file, transaction);
      await applyCreateOperations({
        workerId: worker.id,
        operations,
        transaction,
      });

      const branchWorkers = await BranchWorkerRepository.findByWorker(
        worker.id,
        { transaction }
      );

      return { worker, branchWorkers };
    });
  },

  async update({ id, body, file }) {
    const operations = normalizeOperations(body.branches);

    return sequelize.transaction(async (transaction) => {
      const worker = await WorkerRepository.findById(id, { transaction });
      if (!worker) {
        throw new Error('WorkerNotFound');
      }

      const finalRoleId = normalizeId(body.role_id) || Number(worker.role_id);
      const roleChanged = finalRoleId !== Number(worker.role_id);
      await ensureRoleExists(finalRoleId, transaction);
      await ensureBranchesExist(operations, transaction);

      const existingRelations = await BranchWorkerRepository.findByWorker(
        worker.id,
        { transaction, lock: transaction.LOCK.UPDATE }
      );

      validateUpdateOperations({
        operations,
        existingRelations,
        finalRoleId,
      });

      const updatedWorker = await WorkerRepository.update(
        worker,
        body,
        file,
        { transaction }
      );

      await applyUpdateOperations({
        workerId: worker.id,
        operations,
        existingRelations,
        finalRoleId,
        roleChanged,
        transaction,
      });

      const branchWorkers = await BranchWorkerRepository.findByWorker(
        worker.id,
        { transaction }
      );

      return { worker: updatedWorker, branchWorkers };
    });
  },
};

module.exports = WorkerService;
