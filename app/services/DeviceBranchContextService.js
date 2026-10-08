'use strict';

const {
  DeviceRepository,
  BranchRepository,
} = require('../repositories');
const {
  Worker,
  Role,
  User,
  Company,
  BranchWorker,
} = require('../models');
const { ROLE_TYPES } = require('../constants/roleTypes');

const normalizeId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const DeviceBranchContextService = {
  async resolve({ worker, device_id, options = {} }) {
    const workerId = normalizeId(worker?.id);
    const deviceId = normalizeId(device_id);

    if (!workerId) {
      throw new Error('WorkerNotAuthenticated');
    }

    if (!deviceId) {
      throw new Error('DeviceNotAuthenticated');
    }

    const device = await DeviceRepository.findById(deviceId, options);
    if (!device) {
      throw new Error('DeviceNotFound');
    }

    if (Number(device.status) !== 1) {
      throw new Error('DeviceInactive');
    }

    const branchId = normalizeId(device.branch_id);
    if (!branchId) {
      throw new Error('DeviceBranchNotAssigned');
    }

    const branch = await BranchRepository.findById(branchId);
    if (!branch) {
      throw new Error('DeviceBranchNotFound');
    }

    const workerRecord = await Worker.findByPk(workerId, {
      ...options,
      attributes: ['id', 'user_id', 'role_id'],
      include: [
        {
          model: Role,
          as: 'role',
          attributes: ['id', 'type'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['id'],
          include: [
            {
              model: Company,
              as: 'companies',
              attributes: ['id'],
            },
          ],
        },
      ],
    });

    if (!workerRecord) {
      throw new Error('WorkerNotAuthenticated');
    }

    if (workerRecord.role?.type === ROLE_TYPES.COMPANY) {
      const hasCompanyAccess = (workerRecord.user?.companies || []).some(
        (company) => Number(company.id) === Number(branch.company_id)
      );

      if (!hasCompanyAccess) {
        throw new Error('WorkerNotAuthorizedForBranch');
      }
    } else {
      const branchWorker = await BranchWorker.findOne({
        ...options,
        where: {
          worker_id: workerId,
          branch_id: branchId,
        },
      });

      if (!branchWorker) {
        throw new Error('WorkerNotAuthorizedForBranch');
      }
    }

    return {
      device,
      branch,
      branch_id: branchId,
    };
  },
};

module.exports = DeviceBranchContextService;
