'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('device_vehicles', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
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
      branch_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'branches',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    // Evita duplicar exactamente la misma asignación y permite conservar
    // relaciones inactivas para una futura evolución de cardinalidad.
    await queryInterface.addConstraint('device_vehicles', {
      fields: ['device_id', 'vehicle_id'],
      type: 'unique',
      name: 'unique_device_vehicle_assignment',
    });

    await queryInterface.addIndex('device_vehicles', ['device_id', 'active'], {
      name: 'device_vehicles_device_active_idx',
    });

    await queryInterface.addIndex('device_vehicles', ['vehicle_id', 'active'], {
      name: 'device_vehicles_vehicle_active_idx',
    });

    await queryInterface.addIndex('device_vehicles', ['branch_id', 'active'], {
      name: 'device_vehicles_branch_active_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('device_vehicles', 'device_vehicles_branch_active_idx');
    await queryInterface.removeIndex('device_vehicles', 'device_vehicles_vehicle_active_idx');
    await queryInterface.removeIndex('device_vehicles', 'device_vehicles_device_active_idx');
    await queryInterface.removeConstraint('device_vehicles', 'unique_device_vehicle_assignment');
    await queryInterface.dropTable('device_vehicles');
  },
};
