const Joi = require('joi');

const vehicleBranchActionSchema = Joi.object({
    association_id: Joi.number().integer().positive().allow(null).optional().messages({
        'number.base': 'El campo association_id debe ser un número entero',
        'number.integer': 'El campo association_id debe ser un número entero',
        'number.positive': 'El campo association_id debe ser mayor que cero',
    }),
    branch_id: Joi.number().integer().positive().required().messages({
        'number.base': 'El campo branch_id debe ser un número entero',
        'number.integer': 'El campo branch_id debe ser un número entero',
        'number.positive': 'El campo branch_id debe ser mayor que cero',
        'any.required': 'El campo branch_id es obligatorio',
    }),
    action: Joi.string()
        .valid('associate', 'delete')
        .insensitive()
        .required()
        .messages({
            'any.only': 'La acción debe ser associate o delete',
            'any.required': 'El campo action es obligatorio',
        }),
});

const vehicleBranchesSchema = Joi.array()
    .items(vehicleBranchActionSchema)
    .allow(null)
    .optional()
    .messages({
        'array.base': 'El campo branches debe ser un arreglo de asociaciones',
    });

const vehicleRoutePreferenceActionSchema = Joi.object({
    association_id: Joi.number().integer().positive().allow(null).optional().messages({
        'number.base': 'El campo association_id de la preferencia debe ser un número entero',
        'number.integer': 'El campo association_id de la preferencia debe ser un número entero',
        'number.positive': 'El campo association_id de la preferencia debe ser mayor que cero',
    }),
    vehicle_id: Joi.number().integer().positive().allow(null).optional().messages({
        'number.base': 'El campo vehicle_id de la preferencia debe ser un número entero',
        'number.integer': 'El campo vehicle_id de la preferencia debe ser un número entero',
        'number.positive': 'El campo vehicle_id de la preferencia debe ser mayor que cero',
    }),
    route_id: Joi.number().integer().positive().required().messages({
        'number.base': 'El campo route_id de la preferencia debe ser un número entero',
        'number.integer': 'El campo route_id de la preferencia debe ser un número entero',
        'number.positive': 'El campo route_id de la preferencia debe ser mayor que cero',
        'any.required': 'El campo route_id de la preferencia es obligatorio',
    }),
    action: Joi.string()
        .valid('associate', 'delete')
        .insensitive()
        .required()
        .messages({
            'any.only': 'La acción de la preferencia debe ser associate o delete',
            'any.required': 'El campo action de la preferencia es obligatorio',
        }),
});

const vehicleRoutePreferencesSchema = Joi.array()
    .items(vehicleRoutePreferenceActionSchema)
    .allow(null)
    .optional()
    .messages({
        'array.base': 'El campo route_preferences debe ser un arreglo de preferencias',
    });

// Validación para crear una nueva empresa
const storeVehicleSchema = Joi.object({
    structure_id: Joi.number().required(),
    brand: Joi.string().max(255).allow(null).empty('').optional(),
    model: Joi.string().max(255).allow(null).empty('').optional(),
    plate: Joi.string().max(255).allow(null).empty('').optional(),
    internal_number: Joi.string().max(255).allow(null).empty('').optional(),
    rut: Joi.string().max(50).allow(null).empty('').optional(),
    seats: Joi.number().allow(null).empty('').optional(),
    state: Joi.number().default(1).allow(null).empty('').optional(),
    image: Joi.string()
        .pattern(/\.(jpg|jpeg|png|gif)$/i)  // Validar formato de imagen
        .allow(null).empty('').optional()                         // Hace que sea opcional
        .messages({
            'string.pattern.base': 'El campo image debe ser una imagen válida (jpg, jpeg, png, gif)',
        }),
    branches: vehicleBranchesSchema,
    route_preferences: vehicleRoutePreferencesSchema,
});

// Validación para actualizar una empresa
const updateVehicleSchema = Joi.object({
    id: Joi.number().required(),
    structure_id: Joi.number().allow(null).empty('').optional(),
    brand: Joi.string().max(255).allow(null).empty('').optional(),
    model: Joi.string().max(255).allow(null).empty('').optional(),
    plate: Joi.string().max(255).allow(null).empty('').optional(),
    internal_number: Joi.string().max(255).allow(null).empty('').optional(),
    rut: Joi.string().max(50).allow(null).empty('').optional(),
    seats: Joi.number().allow(null).empty('').optional(),
    state: Joi.number().default(1).allow(null).empty('').optional(),
    image: Joi.string()
        .pattern(/\.(jpg|jpeg|png|gif)$/i)  // Validar formato de imagen
        .allow(null).empty('').optional()                         // Hace que sea opcional
        .messages({
            'string.pattern.base': 'El campo image debe ser una imagen válida (jpg, jpeg, png, gif)',
        }),
    branches: vehicleBranchesSchema,
    route_preferences: vehicleRoutePreferencesSchema,
});

const parseVehicleBranches = (req, res, next) => {
    const jsonFields = [
        {
            name: 'branches',
            message: 'El campo branches debe contener un JSON válido',
        },
        {
            name: 'route_preferences',
            message: 'El campo route_preferences debe contener un JSON válido',
        },
    ];

    for (const field of jsonFields) {
        if (req.body && typeof req.body[field.name] === 'string') {
            if (req.body[field.name].trim() === '') {
                delete req.body[field.name];
                continue;
            }

            try {
                req.body[field.name] = JSON.parse(req.body[field.name]);
            } catch (error) {
                return res.status(400).json({
                    error: 'Error de validación',
                    details: [field.message],
                });
            }
        }
    }

    return next();
};

// Validación para obtener una empresa por ID
const idVehicleSchema = Joi.object({
    id: Joi.number().required(),
});


module.exports = {
    storeVehicleSchema,
    updateVehicleSchema,
    idVehicleSchema,
    parseVehicleBranches,
};
