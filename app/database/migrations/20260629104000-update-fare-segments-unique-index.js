'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addIndex(
      'fare_segments',
      ['company_id', 'route_id', 'origin_route_stop_id', 'destination_route_stop_id'],
      {
        unique: true,
        name: 'fare_segments_unique_segment_v2',
      }
    );

    await queryInterface.removeIndex('fare_segments', 'fare_segments_unique_segment');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addIndex(
      'fare_segments',
      ['company_id', 'route_id', 'origin_route_stop_id', 'destination_route_stop_id', 'service_class'],
      {
        unique: true,
        name: 'fare_segments_unique_segment',
      }
    );

    await queryInterface.removeIndex('fare_segments', 'fare_segments_unique_segment_v2');
  },
};
