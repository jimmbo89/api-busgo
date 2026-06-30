'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('trip_fares', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
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
      fare_segment_ticket_type_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'fare_segment_ticket_types',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      base_price: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      price: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
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
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addConstraint('trip_fares', {
      fields: ['trip_id', 'fare_segment_ticket_type_id'],
      type: 'unique',
      name: 'unique_trip_fare_trip_fstt',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint('trip_fares', 'unique_trip_fare_trip_fstt');
    await queryInterface.dropTable('trip_fares');
  },
};
