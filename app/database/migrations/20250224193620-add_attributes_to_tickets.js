"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("tickets", "transactionStatus", {
      type: Sequelize.BOOLEAN,
      allowNull: true, // Puede ser null
    });
    await queryInterface.addColumn("tickets", "sequenceNumber", {
      type: Sequelize.STRING(12), // Cadena de texto de 12 dígitos
      allowNull: true, // Puede ser null
    });
    await queryInterface.addColumn("tickets", "extraData", {
      type: Sequelize.JSON, // Tipo JSON
      allowNull: true, // Puede ser null
    });
    await queryInterface.addColumn("tickets", "transactionTip", {
      type: Sequelize.DECIMAL(10, 2), // Decimal para manejar montos
      allowNull: true, // Puede ser null
    });
    await queryInterface.addColumn("tickets", "transactionCashback", {
      type: Sequelize.DECIMAL(14, 2), // Decimal para manejar montos
      allowNull: true, // Puede ser null
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('tickets', 'transactionStatus');
        await queryInterface.removeColumn('tickets', 'sequenceNumber');
        await queryInterface.removeColumn('tickets', 'extraData');
        await queryInterface.removeColumn('tickets', 'transactionTip');
        await queryInterface.removeColumn('tickets', 'transactionCashback');
  },
};
