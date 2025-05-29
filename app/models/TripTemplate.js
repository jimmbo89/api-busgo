'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TripTemplate extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      TripTemplate.belongsTo(models.Branch, { foreignKey: 'branch_id', as: 'branch' });
      TripTemplate.belongsTo(models.Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });
      TripTemplate.belongsTo(models.Route, { foreignKey: 'route_id', as: 'route' });
      TripTemplate.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    }
  }
  TripTemplate.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true, // Indica que 'id' es la clave primaria
        autoIncrement: true, // Esto hace que el campo 'id' sea auto-incrementable
      },
      branch_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notNull: {
            msg: "El campo branch_id es obligatorio",
          },
          isInt: {
            msg: "El campo branch_id debe ser un número entero",
          },
        },
      },
      vehicle_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notNull: {
            msg: "El campo vehicle_id es obligatorio",
          },
          isInt: {
            msg: "El campo vehicle_id debe ser un número entero",
          },
        },
      },
      route_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notNull: {
            msg: "El campo route_id es obligatorio",
          },
          isInt: {
            msg: "El campo route_id debe ser un número entero",
          },
        },
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notNull: {
            msg: "El campo user_id es obligatorio",
          },
          isInt: {
            msg: "El campo user_id debe ser un número entero",
          },
        },
      },
      schedule: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      duration:  {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
      price: {
        type: DataTypes.DECIMAL(16, 2), // Define el tipo de datos para el precio
        allowNull: false, // Si el precio es obligatorio
        validate: {
          isDecimal: true, // Valida que el valor sea un decimal
        },
      },
      recurrence_pattern: DataTypes.STRING,
      days_of_week: DataTypes.STRING,
      active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      workers: {
        type: DataTypes.JSON,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "TripTemplate",
      tableName: "trip_templates",
      timestamps: true,
    }
  );
  return TripTemplate;
};