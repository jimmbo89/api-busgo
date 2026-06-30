'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('trips', 'price', {
      type: Sequelize.DECIMAL(16, 2),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('trips', 'price', {
      type: Sequelize.DECIMAL(16, 2),
      allowNull: false,
    });
  },
};
