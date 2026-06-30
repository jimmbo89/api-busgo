const Joi = require('joi');

// Esquema para crear un nuevo tipo de pasaje
const storeTicketTypeSchema = Joi.object({
  name: Joi.string().max(255).required(),
  description: Joi.string().allow(null).empty('').optional(),
  adjustment_type: Joi.string().valid('recargo', 'descuento').allow(null).empty('').optional(),
  value_type: Joi.string().valid('porcentaje', 'monto').allow(null).empty('').optional(),
  adjustment_value: Joi.number().min(0).allow(null).empty('').optional(),
  active: Joi.boolean().required(),
});

// Esquema para actualizar un tipo de pasaje
const updateTicketTypeSchema = Joi.object({
  name: Joi.string().max(255).allow(null).empty('').optional(),
  description: Joi.string().allow(null).empty('').optional(),
  adjustment_type: Joi.string().valid('recargo', 'descuento').allow(null).empty('').optional(),
  value_type: Joi.string().valid('porcentaje', 'monto').allow(null).empty('').optional(),
  adjustment_value: Joi.number().min(0).allow(null).empty('').optional(),
  active: Joi.boolean().allow(null).empty('').optional(),
  id: Joi.number().required(),
});

// Esquema para validar el ID de un tipo de pasaje
const idTicketTypeSchema = Joi.object({
  id: Joi.number().required(),
});

// Esquema para validar el estado activo de un tipo de pasaje
const activeTicketTypeSchema = Joi.object({
  active: Joi.number().integer().min(0).max(1).required(),
});

module.exports = {
  storeTicketTypeSchema,
  updateTicketTypeSchema,
  idTicketTypeSchema,
  activeTicketTypeSchema,
};
