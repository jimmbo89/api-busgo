'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FareSegmentTicketType extends Model {
    static associate(models) {
      FareSegmentTicketType.belongsTo(models.FareSegment, {
        foreignKey: 'fare_segment_id',
        as: 'fareSegment',
      });

      FareSegmentTicketType.belongsTo(models.TicketType, {
        foreignKey: 'ticket_type_id',
        as: 'ticketType',
      });

      FareSegmentTicketType.hasMany(models.TripFare, {
        foreignKey: 'fare_segment_ticket_type_id',
        as: 'tripFares',
      });
    }
  }

  FareSegmentTicketType.init(
    {
      id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      fare_segment_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        validate: {
          notNull: { msg: 'El campo fare_segment_id es obligatorio' },
          isInt: { msg: 'El campo fare_segment_id debe ser un número entero' },
        },
      },
      ticket_type_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notNull: { msg: 'El campo ticket_type_id es obligatorio' },
          isInt: { msg: 'El campo ticket_type_id debe ser un número entero' },
        },
      },
      base_price: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        validate: {
          isDecimal: true,
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
      modelName: 'FareSegmentTicketType',
      tableName: 'fare_segment_ticket_types',
      timestamps: true,
    }
  );

  return FareSegmentTicketType;
};
