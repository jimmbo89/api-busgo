'use strict';

const SYSTEM_TEMPLATE_NAME = 'Plantilla global del sistema';
const SYSTEM_TEMPLATE_TRIP_TYPE = 'system';

const SYSTEM_TEMPLATE_CONFIG = {
  version: '1.0',
  blocks: {
    logo: {
      enabled: true,
    },
    companyData: {
      enabled: true,
      fields: {
        name: true,
        rut: true,
        address: true,
      },
    },
    tripTitle: {
      enabled: true,
      text: 'DETALLE DEL VIAJE',
    },
    route: {
      enabled: true,
      fields: {
        origin: true,
        destination: true,
        tripId: true,
      },
    },
    dateTime: {
      enabled: true,
      fields: {
        tripDate: true,
        departureTime: true,
        arrivalDate: true,
        arrivalTime: true,
      },
    },
    vehicleData: {
      enabled: true,
      fields: {
        vehiclePlate: true,
        internalNumber: true,
      },
    },
    seats: {
      enabled: true,
      title: 'ASIENTO(S)',
      hideWhenEmpty: false,
      emptyMessage: 'NO HAY ASIENTOS REGISTRADOS',
    },
    paymentTitle: {
      enabled: true,
      text: 'DETALLE DE PAGO',
    },
    fareDetails: {
      enabled: true,
      columns: {
        type: true,
        quantity: true,
        unitPrice: true,
        subtotal: true,
      },
    },
    total: {
      enabled: true,
      label: 'TOTAL',
      decimals: 0,
    },
    paymentMethod: {
      enabled: true,
      label: 'Medio de pago',
      value: '',
    },
    transactionNumber: {
      enabled: true,
      label: 'N° Transacción',
      value: '',
    },
    qr: {
      enabled: true,
      size: 148,
      centered: true,
    },
    footer: {
      enabled: true,
      fields: {
        copyControl: true,
        transactionId: true,
        optionalText: true,
        vehiclePlate: false,
        internalNumber: false,
      },
      optionalText: '',
    },
  },
  showSeparators: true,
  spacing: 'comfortable',
};

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('ticket_templates', 'company_id', {
      type: Sequelize.STRING(36),
      allowNull: true,
    });

    const [existingTemplates] = await queryInterface.sequelize.query(
      `SELECT id
       FROM ticket_templates
       WHERE company_id IS NULL
         AND trip_type = :tripType
       LIMIT 1`,
      {
        replacements: { tripType: SYSTEM_TEMPLATE_TRIP_TYPE },
      }
    );

    if (existingTemplates.length === 0) {
      await queryInterface.sequelize.query(
        `INSERT INTO ticket_templates
          (company_id, name, trip_type, status, config, created_at, updated_at)
         VALUES
          (NULL, :name, :tripType, 'active', :config, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        {
          replacements: {
            name: SYSTEM_TEMPLATE_NAME,
            tripType: SYSTEM_TEMPLATE_TRIP_TYPE,
            config: JSON.stringify(SYSTEM_TEMPLATE_CONFIG),
          },
        }
      );
    }
  },

  async down(queryInterface, Sequelize) {
    const [systemTemplates] = await queryInterface.sequelize.query(
      `SELECT id
       FROM ticket_templates
       WHERE company_id IS NULL
         AND trip_type = :tripType
         AND name = :name`,
      {
        replacements: {
          name: SYSTEM_TEMPLATE_NAME,
          tripType: SYSTEM_TEMPLATE_TRIP_TYPE,
        },
      }
    );

    const systemTemplateIds = systemTemplates.map((template) => template.id);

    if (systemTemplateIds.length > 0) {
      const [tripReferences] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) AS count
         FROM trips
         WHERE ticket_template_id IN (:templateIds)`,
        { replacements: { templateIds: systemTemplateIds } }
      );
      const [tripTemplateReferences] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) AS count
         FROM trip_templates
         WHERE ticket_template_id IN (:templateIds)`,
        { replacements: { templateIds: systemTemplateIds } }
      );

      if (
        Number(tripReferences[0]?.count || 0) > 0 ||
        Number(tripTemplateReferences[0]?.count || 0) > 0
      ) {
        throw new Error(
          'No se puede revertir la migración: la plantilla global ya está asociada a viajes o plantillas de viajes.'
        );
      }
    }

    await queryInterface.sequelize.query(
      `DELETE FROM ticket_templates
       WHERE company_id IS NULL
         AND trip_type = :tripType
         AND name = :name`,
      {
        replacements: {
          name: SYSTEM_TEMPLATE_NAME,
          tripType: SYSTEM_TEMPLATE_TRIP_TYPE,
        },
      }
    );

    const [nullCompanyTemplates] = await queryInterface.sequelize.query(
      `SELECT COUNT(*) AS count
       FROM ticket_templates
       WHERE company_id IS NULL`
    );

    if (Number(nullCompanyTemplates[0]?.count || 0) > 0) {
      throw new Error(
        'No se puede revertir la migración: existen plantillas de ticket sin company_id.'
      );
    }

    await queryInterface.changeColumn('ticket_templates', 'company_id', {
      type: Sequelize.STRING(36),
      allowNull: false,
    });
  },
};
