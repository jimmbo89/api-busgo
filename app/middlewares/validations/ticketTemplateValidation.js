const Joi = require('joi');

const companyIdSchema = Joi.alternatives().try(
  Joi.string().trim().min(1).max(36),
  Joi.number().integer().min(1)
).messages({
  'alternatives.match': 'El campo company_id debe ser un identificador válido',
});

const nameSchema = Joi.string().trim().min(1).max(255).messages({
  'string.base': 'El campo name debe ser un texto',
  'string.empty': 'El nombre de la plantilla es obligatorio',
  'string.min': 'El nombre de la plantilla es obligatorio',
  'string.max': 'El nombre de la plantilla no puede superar los 255 caracteres',
});

const tripTypeSchema = Joi.string().trim().max(50).custom((value, helpers) => {
  if (!['normal', 'express', 'on_board'].includes(value.toLowerCase())) {
    return helpers.error('any.only');
  }

  return value;
}).messages({
  'string.base': 'El campo trip_type debe ser un texto',
  'string.empty': 'El campo trip_type es obligatorio',
  'string.max': 'El campo trip_type no puede superar los 50 caracteres',
  'any.only': 'El campo trip_type no es válido',
});

const statusSchema = Joi.string().trim().max(20).valid('active', 'inactive').messages({
  'string.base': 'El campo status debe ser un texto',
  'any.only': 'El campo status no es válido',
  'string.max': 'El campo status no puede superar los 20 caracteres',
});

const configSchema = Joi.object().required().unknown(true).messages({
  'any.required': 'El campo config es obligatorio',
  'object.base': 'El campo config debe ser un objeto JSON',
});

const storeTicketTemplateSchema = Joi.object({
  company_id: companyIdSchema.optional(),
  companyId: companyIdSchema.optional(),
  name: nameSchema.required(),
  trip_type: tripTypeSchema.optional(),
  tripType: tripTypeSchema.optional(),
  status: statusSchema.optional(),
  config: configSchema,
}).or('company_id', 'companyId').or('trip_type', 'tripType').messages({
  'object.missing': 'Los campos company_id y trip_type son obligatorios',
});

const updateTicketTemplateSchema = Joi.object({
  id: Joi.string().trim().min(1).max(36).required().messages({
    'string.base': 'El campo id debe ser un texto',
    'string.empty': 'El campo id es obligatorio',
    'string.min': 'El campo id es obligatorio',
    'string.max': 'El campo id no puede superar los 36 caracteres',
  }),
  company_id: companyIdSchema.optional(),
  companyId: companyIdSchema.optional(),
  name: nameSchema.optional(),
  trip_type: tripTypeSchema.optional(),
  tripType: tripTypeSchema.optional(),
  status: statusSchema.optional(),
  config: configSchema.optional(),
}).min(1).messages({
  'object.min': 'Debe enviar al menos un campo para actualizar',
});

const idTicketTemplateSchema = Joi.object({
  id: Joi.string().trim().min(1).max(36).required().messages({
    'string.base': 'El campo id debe ser un texto',
    'string.empty': 'El campo id es obligatorio',
    'string.min': 'El campo id es obligatorio',
    'string.max': 'El campo id no puede superar los 36 caracteres',
  }),
});

const ticketTemplateCompanySchema = Joi.object({
  company_id: companyIdSchema.optional(),
  companyId: companyIdSchema.optional(),
  trip_type: tripTypeSchema.optional(),
  tripType: tripTypeSchema.optional(),
  status: statusSchema.optional(),
}).or('company_id', 'companyId').messages({
  'object.missing': 'El campo company_id es obligatorio',
});

module.exports = {
  storeTicketTemplateSchema,
  updateTicketTemplateSchema,
  idTicketTemplateSchema,
  ticketTemplateCompanySchema,
};
