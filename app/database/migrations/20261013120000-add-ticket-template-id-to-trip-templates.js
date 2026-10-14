'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('trip_templates');

    if (!table.ticket_template_id) {
      await queryInterface.addColumn('trip_templates', 'ticket_template_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        // Tabla histórica: se evita una FK física por posibles diferencias
        // de charset/collation; la relación se valida en la API.
      });
    }

    await queryInterface.addIndex('trip_templates', ['ticket_template_id'], {
      name: 'trip_templates_ticket_template_id_idx',
    });
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('trip_templates');

    if (table.ticket_template_id) {
      await queryInterface.removeIndex('trip_templates', 'trip_templates_ticket_template_id_idx');
      await queryInterface.removeColumn('trip_templates', 'ticket_template_id');
    }
  },
};
