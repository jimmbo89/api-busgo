'use strict';

/** @type {import('sequelize-cli').Migration} */
const TABLE_NAME = 'vehicle_route_preferences';

const getIndexes = async (queryInterface, transaction) => {
  const [rows] = await queryInterface.sequelize.query(
    `SHOW INDEX FROM \`${TABLE_NAME}\``,
    { transaction }
  );
  const indexes = new Map();

  rows.forEach((row) => {
    const columns = indexes.get(row.Key_name) || [];
    columns[row.Seq_in_index - 1] = row.Column_name;
    indexes.set(row.Key_name, columns);
  });

  return indexes;
};

const dropIndexIfExists = async (queryInterface, indexName, transaction) => {
  const indexes = await getIndexes(queryInterface, transaction);
  if (!indexes.has(indexName)) {
    return;
  }

  await queryInterface.sequelize.query(
    `ALTER TABLE \`${TABLE_NAME}\` DROP INDEX \`${indexName}\``,
    { transaction }
  );
};

const dropLegacyIndexes = async (queryInterface, transaction) => {
  const indexes = await getIndexes(queryInterface, transaction);

  for (const [indexName, columns] of indexes.entries()) {
    const isBranchRouteUnique =
      columns.join(':') === 'vehicle_id:branch_id:route_id';
    const isBranchPriorityIndex =
      columns.slice(0, 3).join(':') === 'vehicle_id:branch_id:priority';

    if (isBranchRouteUnique || isBranchPriorityIndex) {
      await queryInterface.sequelize.query(
        `ALTER TABLE \`${TABLE_NAME}\` DROP INDEX \`${indexName}\``,
        { transaction }
      );
    }
  }
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // The previous schema allowed one row per branch. Keep the oldest row
      // before enforcing one direct relation per vehicle and route.
      await queryInterface.sequelize.query(
        `DELETE duplicate
         FROM vehicle_route_preferences AS duplicate
         INNER JOIN vehicle_route_preferences AS original
           ON original.vehicle_id = duplicate.vehicle_id
          AND original.route_id = duplicate.route_id
          AND original.id < duplicate.id`,
        { transaction }
      );

      // Create the new leading vehicle index before dropping the old one;
      // MySQL may be using the old composite index to support the vehicle FK.
      const indexesBeforeLegacyDrop = await getIndexes(queryInterface, transaction);
      const hasDirectUnique = [...indexesBeforeLegacyDrop.values()].some(
        (columns) => columns.join(':') === 'vehicle_id:route_id'
      );

      if (!hasDirectUnique) {
        await queryInterface.addConstraint(TABLE_NAME, {
          fields: ['vehicle_id', 'route_id'],
          type: 'unique',
          name: 'vehicle_route_preferences_vehicle_route_unique',
          transaction,
        });
      }

      // Deployments created from earlier versions do not all have the same
      // legacy priority index/constraint names. Drop them by their columns.
      await dropLegacyIndexes(queryInterface, transaction);
      await queryInterface.changeColumn('vehicle_route_preferences', 'priority', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null,
        transaction,
      });

      // Keep the legacy columns for compatibility, but detach existing rows
      // from branch/priority semantics so branch deletion cannot remove a
      // direct vehicle-route preference through the old foreign key.
      await queryInterface.sequelize.query(
        `UPDATE vehicle_route_preferences
         SET branch_id = NULL, priority = NULL`,
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.sequelize.query(
        `UPDATE vehicle_route_preferences SET priority = 1
         WHERE priority IS NULL`,
        { transaction }
      );
      await queryInterface.changeColumn('vehicle_route_preferences', 'priority', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        transaction,
      });

      const indexes = await getIndexes(queryInterface, transaction);
      if (!indexes.has('vehicle_route_preferences_vehicle_branch_route_unique')) {
        await queryInterface.addConstraint(TABLE_NAME, {
          fields: ['vehicle_id', 'branch_id', 'route_id'],
          type: 'unique',
          name: 'vehicle_route_preferences_vehicle_branch_route_unique',
          transaction,
        });
      }

      // Restore the legacy FK-supporting indexes before removing the direct
      // unique index that currently supports the vehicle foreign key.
      await dropIndexIfExists(
        queryInterface,
        'vehicle_route_preferences_vehicle_route_unique',
        transaction
      );
      if (!indexes.has('vehicle_route_preferences_vehicle_branch_priority_unique')) {
        await queryInterface.addConstraint(TABLE_NAME, {
          fields: ['vehicle_id', 'branch_id', 'priority'],
          type: 'unique',
          name: 'vehicle_route_preferences_vehicle_branch_priority_unique',
          transaction,
        });
      }
      await queryInterface.addIndex(
        'vehicle_route_preferences',
        ['vehicle_id', 'branch_id', 'priority', 'route_id'],
        {
          name: 'vehicle_route_preferences_vehicle_branch_priority_idx',
          transaction,
        }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
