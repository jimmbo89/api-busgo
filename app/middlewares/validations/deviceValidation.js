const Joi = require("joi");

// Validación para crear un nuevo dispositivo
const storeDeviceSchema = Joi.object({
  branch_id: Joi.number().required().messages({
    "number.base": "El campo branch_id debe ser un número entero",
    "any.required": "El campo branch_id es obligatorio",
  }),
  name: Joi.string().max(255).required().messages({
    "string.base": "El campo name debe ser una cadena de texto",
    "string.max": "El campo name no debe exceder los 255 caracteres",
    "any.required": "El campo name es obligatorio",
  }),
  mac: Joi.string().max(50).required().messages({
    "string.base": "El campo mac debe ser una cadena de texto",
    "string.max": "El campo mac no debe exceder los 50 caracteres",
    "any.required": "El campo mac es obligatorio",
  }),
  version: Joi.string().max(50).allow(null).empty("").optional().messages({
    "string.base": "El campo version debe ser una cadena de texto",
    "string.max": "El campo version no debe exceder los 50 caracteres",
  }),
  image: Joi.string()
    .pattern(/\.(jpg|jpeg|png|gif)$/i)
    .allow(null)
    .empty("")
    .optional()
    .messages({
      "string.pattern.base":
        "El campo image debe ser una imagen válida (jpg, jpeg, png, gif)",
    }),
  serial: Joi.string().max(100).required().messages({
    "string.base": "El campo serial debe ser una cadena de texto",
    "string.max": "El campo serial no debe exceder los 100 caracteres",
    "any.required": "El campo serial es obligatorio",
  }),
  status: Joi.number().allow(null).empty("").optional().messages({
    "number.base": "El campo status debe ser un número entero",
  }),
  maintenance: Joi.date().allow(null).empty("").optional().messages({
    "date.base": "El campo maintenance debe ser una fecha válida",
  }),
  acquisition: Joi.date().allow(null).empty("").optional().messages({
    "date.base": "El campo acquisition debe ser una fecha válida",
  }),
  notes: Joi.string().allow(null).empty("").optional().messages({
    "string.base": "El campo notes debe ser una cadena de texto",
  }),
});

// Validación para actualizar un dispositivo
const updateDeviceSchema = Joi.object({
  id: Joi.number().required().messages({
    "number.base": "El campo id debe ser un número entero",
    "any.required": "El campo id es obligatorio",
  }),
  branch_id: Joi.number().allow(null).empty("").optional().messages({
    "number.base": "El campo branch_id debe ser un número entero",
  }),
  name: Joi.string().max(255).allow(null).empty("").optional().messages({
    "string.base": "El campo name debe ser una cadena de texto",
    "string.max": "El campo name no debe exceder los 255 caracteres",
  }),
  mac: Joi.string().max(50).allow(null).empty("").optional().messages({
    "string.base": "El campo mac debe ser una cadena de texto",
    "string.max": "El campo mac no debe exceder los 50 caracteres",
  }),
  version: Joi.string().max(50).allow(null).empty("").optional().messages({
    "string.base": "El campo version debe ser una cadena de texto",
    "string.max": "El campo version no debe exceder los 50 caracteres",
  }),
  image: Joi.string()
    .pattern(/\.(jpg|jpeg|png|gif)$/i)
    .allow(null)
    .empty("")
    .optional()
    .messages({
      "string.pattern.base":
        "El campo image debe ser una imagen válida (jpg, jpeg, png, gif)",
    }),
  serial: Joi.string().max(100).allow(null).empty("").optional().messages({
    "string.base": "El campo serial debe ser una cadena de texto",
    "string.max": "El campo serial no debe exceder los 100 caracteres",
  }),
  status: Joi.number().allow(null).empty("").optional().messages({
    "number.base": "El campo status debe ser un número entero",
  }),
  maintenance: Joi.date().allow(null).empty("").optional().messages({
    "date.base": "El campo maintenance debe ser una fecha válida",
  }),
  acquisition: Joi.date().allow(null).empty("").optional().messages({
    "date.base": "El campo acquisition debe ser una fecha válida",
  }),
  notes: Joi.string().allow(null).empty("").optional().messages({
    "string.base": "El campo notes debe ser una cadena de texto",
  }),
});

const deviceCompanySchema = Joi.object({
  mac: Joi.string()
    .pattern(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/) // Valida formato MAC
    .allow(null) // Permite null
    .messages({
      "string.pattern.base": "La dirección MAC debe tener un formato válido.",
    }),
  serial: Joi.string().max(100).allow(null).empty("").optional().messages({
    "string.base": "El campo serial debe ser una cadena de texto",
    "string.max": "El campo serial no debe exceder los 100 caracteres",
  }),
  branch_id: Joi.number().allow(null).empty("").optional().messages({
    "number.base": "El campo company_id debe ser un número entero",
  }),
});

// Validación para obtener un dispositivo por ID
const idDeviceSchema = Joi.object({
  id: Joi.number().required().messages({
    "number.base": "El campo id debe ser un número entero",
    "any.required": "El campo id es obligatorio",
  }),
});

// Validación para obtener un dispositivo por ID
const branchIdDeviceSchema = Joi.object({
  branch_id: Joi.number().required().messages({
    "number.base": "El campo id debe ser un número entero",
    "any.required": "El campo id es obligatorio",
  }),
});

module.exports = {
  storeDeviceSchema,
  updateDeviceSchema,
  idDeviceSchema,
  branchIdDeviceSchema,
  deviceCompanySchema
};
