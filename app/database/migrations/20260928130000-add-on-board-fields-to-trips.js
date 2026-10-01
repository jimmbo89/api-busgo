'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('trips');

    if (!table.device_id) {
      await queryInterface.addColumn('trips', 'device_id', {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: 'devices',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }

    if (!table.finish_method) {
      await queryInterface.addColumn('trips', 'finish_method', {
        type: Sequelize.STRING(32),
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('trips');

    if (table.finish_method) {
      await queryInterface.removeColumn('trips', 'finish_method');
    }

    if (table.device_id) {
      await queryInterface.removeColumn('trips', 'device_id');
    }
  },
};
