const Joi = require('joi');

// Validación para crear una nueva empresa
const storeVehicleSchema = Joi.object({
    structure_id: Joi.number().required(),
    brand: Joi.string().max(255).allow(null).empty('').optional(),
    model: Joi.string().max(255).allow(null).empty('').optional(),
    plate: Joi.string().max(255).allow(null).empty('').optional(),
    rut: Joi.string().max(50).allow(null).empty('').optional(),
    seats: Joi.number().allow(null).empty('').optional(),
    state: Joi.number().default(1).allow(null).empty('').optional(),
    image: Joi.string()
        .pattern(/\.(jpg|jpeg|png|gif)$/i)  // Validar formato de imagen
        .allow(null).empty('').optional()                         // Hace que sea opcional
        .messages({
            'string.pattern.base': 'El campo image debe ser una imagen válida (jpg, jpeg, png, gif)',
        }),
});

// Validación para actualizar una empresa
const updateVehicleSchema = Joi.object({
    id: Joi.number().required(),
    structure_id: Joi.number().allow(null).empty('').optional(),
    brand: Joi.string().max(255).allow(null).empty('').optional(),
    model: Joi.string().max(255).allow(null).empty('').optional(),
    plate: Joi.string().max(255).allow(null).empty('').optional(),
    rut: Joi.string().max(50).allow(null).empty('').optional(),
    seats: Joi.number().allow(null).empty('').optional(),
    state: Joi.number().default(1).allow(null).empty('').optional(),
    image: Joi.string()
        .pattern(/\.(jpg|jpeg|png|gif)$/i)  // Validar formato de imagen
        .allow(null).empty('').optional()                         // Hace que sea opcional
        .messages({
            'string.pattern.base': 'El campo image debe ser una imagen válida (jpg, jpeg, png, gif)',
        }),
});

// Validación para obtener una empresa por ID
const idVehicleSchema = Joi.object({
    id: Joi.number().required(),
});


module.exports = {
    storeVehicleSchema,
    updateVehicleSchema,
    idVehicleSchema,
};
