'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Permission extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      // Relación muchos a muchos con Roles
    Permission.belongsToMany(models.Role, {
      through: models.PermissionRole,
      as: 'roles',
      foreignKey: 'permission_id',
      otherKey: 'role_id'
    });
    }
  }
  Permission.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,   // Indica que 'id' es la clave primaria
      autoIncrement: true // Esto hace que el campo 'id' sea auto-incrementable
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // Validación de unicidad
      validate: {
        notEmpty: { msg: 'El nombre no puede estar vacío' },
        len: { args: [3, 255], msg: 'El nombre debe tener entre 3 y 255 caracteres' }
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: { args: [0, 500], msg: 'La descripción no puede exceder los 500 caracteres' }
      }
    },
    module: {
      type: DataTypes.STRING,
      allowNull: true,
    }
  }, {
    sequelize,
    modelName: 'Permission',
    tableName: 'permissions', // Nombre de la tabla
    timestamps: true
  });
  return Permission;
};