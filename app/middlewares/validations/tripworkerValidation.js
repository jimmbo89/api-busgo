const Joi = require('joi');

// Esquema para crear una nueva relación TripWorker
const storeTripWorkerSchema = Joi.object({
    branch_id: Joi.number().integer().required().messages({
        'number.base': 'El campo branch_id debe ser un número entero',
        'any.required': 'El campo branch_id es obligatorio'
    }),
    trip_id: Joi.number().integer().required().messages({
        'number.base': 'El campo trip_id debe ser un número entero',
        'any.required': 'El campo trip_id es obligatorio'
    }),
    worker_id: Joi.number().integer().required().messages({
        'number.base': 'El campo worker_id debe ser un número entero',
        'any.required': 'El campo worker_id es obligatorio'
    }),
    date: Joi.date().iso().required().messages({
        'date.base': 'El campo date debe ser una fecha válida en formato YYYY-MM-DD',
        'any.required': 'El campo date es obligatorio'
    }),
});

// Esquema para actualizar una relación TripWorker
const updateTripWorkerSchema = Joi.object({
    branch_id: Joi.number().integer().allow(null).optional().messages({
        'number.base': 'El campo branch_id debe ser un número entero'
    }),
    trip_id: Joi.number().integer().allow(null).optional().messages({
        'number.base': 'El campo trip_id debe ser un número entero'
    }),
    worker_id: Joi.number().integer().allow(null).optional().messages({
        'number.base': 'El campo worker_id debe ser un número entero'
    }),
    date: Joi.date().iso().allow(null).optional().messages({
        'date.base': 'El campo date debe ser una fecha válida en formato YYYY-MM-DD'
    }),
    id: Joi.number().integer().required().messages({
        'number.base': 'El campo id debe ser un número entero',
        'any.required': 'El campo id es obligatorio'
    }),
});

// Esquema para validar el ID de una relación TripWorker
const idTripWorkerSchema = Joi.object({
    id: Joi.number().integer().required().messages({
        'number.base': 'El campo id debe ser un número entero',
        'any.required': 'El campo id es obligatorio'
    }),
});

const assignTripWorkersSchema = Joi.object({
    branch_id: Joi.number().integer().allow(null).optional().messages({
        'number.base': 'El campo branch_id debe ser un número entero'
    }),
    trip_id: Joi.number().integer().allow(null).optional().messages({
        'number.base': 'El campo trip_id debe ser un número entero'
    }),
    date: Joi.date().iso().allow(null).optional().messages({
        'date.base': 'El campo date debe ser una fecha válida en formato YYYY-MM-DD'
    }),
    workers: Joi.array().items(
        Joi.object({
            worker_id: Joi.number().required()
        })
    ).required()
});

module.exports = {
    storeTripWorkerSchema,
    updateTripWorkerSchema,
    idTripWorkerSchema,
    assignTripWorkersSchema
};
