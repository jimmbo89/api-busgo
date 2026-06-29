'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Company extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      // Definimos la relación uno a muchos con `Branch`
      Company.hasMany(models.Branch, {
        foreignKey: 'company_id',
        as: 'branches',
        onDelete: 'CASCADE'
      });

      Company.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
        onDelete: 'CASCADE'
      });

      Company.hasMany(models.RouteStop, {
        foreignKey: 'company_id',
        as: 'routeStops',
      });

      Company.hasMany(models.TripStop, {
        foreignKey: 'company_id',
        as: 'tripStops',
      });

      Company.hasMany(models.FareSegment, {
        foreignKey: 'company_id',
        as: 'fareSegments',
      });
    }
  }
  Company.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,   // Indica que 'id' es la clave primaria
      autoIncrement: true // Esto hace que el campo 'id' sea auto-incrementable
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: {
          msg: 'El campo user_id es obligatorio'
        },
        isInt: {
          msg: 'El campo user_id debe ser un número entero'
        }
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    rut: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    }
  }, {
    sequelize,
    modelName: 'Company',
    tableName: 'companies', // Nombre de la tabla
    timestamps: true
  });
  return Company;
};
