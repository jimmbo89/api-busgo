'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('trips');

    if (!table.sale_mode) {
      await queryInterface.addColumn('trips', 'sale_mode', {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: 'normal',
      });
    }

    if (!table.trip_template_id) {
      await queryInterface.addColumn('trips', 'trip_template_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'trip_templates',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('trips');

    if (table.trip_template_id) {
      await queryInterface.removeColumn('trips', 'trip_template_id');
    }

    if (table.sale_mode) {
      await queryInterface.removeColumn('trips', 'sale_mode');
    }
  },
};
