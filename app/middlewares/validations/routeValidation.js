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

const routeBranchActionSchema = Joi.object({
    association_id: Joi.number().integer().positive().allow(null).optional().messages({
        'number.base': 'El campo association_id debe ser un número entero',
        'number.integer': 'El campo association_id debe ser un número entero',
        'number.positive': 'El campo association_id debe ser mayor que cero',
    }),
    branch_id: Joi.number().integer().positive().required().messages({
        'number.base': 'El campo branch_id debe ser un número entero',
        'number.integer': 'El campo branch_id debe ser un número entero',
        'number.positive': 'El campo branch_id debe ser mayor que cero',
        'any.required': 'El campo branch_id es obligatorio',
    }),
    action: Joi.string()
        .valid('associate', 'delete')
        .insensitive()
        .required()
        .messages({
            'any.only': 'La acción debe ser associate o delete',
            'any.required': 'El campo action es obligatorio',
        }),
});

const routeBranchesSchema = Joi.array()
    .items(routeBranchActionSchema)
    .allow(null)
    .optional()
    .messages({
        'array.base': 'El campo branches debe ser un arreglo',
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
    branches: routeBranchesSchema,
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
    branches: routeBranchesSchema,
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
