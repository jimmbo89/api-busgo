'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TripFare extends Model {
    static associate(models) {
      TripFare.belongsTo(models.Company, {
        foreignKey: 'company_id',
        as: 'company',
      });

      TripFare.belongsTo(models.Trip, {
        foreignKey: 'trip_id',
        as: 'trip',
      });

      TripFare.belongsTo(models.FareSegmentTicketType, {
        foreignKey: 'fare_segment_ticket_type_id',
        as: 'fareSegmentTicketType',
      });
      TripFare.hasMany(models.TicketItem, {
        foreignKey: 'trip_fare_id',
        as: 'ticketItems',
      });
    }
  }

  TripFare.init(
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
      trip_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        validate: {
          notNull: { msg: 'El campo trip_id es obligatorio' },
          isInt: { msg: 'El campo trip_id debe ser un número entero' },
        },
      },
      fare_segment_ticket_type_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        validate: {
          notNull: { msg: 'El campo fare_segment_ticket_type_id es obligatorio' },
          isInt: { msg: 'El campo fare_segment_ticket_type_id debe ser un número entero' },
        },
      },
      base_price: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
          isDecimal: true,
        },
      },
      price: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
          isDecimal: true,
        },
      },
      active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      source_type: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'auto',
        validate: {
          isIn: [['auto', 'manual', 'override']],
        },
      },
    },
    {
      sequelize,
      modelName: 'TripFare',
      tableName: 'trip_fares',
      timestamps: true,
    }
  );

  return TripFare;
};
