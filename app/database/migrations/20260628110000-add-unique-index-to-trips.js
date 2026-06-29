'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addIndex('trips', [
      'branch_id',
      'vehicle_id',
      'route_id',
      'date',
      'schedule',
    ], {
      unique: true,
      name: 'trips_unique_branch_vehicle_route_date_schedule',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex(
      'trips',
      'trips_unique_branch_vehicle_route_date_schedule'
    );
  },
};
