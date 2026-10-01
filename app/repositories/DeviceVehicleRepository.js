const { Op } = require('sequelize');
const {
  DeviceVehicle,
  Device,
  Vehicle,
  Branch,
  sequelize,
} = require('../models');

const relationInclude = [
  {
    model: Device,
    as: 'device',
    attributes: ['id', 'name', 'serial', 'mac', 'image', 'status', 'branch_id'],
  },
  {
    model: Vehicle,
    as: 'vehicle',
    attributes: ['id', 'plate', 'internal_number', 'state', 'seats'],
  },
  {
    model: Branch,
    as: 'branch',
    attributes: ['id', 'name'],
  },
];

const normalizeId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const findActiveConflict = async ({ deviceId, excludeId = null, transaction }) => {
  const normalizedDeviceId = normalizeId(deviceId);
  const normalizedExcludeId = normalizeId(excludeId);

  const where = {
    active: true,
    device_id: normalizedDeviceId,
  };

  if (normalizedExcludeId) {
    where.id = { [Op.ne]: normalizedExcludeId };
  }

  return DeviceVehicle.findOne({
    where,
    transaction,
    lock: transaction?.LOCK?.UPDATE,
  });
};

const DeviceVehicleRepository = {
  async findAll(options = {}) {
    return DeviceVehicle.findAll({
      ...options,
      include: options.include || relationInclude,
    });
  },

  async findById(id, options = {}) {
    return DeviceVehicle.findByPk(id, {
      ...options,
      include: options.include || relationInclude,
    });
  },

  async findActiveByDevice(deviceId, options = {}) {
    return DeviceVehicle.findOne({
      ...options,
      where: {
        ...(options.where || {}),
        device_id: deviceId,
        active: true,
      },
      include: options.include || relationInclude,
    });
  },

  async findByDevice(deviceId, options = {}) {
    return DeviceVehicle.findAll({
      ...options,
      where: {
        ...(options.where || {}),
        device_id: deviceId,
      },
      order: options.order || [['active', 'DESC'], ['updatedAt', 'DESC']],
      include: options.include || relationInclude,
    });
  },

  async findByDevicesAndVehicles(deviceIds, vehicleIds, options = {}) {
    const normalizedDeviceIds = (Array.isArray(deviceIds) ? deviceIds : [])
      .map(normalizeId)
      .filter(Boolean);
    const normalizedVehicleIds = (Array.isArray(vehicleIds) ? vehicleIds : [])
      .map(normalizeId)
      .filter(Boolean);

    if (normalizedDeviceIds.length === 0 || normalizedVehicleIds.length === 0) {
      return [];
    }

    return DeviceVehicle.findAll({
      ...options,
      where: {
        ...(options.where || {}),
        device_id: { [Op.in]: normalizedDeviceIds },
        vehicle_id: { [Op.in]: normalizedVehicleIds },
      },
      include: options.include || relationInclude,
    });
  },

  async findActiveByVehicle(vehicleId, options = {}) {
    return DeviceVehicle.findOne({
      ...options,
      where: {
        ...(options.where || {}),
        vehicle_id: vehicleId,
        active: true,
      },
      include: options.include || relationInclude,
    });
  },

  async findByVehicle(vehicleId, options = {}) {
    return DeviceVehicle.findAll({
      ...options,
      where: {
        ...(options.where || {}),
        vehicle_id: vehicleId,
      },
      order: options.order || [['active', 'DESC'], ['updatedAt', 'DESC']],
      include: options.include || relationInclude,
    });
  },

  async create(body, options = {}) {
    const deviceId = normalizeId(body.device_id);
    const vehicleId = normalizeId(body.vehicle_id);
    const branchId = normalizeId(body.branch_id);
    const active = body.active ?? true;

    const transaction = options.transaction || await sequelize.transaction();
    const ownsTransaction = !options.transaction;

    try {
      if (active) {
        const conflict = await findActiveConflict({
          deviceId,
          transaction,
        });

        if (conflict) {
          throw new Error('ActiveDeviceVehicleConflict');
        }
      }

      const relation = await DeviceVehicle.create(
        {
          device_id: deviceId,
          vehicle_id: vehicleId,
          branch_id: branchId,
          active,
        },
        { ...options, transaction }
      );

      if (ownsTransaction) {
        await transaction.commit();
      }

      return relation;
    } catch (error) {
      if (ownsTransaction && !transaction.finished) {
        await transaction.rollback();
      }
      throw error;
    }
  },

  async update(relation, body, options = {}) {
    const nextDeviceId = body.device_id ?? relation.device_id;
    const nextActive = body.active ?? relation.active;

    const transaction = options.transaction || await sequelize.transaction();
    const ownsTransaction = !options.transaction;

    try {
      if (nextActive) {
        const conflict = await findActiveConflict({
          deviceId: nextDeviceId,
          excludeId: relation.id,
          transaction,
        });

        if (conflict) {
          throw new Error('ActiveDeviceVehicleConflict');
        }
      }

      const fieldsToUpdate = ['device_id', 'vehicle_id', 'branch_id', 'active'];
      const updatedData = Object.keys(body)
        .filter((key) => fieldsToUpdate.includes(key) && body[key] !== undefined)
        .reduce((result, key) => {
          result[key] = body[key];
          return result;
        }, {});

      await relation.update(updatedData, { ...options, transaction });

      if (ownsTransaction) {
        await transaction.commit();
      }

      return relation;
    } catch (error) {
      if (ownsTransaction && !transaction.finished) {
        await transaction.rollback();
      }
      throw error;
    }
  },

  async deactivate(relation, options = {}) {
    return this.update(relation, { active: false }, options);
  },

  async delete(relation, options = {}) {
    if (relation.active) {
      throw new Error('ActiveDeviceVehicleCannotDelete');
    }

    return relation.destroy(options);
  },
};

module.exports = DeviceVehicleRepository;
