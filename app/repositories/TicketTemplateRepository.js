const { TicketTemplate } = require('../models');
const logger = require('../../config/logger');

const getCompanyId = (body = {}) => body.company_id ?? body.companyId;
const getTripType = (body = {}) => body.trip_type ?? body.tripType;
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

    return TicketTemplate.findAll({
      where,
      attributes: templateAttributes,
      order: [['createdAt', 'DESC']],
    });
  },

  async findById(id) {
    return TicketTemplate.findByPk(id, { attributes: templateAttributes });
  },

  async create(body) {
    const ticketTemplate = await TicketTemplate.create(
      normalizeTemplateData(body, { includeDefaults: true })
    );

    logger.info(`TicketTemplate creado exitosamente (ID: ${ticketTemplate.id})`);
    return ticketTemplate;
  },

  async update(ticketTemplate, body) {
    const updatedData = normalizeTemplateData(body);

    if (Object.keys(updatedData).length > 0) {
      await ticketTemplate.update(updatedData);
      logger.info(`TicketTemplate actualizado exitosamente (ID: ${ticketTemplate.id})`);
    }

    return ticketTemplate;
  },

  async delete(ticketTemplate) {
    await ticketTemplate.destroy();
    logger.info(`TicketTemplate eliminado (ID: ${ticketTemplate.id})`);
  },
};

module.exports = TicketTemplateRepository;
