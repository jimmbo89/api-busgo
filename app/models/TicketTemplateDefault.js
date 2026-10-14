'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TicketTemplateDefault extends Model {
    static associate(models) {
      TicketTemplateDefault.belongsTo(models.TicketTemplate, {
        foreignKey: 'ticket_template_id',
        as: 'ticketTemplate',
      });
    }
  }

  TicketTemplateDefault.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true,
      },
      company_id: {
        type: DataTypes.STRING(36),
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
      ticket_template_id: {
        type: DataTypes.INTEGER,
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
      modelName: 'TicketTemplateDefault',
      tableName: 'ticket_template_defaults',
      timestamps: true,
    }
  );

  return TicketTemplateDefault;
};
