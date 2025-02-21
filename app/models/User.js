'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      User.hasMany(models.UserToken, {
        foreignKey: 'user_id',   // Clave foránea en la tabla Configuration
        as: 'tokens',     // Alias para acceder a las configuraciones del usuario
        onDelete: 'CASCADE'
      });

      User.hasMany(models.Company, {
        foreignKey: 'user_id',   // Clave foránea en la tabla Configuration
        as: 'companies',     // Alias para acceder a las configuraciones del usuario
        onDelete: 'CASCADE'
      });

      // Relación uno a uno con Worker
      this.hasOne(models.Worker, {
        foreignKey: 'user_id', // Clave foránea en la tabla workers
        as: 'worker',        // Alias para acceder a la relación
        onDelete: 'CASCADE'
      });

      User.hasMany(models.Ticket, { foreignKey: 'user_id', as: 'tickets' });
      User.hasMany(models.Incident, { foreignKey: 'user_id', as: 'incidents' });
      User.hasMany(models.Notification, { foreignKey: 'user_id', as: 'notifications' });
    }
  }
  User.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,   // Indica que 'id' es la clave primaria
      autoIncrement: true // Esto hace que el campo 'id' sea auto-incrementable
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,  // El nombre no puede ser nulo
      validate: {        
      len: {
        args: [2, 255],
        msg: "El nombre tiene que ser minimamente de dos caracteres"
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
    email_verified_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,  // Puedes ajustar esto según si el password es obligatorio o no
      validate: {
        len: {
          args: [2, 255],
          msg: "El contraseña tiene que ser minimamente de seis  caracteres"
        }
      }
    },
    remember_token: {
      type: DataTypes.STRING,
      allowNull: true,
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users', // Asegúrate de que el nombre de la tabla sea correcto
    timestamps: true, // Si deseas incluir createdAt y updatedAt
  });
  return User;
};