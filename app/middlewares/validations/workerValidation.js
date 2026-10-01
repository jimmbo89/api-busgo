const Joi = require('joi');
const { password } = require('../../../config/database');

const workerBranchActionSchema = Joi.object({
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
    role_id: Joi.number().integer().positive().required().messages({
        'number.base': 'El campo role_id debe ser un número entero',
        'number.integer': 'El campo role_id debe ser un número entero',
        'number.positive': 'El campo role_id debe ser mayor que cero',
        'any.required': 'El campo role_id es obligatorio',
    }),
    action: Joi.string()
        .valid('associate', 'update', 'delete')
        .insensitive()
        .required()
        .messages({
            'any.only': 'La acción debe ser associate, update o delete',
            'any.required': 'El campo action es obligatorio',
        }),
});

const workerBranchesSchema = Joi.array()
    .items(workerBranchActionSchema)
    .allow(null)
    .optional()
    .messages({
        'array.base': 'El campo branches debe ser un arreglo',
    });

// Validación para crear una nueva empresa
const storeWorkerSchema = Joi.object({
    user_id: Joi.number().allow(null).empty('').optional(),
    role_id: Joi.number().required(),
    name: Joi.string().max(255).required(),
    user: Joi.string().max(255).allow(null).empty('').optional(),
    email: Joi.string().email().required(),       // email válido y obligatorio
    rut: Joi.string().max(50).required(),
    password: Joi.string().allow(null).empty('').optional(),
    address: Joi.string().allow(null).empty('').optional(),
    phone: Joi.string().max(20).allow(null).empty('').optional(),
    branches: workerBranchesSchema,
    image: Joi.string()
        .pattern(/\.(jpg|jpeg|png|gif)$/i)  // Validar formato de imagen
        .allow(null).empty('').optional()                         // Hace que sea opcional
        .messages({
            'string.pattern.base': 'El campo image debe ser una imagen válida (jpg, jpeg, png, gif)',
        }),
});

// Validación para actualizar una empresa
const updateWorkerSchema = Joi.object({
    id: Joi.number().required(),
    user_id: Joi.number().allow(null).empty('').optional(),
    role_id: Joi.number().allow(null).empty('').optional(),
    name: Joi.string().max(255).allow(null).empty('').optional(),
    user: Joi.string().max(255).allow(null).empty('').optional(),
    email: Joi.string().email().allow(null).empty('').optional(),
    rut: Joi.string().max(50).allow(null).empty('').optional(),
    address: Joi.string().allow(null).empty('').optional(),
    phone: Joi.string().max(20).allow(null).empty('').optional(),
    branches: workerBranchesSchema,
    image: Joi.string()
        .pattern(/\.(jpg|jpeg|png|gif)$/i)  // Validar formato de imagen
        .allow(null).empty('').optional()                         // Hace que sea opcional
        .messages({
            'string.pattern.base': 'El campo image debe ser una imagen válida (jpg, jpeg, png, gif)',
        }),
});

// Validación para obtener una empresa por ID
const idWorkerSchema = Joi.object({
    id: Joi.number().required(),
});

const parseWorkerBranches = (req, res, next) => {
    if (req.body && typeof req.body.branches === 'string') {
        try {
            req.body.branches = JSON.parse(req.body.branches);
        } catch (error) {
            return res.status(400).json({
                msg: 'Error de validación',
                details: ['El campo branches debe contener un JSON válido'],
            });
        }
    }

    return next();
};


module.exports = {
    storeWorkerSchema,
    updateWorkerSchema,
    idWorkerSchema,
    parseWorkerBranches,
};
