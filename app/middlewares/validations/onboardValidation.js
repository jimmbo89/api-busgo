'use strict';

const Joi = require('joi');

const storeOnBoardTripSchema = Joi.object({
  branch_id: Joi.number().integer().positive().required().messages({
    'number.base': 'El campo branch_id debe ser un número entero',
    'number.integer': 'El campo branch_id debe ser un número entero',
    'number.positive': 'El campo branch_id debe ser positivo',
    'any.required': 'El campo branch_id es obligatorio',
  }),
  route_id: Joi.number().integer().positive().required().messages({
    'number.base': 'El campo route_id debe ser un número entero',
    'number.integer': 'El campo route_id debe ser un número entero',
    'number.positive': 'El campo route_id debe ser positivo',
    'any.required': 'El campo route_id es obligatorio',
  }),
});

const updateOnBoardTripSchema = Joi.object({
  trip_id: Joi.number().integer().positive().required().messages({
    'number.base': 'El campo trip_id debe ser un número entero',
    'number.integer': 'El campo trip_id debe ser un número entero',
    'number.positive': 'El campo trip_id debe ser positivo',
    'any.required': 'El campo trip_id es obligatorio',
  }),
  action: Joi.string()
    .valid('START', 'FINISH')
    .insensitive()
    .required()
    .messages({
    'any.only': 'El campo action debe ser START o FINISH',
    'any.required': 'El campo action es obligatorio',
    }),
});

const onBoardActiveTripsSchema = Joi.object({
  route_id: Joi.number().integer().positive().required().messages({
    'number.base': 'El campo route_id debe ser un número entero',
    'number.integer': 'El campo route_id debe ser un número entero',
    'number.positive': 'El campo route_id debe ser mayor que cero',
    'any.required': 'El campo route_id es obligatorio',
  }),
  branch_id: Joi.number().integer().positive().allow(null).optional().messages({
    'number.base': 'El campo branch_id debe ser un número entero',
    'number.integer': 'El campo branch_id debe ser un número entero',
    'number.positive': 'El campo branch_id debe ser mayor que cero',
  }),
  vehicle_id: Joi.number().integer().positive().allow(null).optional().messages({
    'number.base': 'El campo vehicle_id debe ser un número entero',
    'number.integer': 'El campo vehicle_id debe ser un número entero',
    'number.positive': 'El campo vehicle_id debe ser mayor que cero',
  }),
  device_id: Joi.number().integer().positive().allow(null).optional().messages({
    'number.base': 'El campo device_id debe ser un número entero',
    'number.integer': 'El campo device_id debe ser un número entero',
    'number.positive': 'El campo device_id debe ser mayor que cero',
  }),
});

const onBoardTicketItemSchema = Joi.object({
  id: Joi.number().integer().allow(null).optional(),
  trip_fare_id: Joi.number().integer().positive().allow(null).optional(),
  tripFareId: Joi.number().integer().positive().allow(null).optional(),
  fare_segment_ticket_type_id: Joi.number().integer().positive().allow(null).optional(),
  ticket_type_id: Joi.number().integer().positive().allow(null).optional(),
  ticketTypeId: Joi.number().integer().positive().allow(null).optional(),
  quantity: Joi.number().integer().min(1).required().messages({
    'number.base': 'La cantidad de cada tipo de pasaje debe ser un número entero',
    'number.integer': 'La cantidad de cada tipo de pasaje debe ser un número entero',
    'number.min': 'La cantidad de cada tipo de pasaje debe ser al menos 1',
    'any.required': 'La cantidad de cada tipo de pasaje es obligatoria',
  }),
}).unknown(true);

const onBoardTicketSchema = Joi.object({
  id: Joi.alternatives()
    .try(Joi.number().integer(), Joi.string().trim().max(50))
    .allow(null)
    .optional(),
  branch_id: Joi.number().integer().positive().allow(null).optional(),
  trip_id: Joi.number().integer().positive().allow(null).optional().messages({
    'number.base': 'El campo trip_id debe ser un número entero',
    'number.integer': 'El campo trip_id debe ser un número entero',
    'number.positive': 'El campo trip_id debe ser positivo',
  }),
  route_id: Joi.number().integer().positive().allow(null).optional().messages({
    'number.base': 'El campo route_id debe ser un número entero',
    'number.integer': 'El campo route_id debe ser un número entero',
    'number.positive': 'El campo route_id debe ser mayor que cero',
  }),
  vehicle_id: Joi.number().integer().positive().allow(null).optional().messages({
    'number.base': 'El campo vehicle_id debe ser un número entero',
    'number.integer': 'El campo vehicle_id debe ser un número entero',
    'number.positive': 'El campo vehicle_id debe ser mayor que cero',
  }),
  device_id: Joi.number().integer().positive().allow(null).optional().messages({
    'number.base': 'El campo device_id debe ser un número entero',
    'number.integer': 'El campo device_id debe ser un número entero',
    'number.positive': 'El campo device_id debe ser mayor que cero',
  }),
  fare_segment_id: Joi.number().integer().positive().allow(null).optional(),
  date: Joi.date().allow(null).optional(),
  method: Joi.string().required().messages({
    'string.base': 'El campo method debe ser un texto',
    'any.required': 'El campo method es obligatorio',
  }),
  status: Joi.number().integer().default(0).optional(),
  quantity: Joi.number().integer().min(1).required().messages({
    'number.base': 'El campo quantity debe ser un número entero',
    'number.integer': 'El campo quantity debe ser un número entero',
    'number.min': 'El campo quantity debe ser al menos 1',
    'any.required': 'El campo quantity es obligatorio',
  }),
  price: Joi.number().precision(2).required().messages({
    'number.base': 'El campo price debe ser un número',
    'any.required': 'El campo price es obligatorio',
  }),
  total: Joi.number().precision(2).required().messages({
    'number.base': 'El campo total debe ser un número',
    'any.required': 'El campo total es obligatorio',
  }),
  seats: Joi.array().items(Joi.any()).allow(null).optional(),
  adults: Joi.number().integer().allow(null).optional(),
  minors: Joi.number().integer().allow(null).optional(),
  pay: Joi.number().precision(2).allow(null).optional(),
  sequenceNumber: Joi.string().max(50).allow(null).optional(),
  extraData: Joi.object().allow(null).optional(),
  transactionTip: Joi.number().precision(2).min(0).allow(null).optional(),
  transactionCashback: Joi.number().precision(2).min(0).allow(null).optional(),
  promotions: Joi.array().allow(null).optional(),
  ticketItems: Joi.array().items(onBoardTicketItemSchema).min(1).optional(),
  tickettypes: Joi.array().items(onBoardTicketItemSchema).min(1).optional(),
  ticketType: Joi.array().items(onBoardTicketItemSchema).min(1).optional(),
})
  .or('ticketItems', 'tickettypes', 'ticketType')
  .custom((value, helpers) => {
    if (!value.trip_id && !value.route_id) {
      return helpers.error('any.onBoardTripReference');
    }

    if (!value.trip_id && !value.branch_id) {
      return helpers.error('any.onBoardBranchRequired');
    }

    return value;
  })
  .unknown(true)
  .messages({
    'object.missing': 'Debe enviar al menos un tipo de pasaje en ticketItems',
    'any.onBoardTripReference':
      'Debe indicar trip_id o route_id para identificar el viaje.',
    'any.onBoardBranchRequired':
      'El campo branch_id es obligatorio cuando se creará o buscará automáticamente el viaje.',
  });

const onBoardTicketWebSchema = onBoardTicketSchema.keys({
  branch_id: Joi.number().integer().positive().required().messages({
    'number.base': 'El campo branch_id debe ser un número entero',
    'number.integer': 'El campo branch_id debe ser un número entero',
    'number.positive': 'El campo branch_id debe ser mayor que cero',
    'any.required': 'El campo branch_id es obligatorio para la venta web',
  }),
  vehicle_id: Joi.number().integer().positive().required().messages({
    'number.base': 'El campo vehicle_id debe ser un número entero',
    'number.integer': 'El campo vehicle_id debe ser un número entero',
    'number.positive': 'El campo vehicle_id debe ser mayor que cero',
    'any.required': 'El campo vehicle_id es obligatorio para la venta web',
  }),
  device_id: Joi.number().integer().positive().required().messages({
    'number.base': 'El campo device_id debe ser un número entero',
    'number.integer': 'El campo device_id debe ser mayor que cero',
    'number.positive': 'El campo device_id debe ser mayor que cero',
    'any.required': 'El campo device_id es obligatorio para la venta web',
  }),
});

const onBoardRouteSegmentsSchema = Joi.object({
  route_id: Joi.number().integer().positive().required().messages({
    'number.base': 'El campo route_id debe ser un número entero',
    'number.integer': 'El campo route_id debe ser un número entero',
    'number.positive': 'El campo route_id debe ser positivo',
    'any.required': 'El campo route_id es obligatorio',
  }),
});

module.exports = {
  storeOnBoardTripSchema,
  updateOnBoardTripSchema,
  onBoardActiveTripsSchema,
  onBoardTicketSchema,
  onBoardTicketWebSchema,
  onBoardRouteSegmentsSchema,
};
