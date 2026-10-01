const logger = require('../../config/logger');
const {
  DeviceVehicleRepository,
  DeviceRepository,
  VehicleRepository,
  BranchRepository,
} = require('../repositories');

const mapDeviceVehicle = (relation) => ({
  id: relation.id,
  device_id: relation.device_id,
  deviceId: relation.device_id,
  vehicle_id: relation.vehicle_id,
  vehicleId: relation.vehicle_id,
  branch_id: relation.branch_id,
  branchId: relation.branch_id,
  active: relation.active,
  device: relation.device
    ? {
        id: relation.device.id,
        name: relation.device.name,
        serial: relation.device.serial,
        status: relation.device.status,
        branch_id: relation.device.branch_id,
      }
    : null,
  vehicle: relation.vehicle
    ? {
        id: relation.vehicle.id,
        plate: relation.vehicle.plate,
        internal_number: relation.vehicle.internal_number,
        internalNumber: relation.vehicle.internal_number,
        state: relation.vehicle.state,
      }
    : null,
  branch: relation.branch
    ? {
        id: relation.branch.id,
        name: relation.branch.name,
      }
    : null,
});

const ensureReferences = async ({ device_id, vehicle_id, branch_id }) => {
  if (device_id !== undefined) {
    const device = await DeviceRepository.findById(device_id);
    if (!device) return 'DeviceNotFound';
  }

  if (vehicle_id !== undefined) {
    const vehicle = await VehicleRepository.findById(vehicle_id);
    if (!vehicle) return 'VehicleNotFound';
  }

  if (branch_id !== undefined) {
    const branch = await BranchRepository.findById(branch_id);
    if (!branch) return 'BranchNotFound';
  }

  return null;
};

const getErrorStatus = (error) => {
  if (
    error.message === 'ActiveDeviceVehicleConflict' ||
    error.message === 'ActiveDeviceVehicleCannotDelete'
  ) {
    return 409;
  }

  if (error.name === 'SequelizeUniqueConstraintError') {
    return 409;
  }

  return 500;
};

const DeviceVehicleController = {
  async index(req, res) {
    logger.info(`${req.user.name} - Busca las relaciones dispositivo-vehículo`);

    try {
      const relations = await DeviceVehicleRepository.findAll();

      if (!relations.length) {
        return res.status(204).json({ msg: 'DeviceVehiclesNotFound' });
      }

      return res.status(200).json({
        deviceVehicles: relations.map(mapDeviceVehicle),
      });
    } catch (error) {
      logger.error('DeviceVehicleController->index: ' + error.message);
      return res.status(500).json({ error: 'ServerError', details: error.message });
    }
  },

  async byDevice(req, res) {
    const { device_id } = req.body;
    logger.info(`${req.user.name} - Busca vehículos asociados al dispositivo ${device_id}`);

    try {
      const device = await DeviceRepository.findById(device_id);
      if (!device) {
        return res.status(404).json({ msg: 'DeviceNotFound' });
      }

      const relations = await DeviceVehicleRepository.findByDevice(device_id);

      if (!relations.length) {
        return res.status(204).json({ msg: 'DeviceVehiclesNotFound' });
      }

      return res.status(200).json({
        deviceVehicles: relations.map(mapDeviceVehicle),
      });
    } catch (error) {
      logger.error('DeviceVehicleController->byDevice: ' + error.message);
      return res.status(500).json({ error: 'ServerError', details: error.message });
    }
  },

  async store(req, res) {
    logger.info(`${req.user.name} - Crea una relación dispositivo-vehículo`);

    try {
      const referenceError = await ensureReferences(req.body);
      if (referenceError) {
        return res.status(404).json({ msg: referenceError });
      }

      const relation = await DeviceVehicleRepository.create(req.body);
      const refreshedRelation = await DeviceVehicleRepository.findById(relation.id);

      return res.status(201).json({
        msg: 'DeviceVehicleCreated',
        deviceVehicle: mapDeviceVehicle(refreshedRelation),
      });
    } catch (error) {
      const status = getErrorStatus(error);
      logger.error('DeviceVehicleController->store: ' + error.message);
      return res.status(status).json({
        error: status === 409 ? error.message : 'ServerError',
        details: error.message,
      });
    }
  },

  async show(req, res) {
    logger.info(`${req.user.name} - Busca la relación dispositivo-vehículo ${req.body.id}`);

    try {
      const relation = await DeviceVehicleRepository.findById(req.body.id);
      if (!relation) {
        return res.status(404).json({ msg: 'DeviceVehicleNotFound' });
      }

      return res.status(200).json({
        deviceVehicle: mapDeviceVehicle(relation),
      });
    } catch (error) {
      logger.error('DeviceVehicleController->show: ' + error.message);
      return res.status(500).json({ error: 'ServerError', details: error.message });
    }
  },

  async update(req, res) {
    logger.info(`${req.user.name} - Actualiza la relación dispositivo-vehículo ${req.body.id}`);

    try {
      const relation = await DeviceVehicleRepository.findById(req.body.id);
      if (!relation) {
        return res.status(404).json({ msg: 'DeviceVehicleNotFound' });
      }

      const referenceError = await ensureReferences(req.body);
      if (referenceError) {
        return res.status(404).json({ msg: referenceError });
      }

      const updatedRelation = await DeviceVehicleRepository.update(relation, req.body);
      const refreshedRelation = await DeviceVehicleRepository.findById(updatedRelation.id);
      const msg = req.body.active === true
        ? 'DeviceVehicleActivated'
        : req.body.active === false
          ? 'DeviceVehicleDeactivated'
          : 'DeviceVehicleUpdated';

      return res.status(200).json({
        msg,
        deviceVehicle: mapDeviceVehicle(refreshedRelation),
      });
    } catch (error) {
      const status = getErrorStatus(error);
      logger.error('DeviceVehicleController->update: ' + error.message);
      return res.status(status).json({
        error: status === 409 ? error.message : 'ServerError',
        details: error.message,
      });
    }
  },

  async destroy(req, res) {
    logger.info(`${req.user.name} - Elimina la relación dispositivo-vehículo ${req.body.id}`);

    try {
      const relation = await DeviceVehicleRepository.findById(req.body.id);
      if (!relation) {
        return res.status(404).json({ msg: 'DeviceVehicleNotFound' });
      }

      await DeviceVehicleRepository.delete(relation);
      return res.status(200).json({ msg: 'DeviceVehicleDeleted' });
    } catch (error) {
      const status = getErrorStatus(error);
      logger.error('DeviceVehicleController->destroy: ' + error.message);
      return res.status(status).json({
        error: status === 409 ? error.message : 'ServerError',
        details: error.message,
      });
    }
  },
};

module.exports = DeviceVehicleController;
