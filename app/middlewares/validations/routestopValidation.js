const Joi = require('joi');

const storeRouteStopSchema = Joi.object({
  company_id: Joi.number().integer().required(),
  route_id: Joi.number().integer().required(),
  location_id: Joi.number().integer().required(),
  stop_order: Joi.number().integer().required(),
  distance_km: Joi.number().precision(2).min(0).allow(null).empty('').optional(),
  minutes_from_origin: Joi.number().integer().min(0).allow(null).empty('').optional(),
  allows_boarding: Joi.boolean().optional().default(true),
  allows_alighting: Joi.boolean().optional().default(true),
  active: Joi.boolean().optional().default(true),
});

const updateRouteStopSchema = Joi.object({
  id: Joi.number().integer().required(),
  company_id: Joi.number().integer().optional(),
  route_id: Joi.number().integer().optional(),
  location_id: Joi.number().integer().optional(),
  stop_order: Joi.number().integer().optional(),
  distance_km: Joi.number().precision(2).min(0).allow(null).empty('').optional(),
  minutes_from_origin: Joi.number().integer().min(0).allow(null).empty('').optional(),
  allows_boarding: Joi.boolean().optional(),
  allows_alighting: Joi.boolean().optional(),
  active: Joi.boolean().optional(),
});

const idRouteStopSchema = Joi.object({
  id: Joi.number().integer().required(),
});

const routeIdRouteStopSchema = Joi.object({
  route_id: Joi.number().integer().required(),
});

const companyIdRouteStopSchema = Joi.object({
  company_id: Joi.number().integer().required(),
});

module.exports = {
  storeRouteStopSchema,
  updateRouteStopSchema,
  idRouteStopSchema,
  routeIdRouteStopSchema,
  companyIdRouteStopSchema,
};
