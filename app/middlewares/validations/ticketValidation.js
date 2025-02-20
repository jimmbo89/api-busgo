const Joi = require("joi");

// Esquema para crear un nuevo Ticket
const storeTicketSchema = Joi.object({
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
  method: Joi.string().valid("Efectivo", "Tarjeta").required().messages({
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
    .valid("Efectivo", "Tarjeta")
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
  id: Joi.number().integer().required().messages({
    "number.base": "El campo id debe ser un número entero",
    "any.required": "El campo id es obligatorio",
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
    .valid('Company', 'Sucursal') // Valores permitidos para el campo "type"
    .required()
    .messages({
      'string.base': 'El campo type debe ser un texto',
      'any.only': 'El campo type debe ser "Company" o "Sucursal"',
      'any.required': 'El campo type es requerido',
    }),
  id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'El campo id debe ser un número entero',
      'number.integer': 'El campo id debe ser un número entero',
      'number.positive': 'El campo id debe ser un número positivo',
      'any.required': 'El campo id es requerido',
    }),
    date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/) // Expresión regular para validar el formato YYYY-MM-DD
    .required()
    .messages({
      'string.pattern.base': 'El formato de la fecha debe ser YYYY-MM-DD',
      'any.required': 'El campo date es requerido',
    }),
});
module.exports = {
  storeTicketSchema,
  updateTicketSchema,
  idTicketSchema,
  branchTicketTripSchema,
  monthlySalesSchema,
  ticketSoldDateSchema
};
