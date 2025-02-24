'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('trips', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT
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
      route_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'routes', // Reference to the 'Companies' model
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      schedule: {
        type: Sequelize.STRING,
        allowNull: false
      },
      arrival: {
        type: Sequelize.STRING,
        allowNull: false
      },
      start: {
        type: Sequelize.STRING,
        allowNull: true
      },
      end: {
        type: Sequelize.STRING,
        allowNull: true
      },
      price: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false
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
   // Agregar restricción única
   await queryInterface.addConstraint('trips', {
    fields: ['branch_id', 'vehicle_id', 'route_id', 'date', 'schedule'],
    type: 'unique',
    name: 'unique_trip_constraint'
  });
},
  
  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint('trips', 'unique_trip_constraint');
    await queryInterface.dropTable('trips');
  }
};