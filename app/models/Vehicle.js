'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Vehicle extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Vehicle.belongsTo(models.Structure, {
        foreignKey: 'structure_id',
        as: 'structure',
        onDelete: 'SET NULL'
      });

      // Relación de muchos a muchos con Branches
    Vehicle.belongsToMany(models.Branch, {
      through: 'BranchVehicle',
      foreignKey: 'vehicle_id',
      otherKey: 'branch_id',
      as: 'branches'
    });

    // Relación muchos a muchos con Worker
    Vehicle.belongsToMany(models.Worker, {
      through: 'VehicleWorker',
      foreignKey: 'vehicle_id',
      otherKey: 'worker_id',
      as: 'workers' // Alias para acceder a los trabajadores de un vehículo
    });

    Vehicle.hasMany(models.Trip, { foreignKey: 'vehicle_id', as: 'trips' });
    Vehicle.hasMany(models.TripTemplate, { foreignKey: 'vehicle_id', as: 'triptemplates' });
    }
  }
  Vehicle.init({
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    structure_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    brand: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    model: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    plate: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    internal_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    rut: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    seats: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    state: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'Vehicle',
    tableName: 'vehicles',
    timestamps: true
  });
  return Vehicle;
};
