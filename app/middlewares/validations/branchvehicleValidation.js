const Joi = require('joi');

// Esquema para crear una nueva relación BranchVehicle
const storeBranchVehicleSchema = Joi.object({
    branch_id: Joi.number().integer().required(),  // Validar que branch_id sea un número entero y requerido
    vehicle_id: Joi.number().integer().required(),   // Validar que vehicle_id sea un número entero y requerido
});

// Esquema para actualizar una relación BranchVehicle
const updateBranchVehicleSchema = Joi.object({
    branch_id: Joi.number().integer().allow(null).optional(),  // branch_id puede ser nulo o vacío en la actualización
    vehicle_id: Joi.number().integer().allow(null).optional(),   // vehicle_id puede ser nulo o vacío en la actualización
    id: Joi.number().integer().required()  // El ID es obligatorio para actualizar
});

// Esquema para validar el ID de una relación BranchVehicle
const idBranchVehicleSchema = Joi.object({
    id: Joi.number().integer().required()  // Validar que el ID sea un número entero y obligatorio
});

module.exports = {
    storeBranchVehicleSchema,
    updateBranchVehicleSchema,
    idBranchVehicleSchema,
};
