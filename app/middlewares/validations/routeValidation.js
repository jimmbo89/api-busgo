const Joi = require('joi');

// Validacion para crear una nueva ruta
const storeRouteSchema = Joi.object({
    name: Joi.string().max(255).required(),
    origin_id: Joi.number().required(),
    destination_id: Joi.number().required(),
    distance: Joi.number().precision(2).positive().allow(null).empty('').optional(),
    estimated: Joi.number().integer().allow(null).empty('').optional(),
    status: Joi.number().integer().allow(null).empty('').optional(),
    branch_id: Joi.number().integer().allow(null).empty('').optional(),
    route_id: Joi.number().integer().allow(null).optional(),
    price: Joi.number().precision(2).allow(null).empty('').optional()
});

// Validacion para actualizar una ruta
const updateRouteSchema = Joi.object({
    id: Joi.number().required(),
    name: Joi.string().max(255).allow(null).empty('').optional(),
    origin_id: Joi.number().allow(null).empty('').optional(),
    destination_id: Joi.number().allow(null).empty('').optional(),
    distance: Joi.number().precision(2).positive().allow(null).empty('').optional(),
    estimated: Joi.number().integer().allow(null).empty('').optional(),
    status: Joi.number().integer().allow(null).empty('').optional(),
    branch_id: Joi.number().integer().allow(null).optional(),
    route_id: Joi.number().integer().allow(null).optional(),
    price: Joi.number().precision(2).allow(null).optional(),
});

// Validacion para obtener una ruta por ID
const idRouteSchema = Joi.object({
    id: Joi.number().required(),
});

module.exports = {
    storeRouteSchema,
    updateRouteSchema,
    idRouteSchema,
};
