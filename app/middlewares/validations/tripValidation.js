const Joi = require("joi");

const saleModeSchema = Joi.string()
  .valid("normal", "express")
  .allow(null)
  .optional()
  .messages({
    "any.only": "El campo saleMode debe ser normal o express",
    "string.base": "El campo saleMode debe ser un texto",
  });

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
  saleMode: saleModeSchema,
  sale_mode: saleModeSchema,
  trip_template_id: Joi.number().integer().allow(null).optional().messages({
    "number.base": "El campo trip_template_id debe ser un numero entero",
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

const storeMobileTripSchema = storeTripSchema;

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
  start: Joi.any().allow(null).optional(),
  end: Joi.any().allow(null).optional(),
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
  saleMode: saleModeSchema,
  sale_mode: saleModeSchema,
  trip_template_id: Joi.number().integer().allow(null).optional().messages({
    "number.base": "El campo trip_template_id debe ser un numero entero",
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
  origin_id: Joi.number().allow(null).optional().messages({
    "number.base": "El campo origin_id debe ser un numero entero",
  }),
  destination_id: Joi.number().allow(null).optional().messages({
    "number.base": "El campo destination_id debe ser un numero entero",
  }),
  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .allow("", null)
    .optional()
    .messages({
      "string.pattern.base": "El formato de date debe ser YYYY-MM-DD",
    }),
});

const branchTripDateSegmentAllSchema = Joi.object({
  branch_id: Joi.number().required().messages({
    "number.base": "El campo branch_id debe ser un numero entero",
    "any.required": "El campo branch_id es obligatorio",
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

const tripWorkerReportSchema = Joi.object({
  branch_id: Joi.number().integer().positive().required().messages({
    "number.base": "El campo branch_id debe ser un numero entero",
    "number.integer": "El campo branch_id debe ser un numero entero",
    "number.positive": "El campo branch_id debe ser un numero positivo",
    "any.required": "El campo branch_id es requerido",
  }),
  user_id: Joi.number().integer().positive().optional().messages({
    "number.base": "El campo user_id debe ser un numero entero",
    "number.integer": "El campo user_id debe ser un numero entero",
    "number.positive": "El campo user_id debe ser un numero positivo",
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

const expressSalesDestinationsSchema = Joi.object({
  branch_id: Joi.number().integer().positive().required().messages({
    "number.base": "El campo branch_id debe ser un numero entero",
    "number.integer": "El campo branch_id debe ser un numero entero",
    "number.positive": "El campo branch_id debe ser un numero positivo",
    "any.required": "El campo branch_id es obligatorio",
  }),
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages({
    "string.pattern.base": "El campo date debe tener formato YYYY-MM-DD",
    "any.required": "El campo date es obligatorio",
  }),
  origin_id: Joi.number().integer().positive().required().messages({
    "number.base": "El campo origin_id debe ser un numero entero",
    "number.integer": "El campo origin_id debe ser un numero entero",
    "number.positive": "El campo origin_id debe ser un numero positivo",
    "any.required": "El campo origin_id es obligatorio",
  }),
});

const expressSalesDeparturesSchema = Joi.object({
  branch_id: Joi.number().integer().positive().required().messages({
    "number.base": "El campo branch_id debe ser un numero entero",
    "number.integer": "El campo branch_id debe ser un numero entero",
    "number.positive": "El campo branch_id debe ser un numero positivo",
    "any.required": "El campo branch_id es obligatorio",
  }),
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages({
    "string.pattern.base": "El campo date debe tener formato YYYY-MM-DD",
    "any.required": "El campo date es obligatorio",
  }),
  origin_id: Joi.number().integer().positive().required().messages({
    "number.base": "El campo origin_id debe ser un numero entero",
    "number.integer": "El campo origin_id debe ser un numero entero",
    "number.positive": "El campo origin_id debe ser un numero positivo",
    "any.required": "El campo origin_id es obligatorio",
  }),
  destination_id: Joi.number().integer().positive().required().messages({
    "number.base": "El campo destination_id debe ser un numero entero",
    "number.integer": "El campo destination_id debe ser un numero entero",
    "number.positive": "El campo destination_id debe ser un numero positivo",
    "any.required": "El campo destination_id es obligatorio",
  }),
});

const expressSalesDepartureAvailabilitySchema = Joi.object({
  source: Joi.string().valid("trip", "template").required().messages({
    "any.only": "El campo source debe ser trip o template",
    "any.required": "El campo source es obligatorio",
    "string.base": "El campo source debe ser un texto",
  }),
  sourceId: Joi.number().integer().positive().optional().messages({
    "number.base": "El campo sourceId debe ser un numero entero",
    "number.integer": "El campo sourceId debe ser un numero entero",
    "number.positive": "El campo sourceId debe ser un numero positivo",
  }),
  source_id: Joi.number().integer().positive().optional().messages({
    "number.base": "El campo source_id debe ser un numero entero",
    "number.integer": "El campo source_id debe ser un numero entero",
    "number.positive": "El campo source_id debe ser un numero positivo",
  }),
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages({
    "string.pattern.base": "El campo date debe tener formato YYYY-MM-DD",
    "any.required": "El campo date es obligatorio",
  }),
}).or("sourceId", "source_id");

module.exports = {
  storeTripSchema,
  storeMobileTripSchema,
  updateTripSchema,
  idTripSchema,
  changeTripSchema,
  branch_idTripSchema,
  branchOriginDestinationTripSchema,
  branchTripDateSegmentAllSchema,
  tripWorkerDateSchema,
  tripWorkerReportSchema,
  expressSalesDestinationsSchema,
  expressSalesDeparturesSchema,
  expressSalesDepartureAvailabilitySchema
};
