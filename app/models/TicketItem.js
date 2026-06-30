'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TicketItem extends Model {
    static associate(models) {
      TicketItem.belongsTo(models.Ticket, {
        foreignKey: 'ticket_id',
        as: 'ticket',
      });
      TicketItem.belongsTo(models.TicketType, {
        foreignKey: 'ticket_type_id',
        as: 'ticketType',
      });
      TicketItem.belongsTo(models.TripFare, {
        foreignKey: 'trip_fare_id',
        as: 'tripFare',
      });
    }
  }

  TicketItem.init(
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      ticket_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notNull: { msg: 'El campo ticket_id es obligatorio' },
          isInt: { msg: 'El campo ticket_id debe ser un numero entero' },
        },
      },
      ticket_type_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          isInt: { msg: 'El campo ticket_type_id debe ser un numero entero' },
        },
      },
      trip_fare_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        validate: {
          isInt: { msg: 'El campo trip_fare_id debe ser un numero entero' },
        },
      },
      ticket_type_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      ticket_type_description: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
          isInt: { msg: 'El campo quantity debe ser un numero entero' },
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
      unit_price: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
          isDecimal: true,
        },
      },
      subtotal: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
          isDecimal: true,
        },
      },
      currency: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'CLP',
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
      modelName: 'TicketItem',
      tableName: 'ticket_items',
      timestamps: true,
    }
  );

  return TicketItem;
};
