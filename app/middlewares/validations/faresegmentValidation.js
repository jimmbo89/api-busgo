const Joi = require("joi");

const storeFareSegmentSchema = Joi.object({
  company_id: Joi.number().integer().positive().required().messages({
    "number.base": "El campo company_id debe ser un numero entero",
    "any.required": "El campo company_id es obligatorio",
  }),
  route_id: Joi.number().integer().positive().required().messages({
    "number.base": "El campo route_id debe ser un numero entero",
    "any.required": "El campo route_id es obligatorio",
  }),
  origin_route_stop_id: Joi.number().integer().positive().required().messages({
    "number.base": "El campo origin_route_stop_id debe ser un numero entero",
    "any.required": "El campo origin_route_stop_id es obligatorio",
  }),
  destination_route_stop_id: Joi.number().integer().positive().required().messages({
    "number.base": "El campo destination_route_stop_id debe ser un numero entero",
    "any.required": "El campo destination_route_stop_id es obligatorio",
  }),
  service_class: Joi.string().allow(null, "").optional(),
  base_price: Joi.number().precision(2).required().messages({
    "number.base": "El campo base_price debe ser un numero",
    "any.required": "El campo base_price es obligatorio",
  }),
  currency: Joi.string().max(10).allow(null, "").optional(),
  valid_from: Joi.date().allow(null).optional(),
  valid_to: Joi.date().allow(null).optional(),
  priority: Joi.number().integer().optional(),
  active: Joi.boolean().optional(),
});

const updateFareSegmentSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    "number.base": "El campo id debe ser un numero entero",
    "any.required": "El campo id es obligatorio",
  }),
  company_id: Joi.number().integer().positive().optional(),
  route_id: Joi.number().integer().positive().optional(),
  origin_route_stop_id: Joi.number().integer().positive().optional(),
  destination_route_stop_id: Joi.number().integer().positive().optional(),
  service_class: Joi.string().allow(null, "").optional(),
  base_price: Joi.number().precision(2).optional(),
  currency: Joi.string().max(10).allow(null, "").optional(),
  valid_from: Joi.date().allow(null).optional(),
  valid_to: Joi.date().allow(null).optional(),
  priority: Joi.number().integer().optional(),
  active: Joi.boolean().optional(),
});

const idFareSegmentSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    "number.base": "El campo id debe ser un numero entero",
    "any.required": "El campo id es obligatorio",
  }),
});

const routeIdFareSegmentSchema = Joi.object({
  route_id: Joi.number().integer().positive().required().messages({
    "number.base": "El campo route_id debe ser un numero entero",
    "any.required": "El campo route_id es obligatorio",
  }),
});

const companyIdFareSegmentSchema = Joi.object({
  company_id: Joi.number().integer().positive().required().messages({
    "number.base": "El campo company_id debe ser un numero entero",
    "any.required": "El campo company_id es obligatorio",
  }),
});

module.exports = {
  storeFareSegmentSchema,
  updateFareSegmentSchema,
  idFareSegmentSchema,
  routeIdFareSegmentSchema,
  companyIdFareSegmentSchema,
};
