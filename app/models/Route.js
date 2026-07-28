'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Route extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Route.belongsTo(models.Location, {
        as: 'origin',
        foreignKey: 'origin_id',
      });

      Route.belongsTo(models.Location, {
        as: 'destination',
        foreignKey: 'destination_id',
      });

      Route.belongsToMany(models.Branch, {
        through: models.BranchRoute,
        foreignKey: 'route_id',
        otherKey: 'branch_id',
        as: 'branches'
      });

      Route.hasMany(models.Trip, { foreignKey: 'route_id', as: 'trips' });
      Route.hasMany(models.TripTemplate, { foreignKey: 'route_id', as: 'triptemplates' });
      Route.hasMany(models.RouteStop, { foreignKey: 'route_id', as: 'routeStops' });
      Route.hasMany(models.FareSegment, { foreignKey: 'route_id', as: 'fareSegments' });
    }
  }
  Route.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,   // Indica que 'id' es la clave primaria
      autoIncrement: true // Esto hace que el campo 'id' sea auto-incrementable
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING(16),
      allowNull: true,
      unique: true,
    },
    origin_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: {
          msg: 'El campo origin_id es obligatorio'
        },
        isInt: {
          msg: 'El campo origin_id debe ser un número entero'
        }
      }
    },
    destination_id:  {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: {
          msg: 'El campo destination_id es obligatorio'
        },
        isInt: {
          msg: 'El campo destination_id debe ser un número entero'
        }
      }
    },
    distance: {
      type: DataTypes.DECIMAL(14,2),
      allowNull: true,
    },
    estimated: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1
    }
  }, {
    sequelize,
    modelName: 'Route',
    tableName: 'routes',
    timestamps:true
  });
  return Route;
};
