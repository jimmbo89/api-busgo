'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Estas columnas ya forman parte de create-ticket en instalaciones nuevas.
    // Solo se agregan si faltan para conservar compatibilidad con esquemas antiguos.
    const columns = await queryInterface.describeTable('tickets');

    if (!columns.qr) {
      await queryInterface.addColumn('tickets', 'qr', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    if (!columns.barcode) {
      await queryInterface.addColumn('tickets', 'barcode', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }
  },

  // qr y barcode pertenecen al esquema base de tickets; no se eliminan al
  // revertir esta migración para no borrar columnas creadas por create-ticket.
  down: async () => {}
};
