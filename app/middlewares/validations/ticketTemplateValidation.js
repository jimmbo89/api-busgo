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

const defaultTripTypesSchema = Joi.array()
  .items(tripTypeSchema)
  .unique()
  .max(1)
  .optional()
  .messages({
    'array.base': 'El campo default_trip_types debe ser un arreglo',
    'array.max': 'Una plantilla solo puede ser predeterminada para un tipo de viaje',
    'array.unique': 'El campo default_trip_types no puede repetir tipos de viaje',
  });

const storeTicketTemplateSchema = Joi.object({
  company_id: companyIdSchema.optional(),
  companyId: companyIdSchema.optional(),
  name: nameSchema.required(),
  trip_type: tripTypeSchema.optional(),
  tripType: tripTypeSchema.optional(),
  default_trip_types: defaultTripTypesSchema,
  defaultTripTypes: defaultTripTypesSchema,
  status: statusSchema.optional(),
  config: configSchema,
}).or('company_id', 'companyId').or('trip_type', 'tripType').messages({
  'object.missing': 'Los campos company_id y trip_type son obligatorios',
});

const updateTicketTemplateSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'El campo id debe ser un número entero',
    'number.integer': 'El campo id debe ser un número entero',
    'number.positive': 'El campo id debe ser positivo',
    'any.required': 'El campo id es obligatorio',
  }),
  company_id: companyIdSchema.optional(),
  companyId: companyIdSchema.optional(),
  name: nameSchema.optional(),
  trip_type: tripTypeSchema.optional(),
  tripType: tripTypeSchema.optional(),
  default_trip_types: defaultTripTypesSchema,
  defaultTripTypes: defaultTripTypesSchema,
  status: statusSchema.optional(),
  config: configSchema.optional(),
}).min(1).messages({
  'object.min': 'Debe enviar al menos un campo para actualizar',
});

const idTicketTemplateSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'El campo id debe ser un número entero',
    'number.integer': 'El campo id debe ser un número entero',
    'number.positive': 'El campo id debe ser positivo',
    'any.required': 'El campo id es obligatorio',
  }),
});

const ticketTemplateCompanySchema = Joi.object({
  company_id: companyIdSchema.optional(),
  companyId: companyIdSchema.optional(),
  trip_type: tripTypeSchema.optional(),
  tripType: tripTypeSchema.optional(),
  status: statusSchema.optional(),
  include_sale_modes: Joi.boolean().strict().optional(),
}).or('company_id', 'companyId').messages({
  'object.missing': 'El campo company_id es obligatorio',
});

const ticketTemplateDefaultsSchema = Joi.object({
  company_id: companyIdSchema.required().messages({
    'any.required': 'El campo company_id es obligatorio',
  }),
  defaults: Joi.array().items(
    Joi.object({
      trip_type: tripTypeSchema.required().messages({
        'any.required': 'El campo trip_type es obligatorio',
      }),
      ticket_template_id: Joi.number().integer().positive().allow(null).required().messages({
        'number.base': 'El campo ticket_template_id debe ser un número entero o null',
        'number.integer': 'El campo ticket_template_id debe ser un número entero o null',
        'number.positive': 'El campo ticket_template_id debe ser un número entero positivo o null',
        'any.required': 'El campo ticket_template_id es obligatorio y debe ser un ID válido o null',
      }),
    }).required()
  ).required().messages({
    'array.base': 'El campo defaults debe ser un arreglo',
    'any.required': 'El campo defaults es obligatorio',
  }),
}).messages({
  'object.base': 'El cuerpo de la solicitud debe ser un objeto JSON',
});

module.exports = {
  storeTicketTemplateSchema,
  updateTicketTemplateSchema,
  idTicketTemplateSchema,
  ticketTemplateCompanySchema,
  ticketTemplateDefaultsSchema,
};
