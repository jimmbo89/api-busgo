const logger = require('../../config/logger');
const { TicketTemplateRepository } = require('../repositories');
const saleModes = require('../constants/saleModes');

const mapTicketTemplate = (ticketTemplate, { includeUsage = false } = {}) => {
  const data = ticketTemplate.toJSON ? ticketTemplate.toJSON() : ticketTemplate;
  const defaultTripTypes = data.default_trip_types ?? data.defaultTripTypes ?? [];

  const mappedTemplate = {
    id: data.id,
    company_id: data.company_id,
    name: data.name,
    trip_type: data.trip_type,
    status: data.status,
    config: data.config,
    default_trip_types: defaultTripTypes,
    is_default: defaultTripTypes.length > 0,
    created_at: data.created_at ?? data.createdAt,
    updated_at: data.updated_at ?? data.updatedAt,
  };

  if (includeUsage) {
    mappedTemplate.has_trips = data.has_trips === true;
    mappedTemplate.has_trip_templates = data.has_trip_templates === true;
    mappedTemplate.is_in_use = data.is_in_use === true;
  }

  return mappedTemplate;
};

const ticketTemplateRuleErrors = new Set([
  'TicketTemplateDefaultReplacementRequired',
  'TicketTemplateMustBeActiveForDefault',
  'TicketTemplateCompanyChangeNotAllowed',
  'TicketTemplateInUse',
  'TicketTemplateDefaultNotConfigured',
]);

const sendTicketTemplateError = (res, error) => {
  if (!ticketTemplateRuleErrors.has(error.code)) return false;

  return res.status(409).json({
    error: error.code,
    msg: error.code,
    ...(error.details ? { details: error.details } : {}),
  });
};

const TicketTemplateController = {
  async getSaleModes(req, res) {
    logger.info(`${req.user?.name ?? 'Usuario'} - Busca modos de venta para plantillas de tickets`);

    return res.status(200).json({ saleModes });
  },
  async index(req, res) {
    logger.info(`${req.user?.name ?? 'Usuario'} - Busca plantillas de tickets por empresa`);

    try {
      const ticketTemplates = await TicketTemplateRepository.findAll(req.body);
      const includeSaleModes = req.body?.include_sale_modes === true;

      if (!ticketTemplates.length) {
        if (includeSaleModes) {
          return res.status(200).json({
            ticketTemplates: [],
            saleModes,
          });
        }

        return res.status(204).json({ msg: 'TicketTemplatesNotFound' });
      }

      const response = {
        ticketTemplates: ticketTemplates.map((ticketTemplate) => mapTicketTemplate(
          ticketTemplate,
          { includeUsage: true }
        )),
      };

      if (includeSaleModes) response.saleModes = saleModes;

      return res.status(200).json(response);
    } catch (error) {
      const errorMsg = error.message || 'Error desconocido';
      logger.error(`TicketTemplateController->index: ${errorMsg}`);
      return res.status(500).json({ error: 'ServerError', details: errorMsg });
    }
  },

  async store(req, res) {
    logger.info(`${req.user?.name ?? 'Usuario'} - Crea una plantilla de ticket`);

    try {
      const ticketTemplate = await TicketTemplateRepository.create(req.body);

      return res.status(201).json({
        msg: 'TicketTemplateCreated',
        ticketTemplate: mapTicketTemplate(ticketTemplate),
      });
    } catch (error) {
      if (sendTicketTemplateError(res, error)) return;
      const errorMsg = error.message || 'Error desconocido';
      logger.error(`TicketTemplateController->store: ${errorMsg}`);
      return res.status(500).json({ error: 'ServerError', details: errorMsg });
    }
  },

  async update(req, res) {
    logger.info(`${req.user?.name ?? 'Usuario'} - Actualiza una plantilla de ticket`);

    try {
      const ticketTemplate = await TicketTemplateRepository.findById(req.body.id);
      if (!ticketTemplate) {
        return res.status(404).json({ msg: 'TicketTemplateNotFound' });
      }

      const updatedTicketTemplate = await TicketTemplateRepository.update(
        ticketTemplate,
        req.body
      );

      return res.status(200).json({
        msg: 'TicketTemplateUpdated',
        ticketTemplate: mapTicketTemplate(updatedTicketTemplate),
      });
    } catch (error) {
      if (sendTicketTemplateError(res, error)) return;
      const errorMsg = error.message || 'Error desconocido';
      logger.error(`TicketTemplateController->update: ${errorMsg}`);
      return res.status(500).json({ error: 'ServerError', details: errorMsg });
    }
  },

  async destroy(req, res) {
    logger.info(`${req.user?.name ?? 'Usuario'} - Elimina una plantilla de ticket`);

    try {
      const ticketTemplate = await TicketTemplateRepository.findById(req.body.id);
      if (!ticketTemplate) {
        return res.status(404).json({ msg: 'TicketTemplateNotFound' });
      }

      const deletion = await TicketTemplateRepository.delete(ticketTemplate);
      return res.status(200).json({
        msg: 'TicketTemplateDeleted',
        ...(deletion?.softDeleted
          ? {
              details:
                'La plantilla fue retirada de los listados operativos porque mantiene viajes históricos asociados.',
            }
          : {}),
      });
    } catch (error) {
      if (sendTicketTemplateError(res, error)) return;
      const errorMsg = error.message || 'Error desconocido';
      logger.error(`TicketTemplateController->destroy: ${errorMsg}`);
      return res.status(500).json({ error: 'ServerError', details: errorMsg });
    }
  },
};

module.exports = TicketTemplateController;
