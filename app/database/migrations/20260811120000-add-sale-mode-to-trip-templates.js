'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('trip_templates', 'sale_mode', {
      type: Sequelize.STRING(32),
      allowNull: true,
      defaultValue: 'normal',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('trip_templates', 'sale_mode');
  },
};
