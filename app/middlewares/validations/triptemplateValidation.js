const Joi = require("joi");

// Esquema para crear un nuevo TripTemplate
const storeTripTemplateSchema = Joi.object({

  branch_id: Joi.number().integer().required().messages({
    "number.base": "El campo branch_id debe ser un número entero",
    "any.required": "El campo branch_id es obligatorio",
  }),
  vehicle_id: Joi.number().integer().required().messages({
    "number.base": "El campo vehicle_id debe ser un número entero",
    "any.required": "El campo vehicle_id es obligatorio",
  }),
  route_id: Joi.number().integer().required().messages({
    "number.base": "El campo route_id debe ser un número entero",
    "any.required": "El campo route_id es obligatorio",
  }),
  schedule: Joi.string().allow(null).optional().messages({
    "string.base": "El campo schedule debe ser un texto",
  }),
  duration: Joi.number().integer().allow(null).optional().messages({
    "number.base": "El campo duration debe ser un número entero",
  }),
  price: Joi.number().precision(2).allow(null).optional().messages({
    "number.base": "El campo price debe ser un número",
  }),
  recurrence_pattern: Joi.string().allow(null).optional().messages({
    "string.base": "El campo recurrence_pattern debe ser un texto",
  }),
  days_of_week: Joi.string().allow(null).optional().messages({
    "string.base": "El campo days_of_week debe ser un texto",
  }),
  active: Joi.boolean().allow(null).optional().messages({
    "boolean.base": "El campo active debe ser un valor booleano",
  }),
  workers: Joi.array().items(Joi.object()).allow(null).optional().messages({
    "array.base": "El campo workers debe ser un arreglo de objetos",
  }),
});

// Esquema para actualizar un TripTemplate
const updateTripTemplateSchema = Joi.object({
  branch_id: Joi.number().integer().allow(null).optional().messages({
    "number.base": "El campo branch_id debe ser un número entero",
  }),
  vehicle_id: Joi.number().integer().allow(null).optional().messages({
    "number.base": "El campo vehicle_id debe ser un número entero",
  }),
  route_id: Joi.number().integer().allow(null).optional().messages({
    "number.base": "El campo route_id debe ser un número entero",
  }),
  schedule: Joi.string().allow(null).optional().messages({
    "string.base": "El campo schedule debe ser un texto",
  }),
  duration: Joi.number().integer().allow(null).optional().messages({
    "number.base": "El campo duration debe ser un número entero",
  }),
  price: Joi.number().precision(2).allow(null).optional().messages({
    "number.base": "El campo price debe ser un número",
  }),
  recurrence_pattern: Joi.string().allow(null).optional().messages({
    "string.base": "El campo recurrence_pattern debe ser un texto",
  }),
  days_of_week: Joi.string().allow(null).optional().messages({
    "string.base": "El campo days_of_week debe ser un texto",
  }),
  active: Joi.boolean().allow(null).optional().messages({
    "boolean.base": "El campo active debe ser un valor booleano",
  }),
  workers: Joi.array().items(Joi.object()).allow(null).optional().messages({
    "array.base": "El campo workers debe ser un arreglo de objetos",
  }),
  id: Joi.number().integer().required().messages({
    "number.base": "El campo id debe ser un número entero",
    "any.required": "El campo id es obligatorio",
  }),
});

// Esquema para validar el ID de un TripTemplate
const idTripTemplateSchema = Joi.object({
  id: Joi.number().integer().required().messages({
    "number.base": "El campo id debe ser un número entero",
    "any.required": "El campo id es obligatorio",
  }),
});

// Esquema para buscar TripTemplates por branch_id
const branchTripTemplateSchema = Joi.object({
  branch_id: Joi.number().integer().required().messages({
    "number.base": "El campo branch_id debe ser un número entero",
    "any.required": "El campo branch_id es obligatorio",
  })
});

module.exports = {
  storeTripTemplateSchema,
  updateTripTemplateSchema,
  idTripTemplateSchema,
  branchTripTemplateSchema
};