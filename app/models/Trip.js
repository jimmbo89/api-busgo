'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Trip extends Model {
    static associate(models) {
      Trip.belongsTo(models.Branch, { foreignKey: 'branch_id', as: 'branch' });
      Trip.belongsTo(models.Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });
      Trip.belongsTo(models.Route, { foreignKey: 'route_id', as: 'route' });

      // Relación de muchos a muchos con workers
      Trip.belongsToMany(models.Worker, {
        through: 'TripWorker',
        foreignKey: 'trip_id',
        otherKey: 'worker_id',
        as: 'workers'
      });

      Trip.hasMany(models.Ticket, { foreignKey: 'trip_id', as: 'tickets' });
    }
  }
  Trip.init({
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
    },
    route_id: {
      type: DataTypes.INTEGER,
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
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    schedule: {
      type: DataTypes.TIME,
      allowNull: true
    },
    arrival: {
      type: DataTypes.TIME,
      allowNull: true
    },
    start: {
      type: DataTypes.TIME,
      allowNull: true
    },
    end: {
      type: DataTypes.TIME,
      allowNull: true
    },
    price: {
      type: DataTypes.DECIMAL(10, 2), // Define el tipo de datos para el precio
      allowNull: false, // Si el precio es obligatorio
      validate: {
        isDecimal: true, // Valida que el valor sea un decimal
      },
    },
  }, {
    sequelize,
    modelName: 'Trip',
    tableName: 'trips',
    timestamps: true,
    hooks: {
      beforeCreate: async (trip, options) => {
        const existingTrip = await Trip.findOne({
          where: {
            branch_id: trip.branch_id,
            vehicle_id: trip.vehicle_id,
            route_id: trip.route_id,
            date: trip.date,
            schedule: trip.schedule
          }
        });
        if (existingTrip) {
          throw new Error('A trip with the same vehicle, route, date, and schedule time already exists.');
        }
      }
    }
  });
  return Trip;
};