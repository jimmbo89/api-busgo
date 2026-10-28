'use strict';

/**
 * Expande la configuración de un viaje sin retirar la relación histórica con
 * route_stops/fare_segment_ticket_types. Los registros legacy siguen siendo
 * válidos; los nuevos registros pueden usar trip_stops/trip_segments.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('trip_stops', 'location_id', {
      type: Sequelize.BIGINT,
      allowNull: true,
    });
    await queryInterface.addColumn('trip_stops', 'distance_km', {
      type: Sequelize.DECIMAL(14, 2),
      allowNull: true,
    });
    await queryInterface.addColumn('trip_stops', 'minutes_from_origin', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.changeColumn('trip_stops', 'route_stop_id', {
      type: Sequelize.BIGINT,
      allowNull: true,
    });

    await queryInterface.addConstraint('trip_stops', {
      fields: ['location_id'],
      type: 'foreign key',
      name: 'fk_trip_stops_location',
      references: { table: 'locations', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.createTable('trip_segments', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      company_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      trip_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      origin_trip_stop_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      destination_trip_stop_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      source_fare_segment_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
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
      source_type: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'manual',
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

    await queryInterface.addConstraint('trip_segments', {
      fields: ['company_id'],
      type: 'foreign key',
      name: 'fk_trip_segments_company',
      references: { table: 'companies', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
    await queryInterface.addConstraint('trip_segments', {
      fields: ['trip_id'],
      type: 'foreign key',
      name: 'fk_trip_segments_trip',
      references: { table: 'trips', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
    await queryInterface.addConstraint('trip_segments', {
      fields: ['origin_trip_stop_id'],
      type: 'foreign key',
      name: 'fk_trip_segments_origin_trip_stop',
      references: { table: 'trip_stops', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
    await queryInterface.addConstraint('trip_segments', {
      fields: ['destination_trip_stop_id'],
      type: 'foreign key',
      name: 'fk_trip_segments_destination_trip_stop',
      references: { table: 'trip_stops', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
    await queryInterface.addConstraint('trip_segments', {
      fields: ['source_fare_segment_id'],
      type: 'foreign key',
      name: 'fk_trip_segments_source_fare_segment',
      references: { table: 'fare_segments', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addConstraint('trip_segments', {
      fields: ['trip_id', 'origin_trip_stop_id', 'destination_trip_stop_id'],
      type: 'unique',
      name: 'unique_trip_segment_stops',
    });
    await queryInterface.addIndex('trip_segments', ['trip_id', 'active'], {
      name: 'idx_trip_segments_trip_active',
    });

    await queryInterface.addColumn('trip_fares', 'trip_segment_id', {
      type: Sequelize.BIGINT,
      allowNull: true,
    });
    await queryInterface.addColumn('trip_fares', 'ticket_type_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.changeColumn('trip_fares', 'fare_segment_ticket_type_id', {
      type: Sequelize.BIGINT,
      allowNull: true,
    });

    await queryInterface.addConstraint('trip_fares', {
      fields: ['trip_segment_id'],
      type: 'foreign key',
      name: 'fk_trip_fares_trip_segment',
      references: { table: 'trip_segments', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
    await queryInterface.addConstraint('trip_fares', {
      fields: ['ticket_type_id'],
      type: 'foreign key',
      name: 'fk_trip_fares_ticket_type',
      references: { table: 'ticket_types', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
    await queryInterface.addConstraint('trip_fares', {
      fields: ['trip_id', 'trip_segment_id', 'ticket_type_id'],
      type: 'unique',
      name: 'unique_trip_fare_trip_segment_ticket_type',
    });

    // Migración estructural únicamente: los viajes existentes se conservan
    // exactamente como están y continúan resolviéndose por las relaciones
    // legacy. Los snapshots directos se crean sólo para nuevos viajes o cuando
    // se edita explícitamente un viaje desde la aplicación.
  },

  async down(queryInterface, Sequelize) {
    const [directStops] = await queryInterface.sequelize.query(`
      SELECT COUNT(*) AS total
      FROM trip_stops
      WHERE route_stop_id IS NULL OR location_id IS NOT NULL
    `);
    const [directFares] = await queryInterface.sequelize.query(`
      SELECT COUNT(*) AS total
      FROM trip_fares
      WHERE trip_segment_id IS NOT NULL OR ticket_type_id IS NOT NULL
    `);

    if (Number(directStops?.[0]?.total || 0) > 0 || Number(directFares?.[0]?.total || 0) > 0) {
      throw new Error('No se puede revertir la migracion: existen datos de configuracion directa de viajes.');
    }

    await queryInterface.removeConstraint('trip_fares', 'unique_trip_fare_trip_segment_ticket_type');
    await queryInterface.removeConstraint('trip_fares', 'fk_trip_fares_ticket_type');
    await queryInterface.removeConstraint('trip_fares', 'fk_trip_fares_trip_segment');
    await queryInterface.removeColumn('trip_fares', 'ticket_type_id');
    await queryInterface.removeColumn('trip_fares', 'trip_segment_id');
    await queryInterface.changeColumn('trip_fares', 'fare_segment_ticket_type_id', {
      type: Sequelize.BIGINT,
      allowNull: false,
    });

    await queryInterface.removeIndex('trip_segments', 'idx_trip_segments_trip_active');
    await queryInterface.removeConstraint('trip_segments', 'unique_trip_segment_stops');
    await queryInterface.removeConstraint('trip_segments', 'fk_trip_segments_source_fare_segment');
    await queryInterface.removeConstraint('trip_segments', 'fk_trip_segments_destination_trip_stop');
    await queryInterface.removeConstraint('trip_segments', 'fk_trip_segments_origin_trip_stop');
    await queryInterface.removeConstraint('trip_segments', 'fk_trip_segments_trip');
    await queryInterface.removeConstraint('trip_segments', 'fk_trip_segments_company');
    await queryInterface.dropTable('trip_segments');

    await queryInterface.removeConstraint('trip_stops', 'fk_trip_stops_location');
    await queryInterface.changeColumn('trip_stops', 'route_stop_id', {
      type: Sequelize.BIGINT,
      allowNull: false,
    });
    await queryInterface.removeColumn('trip_stops', 'minutes_from_origin');
    await queryInterface.removeColumn('trip_stops', 'distance_km');
    await queryInterface.removeColumn('trip_stops', 'location_id');
  },
};
