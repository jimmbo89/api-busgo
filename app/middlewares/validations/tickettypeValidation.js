const Joi = require('joi');

// Esquema para crear un nuevo tipo de pasaje
const storeTicketTypeSchema = Joi.object({
    name: Joi.string().max(255).required(), // Nombre del tipo (requerido)
    description: Joi.string().allow(null).empty('').optional(), // Descripción (opcional)
    active: Joi.boolean()
        .allow(null)  // Permite explícitamente null
        .optional()   // El campo es opcional
        .default(false),  // Convierte null/undefined a false,
});

// Esquema para actualizar un tipo de pasaje
const updateTicketTypeSchema = Joi.object({
    name: Joi.string().max(255).allow(null).empty('').optional(), // Nombre (opcional)
    description: Joi.string().allow(null).empty('').optional(), // Descripción (opcional)
   active: Joi.boolean()
        .allow(null)  // Permite explícitamente null
        .optional()   // El campo es opcional
        .default(false),  // Convierte null/undefined a false,
    id: Joi.number().required(),
});

// Esquema para validar el ID de un tipo de pasaje
const idTicketTypeSchema = Joi.object({
    id: Joi.number().required(), // ID del tipo (requerido)
});

// Esquema para validar el estado activo de un tipo de pasaje
const activeTicketTypeSchema = Joi.object({
    active: Joi.number().integer().min(0).max(1).required(), // Estado activo como entero (0 o 1, requerido)
});

module.exports = {
    storeTicketTypeSchema,
    updateTicketTypeSchema,
    idTicketTypeSchema,
    activeTicketTypeSchema,
};