'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('tickets', 'qr', {
      type: Sequelize.STRING,
      allowNull: true, // o false si es obligatorio
    });
    await queryInterface.addColumn('tickets', 'barcode', {
      type: Sequelize.STRING,
      allowNull: true, // o false si es obligatorio
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('tickets', 'qr');
    await queryInterface.removeColumn('tickets', 'barcode');
  }
};
