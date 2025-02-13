"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("vehicles", "structure_id", {
      type: Sequelize.BIGINT,
      allowNull: true, // Cambiar a false si no se permite que sea nulo
      references: {
        model: "structures", // Nombre de la tabla de structures
        key: "id", // La columna de la tabla structures que actúa como clave primaria
      },
      onUpdate: "CASCADE", // Opcional, definir la acción cuando se actualiza el id en la tabla structures
      onDelete: "SET NULL", // Opcional, define lo que sucede cuando se elimina un registro de la tabla structures
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('vehicles', 'structure_id');
  },
};
