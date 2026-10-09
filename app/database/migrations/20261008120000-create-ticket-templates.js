'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ticket_templates', {
      id: {
        type: Sequelize.STRING(36),
        allowNull: false,
        primaryKey: true,
      },
      company_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      trip_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'active',
      },
      config: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('ticket_templates', ['company_id'], {
      name: 'ticket_templates_company_id_idx',
    });
    await queryInterface.addIndex('ticket_templates', ['trip_type'], {
      name: 'ticket_templates_trip_type_idx',
    });
    await queryInterface.addIndex('ticket_templates', ['status'], {
      name: 'ticket_templates_status_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ticket_templates');
  },
};
