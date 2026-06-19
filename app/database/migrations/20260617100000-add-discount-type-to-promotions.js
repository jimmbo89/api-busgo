'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('promotions', 'discount_type', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'monto',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('promotions', 'discount_type');
  }
};
