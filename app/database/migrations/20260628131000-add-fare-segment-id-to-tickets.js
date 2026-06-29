'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('tickets', 'fare_segment_id', {
      type: Sequelize.BIGINT,
      allowNull: true,
      references: {
        model: 'fare_segments',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('tickets', 'fare_segment_id');
  },
};
