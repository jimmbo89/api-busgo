const Joi = require('joi');

// Esquema para insertar una nueva estructura
const storeStructureSchema = Joi.object({
    name: Joi.string().max(255).required(), // El nombre debe ser una cadena con un máximo de 255 caracteres
    description: Joi.string().allow(null).empty('').optional(), // Descripción puede ser nula o vacía
    seatCount: Joi.number().integer().min(1).required(), // seatCount debe ser un número entero mayor a 0
    seats: Joi.array().items(Joi.number().integer()).required(), // seats debe ser un arreglo de números enteros
    seatMap: Joi.array().items(Joi.array().items(Joi.object()).required()).required(), // seatMap debe ser un arreglo de arreglos de objetos
});

// Esquema para actualizar una estructura existente
const updateStructureSchema = Joi.object({
    name: Joi.string().max(255).allow(null).empty('').optional(), // El nombre es opcional durante la actualización
    description: Joi.string().allow(null).empty('').optional(), // Descripción opcional
    seatCount: Joi.number().integer().min(1).optional(), // seatCount opcional durante la actualización, pero debe ser mayor a 0 si se proporciona
    seats: Joi.array().items(Joi.number().integer()).optional(), // seats opcional
    seatMap: Joi.array().items(Joi.array().items(Joi.object()).required()).optional(), // seatMap opcional
    id: Joi.number().required(), // El ID es obligatorio para la actualización
});

// Esquema para validación solo del ID de la estructura
const idStructureSchema = Joi.object({
    id: Joi.number().required(), // El ID debe ser un número
});


module.exports = {
    storeStructureSchema,
    updateStructureSchema,
    idStructureSchema,
};
