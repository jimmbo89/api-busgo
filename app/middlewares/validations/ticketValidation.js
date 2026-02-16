const Joi = require("joi");

// Esquema para crear un nuevo Ticket
const storeTicketSchema = Joi.object({
  id: Joi.number().integer().allow(null).optional().empty("").messages({
    "number.base": "El campo branch_id debe ser un número entero",
  }),
  branch_id: Joi.number().integer().required().messages({
    "number.base": "El campo branch_id debe ser un número entero",
    "any.required": "El campo branch_id es obligatorio",
  }),
  trip_id: Joi.number().integer().required().messages({
    "number.base": "El campo trip_id debe ser un número entero",
    "any.required": "El campo trip_id es obligatorio",
  }),
  date: Joi.date().required().messages({
    "date.base":
      "El campo date debe ser una fecha válida en formato YYYY-MM-DD",
    "any.required": "El campo date es obligatorio",
  }),
  method: Joi.string()
    .valid("Efectivo", "Credito", "Debito")
    .required()
    .messages({
      "string.base": "El campo method debe ser un texto",
      "any.required": "El campo method es obligatorio",
      "any.only":
        "El campo method debe ser uno de los siguientes valores: Efectivo, Tarjeta",
    }),
  status: Joi.number().integer().default(0).optional().messages({
    "number.base": "El campo status debe ser un número entero",
    "any.required": "El campo status es obligatorio",
    "any.only": "El campo status debe ser 0 (no pagado) o 1 (pagado)",
  }),
  quantity: Joi.number().integer().min(1).required().messages({
    "number.base": "El campo quantity debe ser un número entero",
    "any.required": "El campo quantity es obligatorio",
    "number.min": "El campo quantity debe ser al menos 1",
  }),
  price: Joi.number().precision(2).required().messages({
    "number.base": "El campo price debe ser un número",
    "any.required": "El campo price es obligatorio",
  }),
  total: Joi.number().precision(2).optional().messages({
    "number.base": "El campo total debe ser un número",
    "any.required": "El campo total es obligatorio",
  }),
  seats: Joi.array().items(Joi.number().integer()).required().messages({
    "array.base": "El campo seats debe ser un arreglo",
    "any.required": "El campo seats es obligatorio",
  }),
  adults: Joi.number().integer().allow(null).optional().empty("").messages({
    "number.base": "El campo adults debe ser un número entero",
  }),
  minors: Joi.number().integer().allow(null).optional().empty("").messages({
    "number.base": "El campo minors debe ser un número entero",
  }),
  pay: Joi.number().precision(2).allow(null).empty("").optional().messages({
    "number.base": "El campo pay debe ser un número entero",
  }),
  transactionStatus: Joi.boolean()
    .allow(null)
    .optional()
    .empty("") // Permite null
    .messages({
      "boolean.base": "El estado de la transacción debe ser un valor booleano.",
    }),
  sequenceNumber: Joi.string()
    .length(12) // Longitud exacta de 12 caracteres
    .pattern(/^\d+$/) // Solo dígitos
    .allow(null)
    .optional()
    .empty("") // Permite null
    .messages({
      "string.base": "El número de secuencia debe ser una cadena de texto.",
      "string.length":
        "El número de secuencia debe tener exactamente 12 dígitos.",
      "string.pattern.base":
        "El número de secuencia debe contener solo dígitos.",
    }),
  extraData: Joi.object()
    .allow(null)
    .optional()
    .empty("") // Permite null
    .messages({
      "object.base": "El campo extraData debe ser un objeto JSON.",
    }),
  transactionTip: Joi.number()
    .precision(2) // Hasta 2 decimales
    .min(0) // No puede ser negativo
    .allow(null)
    .optional()
    .empty("") // Permite null
    .messages({
      "number.base": "La propina debe ser un número.",
      "number.min": "La propina no puede ser negativa.",
    }),
  transactionCashback: Joi.number()
    .precision(2) // Hasta 2 decimales
    .min(0) // No puede ser negativo
    .allow(null)
    .optional()
    .empty("") // Permite null
    .messages({
      "number.base": "El vuelto debe ser un número.",
      "number.min": "El vuelto no puede ser negativo.",
    }),
    promotions: Joi.array()
    .items(
      Joi.object({
        id: Joi.number().required().messages({
          'number.base': 'El ID de la promoción debe ser un número',
          'any.required': 'El ID de la promoción es requerido',
        }),
        percentage: Joi.number().min(0).max(100).required().messages({
          'number.base': 'El porcentaje debe ser un número',
          'number.min': 'El porcentaje no puede ser menor que 0',
          'number.max': 'El porcentaje no puede ser mayor que 100',
          'any.required': 'El porcentaje es requerido',
        }),
        originalPrice: Joi.number().positive().required().messages({
          'number.base': 'El precio original debe ser un número',
          'number.positive': 'El precio original debe ser un número positivo',
          'any.required': 'El precio original es requerido',
        }),
        discountedPrice: Joi.number().positive().required().messages({
          'number.base': 'El precio con descuento debe ser un número',
          'number.positive': 'El precio con descuento debe ser un número positivo',
          'any.required': 'El precio con descuento es requerido',
        }),
        type: Joi.string().required().messages({
          'string.base': 'El tipo debe ser una cadena de texto',
          'any.required': 'El tipo es requerido',
        }),
      })
    )
    .optional() // El campo "promotions" es opcional
    .messages({
      'array.base': 'Las promociones deben ser un array',
      'array.includesRequiredUnknowns': 'Cada promoción debe cumplir con el esquema de validación',
    }),
     tickettypes: Joi.array()
    .items(
      Joi.object({
        id: Joi.number().required().messages({
          'number.base': 'El ID del tipo de ticket debe ser un número',
          'any.required': 'El ID del tipo de ticket es requerido',
        }),
        name: Joi.string().required().messages({
          'string.base': 'El nombre debe ser una cadena de texto',
          'any.required': 'El nombre es requerido',
        }),
        cant: Joi.number().integer().min(1).required().messages({
          'number.base': 'La cantidad debe ser un número entero',
          'number.min': 'La cantidad debe ser al menos 1',
          'any.required': 'La cantidad es requerida',
        }),
        promotion_id: Joi.number().allow(null).optional().messages({
          'number.base': 'El ID de promoción debe ser un número',
        }),
        namePromotion: Joi.string().allow(null).optional().messages({
          'string.base': 'El nombre de la promoción debe ser un texto',
        }),
        percentage: Joi.number().min(0).allow(null).max(100).default(0).messages({
          'number.base': 'El porcentaje debe ser un número',
          'number.min': 'El porcentaje no puede ser menor que 0',
          'number.max': 'El porcentaje no puede ser mayor que 100',
        }),
        discount: Joi.number().min(0).allow(null).default(0).messages({
          'number.base': 'El descuento debe ser un número',
          'number.min': 'El descuento no puede ser negativo',
        }),
        showPromotionSelect: Joi.boolean().allow(null).default(false).messages({
          'boolean.base': 'showPromotionSelect debe ser un valor booleano',
        }),
        selectedPromotion: Joi.boolean()
          .allow(null)
          .default(false)
          .messages({
            'boolean.base': 'selectedPromotion debe ser un valor booleano o null',
          }),
    })
  )
  .allow(null)
  .optional()
  .messages({
    'array.base': 'Los tipos de ticket deben ser un array',
    'array.includesRequiredUnknowns': 'Cada tipo de ticket debe cumplir con el esquema de validación',
  }),
  ticketType: Joi.array()
  .items(Joi.object().unknown()) // Acepta cualquier estructura interna
  .optional()
  .messages({
    'array.base': 'ticketType debe ser un array',
  }),
});

const storeTicketWebSchema = Joi.object({
  branch_id: Joi.number().integer().required().messages({
    "number.base": "El campo branch_id debe ser un número entero",
    "any.required": "El campo branch_id es obligatorio",
  }),
  trip_id: Joi.number().integer().required().messages({
    "number.base": "El campo trip_id debe ser un número entero",
    "any.required": "El campo trip_id es obligatorio",
  }),
  date: Joi.date().required().messages({
    "date.base":
      "El campo date debe ser una fecha válida en formato YYYY-MM-DD",
    "any.required": "El campo date es obligatorio",
  }),
  method: Joi.string()
    .valid("Efectivo", "Credito", "Debito")
    .required()
    .messages({
      "string.base": "El campo method debe ser un texto",
      "any.required": "El campo method es obligatorio",
      "any.only":
        "El campo method debe ser uno de los siguientes valores: Efectivo, Tarjeta",
    }),
  status: Joi.number().integer().default(0).optional().messages({
    "number.base": "El campo status debe ser un número entero",
    "any.required": "El campo status es obligatorio",
    "any.only": "El campo status debe ser 0 (no pagado) o 1 (pagado)",
  }),
  quantity: Joi.number().integer().min(1).required().messages({
    "number.base": "El campo quantity debe ser un número entero",
    "any.required": "El campo quantity es obligatorio",
    "number.min": "El campo quantity debe ser al menos 1",
  }),
  price: Joi.number().precision(2).required().messages({
    "number.base": "El campo price debe ser un número",
    "any.required": "El campo price es obligatorio",
  }),
  total: Joi.number().precision(2).optional().messages({
    "number.base": "El campo total debe ser un número",
    "any.required": "El campo total es obligatorio",
  }),
  seats: Joi.array().items(Joi.number().integer()).required().messages({
    "array.base": "El campo seats debe ser un arreglo",
    "any.required": "El campo seats es obligatorio",
  }),
  adults: Joi.number().integer().allow(null).optional().empty("").messages({
    "number.base": "El campo adults debe ser un número entero",
  }),
  minors: Joi.number().integer().allow(null).optional().empty("").messages({
    "number.base": "El campo minors debe ser un número entero",
  }),
  pay: Joi.number().precision(2).allow(null).empty("").optional().messages({
    "number.base": "El campo pay debe ser un número entero",
  }),
  device: Joi.string().allow(null).optional("").messages({
    "string.base": "El campo device debe ser un texto",
    "any.required": "El campo method es obligatorio",
  }),
  promotions: Joi.array()
    .items(
      Joi.object({
        id: Joi.number().required().messages({
          'number.base': 'El ID de la promoción debe ser un número',
          'any.required': 'El ID de la promoción es requerido',
        }),
        percentage: Joi.number().min(0).max(100).required().messages({
          'number.base': 'El porcentaje debe ser un número',
          'number.min': 'El porcentaje no puede ser menor que 0',
          'number.max': 'El porcentaje no puede ser mayor que 100',
          'any.required': 'El porcentaje es requerido',
        }),
        originalPrice: Joi.number().positive().required().messages({
          'number.base': 'El precio original debe ser un número',
          'number.positive': 'El precio original debe ser un número positivo',
          'any.required': 'El precio original es requerido',
        }),
        discountedPrice: Joi.number().positive().required().messages({
          'number.base': 'El precio con descuento debe ser un número',
          'number.positive': 'El precio con descuento debe ser un número positivo',
          'any.required': 'El precio con descuento es requerido',
        }),
        type: Joi.string().required().messages({
          'string.base': 'El tipo debe ser una cadena de texto',
          'any.required': 'El tipo es requerido',
        }),
      })
    )
    .optional() // El campo "promotions" es opcional
    .messages({
      'array.base': 'Las promociones deben ser un array',
      'array.includesRequiredUnknowns': 'Cada promoción debe cumplir con el esquema de validación',
    }),
     tickettypes: Joi.array()
    .items(
      Joi.object({
        id: Joi.number().required().messages({
          'number.base': 'El ID del tipo de ticket debe ser un número',
          'any.required': 'El ID del tipo de ticket es requerido',
        }),
        name: Joi.string().required().messages({
          'string.base': 'El nombre debe ser una cadena de texto',
          'any.required': 'El nombre es requerido',
        }),
        cant: Joi.number().integer().min(1).required().messages({
          'number.base': 'La cantidad debe ser un número entero',
          'number.min': 'La cantidad debe ser al menos 1',
          'any.required': 'La cantidad es requerida',
        }),
        promotion_id: Joi.number().allow(null).optional().messages({
          'number.base': 'El ID de promoción debe ser un número',
        }),
        namePromotion: Joi.string().allow(null).optional().messages({
          'string.base': 'El nombre de la promoción debe ser un texto',
        }),
        percentage: Joi.number().min(0).allow(null).max(100).default(0).messages({
          'number.base': 'El porcentaje debe ser un número',
          'number.min': 'El porcentaje no puede ser menor que 0',
          'number.max': 'El porcentaje no puede ser mayor que 100',
        }),
        discount: Joi.number().min(0).allow(null).default(0).messages({
          'number.base': 'El descuento debe ser un número',
          'number.min': 'El descuento no puede ser negativo',
        }),
        showPromotionSelect: Joi.boolean().allow(null).default(false).messages({
          'boolean.base': 'showPromotionSelect debe ser un valor booleano',
        }),
        selectedPromotion: Joi.boolean()
          .allow(null)
          .default(false)
          .messages({
            'boolean.base': 'selectedPromotion debe ser un valor booleano o null',
          }),
    })
  )
  .allow(null)
  .optional()
  .messages({
    'array.base': 'Los tipos de ticket deben ser un array',
    'array.includesRequiredUnknowns': 'Cada tipo de ticket debe cumplir con el esquema de validación',
  }),
});

// Esquema para actualizar un Ticket
const updateTicketSchema = Joi.object({
  branch_id: Joi.number().integer().allow(null).optional().messages({
    "number.base": "El campo branch_id debe ser un número entero",
  }),
  trip_id: Joi.number().integer().allow(null).optional().messages({
    "number.base": "El campo trip_id debe ser un número entero",
  }),
  date: Joi.date().allow(null).optional().messages({
    "date.base":
      "El campo date debe ser una fecha válida en formato YYYY-MM-DD",
  }),
  method: Joi.string()
    .valid("Efectivo", "Credito", "Debito")
    .allow(null)
    .optional()
    .messages({
      "string.base": "El campo payment debe ser un texto",
    }),
  status: Joi.number().integer().valid(0, 1).allow(null).optional().messages({
    "number.base": "El campo status debe ser un número entero",
    "any.only": "El campo status debe ser 0 (no pagado) o 1 (pagado)",
  }),
  quantity: Joi.number().integer().min(1).allow(null).optional().messages({
    "number.base": "El campo quantity debe ser un número entero",
    "number.min": "El campo quantity debe ser al menos 1",
  }),
  price: Joi.number().precision(2).allow(null).optional().messages({
    "number.base": "El campo price debe ser un número",
  }),
  total: Joi.number().precision(2).allow(null).optional().messages({
    "number.base": "El campo total debe ser un número",
  }),
  seats: Joi.array()
    .items(Joi.number().integer())
    .allow(null)
    .optional()
    .messages({
      "array.base": "El campo seats debe ser un arreglo",
    }),
  adults: Joi.number().integer().allow(null).optional().empty("").messages({
    "number.base": "El campo adults debe ser un número entero",
  }),
  minors: Joi.number().integer().allow(null).optional().empty("").messages({
    "number.base": "El campo minors debe ser un número entero",
  }),
  pay: Joi.number().integer().allow(null).optional().messages({
    "number.base": "El campo pay debe ser un número entero",
  }),
  promotions: Joi.array()
    .items(
      Joi.object({
        id: Joi.number().required().messages({
          'number.base': 'El ID de la promoción debe ser un número',
          'any.required': 'El ID de la promoción es requerido',
        }),
        percentage: Joi.number().min(0).max(100).required().messages({
          'number.base': 'El porcentaje debe ser un número',
          'number.min': 'El porcentaje no puede ser menor que 0',
          'number.max': 'El porcentaje no puede ser mayor que 100',
          'any.required': 'El porcentaje es requerido',
        }),
        originalPrice: Joi.number().positive().required().messages({
          'number.base': 'El precio original debe ser un número',
          'number.positive': 'El precio original debe ser un número positivo',
          'any.required': 'El precio original es requerido',
        }),
        discountedPrice: Joi.number().positive().required().messages({
          'number.base': 'El precio con descuento debe ser un número',
          'number.positive': 'El precio con descuento debe ser un número positivo',
          'any.required': 'El precio con descuento es requerido',
        }),
        type: Joi.string().required().messages({
          'string.base': 'El tipo debe ser una cadena de texto',
          'any.required': 'El tipo es requerido',
        }),
      })
    )
    .optional() // El campo "promotions" es opcional
    .messages({
      'array.base': 'Las promociones deben ser un array',
      'array.includesRequiredUnknowns': 'Cada promoción debe cumplir con el esquema de validación',
    }),
  id: Joi.number().integer().required().messages({
    "number.base": "El campo id debe ser un número entero",
    "any.required": "El campo id es obligatorio",
  }),
  transactionStatus: Joi.boolean()
    .allow(null)
    .optional()
    .empty("") // Permite null
    .messages({
      "boolean.base": "El estado de la transacción debe ser un valor booleano.",
    }),
  sequenceNumber: Joi.string()
    .length(12) // Longitud exacta de 12 caracteres
    .pattern(/^\d+$/) // Solo dígitos
    .allow(null)
    .optional()
    .empty("") // Permite null
    .messages({
      "string.base": "El número de secuencia debe ser una cadena de texto.",
      "string.length":
        "El número de secuencia debe tener exactamente 12 dígitos.",
      "string.pattern.base":
        "El número de secuencia debe contener solo dígitos.",
    }),
  extraData: Joi.object()
    .allow(null)
    .optional()
    .empty("") // Permite null
    .messages({
      "object.base": "El campo extraData debe ser un objeto JSON.",
    }),
  transactionTip: Joi.number()
    .precision(2) // Hasta 2 decimales
    .min(0) // No puede ser negativo
    .allow(null)
    .optional()
    .empty("") // Permite null
    .messages({
      "number.base": "La propina debe ser un número.",
      "number.min": "La propina no puede ser negativa.",
    }),
  transactionCashback: Joi.number()
    .precision(2) // Hasta 2 decimales
    .min(0) // No puede ser negativo
    .allow(null)
    .optional()
    .empty("") // Permite null
    .messages({
      "number.base": "El vuelto debe ser un número.",
      "number.min": "El vuelto no puede ser negativo.",
    }),
    tickettypes: Joi.array()
    .items(
      Joi.object({
        id: Joi.number().required().messages({
          'number.base': 'El ID del tipo de ticket debe ser un número',
          'any.required': 'El ID del tipo de ticket es requerido',
        }),
        name: Joi.string().required().messages({
          'string.base': 'El nombre debe ser una cadena de texto',
          'any.required': 'El nombre es requerido',
        }),
        cant: Joi.number().integer().min(1).required().messages({
          'number.base': 'La cantidad debe ser un número entero',
          'number.min': 'La cantidad debe ser al menos 1',
          'any.required': 'La cantidad es requerida',
        }),
        promotion_id: Joi.number().allow(null).optional().messages({
          'number.base': 'El ID de promoción debe ser un número',
        }),
        namePromotion: Joi.string().allow(null).optional().messages({
          'string.base': 'El nombre de la promoción debe ser un texto',
        }),
        percentage: Joi.number().min(0).allow(null).max(100).default(0).messages({
          'number.base': 'El porcentaje debe ser un número',
          'number.min': 'El porcentaje no puede ser menor que 0',
          'number.max': 'El porcentaje no puede ser mayor que 100',
        }),
        discount: Joi.number().min(0).allow(null).default(0).messages({
          'number.base': 'El descuento debe ser un número',
          'number.min': 'El descuento no puede ser negativo',
        }),
        showPromotionSelect: Joi.boolean().allow(null).default(false).messages({
          'boolean.base': 'showPromotionSelect debe ser un valor booleano',
        }),
        selectedPromotion: Joi.boolean()
          .allow(null)
          .default(false)
          .messages({
            'boolean.base': 'selectedPromotion debe ser un valor booleano o null',
          }),
    })
  )
  .allow(null)
  .optional()
  .messages({
    'array.base': 'Los tipos de ticket deben ser un array',
    'array.includesRequiredUnknowns': 'Cada tipo de ticket debe cumplir con el esquema de validación',
  }),
  ticketType: Joi.array()
  .items(Joi.object().unknown()) // Acepta cualquier estructura interna
  .optional()
  .messages({
    'array.base': 'ticketType debe ser un array',
  }),
});

// Esquema para validar el ID de un Ticket
const idTicketSchema = Joi.object({
  id: Joi.number().integer().required().messages({
    "number.base": "El campo id debe ser un número entero",
    "any.required": "El campo id es obligatorio",
  }),
});

const branchTicketTripSchema = Joi.object({
  branch_id: Joi.number().required().messages({
    "number.base": "El campo id debe ser un número entero",
    "any.required": "El campo id es obligatorio",
  }),
  ticket_id: Joi.number().allow(null).empty("").optional().messages({
    "number.base": "El campo ticket_id debe ser un número entero",
  }),
  date: Joi.date().allow(null).optional().messages({
    "date.base":
      "El campo date debe ser una fecha válida en formato YYYY-MM-DD",
  }),
  endDate: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/) // Formato YYYY-MM-DD
    .allow("", null) // Permitir vacío o null
    .optional() // Campo opcional
    .messages({
      "string.pattern.base": "El formato de endDate debe ser YYYY-MM-DD",
    }),
});

const monthlySalesSchema = Joi.object({
  month: Joi.string()
    .pattern(/^\d{4}-\d{2}$/) // Expresión regular para validar el formato YYYY-MM
    .required()
    .messages({
      "string.pattern.base": "El formato del mes debe ser YYYY-MM",
      "any.required": "El mes es un campo requerido",
    }),
  branch_id: Joi.number().integer().allow(null).optional().messages({
    "number.base": "El campo branch_id debe ser un número entero",
  }),
  type: Joi.string()
    .valid("Sucursal", "Negocio")
    .allow(null)
    .required()
    .messages({
      "string.base": "El campo type debe ser un texto",
    }),
});

const ticketSoldDateSchema = Joi.object({
  type: Joi.string()
    .valid("Company", "Sucursal") // Valores permitidos para el campo "type"
    .required()
    .messages({
      "string.base": "El campo type debe ser un texto",
      "any.only": 'El campo type debe ser "Company" o "Sucursal"',
      "any.required": "El campo type es requerido",
    }),
  id: Joi.number().integer().positive().required().messages({
    "number.base": "El campo id debe ser un número entero",
    "number.integer": "El campo id debe ser un número entero",
    "number.positive": "El campo id debe ser un número positivo",
    "any.required": "El campo id es requerido",
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
});

const ticketSoldDateWorkerSchema = Joi.object({
 branch_id: Joi.number().integer().positive().required().messages({
    "number.base": "El campo id debe ser un número entero",
    "number.integer": "El campo id debe ser un número entero",
    "number.positive": "El campo id debe ser un número positivo",
    "any.required": "El campo id es requerido",
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
});

const qrEncryptedSchema = Joi.object({
  qr: Joi.alternatives()
    .try(
      Joi.string().trim().min(1),
      Joi.number().integer().positive()
    )
    .required()
    .messages({
      "alternatives.types": "El QR debe ser un texto o un número entero positivo",
      "any.required": "El QR es obligatorio"
    })
    .custom((value, helpers) => {
      // Convertir siempre a string para consistencia interna
      return String(value);
    }, 'Convert qr to string'),
  trip_id: Joi.number()
    .integer()
    .required()
    .messages({
      "number.base": "El trip_id debe ser un número",
      "number.integer": "El trip_id debe ser un número entero",
      "any.required": "El trip_id es obligatorio"
    })
});
module.exports = {
  storeTicketSchema,
  updateTicketSchema,
  idTicketSchema,
  branchTicketTripSchema,
  monthlySalesSchema,
  ticketSoldDateSchema,
  storeTicketWebSchema,
  qrEncryptedSchema,
  ticketSoldDateWorkerSchema
};
