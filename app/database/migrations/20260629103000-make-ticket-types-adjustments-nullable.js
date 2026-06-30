'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('ticket_types', 'adjustment_type', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null,
    });

    await queryInterface.changeColumn('ticket_types', 'value_type', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null,
    });

    await queryInterface.changeColumn('ticket_types', 'adjustment_value', {
      type: Sequelize.DOUBLE,
      allowNull: true,
      defaultValue: null,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('ticket_types', 'adjustment_type', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'descuento',
    });

    await queryInterface.changeColumn('ticket_types', 'value_type', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'monto',
    });

    await queryInterface.changeColumn('ticket_types', 'adjustment_value', {
      type: Sequelize.DOUBLE,
      allowNull: false,
      defaultValue: 0,
    });
  },
};
