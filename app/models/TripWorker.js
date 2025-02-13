'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TripWorker extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here

      // Relación con el modelo 'Trip'
      TripWorker.belongsTo(models.Trip, {
        foreignKey: 'trip_id',
        as: 'trip'
      });

      // Relación con el modelo 'Worker'
      TripWorker.belongsTo(models.Worker, {
        foreignKey: 'worker_id',
        as: 'worker'
      });

      // Relación con el modelo 'Worker'
      TripWorker.belongsTo(models.Branch, {
        foreignKey: 'branch_id',
        as: 'branch'
      });
    }
  }
  TripWorker.init({
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
    trip_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: {
          msg: 'El campo trip_id es obligatorio'
        },
        isInt: {
          msg: 'El campo trip_id debe ser un número entero'
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
    },
    date: DataTypes.DATEONLY
  }, {
    sequelize,
    modelName: 'TripWorker',
    tableName: 'trip_workers',
    timestamps: true
  });
  return TripWorker;
};