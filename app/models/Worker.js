'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Worker extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      // Relación uno a uno con User
      this.belongsTo(models.User, {
        foreignKey: 'user_id', // Clave foránea en la tabla workers
        as: 'user',          // Alias para acceder a la relación
        onDelete: 'CASCADE'
      });

       // Relación uno a uno con Role
       this.belongsTo(models.Role, {
        foreignKey: 'role_id', // Clave foránea en la tabla workers
        as: 'role',          // Alias para acceder a la relación
        onDelete: 'CASCADE'
      });

      Worker.belongsToMany(models.Branch, {
        through: models.BranchWorker,
        foreignKey: 'worker_id',
        otherKey: 'branch_id',
        as: 'branches'
      });

      // Relación muchos a muchos con Vehicle
      Worker.belongsToMany(models.Vehicle, {
        through: 'VehicleWorker',
        foreignKey: 'worker_id',
        otherKey: 'vehicle_id',
        as: 'vehicles' // Alias para acceder a los vehículos de un trabajador
      });

      // Relación de muchos a muchos con trips
      Worker.belongsToMany(models.Trip, {
        through: 'TripWorker',
        foreignKey: 'worker_id',
        otherKey: 'trip_id',
        as: 'trips'
      });

      Worker.hasMany(models.BranchWorker, { foreignKey: 'worker_id', as: 'branchWorkers' });
    }
  }
  Worker.init({
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
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,  // El nombre no puede ser nulo
      validate: {        
      len: {
        args: [2, 255],
        msg: "El nombre tiene que ser minimamente de dos caracteres a 255"
      }
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,  // El correo debe ser único
      validate: {
        isEmail: {
          msg: 'Debe ser un correo electrónico válido'
        }
      },
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
    modelName: 'Worker',
    tableName: 'workers',
    timestamps: true
  });
  return Worker;
};