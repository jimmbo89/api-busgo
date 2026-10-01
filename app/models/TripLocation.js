'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TripLocation extends Model {
    static associate(models) {
      TripLocation.belongsTo(models.Trip, {
        foreignKey: 'trip_id',
        as: 'trip',
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });

      TripLocation.belongsTo(models.Device, {
        foreignKey: 'device_id',
        as: 'device',
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });

      TripLocation.belongsTo(models.Vehicle, {
        foreignKey: 'vehicle_id',
        as: 'vehicle',
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });
    }
  }

  TripLocation.init(
    {
      id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      trip_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      device_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      vehicle_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: false,
        validate: {
          min: {
            args: [-90],
            msg: 'La latitud debe ser mayor o igual a -90',
          },
          max: {
            args: [90],
            msg: 'La latitud debe ser menor o igual a 90',
          },
        },
      },
      longitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: false,
        validate: {
          min: {
            args: [-180],
            msg: 'La longitud debe ser mayor o igual a -180',
          },
          max: {
            args: [180],
            msg: 'La longitud debe ser menor o igual a 180',
          },
        },
      },
      accuracy: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: true,
        validate: {
          min: {
            args: [0],
            msg: 'La precisión no puede ser negativa',
          },
        },
      },
      captured_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'TripLocation',
      tableName: 'trip_locations',
      timestamps: true,
    }
  );

  return TripLocation;
};
