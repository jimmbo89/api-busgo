const {
  TicketTemplate,
  Trip,
  TripTemplate,
  Branch,
  sequelize,
} = require('../models');
const logger = require('../../config/logger');
const TicketTemplateDefaultRepository = require('./TicketTemplateDefaultRepository');

const getCompanyId = (body = {}) => body.company_id ?? body.companyId;
const getTripType = (body = {}) => body.trip_type ?? body.tripType;
const getDefaultTripTypes = (body = {}) => body.default_trip_types ?? body.defaultTripTypes;
const normalizeString = (value) => typeof value === 'string' ? value.trim() : value;
const normalizeCompanyId = (value) => value === undefined || value === null
  ? value
  : String(value).trim();

const normalizeTemplateData = (body = {}, { includeDefaults = false } = {}) => {
  const data = {};

  if (getCompanyId(body) !== undefined) data.company_id = normalizeCompanyId(getCompanyId(body));
  if (body.name !== undefined) data.name = normalizeString(body.name);
  if (getTripType(body) !== undefined) data.trip_type = normalizeString(getTripType(body));
  if (body.status !== undefined) data.status = normalizeString(body.status);
  if (body.config !== undefined) data.config = body.config;

  if (includeDefaults && data.status === undefined) {
    data.status = 'active';
  }

  return data;
};

const hasDefaultTripTypes = (body = {}) => (
  Object.prototype.hasOwnProperty.call(body, 'default_trip_types') ||
  Object.prototype.hasOwnProperty.call(body, 'defaultTripTypes')
);

const templateAttributes = [
  'id',
  'company_id',
  'name',
  'trip_type',
  'status',
  'config',
  'createdAt',
  'updatedAt',
];

const getTemplateIds = (templates) => templates
  .map((template) => template?.id)
  .filter((id) => id !== undefined && id !== null);

const getAssociationIds = (rows = []) => new Set(
  rows.map((row) => row?.ticket_template_id ?? row?.get?.('ticket_template_id'))
    .filter((id) => id !== undefined && id !== null)
    .map((id) => String(id))
);

const setTemplateValue = (template, key, value) => {
  if (typeof template?.setDataValue === 'function') {
    template.setDataValue(key, value);
  } else if (template) {
    template[key] = value;
  }
};

const attachUsageToTemplates = async (templates) => {
  const templateIds = getTemplateIds(templates);
  if (templateIds.length === 0) return templates;

  const [tripRows, tripTemplateRows] = await Promise.all([
    typeof Trip?.findAll === 'function'
      ? Trip.findAll({
          attributes: ['ticket_template_id'],
          where: { ticket_template_id: templateIds },
          group: ['ticket_template_id'],
          raw: true,
        })
      : [],
    typeof TripTemplate?.findAll === 'function'
      ? TripTemplate.findAll({
          attributes: ['ticket_template_id'],
          where: { ticket_template_id: templateIds },
          group: ['ticket_template_id'],
          raw: true,
        })
      : [],
  ]);

  const tripTemplateIds = getAssociationIds(tripRows);
  const tripTemplateAssociationIds = getAssociationIds(tripTemplateRows);

  templates.forEach((template) => {
    const templateId = String(template.id);
    const hasTrips = tripTemplateIds.has(templateId);
    const hasTripTemplates = tripTemplateAssociationIds.has(templateId);

    setTemplateValue(template, 'has_trips', hasTrips);
    setTemplateValue(template, 'has_trip_templates', hasTripTemplates);
    setTemplateValue(template, 'is_in_use', hasTrips || hasTripTemplates);
  });

  return templates;
};

const TicketTemplateRepository = {
  async findAll(filters = {}) {
    const where = {};
    const company_id = getCompanyId(filters);
    const trip_type = getTripType(filters);

    if (company_id !== undefined) where.company_id = normalizeCompanyId(company_id);
    if (trip_type !== undefined) where.trip_type = trip_type;
    if (filters.status !== undefined) where.status = filters.status;

    const ticketTemplates = await TicketTemplate.findAll({
      where,
      attributes: templateAttributes,
      order: [['createdAt', 'DESC']],
    });
    const activeTicketTemplates = ticketTemplates.filter(
      (template) => template.status !== 'deleted'
    );

    await TicketTemplateDefaultRepository.attachToTemplates(activeTicketTemplates);
    return attachUsageToTemplates(activeTicketTemplates);
  },

  async findById(id) {
    const ticketTemplate = await TicketTemplate.findByPk(id, {
      attributes: templateAttributes,
    });
    if (!ticketTemplate || ticketTemplate.status === 'deleted') return null;

    return TicketTemplateDefaultRepository.attachToTemplates(ticketTemplate);
  },

  async create(body) {
    const transaction = await sequelize.transaction();

    try {
      const ticketTemplate = await TicketTemplate.create(
        normalizeTemplateData(body, { includeDefaults: true }),
        { transaction }
      );

      await TicketTemplateDefaultRepository.replaceForTemplate(
        ticketTemplate,
        getDefaultTripTypes(body) || [],
        { transaction }
      );

      await transaction.commit();
      await TicketTemplateDefaultRepository.attachToTemplates(ticketTemplate);
      logger.info(`TicketTemplate creado exitosamente (ID: ${ticketTemplate.id})`);
      return ticketTemplate;
    } catch (error) {
      if (transaction && !transaction.finished) await transaction.rollback();
      throw error;
    }
  },

  async createSystem(body) {
    const transaction = await sequelize.transaction();

    try {
      const existingTemplates = await TicketTemplate.findAll({
        where: {
          company_id: null,
          trip_type: 'system',
        },
        attributes: ['id', 'status', 'createdAt'],
        order: [['createdAt', 'DESC']],
        transaction,
      });

      const ticketTemplate = existingTemplates[0]
        ? await existingTemplates[0].update(
            {
              company_id: null,
              name: normalizeString(body.name),
              trip_type: 'system',
              status: 'active',
              config: body.config,
            },
            { transaction, validate: false }
          )
        : await TicketTemplate.create(
            {
              company_id: null,
              name: normalizeString(body.name),
              trip_type: 'system',
              status: 'active',
              config: body.config,
            },
            { transaction, validate: false }
          );

      await transaction.commit();
      await TicketTemplateDefaultRepository.attachToTemplates(ticketTemplate);
      await attachUsageToTemplates([ticketTemplate]);
      logger.info(
        `Plantilla global del sistema ${existingTemplates[0] ? 'actualizada' : 'creada'} exitosamente (ID: ${ticketTemplate.id})`
      );
      return {
        ticketTemplate,
        created: !existingTemplates[0],
      };
    } catch (error) {
      if (transaction && !transaction.finished) await transaction.rollback();
      throw error;
    }
  },

  async update(ticketTemplate, body) {
    const transaction = await sequelize.transaction();

    try {
      const currentDefaults = await TicketTemplateDefaultRepository.findByTemplateId(
        ticketTemplate.id,
        { transaction }
      );
      const updatedData = normalizeTemplateData(body);
      const nextStatus = updatedData.status ?? ticketTemplate.status;
      const nextCompanyId = updatedData.company_id ?? ticketTemplate.company_id;

      if (currentDefaults.length > 0 && nextStatus !== 'active' && !hasDefaultTripTypes(body)) {
        const error = new Error('TicketTemplateDefaultReplacementRequired');
        error.code = 'TicketTemplateDefaultReplacementRequired';
        throw error;
      }

      if (
        currentDefaults.length > 0 &&
        normalizeCompanyId(nextCompanyId) !== normalizeCompanyId(ticketTemplate.company_id)
      ) {
        const error = new Error('TicketTemplateCompanyChangeNotAllowed');
        error.code = 'TicketTemplateCompanyChangeNotAllowed';
        throw error;
      }

      if (
        currentDefaults.length > 0 &&
        !hasDefaultTripTypes(body) &&
        updatedData.trip_type !== undefined &&
        currentDefaults.some((currentDefault) => (
          String(currentDefault.trip_type).trim().toLowerCase() !==
          String(updatedData.trip_type).trim().toLowerCase()
        ))
      ) {
        const error = new Error('TicketTemplateDefaultTripTypeMismatch');
        error.code = 'TicketTemplateDefaultTripTypeMismatch';
        error.details = 'La plantilla predeterminada debe coincidir con su tipo de viaje.';
        throw error;
      }

      if (Object.keys(updatedData).length > 0) {
        await ticketTemplate.update(updatedData, { transaction });
      }

      if (hasDefaultTripTypes(body)) {
        await TicketTemplateDefaultRepository.replaceForTemplate(
          ticketTemplate,
          getDefaultTripTypes(body) || [],
          { transaction }
        );
      }

      await transaction.commit();
      await TicketTemplateDefaultRepository.attachToTemplates(ticketTemplate);
      logger.info(`TicketTemplate actualizado exitosamente (ID: ${ticketTemplate.id})`);
      return ticketTemplate;
    } catch (error) {
      if (transaction && !transaction.finished) await transaction.rollback();
      throw error;
    }
  },

  async delete(ticketTemplate) {
    const transaction = await sequelize.transaction();

    try {
      const currentDefaults = await TicketTemplateDefaultRepository.findByTemplateId(
        ticketTemplate.id,
        { transaction }
      );

      if (currentDefaults.length > 0) {
        const error = new Error('TicketTemplateDefaultReplacementRequired');
        error.code = 'TicketTemplateDefaultReplacementRequired';
        throw error;
      }

      if (TripTemplate) {
        const tripTemplatesUsingTemplate = await TripTemplate.findAll({
          where: { ticket_template_id: ticketTemplate.id },
          attributes: ['id', 'saleMode', 'branch_id'],
          include: [
            {
              model: Branch,
              as: 'branch',
              attributes: ['company_id'],
              required: true,
            },
          ],
          transaction,
        });

        for (const tripTemplate of tripTemplatesUsingTemplate) {
          const replacementId = await TicketTemplateDefaultRepository.resolveForTrip({
            companyId: tripTemplate.branch.company_id,
            tripType: tripTemplate.saleMode,
            transaction,
          });

          await tripTemplate.update(
            { ticket_template_id: replacementId },
            { transaction }
          );
        }
      }

      const tripsUsingTemplate = await Trip.count({
        where: { ticket_template_id: ticketTemplate.id },
        transaction,
      });
      if (tripsUsingTemplate > 0) {
        await ticketTemplate.update({ status: 'deleted' }, { transaction });
        await transaction.commit();
        logger.info(
          `TicketTemplate marcado como eliminado lógicamente (ID: ${ticketTemplate.id})`
        );
        return {
          softDeleted: true,
          status: 'deleted',
          tripsUsingTemplate,
        };
      }

      await ticketTemplate.destroy({ transaction });
      await transaction.commit();
      logger.info(`TicketTemplate eliminado (ID: ${ticketTemplate.id})`);
    } catch (error) {
      if (transaction && !transaction.finished) await transaction.rollback();
      throw error;
    }
  },
};

module.exports = TicketTemplateRepository;
