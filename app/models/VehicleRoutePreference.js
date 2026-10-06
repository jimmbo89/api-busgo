'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class VehicleRoutePreference extends Model {
    static associate(models) {
      VehicleRoutePreference.belongsTo(models.Vehicle, {
        foreignKey: 'vehicle_id',
        as: 'vehicle',
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });

      VehicleRoutePreference.belongsTo(models.Route, {
        foreignKey: 'route_id',
        as: 'route',
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });

      VehicleRoutePreference.belongsTo(models.Branch, {
        foreignKey: 'branch_id',
        as: 'branch',
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });

    }
  }

  VehicleRoutePreference.init(
    {
      id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      vehicle_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        validate: {
          isInt: {
            msg: 'El campo vehicle_id debe ser un número entero',
          },
          min: {
            args: [1],
            msg: 'El campo vehicle_id debe ser mayor que cero',
          },
        },
      },
      route_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        validate: {
          isInt: {
            msg: 'El campo route_id debe ser un número entero',
          },
          min: {
            args: [1],
            msg: 'El campo route_id debe ser mayor que cero',
          },
        },
      },
      // Legacy columns kept nullable for a possible future branch-scoped flow.
      // The current vehicle form never reads or writes these values.
      branch_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      priority: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'VehicleRoutePreference',
      tableName: 'vehicle_route_preferences',
      timestamps: true,
    }
  );

  return VehicleRoutePreference;
};
