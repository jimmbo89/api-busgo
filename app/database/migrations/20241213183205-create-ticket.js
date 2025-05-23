'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tickets', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      branch_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'branches',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      trip_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'trips',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      date: {
        allowNull: false,
        type: Sequelize.DATE
      },
      method: {
        type: Sequelize.STRING,
        allowNull: false
      },
      status: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      total: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0
      },
      seats: {
        type: Sequelize.JSON, // Permitir almacenamiento de arrays
        allowNull: false
      },
      adults: {
        type: Sequelize.INTEGER, // Permitir almacenamiento de arrays
        allowNull: true
      },
      minors: {
        type: Sequelize.INTEGER, // Permitir almacenamiento de arrays
        allowNull: true
      },
      pay: {
        type: Sequelize.INTEGER, // Permitir almacenamiento de arrays
        allowNull: false,
        defaultValue: 1
      },
      qr: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      barcode: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      print: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      promotions: {
        type: Sequelize.JSON, // Permitir almacenamiento de arrays
        allowNull: true
      },
      tickettypes: {
        type: Sequelize.JSON, // Permitir almacenamiento de arrays
        allowNull: true
      },
      qr_status: {
        type: Sequelize.INTEGER,
        allowNull: true, // Inicialmente null
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
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('tickets');
  }
};