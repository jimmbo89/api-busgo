'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TicketTemplate extends Model {
    static associate(models) {
      TicketTemplate.hasMany(models.TicketTemplateDefault, {
        foreignKey: 'ticket_template_id',
        as: 'defaults',
        onDelete: 'CASCADE',
      });
      TicketTemplate.hasMany(models.TripTemplate, {
        foreignKey: 'ticket_template_id',
        as: 'tripTemplates',
        onDelete: 'SET NULL',
      });
    }
  }

  TicketTemplate.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true,
      },
      company_id: {
        type: DataTypes.STRING(36),
        allowNull: true,
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
            args: [['active', 'inactive', 'deleted']],
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
