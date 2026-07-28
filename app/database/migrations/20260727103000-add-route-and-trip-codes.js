'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('routes', 'code', {
      type: Sequelize.STRING(16),
      allowNull: true,
    });

    await queryInterface.addColumn('trips', 'code', {
      type: Sequelize.STRING(32),
      allowNull: true,
    });

    await queryInterface.createTable('trip_code_sequences', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      route_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      trip_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      last_sequence: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
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

    await queryInterface.addIndex('trip_code_sequences', ['route_id', 'trip_date'], {
      unique: true,
      name: 'trip_code_sequences_route_date_unique',
    });

    const routeRows = await queryInterface.sequelize.query(
      'SELECT id FROM routes ORDER BY id ASC',
      { type: Sequelize.QueryTypes.SELECT }
    );

    for (const route of routeRows) {
      const routeCode = `R${String(route.id).padStart(3, '0')}`;
      await queryInterface.bulkUpdate(
        'routes',
        { code: routeCode },
        { id: route.id }
      );
    }

    const routeCodeRows = await queryInterface.sequelize.query(
      'SELECT id, code FROM routes ORDER BY id ASC',
      { type: Sequelize.QueryTypes.SELECT }
    );
    const routeCodeMap = new Map(
      routeCodeRows.map((route) => [Number(route.id), route.code])
    );

    const tripRows = await queryInterface.sequelize.query(
      'SELECT id, route_id, date FROM trips ORDER BY route_id ASC, date ASC, id ASC',
      { type: Sequelize.QueryTypes.SELECT }
    );

    const sequenceByKey = new Map();
    const latestSequenceByKey = new Map();

    for (const trip of tripRows) {
      const routeId = Number(trip.route_id);
      const routeCode = routeCodeMap.get(routeId);
      const tripDate = typeof trip.date === 'string'
        ? trip.date.slice(0, 10)
        : new Date(trip.date).toISOString().slice(0, 10);

      if (!routeCode || !tripDate) {
        continue;
      }

      const key = `${routeId}:${tripDate}`;
      const nextSequence = (sequenceByKey.get(key) || 0) + 1;
      sequenceByKey.set(key, nextSequence);
      latestSequenceByKey.set(key, nextSequence);

      const tripCode = `${routeCode}-${tripDate.replace(/-/g, '')}-${String(nextSequence).padStart(3, '0')}`;
      await queryInterface.bulkUpdate(
        'trips',
        { code: tripCode },
        { id: trip.id }
      );
    }

    for (const [key, lastSequence] of latestSequenceByKey.entries()) {
      const [routeId, tripDate] = key.split(':');
      await queryInterface.sequelize.query(
        `
          INSERT INTO trip_code_sequences (route_id, trip_date, last_sequence, createdAt, updatedAt)
          VALUES (:route_id, :trip_date, :last_sequence, NOW(), NOW())
          ON DUPLICATE KEY UPDATE
            last_sequence = VALUES(last_sequence),
            updatedAt = VALUES(updatedAt)
        `,
        {
          replacements: {
            route_id: Number(routeId),
            trip_date: tripDate,
            last_sequence: Number(lastSequence),
          },
        }
      );
    }

    await queryInterface.addIndex('routes', ['code'], {
      unique: true,
      name: 'routes_code_unique',
    });

    await queryInterface.addIndex('trips', ['code'], {
      unique: true,
      name: 'trips_code_unique',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('trips', 'trips_code_unique');
    await queryInterface.removeIndex('routes', 'routes_code_unique');
    await queryInterface.dropTable('trip_code_sequences');
    await queryInterface.removeColumn('trips', 'code');
    await queryInterface.removeColumn('routes', 'code');
  },
};
