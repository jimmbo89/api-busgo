const Joi = require('joi');

const sourceTypes = ['auto', 'manual', 'override'];

const storeTripStopSchema = Joi.object({
  company_id: Joi.number().integer().required(),
  trip_id: Joi.number().integer().required(),
  route_stop_id: Joi.number().integer().required(),
  stop_order: Joi.number().integer().required(),
  arrival_time: Joi.string().allow(null).empty('').optional(),
  departure_time: Joi.string().allow(null).empty('').optional(),
  can_board: Joi.boolean().optional().default(true),
  can_alight: Joi.boolean().optional().default(true),
  active: Joi.boolean().optional().default(true),
  source_type: Joi.string().valid(...sourceTypes).optional().default('auto'),
});

const updateTripStopSchema = Joi.object({
  id: Joi.number().integer().required(),
  company_id: Joi.number().integer().optional(),
  trip_id: Joi.number().integer().optional(),
  route_stop_id: Joi.number().integer().optional(),
  stop_order: Joi.number().integer().optional(),
  arrival_time: Joi.string().allow(null).empty('').optional(),
  departure_time: Joi.string().allow(null).empty('').optional(),
  can_board: Joi.boolean().optional(),
  can_alight: Joi.boolean().optional(),
  active: Joi.boolean().optional(),
  source_type: Joi.string().valid(...sourceTypes).optional(),
});

const idTripStopSchema = Joi.object({
  id: Joi.number().integer().required(),
});

const tripIdTripStopSchema = Joi.object({
  trip_id: Joi.number().integer().required(),
});

const companyIdTripStopSchema = Joi.object({
  company_id: Joi.number().integer().required(),
});

module.exports = {
  storeTripStopSchema,
  updateTripStopSchema,
  idTripStopSchema,
  tripIdTripStopSchema,
  companyIdTripStopSchema,
};
