'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('trip_stops', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT
      },
      company_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'companies',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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
      route_stop_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'route_stops',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      stop_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      arrival_time: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      departure_time: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      can_board: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      can_alight: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      source_type: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'auto',
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    await queryInterface.addConstraint('trip_stops', {
      fields: ['trip_id', 'stop_order'],
      type: 'unique',
      name: 'unique_trip_stop_order'
    });

    await queryInterface.addConstraint('trip_stops', {
      fields: ['trip_id', 'route_stop_id'],
      type: 'unique',
      name: 'unique_trip_stop_route_stop'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint('trip_stops', 'unique_trip_stop_order');
    await queryInterface.removeConstraint('trip_stops', 'unique_trip_stop_route_stop');
    await queryInterface.dropTable('trip_stops');
  }
};
