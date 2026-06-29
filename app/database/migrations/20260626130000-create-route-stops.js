'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('route_stops', {
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
      route_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'routes',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      location_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'locations',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      stop_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      distance_km: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: true,
        defaultValue: 0,
      },
      minutes_from_origin: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      allows_boarding: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      allows_alighting: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    await queryInterface.addConstraint('route_stops', {
      fields: ['route_id', 'stop_order'],
      type: 'unique',
      name: 'unique_route_stop_order'
    });

    await queryInterface.addConstraint('route_stops', {
      fields: ['route_id', 'location_id'],
      type: 'unique',
      name: 'unique_route_stop_location'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint('route_stops', 'unique_route_stop_order');
    await queryInterface.removeConstraint('route_stops', 'unique_route_stop_location');
    await queryInterface.dropTable('route_stops');
  }
};
