'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class VehicleWorker extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
       // Relación de muchos a muchos entre Vehicle y Worker
       VehicleWorker.belongsTo(models.Vehicle, {
        foreignKey: 'vehicle_id',
        as: 'vehicle', // Alias para acceder al vehículo
      });
      VehicleWorker.belongsTo(models.Worker, {
        foreignKey: 'worker_id',
        as: 'worker', // Alias para acceder al trabajador
      });
    }
  }
  VehicleWorker.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,   // Indica que 'id' es la clave primaria
      autoIncrement: true // Esto hace que el campo 'id' sea auto-incrementable
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
    },
    worker_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: {
          msg: 'El campo worker_id es obligatorio'
        },
        isInt: {
          msg: 'El campo worker_id debe ser un número entero'
        }
      }
    }
  }, {
    sequelize,
    modelName: 'VehicleWorker',
    tableName: 'vehicle_workers',
    timestamps: true
  });
  return VehicleWorker;
};