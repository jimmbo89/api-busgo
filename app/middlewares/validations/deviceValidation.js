const Joi = require("joi");

const deviceVehicleActionSchema = Joi.object({
  vehicle_id: Joi.number().integer().positive().required().messages({
    "number.base": "El campo vehicle_id debe ser un número entero",
    "number.integer": "El campo vehicle_id debe ser un número entero",
    "number.positive": "El campo vehicle_id debe ser mayor que cero",
    "any.required": "El campo vehicle_id es obligatorio",
  }),
  association_id: Joi.number().integer().positive().allow(null).optional().messages({
    "number.base": "El campo association_id debe ser un número entero",
    "number.integer": "El campo association_id debe ser un número entero",
    "number.positive": "El campo association_id debe ser mayor que cero",
  }),
  action: Joi.string()
    .valid("associate", "activate", "deactivate", "delete")
    .insensitive()
    .required()
    .messages({
      "any.only": "La acción debe ser associate, activate, deactivate o delete",
      "any.required": "El campo action es obligatorio",
    }),
  active: Joi.boolean().optional().messages({
    "boolean.base": "El campo active debe ser booleano",
  }),
});

const deviceVehiclesSchema = Joi.array()
  .items(deviceVehicleActionSchema)
  .allow(null)
  .optional()
  .messages({
    "array.base": "El campo vehicles debe ser un arreglo",
  });

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
  vehicles: deviceVehiclesSchema,
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
  vehicles: deviceVehiclesSchema,
});

const parseDeviceVehicles = (req, res, next) => {
  if (req.body && typeof req.body.vehicles === "string") {
    try {
      req.body.vehicles = JSON.parse(req.body.vehicles);
    } catch (error) {
      return res.status(400).json({
        msg: "Error de validación",
        details: ["El campo vehicles debe contener un JSON válido"],
      });
    }
  }

  return next();
};

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
  company_id: Joi.number().allow(null).empty("").optional().messages({
    "number.base": "El campo company_id debe ser un número entero",
  }),

  branch_id: Joi.number().allow(null).empty("").optional().messages({
    "number.base": "El campo branch_id debe ser un número entero",
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
  deviceCompanySchema,
  parseDeviceVehicles,
};
