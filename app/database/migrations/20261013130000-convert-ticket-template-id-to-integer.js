'use strict';

const quoteIdentifier = (value) => `\`${String(value).replace(/`/g, '``')}\``;

const isIntegerColumn = (definition = {}) => {
  const type = String(definition.type || '').toUpperCase();
  return /(?:TINYINT|SMALLINT|MEDIUMINT|INT|INTEGER|BIGINT)/.test(type)
    && !/(?:CHAR|TEXT|BINARY)/.test(type);
};

const getReferencingConstraints = async (sequelize) => {
  const [rows] = await sequelize.query(`
    SELECT TABLE_NAME AS table_name, CONSTRAINT_NAME AS constraint_name
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND REFERENCED_TABLE_NAME = 'ticket_templates'
      AND REFERENCED_COLUMN_NAME = 'id'
  `);

  return rows;
};

const dropReferencingConstraints = async (sequelize) => {
  const constraints = await getReferencingConstraints(sequelize);

  for (const constraint of constraints) {
    await sequelize.query(
      `ALTER TABLE ${quoteIdentifier(constraint.table_name)} DROP FOREIGN KEY ${quoteIdentifier(constraint.constraint_name)}`
    );
  }
};

const assertNoUnmappedReferences = async (
  sequelize,
  tableName,
  sourceColumn,
  mappedColumn
) => {
  const [rows] = await sequelize.query(`
    SELECT COUNT(*) AS total
    FROM ${quoteIdentifier(tableName)}
    WHERE ${quoteIdentifier(sourceColumn)} IS NOT NULL
      AND ${quoteIdentifier(mappedColumn)} IS NULL
  `);

  if (Number(rows[0]?.total || 0) > 0) {
    throw new Error(`No se pudieron conservar las relaciones de ${tableName}`);
  }
};

const convertChildReference = async (queryInterface, Sequelize, tableName, parentUsesLegacyIds) => {
  const table = await queryInterface.describeTable(tableName);
  const currentColumn = table.ticket_template_id;

  if (!currentColumn || isIntegerColumn(currentColumn)) {
    return false;
  }

  if (!table.ticket_template_id_numeric) {
    await queryInterface.addColumn(tableName, 'ticket_template_id_numeric', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  }

  const sourceExpression = parentUsesLegacyIds
    ? `templates.id_numeric`
    : `templates.id`;

  await queryInterface.sequelize.query(`
    UPDATE ${quoteIdentifier(tableName)} AS references_table
    INNER JOIN ${quoteIdentifier('ticket_templates')} AS templates
      ON CAST(references_table.${quoteIdentifier('ticket_template_id')} AS CHAR) =
         CAST(templates.${quoteIdentifier(parentUsesLegacyIds ? 'id' : 'id')} AS CHAR)
    SET references_table.${quoteIdentifier('ticket_template_id_numeric')} = ${sourceExpression}
  `);

  await assertNoUnmappedReferences(
    queryInterface.sequelize,
    tableName,
    'ticket_template_id',
    'ticket_template_id_numeric'
  );

  await queryInterface.removeColumn(tableName, 'ticket_template_id');
  await queryInterface.renameColumn(tableName, 'ticket_template_id_numeric', 'ticket_template_id');
  await queryInterface.changeColumn(tableName, 'ticket_template_id', {
    type: Sequelize.INTEGER,
    allowNull: tableName === 'ticket_template_defaults' ? false : true,
  });
  return true;
};

const ensureIndex = async (queryInterface, tableName, fields, name) => {
  const [rows] = await queryInterface.sequelize.query(
    `SHOW INDEX FROM ${quoteIdentifier(tableName)} WHERE Key_name = :name`,
    { replacements: { name } }
  );

  if (!rows.length) {
    await queryInterface.addIndex(tableName, fields, { name });
  }
};

const ensureForeignKey = async (queryInterface, tableName, name, onDelete) => {
  await queryInterface.addConstraint(tableName, {
    fields: ['ticket_template_id'],
    type: 'foreign key',
    name,
    references: {
      table: 'ticket_templates',
      field: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete,
  });
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const ticketTemplates = await queryInterface.describeTable('ticket_templates');
    const parentUsesLegacyIds = !isIntegerColumn(ticketTemplates.id);

    await dropReferencingConstraints(queryInterface.sequelize);

    if (parentUsesLegacyIds && !ticketTemplates.id_numeric) {
      await queryInterface.addColumn('ticket_templates', 'id_numeric', {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        unique: true,
      });
    }

    const childTables = ['ticket_template_defaults', 'trips', 'trip_templates'];
    for (const tableName of childTables) {
      await convertChildReference(
        queryInterface,
        Sequelize,
        tableName,
        parentUsesLegacyIds
      );
    }

    if (parentUsesLegacyIds) {
      if (ticketTemplates.id.primaryKey === true) {
        await queryInterface.sequelize.query(
          `ALTER TABLE ${quoteIdentifier('ticket_templates')} DROP PRIMARY KEY`
        );
      }
      await queryInterface.renameColumn('ticket_templates', 'id', 'legacy_id');
      await queryInterface.renameColumn('ticket_templates', 'id_numeric', 'id');
      await queryInterface.changeColumn('ticket_templates', 'legacy_id', {
        type: Sequelize.STRING(36),
        allowNull: true,
      });
      await queryInterface.addConstraint('ticket_templates', {
        fields: ['id'],
        type: 'primary key',
        name: 'ticket_templates_pkey',
      });
      await queryInterface.changeColumn('ticket_templates', 'id', {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      });
    } else if (!ticketTemplates.id.autoIncrement) {
      await queryInterface.changeColumn('ticket_templates', 'id', {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      });
    }

    await ensureIndex(
      queryInterface,
      'ticket_template_defaults',
      ['ticket_template_id'],
      'ticket_template_defaults_template_id_idx'
    );
    await ensureIndex(
      queryInterface,
      'trips',
      ['ticket_template_id'],
      'trips_ticket_template_id_idx'
    );
    await ensureIndex(
      queryInterface,
      'trip_templates',
      ['ticket_template_id'],
      'trip_templates_ticket_template_id_idx'
    );

    await ensureForeignKey(
      queryInterface,
      'ticket_template_defaults',
      'ticket_template_defaults_ticket_template_id_fk',
      'CASCADE'
    );
    await ensureForeignKey(
      queryInterface,
      'trips',
      'trips_ticket_template_id_fk',
      'RESTRICT'
    );
    await ensureForeignKey(
      queryInterface,
      'trip_templates',
      'trip_templates_ticket_template_id_fk',
      'SET NULL'
    );
  },

  async down(queryInterface, Sequelize) {
    const ticketTemplates = await queryInterface.describeTable('ticket_templates');
    if (!ticketTemplates.id || !ticketTemplates.legacy_id || !isIntegerColumn(ticketTemplates.id)) {
      return;
    }

    const [templatesWithoutLegacyId] = await queryInterface.sequelize.query(`
      SELECT COUNT(*) AS total
      FROM ${quoteIdentifier('ticket_templates')}
      WHERE ${quoteIdentifier('legacy_id')} IS NULL
    `);
    if (Number(templatesWithoutLegacyId[0]?.total || 0) > 0) {
      throw new Error('No se puede revertir la conversión porque existen plantillas nuevas sin UUID legado');
    }

    await dropReferencingConstraints(queryInterface.sequelize);

    for (const tableName of ['ticket_template_defaults', 'trips', 'trip_templates']) {
      const table = await queryInterface.describeTable(tableName);
      if (!table.ticket_template_id || !isIntegerColumn(table.ticket_template_id)) continue;

      await queryInterface.addColumn(tableName, 'ticket_template_id_legacy', {
        type: Sequelize.STRING(36),
        allowNull: true,
      });

      await queryInterface.sequelize.query(`
        UPDATE ${quoteIdentifier(tableName)} AS references_table
        INNER JOIN ${quoteIdentifier('ticket_templates')} AS templates
          ON references_table.${quoteIdentifier('ticket_template_id')} = templates.${quoteIdentifier('id')}
        SET references_table.${quoteIdentifier('ticket_template_id_legacy')} = templates.${quoteIdentifier('legacy_id')}
      `);

      await assertNoUnmappedReferences(
        queryInterface.sequelize,
        tableName,
        'ticket_template_id',
        'ticket_template_id_legacy'
      );
      await queryInterface.removeColumn(tableName, 'ticket_template_id');
      await queryInterface.renameColumn(tableName, 'ticket_template_id_legacy', 'ticket_template_id');
      await queryInterface.changeColumn(tableName, 'ticket_template_id', {
        type: Sequelize.STRING(36),
        allowNull: tableName === 'ticket_template_defaults' ? false : true,
      });
    }

    if (ticketTemplates.id.primaryKey === true) {
      await queryInterface.sequelize.query(
        `ALTER TABLE ${quoteIdentifier('ticket_templates')} DROP PRIMARY KEY`
      );
    }
    await queryInterface.renameColumn('ticket_templates', 'id', 'id_numeric');
    await queryInterface.renameColumn('ticket_templates', 'legacy_id', 'id');
    await queryInterface.changeColumn('ticket_templates', 'id', {
      type: Sequelize.STRING(36),
      allowNull: false,
    });
    await queryInterface.addConstraint('ticket_templates', {
      fields: ['id'],
      type: 'primary key',
      name: 'ticket_templates_pkey_legacy',
    });
    await queryInterface.removeColumn('ticket_templates', 'id_numeric');

    await ensureIndex(
      queryInterface,
      'ticket_template_defaults',
      ['ticket_template_id'],
      'ticket_template_defaults_template_id_idx'
    );
    await ensureIndex(
      queryInterface,
      'trips',
      ['ticket_template_id'],
      'trips_ticket_template_id_idx'
    );
    await ensureIndex(
      queryInterface,
      'trip_templates',
      ['ticket_template_id'],
      'trip_templates_ticket_template_id_idx'
    );

    await ensureForeignKey(
      queryInterface,
      'ticket_template_defaults',
      'ticket_template_defaults_ticket_template_id_fk_legacy',
      'CASCADE'
    );
    await ensureForeignKey(
      queryInterface,
      'trips',
      'trips_ticket_template_id_fk_legacy',
      'RESTRICT'
    );
    await ensureForeignKey(
      queryInterface,
      'trip_templates',
      'trip_templates_ticket_template_id_fk_legacy',
      'SET NULL'
    );
  },
};
