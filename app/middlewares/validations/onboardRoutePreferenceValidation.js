'use strict';

const Joi = require('joi');

const onBoardRoutePreferenceItemSchema = Joi.object({
  route_id: Joi.number().integer().positive().required().messages({
    'number.base': 'El campo route_id debe ser un número entero',
    'number.integer': 'El campo route_id debe ser un número entero',
    'number.positive': 'El campo route_id debe ser mayor que cero',
    'any.required': 'El campo route_id es obligatorio',
  }),
  priority: Joi.number().integer().positive().required().messages({
    'number.base': 'El campo priority debe ser un número entero',
    'number.integer': 'El campo priority debe ser un número entero',
    'number.positive': 'El campo priority debe ser mayor que cero',
    'any.required': 'El campo priority es obligatorio',
  }),
});

const vehicleIdSchema = Joi.object({
  vehicle_id: Joi.number().integer().positive().required().messages({
    'number.base': 'El campo vehicle_id debe ser un número entero',
    'number.integer': 'El campo vehicle_id debe ser un número entero',
    'number.positive': 'El campo vehicle_id debe ser mayor que cero',
    'any.required': 'El campo vehicle_id es obligatorio',
  }),
  branch_id: Joi.number().integer().positive().required().messages({
    'number.base': 'El campo branch_id debe ser un número entero',
    'number.integer': 'El campo branch_id debe ser un número entero',
    'number.positive': 'El campo branch_id debe ser mayor que cero',
    'any.required': 'El campo branch_id es obligatorio',
  }),
});

const updateOnBoardRoutePreferencesSchema = Joi.object({
  vehicle_id: Joi.number().integer().positive().required().messages({
    'number.base': 'El campo vehicle_id debe ser un número entero',
    'number.integer': 'El campo vehicle_id debe ser un número entero',
    'number.positive': 'El campo vehicle_id debe ser mayor que cero',
    'any.required': 'El campo vehicle_id es obligatorio',
  }),
  branch_id: Joi.number().integer().positive().required().messages({
    'number.base': 'El campo branch_id debe ser un número entero',
    'number.integer': 'El campo branch_id debe ser un número entero',
    'number.positive': 'El campo branch_id debe ser mayor que cero',
    'any.required': 'El campo branch_id es obligatorio',
  }),
  preferences: Joi.array()
    .items(onBoardRoutePreferenceItemSchema)
    .unique('route_id')
    .required()
    .messages({
      'array.base': 'El campo preferences debe ser un arreglo',
      'array.unique': 'No se puede repetir una ruta en las preferencias del vehículo',
      'any.required': 'El campo preferences es obligatorio',
    }),
});

module.exports = {
  vehicleIdSchema,
  updateOnBoardRoutePreferencesSchema,
};
