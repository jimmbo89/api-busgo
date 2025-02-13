'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('companies', 'user_id', {
      type: Sequelize.BIGINT,
      allowNull: true, // o false, dependiendo de tus requisitos
      references: {
        model: 'users', // nombre de la tabla referenciada
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('companies', 'user_id');
  }
};
