'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('fare_segment_ticket_types', {
      id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      fare_segment_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      ticket_type_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      base_price: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
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

    await queryInterface.addConstraint('fare_segment_ticket_types', {
      fields: ['fare_segment_id'],
      type: 'foreign key',
      name: 'fk_fare_segment_ticket_types_fare_segment',
      references: {
        table: 'fare_segments',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    await queryInterface.addConstraint('fare_segment_ticket_types', {
      fields: ['ticket_type_id'],
      type: 'foreign key',
      name: 'fk_fare_segment_ticket_types_ticket_type',
      references: {
        table: 'ticket_types',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    await queryInterface.addIndex(
      'fare_segment_ticket_types',
      ['fare_segment_id', 'ticket_type_id'],
      {
        unique: true,
        name: 'fare_segment_ticket_types_unique_segment_type',
      }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('fare_segment_ticket_types', 'fare_segment_ticket_types_unique_segment_type');
    await queryInterface.removeConstraint('fare_segment_ticket_types', 'fk_fare_segment_ticket_types_ticket_type');
    await queryInterface.removeConstraint('fare_segment_ticket_types', 'fk_fare_segment_ticket_types_fare_segment');
    await queryInterface.dropTable('fare_segment_ticket_types');
  },
};
