'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DeviceVehicle extends Model {
    static associate(models) {
      DeviceVehicle.belongsTo(models.Device, {
        foreignKey: 'device_id',
        as: 'device',
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });

      DeviceVehicle.belongsTo(models.Vehicle, {
        foreignKey: 'vehicle_id',
        as: 'vehicle',
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });

      DeviceVehicle.belongsTo(models.Branch, {
        foreignKey: 'branch_id',
        as: 'branch',
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });
    }
  }

  DeviceVehicle.init(
    {
      id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      device_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        validate: {
          notNull: {
            msg: 'El campo device_id es obligatorio',
          },
          isInt: {
            msg: 'El campo device_id debe ser un número entero',
          },
        },
      },
      vehicle_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        validate: {
          notNull: {
            msg: 'El campo vehicle_id es obligatorio',
          },
          isInt: {
            msg: 'El campo vehicle_id debe ser un número entero',
          },
        },
      },
      branch_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notNull: {
            msg: 'El campo branch_id es obligatorio',
          },
          isInt: {
            msg: 'El campo branch_id debe ser un número entero',
          },
        },
      },
      active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'DeviceVehicle',
      tableName: 'device_vehicles',
      timestamps: true,
    }
  );

  return DeviceVehicle;
};
