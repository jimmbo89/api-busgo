const Joi = require("joi");

const storeTripSchema = Joi.object({
  branch_id: Joi.number().required().messages({
    "number.base": "El campo branch_id debe ser un numero entero",
    "any.required": "El campo branch_id es obligatorio",
  }),
  vehicle_id: Joi.number().required().messages({
    "number.base": "El campo vehicle_id debe ser un numero entero",
    "any.required": "El campo vehicle_id es obligatorio",
  }),
  route_id: Joi.number().required().messages({
    "number.base": "El campo route_id debe ser un numero entero",
    "any.required": "El campo route_id es obligatorio",
  }),
  date: Joi.date().required().messages({
    "date.base": "El campo date debe ser una fecha valida",
    "any.required": "El campo date es obligatorio",
  }),
  schedule: Joi.string()
    .pattern(/^\d{2}:\d{2}$/)
    .allow(null)
    .empty("")
    .optional()
    .messages({
      "string.pattern.base": "El campo schedule debe tener el formato 00:00:00",
    }),
  arrival: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/)
    .allow(null)
    .empty("")
    .optional()
    .messages({
      "string.pattern.base": "El campo arrival debe tener el formato YYYY-MM-DD HH:MM:SS",
    }),
  start: Joi.string()
    .pattern(/^\d{2}:\d{2}$/)
    .allow(null)
    .empty("")
    .optional()
    .messages({
      "string.pattern.base": "El campo start debe tener el formato 00:00:00",
    }),
  end: Joi.string()
    .pattern(/^\d{2}:\d{2}$/)
    .allow(null)
    .empty("")
    .optional()
    .messages({
      "string.pattern.base": "El campo end debe tener el formato 00:00:00",
    }),
  price: Joi.number()
    .precision(2)
    .positive()
    .required()
    .messages({
      "number.base": "El precio debe ser un numero",
      "number.precision": "El precio no puede tener mas de dos decimales",
      "number.positive": "El precio debe ser un numero positivo",
      "any.required": "El precio es obligatorio",
    }),
  workers: Joi.array()
    .items(
      Joi.object({
        worker_id: Joi.number().required(),
      })
    )
    .optional(),
});

const updateTripSchema = Joi.object({
  id: Joi.number().required().messages({
    "number.base": "El campo id debe ser un numero entero",
    "any.required": "El campo id es obligatorio",
  }),
  branch_id: Joi.number().allow(null).empty("").optional().messages({
    "number.base": "El campo branch_id debe ser un numero entero",
  }),
  vehicle_id: Joi.number().allow(null).empty("").optional().messages({
    "number.base": "El campo vehicle_id debe ser un numero entero",
  }),
  route_id: Joi.number().allow(null).empty("").optional().messages({
    "number.base": "El campo route_id debe ser un numero entero",
  }),
  date: Joi.date().allow(null).empty("").optional().messages({
    "date.base": "El campo date debe ser una fecha valida",
  }),
  schedule: Joi.string()
    .pattern(/^\d{2}:\d{2}$/)
    .allow(null)
    .empty("")
    .optional()
    .messages({
      "string.pattern.base": "El campo schedule debe tener el formato 00:00:00",
    }),
  arrival: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/)
    .allow(null)
    .empty("")
    .optional()
    .messages({
      "string.pattern.base": "El campo arrival debe tener el formato YYYY-MM-DD HH:MM:SS",
    }),
  start: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/)
    .allow(null)
    .empty("")
    .optional()
    .messages({
      "string.pattern.base": "El campo start debe tener el formato YYYY-MM-DD HH:mm:ss",
    }),
  end: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/)
    .allow(null)
    .empty("")
    .optional()
    .messages({
      "string.pattern.base": "El campo end debe tener el formato YYYY-MM-DD HH:mm:ss",
    }),
  price: Joi.number()
    .precision(2)
    .positive()
    .allow(null)
    .empty("")
    .optional()
    .messages({
      "number.base": "El precio debe ser un numero",
      "number.precision": "El precio no puede tener mas de dos decimales",
      "number.positive": "El precio debe ser un numero positivo",
      "any.required": "El precio es obligatorio",
    }),
  workers: Joi.array()
    .items(
      Joi.object({
        worker_id: Joi.number().required(),
      })
    )
    .optional(),
});

const idTripSchema = Joi.object({
  id: Joi.number().required().messages({
    "number.base": "El campo id debe ser un numero entero",
    "any.required": "El campo id es obligatorio",
  }),
});

const changeTripSchema = Joi.object({
  id: Joi.number().required().messages({
    "number.base": "El campo id debe ser un numero entero",
    "any.required": "El campo id es obligatorio",
  }),
  vehicle_id: Joi.number().required().messages({
    "number.base": "El campo vehicle_id debe ser un numero entero",
    "any.required": "El campo vehicle_id es obligatorio",
  }),
});

const branch_idTripSchema = Joi.object({
  branch_id: Joi.number().required().messages({
    "number.base": "El campo id debe ser un numero entero",
    "any.required": "El campo id es obligatorio",
  }),
  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .allow("", null)
    .optional()
    .messages({
      "string.pattern.base": "El formato de endDate debe ser YYYY-MM-DD",
    }),
});

const tripWorkerDateSchema = Joi.object({
  branch_id: Joi.number().integer().positive().required().messages({
    "number.base": "El campo branch_id debe ser un numero entero",
    "number.integer": "El campo branch_id debe ser un numero entero",
    "number.positive": "El campo branch_id debe ser un numero positivo",
    "any.required": "El campo branch_id es requerido",
  }),
  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .messages({
      "string.pattern.base": "El formato de la fecha debe ser YYYY-MM-DD",
    }),
  endDate: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .allow("", null)
    .optional()
    .messages({
      "string.pattern.base": "El formato de endDate debe ser YYYY-MM-DD",
    }),
  worker_id: Joi.number().allow(null).empty("").optional().messages({
    "number.base": "El campo branch_id debe ser un numero entero",
  }),
});

module.exports = {
  storeTripSchema,
  updateTripSchema,
  idTripSchema,
  changeTripSchema,
  branch_idTripSchema,
  tripWorkerDateSchema,
};
