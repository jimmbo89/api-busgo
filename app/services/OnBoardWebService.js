'use strict';

const {
  BranchWorkerRepository,
  BranchVehicleRepository,
  DeviceVehicleRepository,
  VehicleWorkerRepository,
} = require('../repositories');

const normalizeId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const mapBranch = (branch) => ({
  id: branch.id,
  name: branch.name,
  image: branch.image,
  address: branch.address,
  rut: branch.rut,
  phone: branch.phone,
  company_id: branch.company_id,
  companyName: branch.company?.name,
  companyImage: branch.company?.image,
});

const mapDevice = (relation) => ({
  id: relation.device?.id,
  device_id: relation.device_id,
  association_id: relation.id,
  name: relation.device?.name,
  serial: relation.device?.serial,
  mac: relation.device?.mac,
  image: relation.device?.image,
  status: relation.device?.status,
  branch_id: relation.branch_id,
  active: Boolean(relation.active),
  available: Boolean(relation.active) && Number(relation.device?.status) === 1,
});

const mapVehicle = (vehicle, devices) => ({
  id: vehicle.id,
  plate: vehicle.plate,
  internal_number: vehicle.internal_number,
  brand: vehicle.brand,
  model: vehicle.model,
  image: vehicle.image,
  seats: vehicle.seats,
  state: vehicle.state,
  devices: devices.map(mapDevice),
});

const OnBoardWebService = {
  async context({ worker }) {
    const workerId = normalizeId(worker?.id);
    if (!workerId) {
      throw new Error('WorkerNotAuthenticated');
    }

    const workerBranches = await BranchWorkerRepository.findByWorker(workerId);
    const branchesById = new Map();

    for (const branchWorker of workerBranches) {
      if (branchWorker.branch) {
        branchesById.set(Number(branchWorker.branch.id), branchWorker.branch);
      }
    }

    if (branchesById.size === 0) {
      throw new Error('WorkerNotAuthorizedForBranch');
    }

    const branches = await Promise.all(
      Array.from(branchesById.values()).map(async (branch) => {
        const branchVehicles = await BranchVehicleRepository.findByBranch(branch.id);
        const vehicles = await Promise.all(
          branchVehicles
            .filter((branchVehicle) => branchVehicle.vehicle)
            .map(async (branchVehicle) => {
              const canOperate = await VehicleWorkerRepository.existsVehicleWorker(
                workerId,
                branchVehicle.vehicle_id
              );

              if (!canOperate) {
                return null;
              }

              const deviceVehicles = await DeviceVehicleRepository.findByVehicle(
                branchVehicle.vehicle_id
              );

              const branchDevices = deviceVehicles.filter(
                (deviceVehicle) =>
                  Number(deviceVehicle.branch_id) === Number(branch.id)
              );

              return mapVehicle(branchVehicle.vehicle, branchDevices);
            })
        ).then((items) => items.filter(Boolean));

        return {
          ...mapBranch(branch),
          vehicles,
        };
      })
    );

    return { branches };
  },
};

module.exports = OnBoardWebService;
