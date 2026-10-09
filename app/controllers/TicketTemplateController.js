const logger = require('../../config/logger');
const { TicketTemplateRepository } = require('../repositories');

const mapTicketTemplate = (ticketTemplate) => {
  const data = ticketTemplate.toJSON ? ticketTemplate.toJSON() : ticketTemplate;

  return {
    id: data.id,
    company_id: data.company_id,
    name: data.name,
    trip_type: data.trip_type,
    status: data.status,
    config: data.config,
    created_at: data.created_at ?? data.createdAt,
    updated_at: data.updated_at ?? data.updatedAt,
  };
};

const TicketTemplateController = {
  async index(req, res) {
    logger.info(`${req.user?.name ?? 'Usuario'} - Busca plantillas de tickets por empresa`);

    try {
      const ticketTemplates = await TicketTemplateRepository.findAll(req.body);

      if (!ticketTemplates.length) {
        return res.status(204).json({ msg: 'TicketTemplatesNotFound' });
      }

      return res.status(200).json({
        ticketTemplates: ticketTemplates.map(mapTicketTemplate),
      });
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

      await TicketTemplateRepository.delete(ticketTemplate);
      return res.status(200).json({ msg: 'TicketTemplateDeleted' });
    } catch (error) {
      const errorMsg = error.message || 'Error desconocido';
      logger.error(`TicketTemplateController->destroy: ${errorMsg}`);
      return res.status(500).json({ error: 'ServerError', details: errorMsg });
    }
  },
};

module.exports = TicketTemplateController;
