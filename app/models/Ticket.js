'use strict';
const {
  Model
} = require('sequelize');
const logger = require('../../config/logger');
module.exports = (sequelize, DataTypes) => {
  class Ticket extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Ticket.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      Ticket.belongsTo(models.Trip, { foreignKey: 'trip_id', as: 'trip' });
      Ticket.belongsTo(models.Branch, { foreignKey: 'branch_id', as: 'branch' });
      Ticket.belongsTo(models.FareSegment, { foreignKey: 'fare_segment_id', as: 'fareSegment' });
      Ticket.hasOne(models.Payment, { foreignKey: 'ticket_id', as: 'payment', onUpdate: 'CASCADE', onDelete: 'CASCADE' });
    }
  }
  Ticket.init({
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
    trip_id: {
      type: DataTypes.INTEGER,
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
    fare_segment_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    method: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    price: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false
    },
    total: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false
    },
    seats: {
      type: DataTypes.JSON,
      allowNull: false
    },
    adults: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    minors: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    pay: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },   
    qr: {
      type: DataTypes.TEXT,
      allowNull: true
    },    
    barcode: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    transactionStatus: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    sequenceNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    extraData: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    transactionTip: {
      type: DataTypes.DECIMAL(16, 2),
      allowNull: true,
    },
    transactionCashback: {
      type: DataTypes.DECIMAL(16, 2),
      allowNull: true,
    },
    print: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    promotions: {
      type: DataTypes.JSON, // Tipo de dato JSON
      allowNull: true, // Puede ser nulo
    },
     tickettypes: {
      type: DataTypes.JSON, // Tipo de dato JSON
      allowNull: true, // Puede ser nulo
    },
    qr_status: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Ticket',
    tableName: 'tickets',
    timestamps: true
  });

  return Ticket;
};
