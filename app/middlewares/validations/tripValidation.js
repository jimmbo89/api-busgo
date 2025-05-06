const Joi = require("joi");

// Validación para crear un nuevo viaje
const storeTripSchema = Joi.object({
  branch_id: Joi.number().required().messages({
    "number.base": "El campo branch_id debe ser un número entero",
    "any.required": "El campo branch_id es obligatorio",
  }),
  vehicle_id: Joi.number().required().messages({
    "number.base": "El campo vehicle_id debe ser un número entero",
    "any.required": "El campo vehicle_id es obligatorio",
  }),
  route_id: Joi.number().required().messages({
    "number.base": "El campo route_id debe ser un número entero",
    "any.required": "El campo route_id es obligatorio",
  }),
  date: Joi.date().required().messages({
    "date.base": "El campo date debe ser una fecha válida",
    "any.required": "El campo date es obligatorio",
  }),
  schedule: Joi.string()
    .pattern(/^\d{2}:\d{2}$/) // Formato 00:00
    .allow(null)
    .empty("")
    .optional()
    .messages({
      "string.pattern.base": "El campo schedule debe tener el formato 00:00:00",
    }),
    arrival: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/) // Formato 2025-04-15 05:10 o 2025-04-15 05:10:00
    .allow(null)
    .empty("")
    .optional()
    .messages({
      "string.pattern.base": "El campo arrival debe tener el formato YYYY-MM-DD HH:MM:SS",
    }),
  start: Joi.string()
    .pattern(/^\d{2}:\d{2}$/) // Formato 00:00
    .allow(null)
    .empty("")
    .optional()
    .messages({
      "string.pattern.base": "El campo start debe tener el formato 00:00:00",
    }),
  end: Joi.string()
    .pattern(/^\d{2}:\d{2}$/) // Formato 00:00
    .allow(null)
    .empty("")
    .optional()
    .messages({
      "string.pattern.base": "El campo end debe tener el formato 00:00:00",
    }),
    price: Joi.number()
    .precision(2) // Permite hasta 2 decimales
    .positive()   // El precio debe ser un número positivo
    .required()   // El campo price es obligatorio
    .messages({
      'number.base': 'El precio debe ser un número',
      'number.precision': 'El precio no puede tener más de dos decimales',
      'number.positive': 'El precio debe ser un número positivo',
      'any.required': 'El precio es obligatorio',
    }),
  workers: Joi.array()
    .items(
      Joi.object({
        worker_id: Joi.number().required(),
      })
    )
    .optional(),
});

// Validación para actualizar un viaje
const updateTripSchema = Joi.object({
  id: Joi.number().required().messages({
    "number.base": "El campo id debe ser un número entero",
    "any.required": "El campo id es obligatorio",
  }),
  branch_id: Joi.number().allow(null).empty("").optional().messages({
    "number.base": "El campo branch_id debe ser un número entero",
  }),
  vehicle_id: Joi.number().allow(null).empty("").optional().messages({
    "number.base": "El campo vehicle_id debe ser un número entero",
  }),
  route_id: Joi.number().allow(null).empty("").optional().messages({
    "number.base": "El campo route_id debe ser un número entero",
  }),
  date: Joi.date().allow(null).empty("").optional().messages({
    "date.base": "El campo date debe ser una fecha válida",
  }),
  schedule: Joi.string()
    .pattern(/^\d{2}:\d{2}$/) // Formato 00:00
    .allow(null)
    .empty("")
    .optional()
    .messages({
      "string.pattern.base": "El campo schedule debe tener el formato 00:00:00",
    }),
  arrival: Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/) // Formato 2025-04-15 05:10 o 2025-04-15 05:10:00
  .allow(null)
  .empty("")
  .optional()
  .messages({
    "string.pattern.base": "El campo arrival debe tener el formato YYYY-MM-DD HH:MM:SS",
  }),
  start: Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/) // Formato 2025-04-15 05:10 o 2025-04-15 05:10:00
    .allow(null)
    .empty("")
    .optional()
    .messages({
      "string.pattern.base":
        "El campo start debe tener el formato YYYY-MM-DD HH:mm:ss",
    }),
  end: Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/) // Formato 2025-04-15 05:10 o 2025-04-15 05:10:00
    .allow(null)
    .empty("")
    .optional()
    .messages({
      "string.pattern.base":
        "El campo end debe tener el formato YYYY-MM-DD HH:mm:ss",
    }),
    price: Joi.number()
    .precision(2) // Permite hasta 2 decimales
    .positive()   // El precio debe ser un número positivo
    .allow(null)
    .empty("")
    .optional()
    .messages({
      'number.base': 'El precio debe ser un número',
      'number.precision': 'El precio no puede tener más de dos decimales',
      'number.positive': 'El precio debe ser un número positivo',
      'any.required': 'El precio es obligatorio',
    }),
  workers: Joi.array()
    .items(
      Joi.object({
        worker_id: Joi.number().required(),
      })
    )
    .optional(),
});

// Validación para obtener un viaje por ID
const idTripSchema = Joi.object({
  id: Joi.number().required().messages({
    "number.base": "El campo id debe ser un número entero",
    "any.required": "El campo id es obligatorio",
  }),
});

const branch_idTripSchema = Joi.object({
  branch_id: Joi.number().required().messages({
    "number.base": "El campo id debe ser un número entero",
    "any.required": "El campo id es obligatorio",
  }),
  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/) // Formato YYYY-MM-DD
    .allow("", null) // Permitir vacío o null
    .optional() // Campo opcional
    .messages({
      "string.pattern.base": "El formato de endDate debe ser YYYY-MM-DD",
    }),
});

const tripWorkerDateSchema = Joi.object({
  branch_id: Joi.number().integer().positive().required().messages({
    "number.base": "El campo branch_id debe ser un número entero",
    "number.integer": "El campo branch_id debe ser un número entero",
    "number.positive": "El campo branch_id debe ser un número positivo",
    "any.required": "El campo branch_id es requerido",
  }),
  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/) // Expresión regular para validar el formato YYYY-MM-DD
    .required()
    .messages({
      "string.pattern.base": "El formato de la fecha debe ser YYYY-MM-DD",
      "any.required": "El campo date es requerido",
    }),
  endDate: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/) // Formato YYYY-MM-DD
    .allow("", null) // Permitir vacío o null
    .optional() // Campo opcional
    .messages({
      "string.pattern.base": "El formato de endDate debe ser YYYY-MM-DD",
    }),
    worker_id: Joi.number().allow(null).empty("").optional().messages({
      "number.base": "El campo branch_id debe ser un número entero",
    }),
});

module.exports = {
  storeTripSchema,
  updateTripSchema,
  idTripSchema,
  branch_idTripSchema,
  tripWorkerDateSchema
};
