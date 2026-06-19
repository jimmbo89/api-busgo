'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('ticket_types', 'adjustment_type', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'descuento',
    });

    await queryInterface.addColumn('ticket_types', 'value_type', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'monto',
    });

    await queryInterface.addColumn('ticket_types', 'adjustment_value', {
      type: Sequelize.DOUBLE,
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('ticket_types', 'adjustment_value');
    await queryInterface.removeColumn('ticket_types', 'value_type');
    await queryInterface.removeColumn('ticket_types', 'adjustment_type');
  }
};
