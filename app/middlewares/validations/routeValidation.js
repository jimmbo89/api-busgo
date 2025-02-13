const Joi = require('joi');

// Validación para crear una nueva empresa
const storeRouteSchema = Joi.object({
    name: Joi.string().max(255).required(),
    origin_id: Joi.number().required(),
    destination_id: Joi.number().required(),
    distance: Joi.number().precision(2).positive().allow(null).empty('').optional(),
    estimated: Joi.number().integer().allow(null).empty('').optional(),
    status: Joi.number().integer().allow(null).empty('').optional(),
});

// Validación para actualizar una empresa
const updateRouteSchema = Joi.object({
    id: Joi.number().required(),
    name: Joi.string().max(255).allow(null).empty('').optional(),
    origin_id: Joi.number().allow(null).empty('').optional(),
    destination_id: Joi.number().allow(null).empty('').optional(),
    distance: Joi.number().precision(2).positive().allow(null).empty('').optional(),
    estimated: Joi.number().integer().allow(null).empty('').optional(),
    status: Joi.number().integer().allow(null).empty('').optional(),
});

// Validación para obtener una empresa por ID
const idRouteSchema = Joi.object({
    id: Joi.number().required(),
});


module.exports = {
    storeRouteSchema,
    updateRouteSchema,
    idRouteSchema,
};
