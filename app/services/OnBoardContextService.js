'use strict';

const {
  DeviceRepository,
  DeviceVehicleRepository,
  BranchWorkerRepository,
  BranchVehicleRepository,
  VehicleWorkerRepository,
} = require('../repositories');

const normalizeId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const OnBoardContextService = {
  async resolve({ worker, device_id, options = {} }) {
    const workerId = normalizeId(worker?.id);
    if (!workerId) {
      throw new Error('WorkerNotAuthenticated');
    }

    const deviceId = normalizeId(device_id);
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

    const deviceVehicle = await DeviceVehicleRepository.findActiveByDevice(deviceId, options);
    if (!deviceVehicle || !deviceVehicle.vehicle) {
      throw new Error('DeviceVehicleNotAssigned');
    }

    const vehicle = deviceVehicle.vehicle;
    const workerVehicle = await VehicleWorkerRepository.existsVehicleWorker(
      workerId,
      vehicle.id,
      null,
      options
    );

    if (!workerVehicle) {
      throw new Error('WorkerCannotOperateVehicle');
    }

    const [vehicleBranches, workerBranches] = await Promise.all([
      BranchVehicleRepository.findByVehicle(vehicle.id, options),
      BranchWorkerRepository.findByWorker(workerId, options),
    ]);
    const vehicleBranchIds = new Set(
      vehicleBranches.map((branchVehicle) => normalizeId(branchVehicle.branch_id))
    );
    const authorizedBranchIds = workerBranches
      .map((branchWorker) => normalizeId(branchWorker.branch_id))
      .filter((branchId) => branchId && vehicleBranchIds.has(branchId));

    if (authorizedBranchIds.length === 0) {
      throw new Error('WorkerNotAuthorizedForBranch');
    }

    return {
      worker,
      device,
      vehicle,
      deviceVehicle,
      authorizedBranchIds: Array.from(new Set(authorizedBranchIds)),
    };
  },

  async resolveWeb({ worker, branch_id, vehicle_id, device_id, options = {} }) {
    const workerId = normalizeId(worker?.id);
    const branchId = normalizeId(branch_id);
    const vehicleId = normalizeId(vehicle_id);

    if (!workerId) {
      throw new Error('WorkerNotAuthenticated');
    }

    if (!branchId || !vehicleId) {
      throw new Error('OnBoardWebContextDataInvalid');
    }

    const [workerBranches, branchVehicles] = await Promise.all([
      BranchWorkerRepository.findByWorker(workerId, options),
      BranchVehicleRepository.findByBranch(branchId, options),
    ]);

    const vehicleBranchIds = new Set(
      branchVehicles.map((branchVehicle) => Number(branchVehicle.branch_id))
    );
    const workerCanOperateVehicle = workerBranches.some((branchWorker) =>
      vehicleBranchIds.has(Number(branchWorker.branch_id))
    );
    if (!workerCanOperateVehicle) {
      throw new Error('WorkerNotAuthorizedForBranch');
    }

    const branchVehicle = branchVehicles.find(
      (item) => Number(item.vehicle_id) === vehicleId
    );
    if (!branchVehicle || !branchVehicle.vehicle) {
      throw new Error('BranchNotCompatibleWithVehicle');
    }

    const vehicle = branchVehicle.vehicle;
    const workerVehicle = await VehicleWorkerRepository.existsVehicleWorker(
      workerId,
      vehicle.id,
      null,
      options
    );

    if (!workerVehicle) {
      throw new Error('WorkerCannotOperateVehicle');
    }

    let device = null;
    let deviceVehicle = null;
    if (device_id !== undefined && device_id !== null && device_id !== '') {
      const deviceId = normalizeId(device_id);
      if (!deviceId) {
        throw new Error('DeviceNotFound');
      }

      device = await DeviceRepository.findById(deviceId, options);
      if (!device) {
        throw new Error('DeviceNotFound');
      }

      if (Number(device.status) !== 1) {
        throw new Error('DeviceInactive');
      }

      deviceVehicle = await DeviceVehicleRepository.findActiveByDevice(
        deviceId,
        options
      );
      if (!deviceVehicle) {
        throw new Error('DeviceVehicleNotAssigned');
      }

      if (Number(deviceVehicle.vehicle_id) !== vehicleId) {
        throw new Error('OnBoardWebDeviceVehicleMismatch');
      }

    }

    return {
      worker,
      branch: branchVehicle.branch || workerBranches.find(
        (branchWorker) => Number(branchWorker.branch_id) === branchId
      )?.branch,
      vehicle,
      device,
      deviceVehicle,
      authorizedBranchIds: [branchId],
    };
  },
};

module.exports = OnBoardContextService;
