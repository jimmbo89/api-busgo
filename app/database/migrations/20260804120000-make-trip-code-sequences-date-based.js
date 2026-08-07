'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeIndex(
      'trip_code_sequences',
      'trip_code_sequences_route_date_unique'
    );

    await queryInterface.changeColumn('trip_code_sequences', 'route_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    const tripDates = await queryInterface.sequelize.query(
      `
        SELECT date AS trip_date, COUNT(*) AS trip_count
        FROM trips
        GROUP BY date
      `,
      { type: Sequelize.QueryTypes.SELECT }
    );

    for (const row of tripDates) {
      const tripDate = typeof row.trip_date === 'string'
        ? row.trip_date.slice(0, 10)
        : new Date(row.trip_date).toISOString().slice(0, 10);
      const tripCount = Number(row.trip_count || 0);

      const [sequenceRow] = await queryInterface.sequelize.query(
        `
          SELECT MIN(id) AS id
          FROM trip_code_sequences
          WHERE trip_date = :trip_date
        `,
        {
          replacements: { trip_date: tripDate },
          type: Sequelize.QueryTypes.SELECT,
        }
      );

      if (sequenceRow?.id) {
        await queryInterface.sequelize.query(
          `
            UPDATE trip_code_sequences
            SET route_id = NULL,
                last_sequence = :last_sequence,
                updatedAt = NOW()
            WHERE id = :id
          `,
          {
            replacements: {
              id: Number(sequenceRow.id),
              last_sequence: tripCount,
            },
          }
        );

        await queryInterface.sequelize.query(
          `
            DELETE FROM trip_code_sequences
            WHERE trip_date = :trip_date
              AND id <> :id
          `,
          {
            replacements: {
              trip_date: tripDate,
              id: Number(sequenceRow.id),
            },
          }
        );
      } else {
        await queryInterface.sequelize.query(
          `
            INSERT INTO trip_code_sequences (route_id, trip_date, last_sequence, createdAt, updatedAt)
            VALUES (NULL, :trip_date, :last_sequence, NOW(), NOW())
          `,
          {
            replacements: {
              trip_date: tripDate,
              last_sequence: tripCount,
            },
          }
        );
      }
    }

    await queryInterface.addIndex('trip_code_sequences', ['trip_date'], {
      unique: true,
      name: 'trip_code_sequences_date_unique',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex(
      'trip_code_sequences',
      'trip_code_sequences_date_unique'
    );

    const sequenceRows = await queryInterface.sequelize.query(
      `
        SELECT id, trip_date
        FROM trip_code_sequences
        WHERE route_id IS NULL
      `,
      { type: Sequelize.QueryTypes.SELECT }
    );

    for (const row of sequenceRows) {
      const tripDate = typeof row.trip_date === 'string'
        ? row.trip_date.slice(0, 10)
        : new Date(row.trip_date).toISOString().slice(0, 10);

      const [tripRow] = await queryInterface.sequelize.query(
        `
          SELECT MIN(route_id) AS route_id
          FROM trips
          WHERE date = :trip_date
        `,
        {
          replacements: { trip_date: tripDate },
          type: Sequelize.QueryTypes.SELECT,
        }
      );

      await queryInterface.sequelize.query(
        `
          UPDATE trip_code_sequences
          SET route_id = :route_id,
              updatedAt = NOW()
          WHERE id = :id
        `,
        {
          replacements: {
            id: Number(row.id),
            route_id: Number(tripRow?.route_id || 0),
          },
        }
      );
    }

    await queryInterface.changeColumn('trip_code_sequences', 'route_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });

    await queryInterface.addIndex('trip_code_sequences', ['route_id', 'trip_date'], {
      unique: true,
      name: 'trip_code_sequences_route_date_unique',
    });
  },
};
