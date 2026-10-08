'use strict';

const { sequelize, Worker, Branch, Role } = require('../models');
const {
  BranchWorkerRepository,
  WorkerRepository,
} = require('../repositories');
const { ROLE_TYPES } = require('../constants/roleTypes');

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
    const associationId =
      item?.association_id === undefined ||
      item?.association_id === null ||
      item?.association_id === ''
        ? null
        : normalizeId(item.association_id);
    const action = String(item?.action || '').trim().toLowerCase();

    if (!branchId || !['associate', 'update', 'delete'].includes(action)) {
      throw new Error('WorkerBranchActionInvalid');
    }

    if (action === 'associate' && associationId !== null) {
      throw new Error('WorkerBranchAssociationIdNotAllowed');
    }

    if (action !== 'associate' && !associationId) {
      throw new Error('WorkerBranchAssociationIdRequired');
    }

    return { branchId, associationId, action };
  });
};

const ensureRoleExists = async (roleId, transaction) => {
  const role = await Role.findByPk(roleId, { transaction });
  if (!role) {
    throw new Error('RoleNotFound');
  }

  return role;
};

const ensureBranchesExist = async (
  operations,
  existingRelations,
  transaction,
  allowedCompanyIds = []
) => {
  const branchIds = [...new Set(operations.map((operation) => operation.branchId))];
  if (branchIds.length === 0) {
    return;
  }

  const authorizedCompanyIds = new Set(
    (allowedCompanyIds || []).map(normalizeId).filter(Boolean)
  );

  if (authorizedCompanyIds.size === 0) {
    throw new Error('WorkerBranchCompanyMismatch');
  }

  const branches = await Branch.findAll({
    where: { id: branchIds },
    attributes: ['id', 'company_id'],
    transaction,
  });

  if (branches.length !== branchIds.length) {
    throw new Error('BranchNotFound');
  }

  const existingCompanyIds = new Set(
    (existingRelations || [])
      .map((relation) => relation.branch?.company_id ?? relation.company_id)
      .map(normalizeId)
      .filter(Boolean)
  );
  const operationCompanyIds = new Set(
    branches.map((branch) => normalizeId(branch.company_id)).filter(Boolean)
  );

  if (branches.some((branch) => !normalizeId(branch.company_id))) {
    throw new Error('WorkerBranchCompanyMismatch');
  }

  const workerCompanyIds = new Set(
    authorizedCompanyIds
  );
  const scopedCompanyIds = existingCompanyIds.size > 0
    ? existingCompanyIds
    : workerCompanyIds.size > 0
      ? workerCompanyIds
      : operationCompanyIds;

  if (workerCompanyIds.size > 0 && branches.some((branch) => {
    const companyId = normalizeId(branch.company_id);
    return companyId && !workerCompanyIds.has(companyId);
  })) {
    throw new Error('WorkerBranchCompanyMismatch');
  }

  if (existingCompanyIds.size === 0 && workerCompanyIds.size === 0 && operationCompanyIds.size > 1) {
    throw new Error('WorkerBranchCompanyMismatch');
  }

  if (scopedCompanyIds.size > 0 && branches.some((branch) => {
    const companyId = normalizeId(branch.company_id);
    return companyId && !scopedCompanyIds.has(companyId);
  })) {
    throw new Error('WorkerBranchCompanyMismatch');
  }
};

const validateCreateOperations = (operations, roleType) => {
  const branchIds = new Set();

  operations.forEach((operation) => {
    if (operation.action !== 'associate') {
      throw new Error('WorkerBranchCreateActionInvalid');
    }

    if (branchIds.has(operation.branchId)) {
      throw new Error('WorkerBranchDuplicateBranch');
    }
    branchIds.add(operation.branchId);
  });

  if (roleType === ROLE_TYPES.BRANCH && operations.length === 0) {
    throw new Error('WorkerBranchRequiredForBranchRole');
  }

  if (roleType === ROLE_TYPES.COMPANY && operations.length > 0) {
    throw new Error('WorkerBranchNotAllowedForCompanyRole');
  }
};

const validateUpdateOperations = ({ operations, existingRelations, roleType }) => {
  const relationById = new Map(
    existingRelations.map((relation) => [Number(relation.id), relation])
  );
  const operationAssociationIds = new Set();
  const deletedAssociationIds = new Set(
    operations
      .filter((operation) => operation.action === 'delete' && operation.associationId)
      .map((operation) => operation.associationId)
  );
  const associatedBranchIds = new Set();

  operations.forEach((operation) => {
    if (operation.associationId) {
      if (operationAssociationIds.has(operation.associationId)) {
        throw new Error('WorkerBranchDuplicateOperation');
      }
      operationAssociationIds.add(operation.associationId);
    }

    if (operation.action === 'associate') {
      if (roleType === ROLE_TYPES.COMPANY) {
        throw new Error('WorkerBranchNotAllowedForCompanyRole');
      }

      if (associatedBranchIds.has(operation.branchId)) {
        throw new Error('WorkerBranchDuplicateBranch');
      }

      const existingRelation = existingRelations.find(
        (relation) => Number(relation.branch_id) === operation.branchId
      );
      const activeRelationForBranch = existingRelations.some(
        (relation) =>
          Number(relation.branch_id) === operation.branchId &&
          !deletedAssociationIds.has(Number(relation.id))
      );
      if (existingRelation && activeRelationForBranch) {
        throw new Error('WorkerBranchAlreadyAssociated');
      }

      associatedBranchIds.add(operation.branchId);
      return;
    }

    const relation = relationById.get(operation.associationId);
    if (!relation) {
      throw new Error('WorkerBranchAssociationNotFound');
    }

    if (Number(relation.branch_id) !== operation.branchId) {
      throw new Error('WorkerBranchAssociationBranchMismatch');
    }

  });

  const remainingRelations = existingRelations.filter(
    (relation) => !deletedAssociationIds.has(Number(relation.id))
  );
  const resultingRelationCount = remainingRelations.length + associatedBranchIds.size;

  if (roleType === ROLE_TYPES.BRANCH && resultingRelationCount === 0) {
    throw new Error('WorkerBranchRequiredForBranchRole');
  }

};

const applyCreateOperations = async ({ workerId, roleId, operations, transaction }) => {
  for (const operation of operations) {
    await BranchWorkerRepository.create(
      {
        worker_id: workerId,
        branch_id: operation.branchId,
        role_id: roleId,
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
      { role_id: finalRoleId },
      { transaction }
    );
  }

  for (const operation of operations.filter((item) => item.action === 'associate')) {
    await BranchWorkerRepository.create(
      {
        worker_id: workerId,
        branch_id: operation.branchId,
        role_id: finalRoleId,
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
  async create({ body, file, allowedCompanyIds = [] }) {
    const roleId = normalizeId(body.role_id);
    const operations = normalizeOperations(body.branches);

    return sequelize.transaction(async (transaction) => {
      const role = await ensureRoleExists(roleId, transaction);
      validateCreateOperations(operations, role.type);
      await ensureBranchesExist(operations, [], transaction, allowedCompanyIds);

      const worker = await WorkerRepository.create(body, file, transaction);
      await applyCreateOperations({
        workerId: worker.id,
        roleId,
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

  async update({ id, body, file, allowedCompanyIds = [] }) {
    const operations = normalizeOperations(body.branches);

    return sequelize.transaction(async (transaction) => {
      const worker = await WorkerRepository.findById(id, { transaction });
      if (!worker) {
        throw new Error('WorkerNotFound');
      }

      const finalRoleId = normalizeId(body.role_id) || Number(worker.role_id);
      const roleChanged = finalRoleId !== Number(worker.role_id);
      const role = await ensureRoleExists(finalRoleId, transaction);

      const existingRelations = await BranchWorkerRepository.findByWorker(
        worker.id,
        { transaction, lock: transaction.LOCK.UPDATE }
      );

      await ensureBranchesExist(
        operations,
        existingRelations,
        transaction,
        allowedCompanyIds
      );

      validateUpdateOperations({
        operations,
        existingRelations,
        roleType: role.type,
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
