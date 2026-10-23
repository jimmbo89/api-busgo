'use strict';

const isIntegerColumn = (definition = {}) => {
  const type = String(definition.type || '').toUpperCase();
  return /(?:TINYINT|SMALLINT|MEDIUMINT|INT|INTEGER|BIGINT)/.test(type)
    && !/(?:CHAR|TEXT|BINARY)/.test(type);
};

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const ticketTemplates = await queryInterface.describeTable('ticket_templates');
    const ticketTemplateIdType = isIntegerColumn(ticketTemplates.id)
      ? Sequelize.INTEGER
      : Sequelize.STRING(36);

    await queryInterface.createTable('ticket_template_defaults', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      company_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
      },
      trip_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      ticket_template_id: {
        type: ticketTemplateIdType,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('ticket_template_defaults', ['company_id'], {
      name: 'ticket_template_defaults_company_id_idx',
    });
    await queryInterface.addIndex('ticket_template_defaults', ['trip_type'], {
      name: 'ticket_template_defaults_trip_type_idx',
    });
    await queryInterface.addIndex('ticket_template_defaults', ['ticket_template_id'], {
      name: 'ticket_template_defaults_template_id_idx',
    });
    await queryInterface.addIndex('ticket_template_defaults', ['company_id', 'trip_type'], {
      name: 'ticket_template_defaults_company_trip_type_uq',
      unique: true,
    });

    // Conserva la compatibilidad de las empresas existentes: la primera
    // plantilla activa de cada empresa/tipo queda como predeterminada.
    const [templates] = await queryInterface.sequelize.query(
      `SELECT id, company_id, trip_type
       FROM ticket_templates
       WHERE status = 'active'
       ORDER BY company_id ASC, trip_type ASC, created_at ASC, id ASC`
    );

    const defaults = [];
    const assignedTypes = new Set();
    for (const template of templates) {
      const key = `${template.company_id}:${String(template.trip_type).toLowerCase()}`;
      if (assignedTypes.has(key)) continue;

      assignedTypes.add(key);
      defaults.push({
        company_id: String(template.company_id),
        trip_type: String(template.trip_type).trim().toLowerCase(),
        ticket_template_id: template.id,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    if (defaults.length > 0) {
      await queryInterface.bulkInsert('ticket_template_defaults', defaults);
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ticket_template_defaults');
  },
};
