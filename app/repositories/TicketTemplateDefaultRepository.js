const { Op } = require('sequelize');
const {
  TicketTemplate,
  TicketTemplateDefault,
  sequelize,
} = require('../models');

const SUPPORTED_TRIP_TYPES = ['normal', 'express', 'on_board'];
const SYSTEM_TEMPLATE_TRIP_TYPE = 'system';

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

const getRecordValue = (record, key) => record?.[key] ?? record?.get?.(key);

const domainError = (code, details) => {
  const error = new Error(code);
  error.code = code;
  if (details) error.details = details;
  return error;
};

const normalizeTemplateTripType = (ticketTemplate) => normalizeTripType(
  ticketTemplate?.trip_type ?? ticketTemplate?.tripType
);

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

  async replaceForCompany(companyId, defaults = []) {
    if (!Array.isArray(defaults)) {
      throw domainError(
        'TicketTemplateDefaultsValidationError',
        ['El campo defaults debe ser un arreglo.']
      );
    }

    const normalizedCompanyId = normalizeCompanyId(companyId);
    const requestedDefaults = defaults.map((item) => ({
      tripType: normalizeTripType(item.trip_type),
      ticketTemplateId: item.ticket_template_id === null
        ? null
        : Number(item.ticket_template_id),
    }));
    const seenTripTypes = new Set();

    for (const item of requestedDefaults) {
      if (seenTripTypes.has(item.tripType)) {
        throw domainError(
          'TicketTemplateDefaultDuplicateTripType',
          [`El tipo de viaje ${item.tripType} aparece más de una vez.`]
        );
      }
      seenTripTypes.add(item.tripType);
    }

    const transaction = await sequelize.transaction();

    try {
      const currentDefaults = await TicketTemplateDefault.findAll({
        where: { company_id: normalizedCompanyId },
        transaction,
      });
      const currentByTripType = new Map(
        currentDefaults.map((item) => [
          normalizeTripType(getRecordValue(item, 'trip_type')),
          item,
        ])
      );
      const finalAssignments = new Map(
        currentDefaults.map((item) => [
          normalizeTripType(getRecordValue(item, 'trip_type')),
          getRecordValue(item, 'ticket_template_id'),
        ])
      );

      for (const item of requestedDefaults) {
        ensureSupportedTripType(item.tripType);
        if (item.ticketTemplateId === null) {
          finalAssignments.delete(item.tripType);
        } else {
          finalAssignments.set(item.tripType, item.ticketTemplateId);
        }
      }

      const tripTypeByTemplate = new Map();
      for (const [tripType, ticketTemplateId] of finalAssignments) {
        const templateKey = String(ticketTemplateId);
        const previousTripType = tripTypeByTemplate.get(templateKey);
        if (previousTripType && previousTripType !== tripType) {
          throw domainError(
            'TicketTemplateDefaultSingleTypeOnly',
            [`La plantilla ${ticketTemplateId} ya está asociada como predeterminada al tipo de viaje ${previousTripType}.`]
          );
        }
        tripTypeByTemplate.set(templateKey, tripType);
      }

      for (const item of requestedDefaults) {
        if (item.ticketTemplateId === null) continue;

        const ticketTemplate = await TicketTemplate.findByPk(
          item.ticketTemplateId,
          { transaction }
        );

        if (!ticketTemplate) {
          throw domainError(
            'TicketTemplateNotFound',
            ['La plantilla de ticket indicada no existe.']
          );
        }

        if (getRecordValue(ticketTemplate, 'status') !== 'active') {
          throw domainError(
            'TicketTemplateInactive',
            ['La plantilla seleccionada debe estar activa.']
          );
        }

        if (
          normalizeCompanyId(getRecordValue(ticketTemplate, 'company_id')) !== normalizedCompanyId
        ) {
          throw domainError(
            'TicketTemplateCompanyMismatch',
            ['La plantilla no pertenece a la empresa indicada.']
          );
        }

        if (
          normalizeTemplateTripType(ticketTemplate) !== item.tripType
        ) {
          throw domainError(
            'TicketTemplateTripTypeMismatch',
            [`La plantilla seleccionada no corresponde al tipo de viaje ${item.tripType}.`]
          );
        }
      }

      for (const item of requestedDefaults) {
        const currentDefault = currentByTripType.get(item.tripType);

        if (item.ticketTemplateId === null) {
          if (currentDefault) await currentDefault.destroy({ transaction });
          continue;
        }

        if (currentDefault) {
          await currentDefault.update(
            { ticket_template_id: item.ticketTemplateId },
            { transaction }
          );
        } else {
          await TicketTemplateDefault.create(
            {
              company_id: normalizedCompanyId,
              trip_type: item.tripType,
              ticket_template_id: item.ticketTemplateId,
            },
            { transaction }
          );
        }
      }

      await transaction.commit();

      return SUPPORTED_TRIP_TYPES.map((tripType) => ({
        trip_type: tripType,
        ticket_template_id: finalAssignments.get(tripType) ?? null,
      }));
    } catch (error) {
      if (transaction && !transaction.finished) await transaction.rollback();
      throw error;
    }
  },

  async replaceForTemplate(ticketTemplate, tripTypes = [], options = {}) {
    const transaction = options.transaction || await sequelize.transaction();
    const ownsTransaction = !options.transaction;
    const desiredTripTypes = normalizeTripTypes(tripTypes).map(ensureSupportedTripType);

    try {
      if (desiredTripTypes.length > 1) {
        throw domainError(
          'TicketTemplateDefaultSingleTypeOnly',
          'Una plantilla solo puede ser predeterminada para un tipo de viaje.'
        );
      }

      if (
        desiredTripTypes.length === 1 &&
        normalizeTemplateTripType(ticketTemplate) !== desiredTripTypes[0]
      ) {
        throw domainError(
          'TicketTemplateDefaultTripTypeMismatch',
          'El tipo predeterminado debe coincidir con el tipo de viaje de la plantilla.'
        );
      }

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
      if (normalizeTemplateTripType(template) !== normalizedTripType) {
        const error = domainError('TicketTemplateTripTypeMismatch');
        error.details = 'La plantilla de ticket seleccionada no coincide con el tipo de viaje.';
        throw error;
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
      template = await TicketTemplate.findOne({
        where: {
          company_id: null,
          trip_type: SYSTEM_TEMPLATE_TRIP_TYPE,
          status: 'active',
        },
        transaction,
      });

      if (!template) {
        throw domainError('TicketTemplateDefaultNotConfigured');
      }

      return template.id;
    }

    template = await TicketTemplate.findByPk(currentDefault.ticket_template_id, { transaction });
    if (!template || template.status !== 'active') {
      throw domainError('TicketTemplateDefaultNotConfigured');
    }
    if (normalizeTemplateTripType(template) !== normalizedTripType) {
      const error = domainError('TicketTemplateTripTypeMismatch');
      error.details = 'La plantilla predeterminada no coincide con el tipo de viaje configurado.';
      throw error;
    }

    return template.id;
  },
};

module.exports = TicketTemplateDefaultRepository;
