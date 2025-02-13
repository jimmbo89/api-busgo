'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class BranchVehicle extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      BranchVehicle.belongsTo(models.Branch, {
        foreignKey: 'branch_id',
        as: 'branch' // El alias es 'branch' para acceder a la instancia de Branch
      });
  
      // Relación con el modelo BranchVehicle (cada BranchVehicle pertenece a un vehicle)
      BranchVehicle.belongsTo(models.Vehicle, {
        foreignKey: 'vehicle_id',
        as: 'vehicle' // El alias es 'vehicle' para acceder a la instancia de vehicle
      });
    }
  }
  BranchVehicle.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,   // Indica que 'id' es la clave primaria
      autoIncrement: true // Esto hace que el campo 'id' sea auto-incrementable
    },
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: {
          msg: 'El campo branch_id es obligatorio'
        },
        isInt: {
          msg: 'El campo branch_id debe ser un número entero'
        }
      }
    },
    vehicle_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: {
          msg: 'El campo vehicle_id es obligatorio'
        },
        isInt: {
          msg: 'El campo vehicle_id debe ser un número entero'
        }
      }
    }
  }, {
    sequelize,
    modelName: 'BranchVehicle',
    tableName: 'branch_vehicles',
    timestamps: true
  });
  return BranchVehicle;
};