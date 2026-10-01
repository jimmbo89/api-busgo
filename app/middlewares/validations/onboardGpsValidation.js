'use strict';

const Joi = require('joi');

const positiveId = (field) =>
  Joi.number().integer().positive().required().messages({
    'number.base': `El campo ${field} debe ser un número entero`,
    'number.integer': `El campo ${field} debe ser un número entero`,
    'number.positive': `El campo ${field} debe ser mayor que cero`,
    'any.required': `El campo ${field} es obligatorio`,
  });

const onBoardGpsLocationSchema = Joi.object({
  trip_id: positiveId('trip_id'),
  latitude: Joi.number().min(-90).max(90).required().messages({
    'number.base': 'El campo latitude debe ser un número',
    'number.min': 'El campo latitude debe ser mayor o igual a -90',
    'number.max': 'El campo latitude debe ser menor o igual a 90',
    'any.required': 'El campo latitude es obligatorio',
  }),
  longitude: Joi.number().min(-180).max(180).required().messages({
    'number.base': 'El campo longitude debe ser un número',
    'number.min': 'El campo longitude debe ser mayor o igual a -180',
    'number.max': 'El campo longitude debe ser menor o igual a 180',
    'any.required': 'El campo longitude es obligatorio',
  }),
  accuracy: Joi.number().min(0).optional().allow(null).messages({
    'number.base': 'El campo accuracy debe ser un número',
    'number.min': 'El campo accuracy no puede ser negativo',
  }),
  captured_at: Joi.date().iso().optional().messages({
    'date.base': 'El campo captured_at debe ser una fecha válida',
    'date.format': 'El campo captured_at debe utilizar un formato de fecha ISO válido',
  }),
});

const onBoardGpsTripSchema = Joi.object({
  trip_id: positiveId('trip_id'),
});

module.exports = {
  onBoardGpsLocationSchema,
  onBoardGpsTripSchema,
};
