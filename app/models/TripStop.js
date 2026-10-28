'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TripStop extends Model {
    static associate(models) {
      TripStop.belongsTo(models.Company, {
        foreignKey: 'company_id',
        as: 'company',
      });

      TripStop.belongsTo(models.Trip, {
        foreignKey: 'trip_id',
        as: 'trip',
      });

      TripStop.belongsTo(models.RouteStop, {
        foreignKey: 'route_stop_id',
        as: 'routeStop',
      });

      TripStop.belongsTo(models.Location, {
        foreignKey: 'location_id',
        as: 'location',
      });

      TripStop.hasMany(models.TripSegment, {
        foreignKey: 'origin_trip_stop_id',
        as: 'originTripSegments',
      });

      TripStop.hasMany(models.TripSegment, {
        foreignKey: 'destination_trip_stop_id',
        as: 'destinationTripSegments',
      });
    }
  }
  TripStop.init({
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
    trip_id: {
      type: DataTypes.BIGINT,
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
    route_stop_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    location_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
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
    arrival_time: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    departure_time: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    can_board: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    can_alight: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    source_type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'auto',
      validate: {
        isIn: [['auto', 'manual', 'override']],
      },
    }
  }, {
    sequelize,
    modelName: 'TripStop',
    tableName: 'trip_stops',
    timestamps: true,
    validate: {
      routeOrDirectLocation() {
        if (!this.route_stop_id && !this.location_id) {
          throw new Error('TripStopRouteOrLocationRequired');
        }
      },
    },
  });
  return TripStop;
};
