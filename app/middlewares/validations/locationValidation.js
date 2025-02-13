const Joi = require('joi');

// Validación para crear una nueva empresa
const storeLocationSchema = Joi.object({
    latitude: Joi.string().max(255).allow(null).empty('').optional(),
    longitude: Joi.string().max(255).allow(null).empty('').optional(),
    country: Joi.string().max(255).allow(null).empty('').optional(),
    address: Joi.string().max(255).required(),
    city: Joi.string().max(255).allow(null).empty('').optional(),
    image: Joi.string()
        .pattern(/\.(jpg|jpeg|png|gif)$/i)  // Validar formato de imagen
        .allow(null).empty('').optional()                         // Hace que sea opcional
        .messages({
            'string.pattern.base': 'El campo image debe ser una imagen válida (jpg, jpeg, png, gif)',
        }),
});

// Validación para actualizar una empresa
const updateLocationSchema = Joi.object({
    id: Joi.number().required(),
    latitude: Joi.string().max(255).allow(null).empty('').optional(),
    longitude: Joi.string().max(255).allow(null).empty('').optional(),
    country: Joi.string().max(255).allow(null).empty('').optional(),
    address: Joi.string().max(255).allow(null).empty('').optional(),
    city: Joi.string().max(255).allow(null).empty('').optional(),
    image: Joi.string()
        .pattern(/\.(jpg|jpeg|png|gif)$/i)  // Validar formato de imagen
        .allow(null).empty('').optional()                         // Hace que sea opcional
        .messages({
            'string.pattern.base': 'El campo image debe ser una imagen válida (jpg, jpeg, png, gif)',
        }),
});

// Validación para obtener una empresa por ID
const idLocationSchema = Joi.object({
    id: Joi.number().required(),
});


module.exports = {
    storeLocationSchema,
    updateLocationSchema,
    idLocationSchema,
};
