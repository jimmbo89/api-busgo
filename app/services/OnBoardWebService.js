'use strict';

const {
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

    const workerVehicles = await VehicleWorkerRepository.findByWorker(workerId);
    const branchesById = new Map();

    for (const workerVehicle of workerVehicles) {
      const vehicleId = normalizeId(workerVehicle.vehicle_id || workerVehicle.vehicle?.id);
      if (!vehicleId) {
        continue;
      }

      const branchVehicles = await BranchVehicleRepository.findByVehicle(vehicleId);
      const deviceVehicles = await DeviceVehicleRepository.findByVehicle(vehicleId);

      for (const branchVehicle of branchVehicles) {
        const branch = branchVehicle.branch;
        const vehicle = branchVehicle.vehicle || workerVehicle.vehicle;
        if (!branch || !vehicle) {
          continue;
        }

        const branchId = Number(branch.id);
        let branchContext = branchesById.get(branchId);
        if (!branchContext) {
          branchContext = {
            branch,
            vehiclesById: new Map(),
          };
          branchesById.set(branchId, branchContext);
        }

        if (!branchContext.vehiclesById.has(vehicleId)) {
          const branchDevices = deviceVehicles.filter(
            (deviceVehicle) => Number(deviceVehicle.branch_id) === branchId
          );

          branchContext.vehiclesById.set(
            vehicleId,
            mapVehicle(vehicle, branchDevices)
          );
        }
      }
    }

    if (branchesById.size === 0) {
      throw new Error('WorkerNotAuthorizedForBranch');
    }

    const branches = Array.from(branchesById.values()).map((branchContext) => ({
      ...mapBranch(branchContext.branch),
      vehicles: Array.from(branchContext.vehiclesById.values()),
    }));

    return { branches };
  },
};

module.exports = OnBoardWebService;
