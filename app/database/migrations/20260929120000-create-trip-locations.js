'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('trip_locations', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      trip_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'trips',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      device_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'devices',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      vehicle_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'vehicles',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      latitude: {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: false,
      },
      longitude: {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: false,
      },
      accuracy: {
        type: Sequelize.DECIMAL(8, 2),
        allowNull: true,
      },
      captured_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex('trip_locations', ['trip_id', 'captured_at'], {
      name: 'trip_locations_trip_captured_at_idx',
    });

    await queryInterface.addIndex('trip_locations', ['device_id', 'captured_at'], {
      name: 'trip_locations_device_captured_at_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('trip_locations', 'trip_locations_device_captured_at_idx');
    await queryInterface.removeIndex('trip_locations', 'trip_locations_trip_captured_at_idx');
    await queryInterface.dropTable('trip_locations');
  },
};
