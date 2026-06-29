'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('fare_segments', {
      id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      company_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      route_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      origin_route_stop_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      destination_route_stop_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      service_class: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      base_price: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      currency: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: 'CLP',
      },
      valid_from: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      valid_to: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      priority: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
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

    await queryInterface.addConstraint('fare_segments', {
      fields: ['company_id'],
      type: 'foreign key',
      name: 'fk_fare_segments_company',
      references: {
        table: 'companies',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    await queryInterface.addConstraint('fare_segments', {
      fields: ['route_id'],
      type: 'foreign key',
      name: 'fk_fare_segments_route',
      references: {
        table: 'routes',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    await queryInterface.addConstraint('fare_segments', {
      fields: ['origin_route_stop_id'],
      type: 'foreign key',
      name: 'fk_fare_segments_origin_route_stop',
      references: {
        table: 'route_stops',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    await queryInterface.addConstraint('fare_segments', {
      fields: ['destination_route_stop_id'],
      type: 'foreign key',
      name: 'fk_fare_segments_destination_route_stop',
      references: {
        table: 'route_stops',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    await queryInterface.addIndex('fare_segments', ['company_id', 'route_id', 'origin_route_stop_id', 'destination_route_stop_id', 'service_class'], {
      unique: true,
      name: 'fare_segments_unique_segment',
    });

    await queryInterface.addIndex('fare_segments', ['route_id', 'active', 'priority'], {
      name: 'fare_segments_route_active_priority',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('fare_segments', 'fare_segments_route_active_priority');
    await queryInterface.removeIndex('fare_segments', 'fare_segments_unique_segment');
    await queryInterface.removeConstraint('fare_segments', 'fk_fare_segments_destination_route_stop');
    await queryInterface.removeConstraint('fare_segments', 'fk_fare_segments_origin_route_stop');
    await queryInterface.removeConstraint('fare_segments', 'fk_fare_segments_route');
    await queryInterface.removeConstraint('fare_segments', 'fk_fare_segments_company');
    await queryInterface.dropTable('fare_segments');
  },
};
