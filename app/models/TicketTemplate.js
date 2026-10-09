'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TicketTemplate extends Model {}

  TicketTemplate.init(
    {
      id: {
        type: DataTypes.STRING(36),
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      company_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      trip_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          isValidTripType(value) {
            if (!['normal', 'express', 'on_board'].includes(String(value).trim().toLowerCase())) {
              throw new Error('El trip_type no es válido');
            }
          },
        },
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'active',
        validate: {
          isIn: {
            args: [['active', 'inactive']],
            msg: 'El status no es válido',
          },
        },
      },
      config: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updated_at',
      },
    },
    {
      sequelize,
      modelName: 'TicketTemplate',
      tableName: 'ticket_templates',
      timestamps: true,
    }
  );

  return TicketTemplate;
};
