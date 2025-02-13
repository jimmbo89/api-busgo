const Joi = require('joi');

// Esquema para crear una nueva relación BranchRoute
const storeBranchRouteSchema = Joi.object({
    branch_id: Joi.number().integer().required(),  // Validar que branch_id sea un número entero y requerido
    route_id: Joi.number().integer().required(),   // Validar que route_id sea un número entero y requerido
    price: Joi.number().precision(2).required()    // Validar que price sea un número con hasta 2 decimales y requerido
});

// Esquema para actualizar una relación BranchRoute
const updateBranchRouteSchema = Joi.object({
    branch_id: Joi.number().integer().allow(null).optional(),  // branch_id puede ser nulo o vacío en la actualización
    route_id: Joi.number().integer().allow(null).optional(),   // route_id puede ser nulo o vacío en la actualización
    price: Joi.number().precision(2).allow(null).optional(),   // price puede ser nulo o vacío en la actualización
    id: Joi.number().integer().required()  // El ID es obligatorio para actualizar
});

// Esquema para validar el ID de una relación BranchRoute
const idBranchRouteSchema = Joi.object({
    id: Joi.number().integer().required()  // Validar que el ID sea un número entero y obligatorio
});

module.exports = {
    storeBranchRouteSchema,
    updateBranchRouteSchema,
    idBranchRouteSchema,
};
