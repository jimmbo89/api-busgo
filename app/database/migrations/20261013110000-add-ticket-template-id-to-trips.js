'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('trips');

    if (!table.ticket_template_id) {
      await queryInterface.addColumn('trips', 'ticket_template_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        // `trips` es una tabla histórica y puede tener charset/collation
        // distinto al de `ticket_templates`; la integridad se valida en la API.
      });
    }

    await queryInterface.addIndex('trips', ['ticket_template_id'], {
      name: 'trips_ticket_template_id_idx',
    });
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('trips');

    if (table.ticket_template_id) {
      await queryInterface.removeIndex('trips', 'trips_ticket_template_id_idx');
      await queryInterface.removeColumn('trips', 'ticket_template_id');
    }
  },
};
