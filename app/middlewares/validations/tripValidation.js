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
    .allow(null)
    .empty("")
    .optional()
    .messages({
      "number.base": "El precio debe ser un numero",
      "number.precision": "El precio no puede tener mas de dos decimales",
      "number.positive": "El precio debe ser un numero positivo",
    }),
  workers: Joi.array()
    .items(
      Joi.object({
        worker_id: Joi.number().required(),
      })
    )
    .optional(),
  tripStops: Joi.array()
    .items(
      Joi.object({
        id: Joi.number().integer().optional(),
        route_stop_id: Joi.number().integer().required(),
        stop_order: Joi.number().integer().optional(),
        arrival_time: Joi.string().allow(null).empty("").optional(),
        departure_time: Joi.string().allow(null).empty("").optional(),
        can_board: Joi.boolean().optional(),
        can_alight: Joi.boolean().optional(),
        active: Joi.boolean().optional(),
        source_type: Joi.string().valid("auto", "manual", "override").optional(),
      })
    )
    .optional(),
  tripFares: Joi.array()
    .items(
      Joi.object({
        id: Joi.number().integer().optional(),
        fare_segment_ticket_type_id: Joi.number().integer().required(),
        base_price: Joi.number().precision(2).allow(null).optional(),
        price: Joi.number().precision(2).allow(null).optional(),
        active: Joi.boolean().optional(),
        source_type: Joi.string().valid("auto", "manual", "override").optional(),
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
    }),
  workers: Joi.array()
    .items(
      Joi.object({
        worker_id: Joi.number().required(),
      })
    )
    .optional(),
  tripStops: Joi.array()
    .items(
      Joi.object({
        id: Joi.number().integer().optional(),
        route_stop_id: Joi.number().integer().required(),
        stop_order: Joi.number().integer().optional(),
        arrival_time: Joi.string().allow(null).empty("").optional(),
        departure_time: Joi.string().allow(null).empty("").optional(),
        can_board: Joi.boolean().optional(),
        can_alight: Joi.boolean().optional(),
        active: Joi.boolean().optional(),
        source_type: Joi.string().valid("auto", "manual", "override").optional(),
      })
    )
    .optional(),
  tripFares: Joi.array()
    .items(
      Joi.object({
        id: Joi.number().integer().optional(),
        fare_segment_ticket_type_id: Joi.number().integer().required(),
        base_price: Joi.number().precision(2).allow(null).optional(),
        price: Joi.number().precision(2).allow(null).optional(),
        active: Joi.boolean().optional(),
        source_type: Joi.string().valid("auto", "manual", "override").optional(),
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

const branchOriginDestinationTripSchema = Joi.object({
  branch_id: Joi.number().required().messages({
    "number.base": "El campo branch_id debe ser un numero entero",
    "any.required": "El campo branch_id es obligatorio",
  }),
  origin_id: Joi.number().required().messages({
    "number.base": "El campo origin_id debe ser un numero entero",
    "any.required": "El campo origin_id es obligatorio",
  }),
  destination_id: Joi.number().required().messages({
    "number.base": "El campo destination_id debe ser un numero entero",
    "any.required": "El campo destination_id es obligatorio",
  }),
  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .allow("", null)
    .optional()
    .messages({
      "string.pattern.base": "El formato de date debe ser YYYY-MM-DD",
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
  branchOriginDestinationTripSchema,
  tripWorkerDateSchema,
};
