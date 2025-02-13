'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PermissionRole extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      PermissionRole.belongsTo(models.Permission, {
        foreignKey: 'permission_id',
        as: 'permission',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
      PermissionRole.belongsTo(models.Role, {
        foreignKey: 'role_id',
        as: 'role',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
    }
  }
  PermissionRole.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,   // Indica que 'id' es la clave primaria
      autoIncrement: true // Esto hace que el campo 'id' sea auto-incrementable
    },
    permission_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: {
          msg: 'El campo permission_id es obligatorio'
        },
        isInt: {
          msg: 'El campo permission_id debe ser un número entero'
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
    modelName: 'PermissionRole',
    tableName: 'permission_roles',
    timestamps: true
  });
  return PermissionRole;
};