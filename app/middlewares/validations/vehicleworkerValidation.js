const Joi = require('joi');

// Esquema para crear una nueva relación VehicleWorker
const storeVehicleWorkerSchema = Joi.object({
    worker_id: Joi.number().integer().required(),  // Validar que worker_id sea un número entero y requerido
    vehicle_id: Joi.number().integer().required(),   // Validar que vehicle_id sea un número entero y requerido
});

// Esquema para actualizar una relación VehicleWorker
const updateVehicleWorkerSchema = Joi.object({
    worker_id: Joi.number().integer().allow(null).optional(),  // worker_id puede ser nulo o vacío en la actualización
    vehicle_id: Joi.number().integer().allow(null).optional(),   // vehicle_id puede ser nulo o vacío en la actualización
    id: Joi.number().integer().required()  // El ID es obligatorio para actualizar
});

// Esquema para validar el ID de una relación VehicleWorker
const idVehicleWorkerSchema = Joi.object({
    id: Joi.number().integer().required()  // Validar que el ID sea un número entero y obligatorio
});

// Esquema para validar el ID de una relación VehicleWorker
const vehicle_idWorkerSchema = Joi.object({
    vehicle_id: Joi.number().integer().required()  // Validar que el ID sea un número entero y obligatorio
});

module.exports = {
    storeVehicleWorkerSchema,
    updateVehicleWorkerSchema,
    idVehicleWorkerSchema,
    vehicle_idWorkerSchema
};
