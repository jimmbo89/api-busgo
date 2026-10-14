const { Op } = require('sequelize');
const {
  TicketTemplate,
  TicketTemplateDefault,
  sequelize,
} = require('../models');

const SUPPORTED_TRIP_TYPES = ['normal', 'express', 'on_board'];

const normalizeCompanyId = (value) => (
  value === undefined || value === null ? value : String(value).trim()
);

const normalizeTripType = (value) => (
  value === undefined || value === null ? value : String(value).trim().toLowerCase()
);

const normalizeTripTypes = (values = []) => Array.from(new Set(
  (Array.isArray(values) ? values : [])
    .map(normalizeTripType)
    .filter(Boolean)
));

const domainError = (code) => {
  const error = new Error(code);
  error.code = code;
  return error;
};

const ensureSupportedTripType = (tripType) => {
  const normalized = normalizeTripType(tripType);
  if (!SUPPORTED_TRIP_TYPES.includes(normalized)) {
    throw domainError('TicketTemplateTripTypeNotSupported');
  }
  return normalized;
};

const TicketTemplateDefaultRepository = {
  SUPPORTED_TRIP_TYPES,

  async findByTemplateId(ticketTemplateId, options = {}) {
    return TicketTemplateDefault.findAll({
      where: { ticket_template_id: ticketTemplateId },
      attributes: ['id', 'company_id', 'trip_type', 'ticket_template_id'],
      order: [['trip_type', 'ASC']],
      ...options,
    });
  },

  async attachToTemplates(ticketTemplates, options = {}) {
    const templates = Array.isArray(ticketTemplates) ? ticketTemplates : [ticketTemplates];
    const validTemplates = templates.filter(Boolean);
    if (validTemplates.length === 0) return ticketTemplates;

    const defaults = await TicketTemplateDefault.findAll({
      where: {
        ticket_template_id: {
          [Op.in]: validTemplates.map((template) => template.id),
        },
      },
      attributes: ['ticket_template_id', 'trip_type'],
      order: [['trip_type', 'ASC']],
      ...options,
    });

    const tripTypesByTemplate = new Map();
    for (const item of defaults) {
      const tripTypes = tripTypesByTemplate.get(item.ticket_template_id) || [];
      tripTypes.push(item.trip_type);
      tripTypesByTemplate.set(item.ticket_template_id, tripTypes);
    }

    for (const template of validTemplates) {
      template.setDataValue(
        'default_trip_types',
        tripTypesByTemplate.get(template.id) || []
      );
    }

    return ticketTemplates;
  },

  async replaceForTemplate(ticketTemplate, tripTypes = [], options = {}) {
    const transaction = options.transaction || await sequelize.transaction();
    const ownsTransaction = !options.transaction;
    const desiredTripTypes = normalizeTripTypes(tripTypes).map(ensureSupportedTripType);

    try {
      if (desiredTripTypes.length > 0 && ticketTemplate.status !== 'active') {
        throw domainError('TicketTemplateMustBeActiveForDefault');
      }

      const currentDefaults = await TicketTemplateDefault.findAll({
        where: { ticket_template_id: ticketTemplate.id },
        attributes: ['id', 'company_id', 'trip_type', 'ticket_template_id'],
        transaction,
      });

      const desiredSet = new Set(desiredTripTypes);
      const removedTypes = currentDefaults
        .map((item) => normalizeTripType(item.trip_type))
        .filter((tripType) => !desiredSet.has(tripType));

      if (removedTypes.length > 0) {
        // La desasociación solo es válida si otro template ya reemplazó
        // previamente cada tipo. Nunca dejamos un tipo sin predeterminada.
        throw domainError('TicketTemplateDefaultReplacementRequired');
      }

      const companyId = normalizeCompanyId(ticketTemplate.company_id);
      for (const tripType of desiredTripTypes) {
        const currentDefault = await TicketTemplateDefault.findOne({
          where: { company_id: companyId, trip_type: tripType },
          transaction,
        });

        if (currentDefault) {
          await currentDefault.update(
            { ticket_template_id: ticketTemplate.id },
            { transaction }
          );
        } else {
          await TicketTemplateDefault.create(
            {
              company_id: companyId,
              trip_type: tripType,
              ticket_template_id: ticketTemplate.id,
            },
            { transaction }
          );
        }
      }

      if (ownsTransaction) await transaction.commit();
      return desiredTripTypes;
    } catch (error) {
      if (ownsTransaction && transaction && !transaction.finished) {
        await transaction.rollback();
      }
      throw error;
    }
  },

  async resolveForTrip({
    companyId,
    tripType,
    ticketTemplateId,
    transaction,
  }) {
    const normalizedCompanyId = normalizeCompanyId(companyId);
    const normalizedTripType = ensureSupportedTripType(tripType);

    let template;
    if (ticketTemplateId !== undefined && ticketTemplateId !== null && ticketTemplateId !== '') {
      template = await TicketTemplate.findByPk(ticketTemplateId, { transaction });
      if (!template) throw domainError('TicketTemplateNotFound');
      if (template.status !== 'active') throw domainError('TicketTemplateInactive');
      if (normalizeCompanyId(template.company_id) !== normalizedCompanyId) {
        throw domainError('TicketTemplateCompanyMismatch');
      }
      return template.id;
    }

    const currentDefault = await TicketTemplateDefault.findOne({
      where: {
        company_id: normalizedCompanyId,
        trip_type: normalizedTripType,
      },
      transaction,
    });

    if (!currentDefault) {
      throw domainError('TicketTemplateDefaultNotConfigured');
    }

    template = await TicketTemplate.findByPk(currentDefault.ticket_template_id, { transaction });
    if (!template || template.status !== 'active') {
      throw domainError('TicketTemplateDefaultNotConfigured');
    }

    return template.id;
  },
};

module.exports = TicketTemplateDefaultRepository;
