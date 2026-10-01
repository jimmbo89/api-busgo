'use strict';

const Joi = require('joi');

const onBoardWebAvailableRoutesSchema = Joi.object({
  branch_id: Joi.number().integer().positive().required().messages({
    'number.base': 'El campo branch_id debe ser un número entero',
    'number.integer': 'El campo branch_id debe ser un número entero',
    'number.positive': 'El campo branch_id debe ser mayor que cero',
    'any.required': 'El campo branch_id es obligatorio',
  }),
  vehicle_id: Joi.number().integer().positive().required().messages({
    'number.base': 'El campo vehicle_id debe ser un número entero',
    'number.integer': 'El campo vehicle_id debe ser un número entero',
    'number.positive': 'El campo vehicle_id debe ser mayor que cero',
    'any.required': 'El campo vehicle_id es obligatorio',
  }),
  device_id: Joi.number().integer().positive().allow(null).optional().messages({
    'number.base': 'El campo device_id debe ser un número entero',
    'number.integer': 'El campo device_id debe ser un número entero',
    'number.positive': 'El campo device_id debe ser mayor que cero',
  }),
});

module.exports = {
  onBoardWebAvailableRoutesSchema,
};
