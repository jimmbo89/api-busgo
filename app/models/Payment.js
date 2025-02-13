"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Payment extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Payment.belongsTo(models.Ticket, {
        foreignKey: "ticket_id",
        as: "ticket",
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      });
    }
  }
  Payment.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true, // Indica que 'id' es la clave primaria
        autoIncrement: true, // Esto hace que el campo 'id' sea auto-incrementable
      },
      ticket_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notNull: {
            msg: "El campo ticket_id es obligatorio",
          },
          isInt: {
            msg: "El campo ticket_id debe ser un número entero",
          },
        },
      },
      idempotencyKey: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      dteType: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      device: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      exemptAmount: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      customFields: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Payment",
      tableName: "payments",
      timestamps: true,
    }
  );
  return Payment;
};
