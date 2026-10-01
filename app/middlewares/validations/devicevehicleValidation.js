const Joi = require('joi');

const positiveId = (field) =>
  Joi.number().integer().positive().required().messages({
    'number.base': `El campo ${field} debe ser un número entero`,
    'number.integer': `El campo ${field} debe ser un número entero`,
    'number.positive': `El campo ${field} debe ser mayor que cero`,
    'any.required': `El campo ${field} es obligatorio`,
  });

const optionalPositiveId = (field) =>
  Joi.number().integer().positive().optional().messages({
    'number.base': `El campo ${field} debe ser un número entero`,
    'number.integer': `El campo ${field} debe ser un número entero`,
    'number.positive': `El campo ${field} debe ser mayor que cero`,
  });

const storeDeviceVehicleSchema = Joi.object({
  device_id: positiveId('device_id'),
  vehicle_id: positiveId('vehicle_id'),
  branch_id: positiveId('branch_id'),
  active: Joi.boolean().optional().default(true),
});

const deviceIdDeviceVehicleSchema = Joi.object({
  device_id: positiveId('device_id'),
});

const idDeviceVehicleSchema = Joi.object({
  id: positiveId('id'),
});

const updateDeviceVehicleSchema = Joi.object({
  id: positiveId('id'),
  device_id: optionalPositiveId('device_id'),
  vehicle_id: optionalPositiveId('vehicle_id'),
  branch_id: optionalPositiveId('branch_id'),
  active: Joi.boolean().optional(),
});

module.exports = {
  storeDeviceVehicleSchema,
  deviceIdDeviceVehicleSchema,
  idDeviceVehicleSchema,
  updateDeviceVehicleSchema,
};
