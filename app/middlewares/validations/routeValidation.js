const Joi = require('joi');

const routeCodeSchema = Joi.string()
    .trim()
    .uppercase()
    .max(20)
    .pattern(/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/)
    .messages({
        'string.base': 'El campo code debe ser un texto',
        'string.empty': 'El campo code es obligatorio',
        'string.max': 'El campo code debe tener mÃ¡ximo 20 caracteres',
        'string.pattern.base': 'El campo code solo permite letras, nÃºmeros y guiones, sin espacios, sin guiones al inicio o final y sin guiones consecutivos',
    });

// Validacion para crear una nueva ruta
const storeRouteSchema = Joi.object({
    code: routeCodeSchema.required().messages({
        'any.required': 'El campo code es obligatorio',
    }),
    name: Joi.string().max(255).allow(null).empty('').optional(),
    origin_id: Joi.number().required(),
    destination_id: Joi.number().required(),
    distance: Joi.number().precision(2).positive().allow(null).empty('').optional(),
    estimated: Joi.number().integer().allow(null).empty('').optional(),
    status: Joi.number().integer().allow(null).empty('').optional(),
});

// Validacion para actualizar una ruta
const updateRouteSchema = Joi.object({
    id: Joi.number().required(),
    code: routeCodeSchema.allow(null).empty('').optional(),
    name: Joi.string().max(255).allow(null).empty('').optional(),
    origin_id: Joi.number().allow(null).empty('').optional(),
    destination_id: Joi.number().allow(null).empty('').optional(),
    distance: Joi.number().precision(2).positive().allow(null).empty('').optional(),
    estimated: Joi.number().integer().allow(null).empty('').optional(),
    status: Joi.number().integer().allow(null).empty('').optional(),
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
