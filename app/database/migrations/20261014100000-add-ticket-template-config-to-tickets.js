'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('tickets');

    if (!table.ticket_template_config) {
      await queryInterface.addColumn('tickets', 'ticket_template_config', {
        type: Sequelize.JSON,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('tickets');

    if (table.ticket_template_config) {
      await queryInterface.removeColumn('tickets', 'ticket_template_config');
    }
  },
};
