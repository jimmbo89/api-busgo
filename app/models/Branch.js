'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Branch extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      // Definimos la relación muchos a uno con `Company`
      Branch.belongsTo(models.Company, {
        foreignKey: 'company_id',
        as: 'company',
        onDelete: 'CASCADE'
      });

      Branch.belongsToMany(models.Worker, {
        through: models.BranchWorker,
        foreignKey: 'branch_id',
        otherKey: 'worker_id',
        as: 'workers'
      });

      // Definimos la relación uno a muchos con `Device`
      Branch.hasMany(models.Device, {
        foreignKey: 'branch_id',
        as: 'devices',
        onDelete: 'CASCADE'
      });

      Branch.belongsToMany(models.Route, {
        through: models.BranchRoute,
        foreignKey: 'branch_id',
        otherKey: 'route_id',
        as: 'routes'
      });

      // Relación de muchos a muchos con Vehicles
      Branch.belongsToMany(models.Vehicle, {
        through: 'BranchVehicle',
        foreignKey: 'branch_id',
        otherKey: 'vehicle_id',
        as: 'vehicles'
      });

    Branch.hasMany(models.Trip, { foreignKey: 'branch_id', as: 'trips' });
    Branch.hasMany(models.TripWorker, { foreignKey: 'branch_id', as: 'tripworkers' });
    Branch.hasMany(models.Ticket, { foreignKey: 'branch_id', as: 'tickets' });
    Branch.hasMany(models.Incident, { foreignKey: 'branch_id', as: 'incidents' });
    Branch.hasMany(models.Notification, { foreignKey: 'branch_id', as: 'notifications' });
    }
  }
  Branch.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,   // Indica que 'id' es la clave primaria
      autoIncrement: true // Esto hace que el campo 'id' sea auto-incrementable
    },
    company_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
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
    modelName: 'Branch',
    tableName: 'branches', // Nombre de la tabla
    timestamps: true
  });
  return Branch;
};