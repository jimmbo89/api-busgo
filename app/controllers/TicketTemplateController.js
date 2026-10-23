const logger = require('../../config/logger');
const {
  TicketTemplateRepository,
  TicketTemplateDefaultRepository,
} = require('../repositories');
const { Worker, Role, Permission } = require('../models');
const saleModes = require('../constants/saleModes');

const SYSTEM_TICKET_TEMPLATE_PERMISSION = 'view_system_ticket_template';

const hasSystemTicketTemplatePermission = async (req) => {
  if (!req.user?.id || typeof Worker?.findOne !== 'function') return false;

  const worker = await Worker.findOne({
    where: { user_id: req.user.id },
    attributes: ['id'],
    include: [
      {
        model: Role,
        as: 'role',
        attributes: ['id'],
        required: true,
        include: [
          {
            model: Permission,
            as: 'permissions',
            attributes: ['name'],
            where: { name: SYSTEM_TICKET_TEMPLATE_PERMISSION },
            through: { attributes: [] },
            required: true,
          },
        ],
      },
    ],
  });

  return Boolean(worker);
};

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
  'TicketTemplateDefaultSingleTypeOnly',
  'TicketTemplateDefaultTripTypeMismatch',
]);

const ticketTemplateRuleDetails = {
  TicketTemplateDefaultReplacementRequired:
    'La plantilla es predeterminada para uno o más tipos de viaje. Debes asignar otra plantilla predeterminada antes de quitarla o desactivarla.',
};

const sendTicketTemplateError = (res, error) => {
  if (!ticketTemplateRuleErrors.has(error.code)) return false;

  const details = error.details || ticketTemplateRuleDetails[error.code];

  return res.status(409).json({
    error: error.code,
    msg: error.code,
    ...(details ? { details } : {}),
  });
};

const ticketTemplateDefaultsRuleErrors = new Set([
  'TicketTemplateNotFound',
  'TicketTemplateInactive',
  'TicketTemplateCompanyMismatch',
  'TicketTemplateTripTypeMismatch',
  'TicketTemplateTripTypeNotSupported',
  'TicketTemplateDefaultDuplicateTripType',
  'TicketTemplateDefaultSingleTypeOnly',
  'TicketTemplateDefaultsValidationError',
]);

const sendTicketTemplateDefaultsError = (res, error) => {
  if (!ticketTemplateDefaultsRuleErrors.has(error.code)) return false;

  const details = error.details || ['No fue posible actualizar las plantillas predeterminadas.'];

  return res.status(400).json({
    error: error.code,
    msg: error.code,
    details: Array.isArray(details) ? details : [details],
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

  async systemDefault(req, res) {
    logger.info(`${req.user?.name ?? 'Usuario'} - Consulta plantilla global del sistema`);

    try {
      if (!(await hasSystemTicketTemplatePermission(req))) {
        return res.status(403).json({
          error: 'Forbidden',
          msg: 'Forbidden',
          details: ['No tiene permiso para consultar la plantilla global del sistema.'],
        });
      }

      const systemTemplates = await TicketTemplateRepository.findAll({
        company_id: null,
        trip_type: 'system',
        status: 'active',
      });
      const ticketTemplate = systemTemplates[0] ?? null;

      if (!ticketTemplate) {
        return res.status(404).json({
          error: 'TicketTemplateNotFound',
          msg: 'TicketTemplateNotFound',
          details: ['No existe una plantilla global del sistema activa.'],
        });
      }

      return res.status(200).json({
        ticketTemplate: mapTicketTemplate(ticketTemplate, { includeUsage: true }),
      });
    } catch (error) {
      const errorMsg = error.message || 'Error desconocido';
      logger.error(`TicketTemplateController->systemDefault: ${errorMsg}`);
      return res.status(500).json({ error: 'ServerError', details: errorMsg });
    }
  },

  async storeSystem(req, res) {
    logger.info(`${req.user?.name ?? 'Usuario'} - Crea plantilla global del sistema`);

    try {
      if (!(await hasSystemTicketTemplatePermission(req))) {
        return res.status(403).json({
          error: 'Forbidden',
          msg: 'Forbidden',
          details: ['No tiene permiso para crear la plantilla global del sistema.'],
        });
      }

      const result = await TicketTemplateRepository.createSystem(req.body);
      const ticketTemplate = result.ticketTemplate;

      return res.status(result.created ? 201 : 200).json({
        msg: result.created
          ? 'SystemTicketTemplateCreated'
          : 'SystemTicketTemplateUpdated',
        ticketTemplate: mapTicketTemplate(ticketTemplate, { includeUsage: true }),
      });
    } catch (error) {
      const errorMsg = error.message || 'Error desconocido';
      logger.error(`TicketTemplateController->storeSystem: ${errorMsg}`);
      return res.status(500).json({ error: 'ServerError', details: errorMsg });
    }
  },

  async updateDefaults(req, res) {
    logger.info(`${req.user?.name ?? 'Usuario'} - Actualiza plantillas predeterminadas por tipo de viaje`);

    try {
      const defaults = await TicketTemplateDefaultRepository.replaceForCompany(
        req.body.company_id,
        req.body.defaults
      );

      return res.status(200).json({
        msg: 'TicketTemplateDefaultsUpdated',
        defaults,
      });
    } catch (error) {
      if (sendTicketTemplateDefaultsError(res, error)) return;
      const errorMsg = error.message || 'Error desconocido';
      logger.error(`TicketTemplateController->updateDefaults: ${errorMsg}`);
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
