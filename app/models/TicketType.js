'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TicketType extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      TicketType.hasMany(models.FareSegmentTicketType, {
        foreignKey: 'ticket_type_id',
        as: 'fareSegmentTicketTypes',
      });
      TicketType.hasMany(models.TicketItem, {
        foreignKey: 'ticket_type_id',
        as: 'ticketItems',
      });
    }
  }
  TicketType.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true, // Indica que 'id' es la clave primaria
        autoIncrement: true, // Esto hace que el campo 'id' sea auto-incrementable
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      adjustment_type: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      value_type: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      adjustment_value: {
        type: DataTypes.DOUBLE,
        allowNull: true,
      },
      active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "TicketType",
      tableName: "ticket_types",
      timestamps: true
    }
  );
  return TicketType;
};
