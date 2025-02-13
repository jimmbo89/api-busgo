'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class BranchWorker extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      BranchWorker.belongsTo(models.Branch, {
        foreignKey: 'branch_id',
        as: 'branch',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
      BranchWorker.belongsTo(models.Worker, {
        foreignKey: 'worker_id',
        as: 'worker',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
      BranchWorker.belongsTo(models.Role, {
        foreignKey: 'role_id',
        as: 'role',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
    }
  }
  BranchWorker.init({
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
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: {
          msg: 'El campo role_id es obligatorio'
        },
        isInt: {
          msg: 'El campo role_id debe ser un número entero'
        }
      }
    }
  }, {
    sequelize,
    modelName: 'BranchWorker',
    tableName: 'branch_workers',
    timestamps: true
  });
  return BranchWorker;
};