'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addIndex('trips', ['trip_template_id', 'date', 'schedule'], {
      unique: true,
      name: 'trips_unique_template_date_schedule',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('trips', 'trips_unique_template_date_schedule');
  },
};
