'use strict';

const { Worker, Role } = require('../models');
const {
  BranchRepository,
  BranchWorkerRepository,
} = require('../repositories');
const { ROLE_TYPES } = require('../constants/roleTypes');

// Compatible con usuarios raíz cuyos roles históricos aún tienen tipo Sistema.
const LEGACY_SYSTEM_ROLE_TYPE = 'Sistema';

const normalizeBranchIds = (relations = []) => [
  ...new Set(
    relations
      .map((relation) => Number(relation.branch_id ?? relation.branch?.id))
      .filter((branchId) => Number.isInteger(branchId) && branchId > 0)
  ),
];

const findAuthenticatedWorker = async (userId) => {
  if (!userId) {
    return null;
  }

  return Worker.findOne({
    where: { user_id: userId },
    attributes: ['id', 'role_id'],
    include: [{
      model: Role,
      as: 'role',
      attributes: ['type'],
    }],
  });
};

const hasGlobalBranchAccess = (roleType) => (
  roleType === ROLE_TYPES.COMPANY ||
  roleType === LEGACY_SYSTEM_ROLE_TYPE
);

const BranchAccessService = {
  async getBranchAccessScope(userId) {
    const worker = await findAuthenticatedWorker(userId);

    if (!worker) {
      return {
        canManageAllBranches: false,
        branchIds: [],
      };
    }

    if (hasGlobalBranchAccess(worker.role?.type)) {
      return {
        canManageAllBranches: true,
        branchIds: [],
      };
    }

    if (worker.role?.type === ROLE_TYPES.BRANCH) {
      const relations = await BranchWorkerRepository.findByWorker(worker.id);
      return {
        canManageAllBranches: false,
        branchIds: normalizeBranchIds(relations),
      };
    }

    return {
      canManageAllBranches: false,
      branchIds: [],
    };
  },

  async findAuthorizedBranches(userId, options = {}) {
    const accessScope = await this.getBranchAccessScope(userId);

    if (accessScope.canManageAllBranches) {
      return BranchRepository.findAll(options);
    }

    if (accessScope.branchIds.length === 0) {
      return [];
    }

    return BranchRepository.findByIds(accessScope.branchIds, options);
  },
};

module.exports = BranchAccessService;
