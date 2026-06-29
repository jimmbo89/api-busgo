'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class RouteStop extends Model {
    static associate(models) {
      RouteStop.belongsTo(models.Company, {
        foreignKey: 'company_id',
        as: 'company',
      });

      RouteStop.belongsTo(models.Route, {
        foreignKey: 'route_id',
        as: 'route',
      });

      RouteStop.belongsTo(models.Location, {
        foreignKey: 'location_id',
        as: 'location',
      });

      RouteStop.hasMany(models.TripStop, {
        foreignKey: 'route_stop_id',
        as: 'tripStops',
      });
    }
  }
  RouteStop.init({
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: {
          msg: 'El campo company_id es obligatorio'
        },
        isInt: {
          msg: 'El campo company_id debe ser un número entero'
        }
      }
    },
    route_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      validate: {
        notNull: {
          msg: 'El campo route_id es obligatorio'
        },
        isInt: {
          msg: 'El campo route_id debe ser un número entero'
        }
      }
    },
    location_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      validate: {
        notNull: {
          msg: 'El campo location_id es obligatorio'
        },
        isInt: {
          msg: 'El campo location_id debe ser un número entero'
        }
      }
    },
    stop_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: {
          msg: 'El campo stop_order es obligatorio'
        },
        isInt: {
          msg: 'El campo stop_order debe ser un número entero'
        }
      }
    },
    distance_km: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: true,
      defaultValue: 0,
    },
    minutes_from_origin: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    allows_boarding: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    allows_alighting: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    }
  }, {
    sequelize,
    modelName: 'RouteStop',
    tableName: 'route_stops',
    timestamps: true,
  });
  return RouteStop;
};
