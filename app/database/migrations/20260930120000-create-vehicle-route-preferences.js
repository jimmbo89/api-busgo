'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('vehicle_route_preferences', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
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
      branch_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'branches',
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
      priority: {
        type: Sequelize.INTEGER,
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

    await queryInterface.addConstraint('vehicle_route_preferences', {
      fields: ['vehicle_id', 'branch_id', 'route_id'],
      type: 'unique',
      name: 'vehicle_route_preferences_vehicle_branch_route_unique',
    });

    await queryInterface.addConstraint('vehicle_route_preferences', {
      fields: ['vehicle_id', 'branch_id', 'priority'],
      type: 'unique',
      name: 'vehicle_route_preferences_vehicle_branch_priority_unique',
    });

    await queryInterface.addIndex(
      'vehicle_route_preferences',
      ['vehicle_id', 'branch_id', 'priority', 'route_id'],
      { name: 'vehicle_route_preferences_vehicle_branch_priority_idx' }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      'vehicle_route_preferences',
      'vehicle_route_preferences_vehicle_branch_priority_idx'
    );
    await queryInterface.removeConstraint(
      'vehicle_route_preferences',
      'vehicle_route_preferences_vehicle_branch_priority_unique'
    );
    await queryInterface.removeConstraint(
      'vehicle_route_preferences',
      'vehicle_route_preferences_vehicle_branch_route_unique'
    );
    await queryInterface.dropTable('vehicle_route_preferences');
  },
};
