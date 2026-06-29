'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FareSegment extends Model {
    static associate(models) {
      FareSegment.belongsTo(models.Company, {
        foreignKey: 'company_id',
        as: 'company',
      });

      FareSegment.belongsTo(models.Route, {
        foreignKey: 'route_id',
        as: 'route',
      });

      FareSegment.belongsTo(models.RouteStop, {
        foreignKey: 'origin_route_stop_id',
        as: 'originRouteStop',
      });

      FareSegment.belongsTo(models.RouteStop, {
        foreignKey: 'destination_route_stop_id',
        as: 'destinationRouteStop',
      });

      FareSegment.hasMany(models.Ticket, {
        foreignKey: 'fare_segment_id',
        as: 'tickets',
      });
    }
  }

  FareSegment.init(
    {
      id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notNull: { msg: 'El campo company_id es obligatorio' },
          isInt: { msg: 'El campo company_id debe ser un número entero' },
        },
      },
      route_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        validate: {
          notNull: { msg: 'El campo route_id es obligatorio' },
          isInt: { msg: 'El campo route_id debe ser un número entero' },
        },
      },
      origin_route_stop_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        validate: {
          notNull: { msg: 'El campo origin_route_stop_id es obligatorio' },
          isInt: { msg: 'El campo origin_route_stop_id debe ser un número entero' },
        },
      },
      destination_route_stop_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        validate: {
          notNull: { msg: 'El campo destination_route_stop_id es obligatorio' },
          isInt: { msg: 'El campo destination_route_stop_id debe ser un número entero' },
        },
      },
      service_class: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      base_price: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
          isDecimal: true,
        },
      },
      currency: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'CLP',
      },
      valid_from: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      valid_to: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      priority: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'FareSegment',
      tableName: 'fare_segments',
      timestamps: true,
    }
  );

  return FareSegment;
};
