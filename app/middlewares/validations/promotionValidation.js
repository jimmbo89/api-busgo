const Joi = require('joi');

const discountValueSchema = Joi.when('discount_type', {
    is: 'porcentaje',
    then: Joi.number().min(0).max(100).required(),
    otherwise: Joi.number().min(0).required(),
});

// Esquema para crear una nueva promoción
const storePromotionSchema = Joi.object({
    name: Joi.string().max(255).required(), // Nombre de la promoción (requerido)
    description: Joi.string().allow(null).empty('').optional(), // Descripción (opcional)
    percentage: discountValueSchema, // Valor del descuento: porcentaje o monto
    discount_type: Joi.string().valid('porcentaje', 'monto').default('monto'),
    active: Joi.boolean().required(), // Estado activo (requerido)
});

// Esquema para actualizar una promoción
const updatePromotionSchema = Joi.object({
    name: Joi.string().max(255).allow(null).empty('').optional(), // Nombre (opcional)
    description: Joi.string().allow(null).empty('').optional(), // Descripción (opcional)
    percentage: Joi.number().min(0).allow(null).empty('').optional(), // Valor del descuento
    discount_type: Joi.string().valid('porcentaje', 'monto').allow(null).empty('').optional(),
    active: Joi.boolean().allow(null).empty('').optional(), // Estado activo (opcional)
    id: Joi.number().required(), // ID de la promoción (requerido para actualizar)
});

// Esquema para validar el ID de una promoción
const idPromotionSchema = Joi.object({
    id: Joi.number().required(), // ID de la promoción (requerido)
});

// Esquema para validar el estado activo de una promoción
const activePromotionSchema = Joi.object({
    active: Joi.boolean().required(), // Estado activo (requerido)
});

module.exports = {
    storePromotionSchema,
    updatePromotionSchema,
    idPromotionSchema,
    activePromotionSchema,
};
