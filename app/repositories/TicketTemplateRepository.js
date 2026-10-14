const { TicketTemplate, Trip, sequelize } = require('../models');
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
    return TicketTemplateDefaultRepository.attachToTemplates(ticketTemplates);
  },

  async findById(id) {
    const ticketTemplate = await TicketTemplate.findByPk(id, { attributes: templateAttributes });
    if (!ticketTemplate) return null;

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

      const tripsUsingTemplate = await Trip.count({
        where: { ticket_template_id: ticketTemplate.id },
        transaction,
      });
      if (tripsUsingTemplate > 0) {
        const error = new Error('TicketTemplateInUse');
        error.code = 'TicketTemplateInUse';
        throw error;
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
