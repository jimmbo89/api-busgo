const Joi = require('joi');
const { password } = require('../../../config/database');

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


module.exports = {
    storeWorkerSchema,
    updateWorkerSchema,
    idWorkerSchema,
};
