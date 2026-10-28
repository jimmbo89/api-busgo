const Joi = require("joi");

const saleModeSchema = Joi.string()
  .valid("normal", "express", "on_board")
  .allow(null)
  .optional()
  .messages({
    "any.only": "El campo saleMode debe ser normal, express u on_board",
    "string.base": "El campo saleMode debe ser un texto",
  });

const tripTypeSchema = Joi.string()
  .trim()
  .valid("normal", "express", "on_board")
  .allow(null)
  .optional()
  .messages({
    "any.only": "El campo trip_type debe ser normal, express u on_board",
    "string.base": "El campo trip_type debe ser un texto",
  });

const ticketTemplateIdSchema = Joi.number()
  .integer()
  .positive()
  .allow(null)
  .optional()
  .messages({
    "number.base": "El campo ticket_template_id debe ser un número entero",
    "number.integer": "El campo ticket_template_id debe ser un número entero",
    "number.positive": "El campo ticket_template_id debe ser positivo",
  });

const tripStopSchema = Joi.object({
  id: Joi.number().integer().positive().allow(null).optional(),
  client_key: Joi.string().trim().min(1).max(100).optional(),
  route_stop_id: Joi.number().integer().positive().allow(null).optional(),
  location_id: Joi.number().integer().positive().allow(null).optional(),
  distance_km: Joi.number().precision(2).min(0).allow(null).optional(),
  minutes_from_origin: Joi.number().integer().min(0).allow(null).optional(),
  stop_order: Joi.number().integer().positive().optional(),
  arrival_time: Joi.string().allow(null).empty("").optional(),
  departure_time: Joi.string().allow(null).empty("").optional(),
  can_board: Joi.boolean().optional(),
  can_alight: Joi.boolean().optional(),
  active: Joi.boolean().optional(),
  source_type: Joi.string().valid("auto", "manual", "override").optional(),
}).custom((value, helpers) => {
  const hasRouteStop = value.route_stop_id !== undefined && value.route_stop_id !== null;
  const hasLocation = value.location_id !== undefined && value.location_id !== null;

  if (!hasRouteStop && !hasLocation) {
    return helpers.error("tripStop.locationRequired");
  }

  return value;
}).messages({
  "tripStop.locationRequired": "Cada parada debe indicar route_stop_id o location_id",
});

const tripSegmentSchema = Joi.object({
  id: Joi.number().integer().positive().allow(null).optional(),
  client_key: Joi.string().trim().min(1).max(100).optional(),
  origin_trip_stop_id: Joi.number().integer().positive().allow(null).optional(),
  destination_trip_stop_id: Joi.number().integer().positive().allow(null).optional(),
  origin_stop_id: Joi.number().integer().positive().allow(null).optional(),
  destination_stop_id: Joi.number().integer().positive().allow(null).optional(),
  origin_stop_key: Joi.string().trim().min(1).max(100).optional(),
  destination_stop_key: Joi.string().trim().min(1).max(100).optional(),
  source_fare_segment_id: Joi.number().integer().positive().allow(null).optional(),
  currency: Joi.string().trim().max(10).optional(),
  valid_from: Joi.date().iso().allow(null).optional(),
  valid_to: Joi.date().iso().allow(null).optional(),
  priority: Joi.number().integer().min(0).optional(),
  active: Joi.boolean().optional(),
  source_type: Joi.string().valid("auto", "manual", "override").optional(),
}).custom((value, helpers) => {
  const originId = value.origin_trip_stop_id ?? value.origin_stop_id;
  const destinationId = value.destination_trip_stop_id ?? value.destination_stop_id;
  const hasIds = originId !== undefined && originId !== null &&
    destinationId !== undefined && destinationId !== null;
  const hasKeys = value.origin_stop_key !== undefined &&
    value.destination_stop_key !== undefined;

  if (!hasIds && !hasKeys) {
    return helpers.error("tripSegment.stopsRequired");
  }
  if ((hasIds && (originId === null || destinationId === null)) ||
      (hasKeys && (!value.origin_stop_key || !value.destination_stop_key))) {
    return helpers.error("tripSegment.stopsRequired");
  }

  return value;
}).messages({
  "tripSegment.stopsRequired":
    "Cada tramo debe indicar los IDs de sus paradas o origin_stop_key y destination_stop_key",
});

const tripFareSchema = Joi.object({
  id: Joi.number().integer().positive().allow(null).optional(),
  fare_segment_ticket_type_id: Joi.number().integer().positive().allow(null).optional(),
  trip_segment_id: Joi.number().integer().positive().allow(null).optional(),
  segment_key: Joi.string().trim().min(1).max(100).optional(),
  origin_trip_stop_id: Joi.number().integer().positive().allow(null).optional(),
  destination_trip_stop_id: Joi.number().integer().positive().allow(null).optional(),
  origin_stop_key: Joi.string().trim().min(1).max(100).optional(),
  destination_stop_key: Joi.string().trim().min(1).max(100).optional(),
  ticket_type_id: Joi.number().integer().positive().allow(null).optional(),
  base_price: Joi.number().precision(2).min(0).allow(null).optional(),
  price: Joi.number().precision(2).min(0).allow(null).optional(),
  currency: Joi.string().trim().max(10).optional(),
  valid_from: Joi.date().iso().allow(null).optional(),
  valid_to: Joi.date().iso().allow(null).optional(),
  priority: Joi.number().integer().min(0).optional(),
  active: Joi.boolean().optional(),
  source_type: Joi.string().valid("auto", "manual", "override").optional(),
}).custom((value, helpers) => {
  const hasLegacy = value.fare_segment_ticket_type_id !== undefined &&
    value.fare_segment_ticket_type_id !== null;
  const hasDirectSegment = value.trip_segment_id !== undefined &&
    value.trip_segment_id !== null;
  const hasSegmentKey = value.segment_key !== undefined;
  const hasDirectStops = value.origin_trip_stop_id !== undefined ||
    value.destination_trip_stop_id !== undefined ||
    value.origin_stop_key !== undefined || value.destination_stop_key !== undefined;
  const isDirect = hasDirectSegment || hasSegmentKey || hasDirectStops ||
    value.ticket_type_id !== undefined;

  if (!hasLegacy && !isDirect) {
    return helpers.error("tripFare.sourceRequired");
  }
  if (isDirect && (value.ticket_type_id === undefined || value.ticket_type_id === null)) {
    return helpers.error("tripFare.ticketTypeRequired");
  }
  if (isDirect && !hasDirectSegment && !hasSegmentKey && !hasDirectStops) {
    return helpers.error("tripFare.segmentRequired");
  }

  return value;
}).messages({
  "tripFare.sourceRequired":
    "Cada tarifa debe indicar fare_segment_ticket_type_id o una referencia directa",
  "tripFare.ticketTypeRequired":
    "Cada tarifa directa debe indicar ticket_type_id",
  "tripFare.segmentRequired":
    "Cada tarifa directa debe indicar trip_segment_id, segment_key o las paradas del tramo",
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
  ticket_template_id: ticketTemplateIdSchema,
  ticketTemplateId: ticketTemplateIdSchema,
  trip_type: tripTypeSchema,
  tripType: tripTypeSchema,
  workers: Joi.array()
    .items(
      Joi.object({
        worker_id: Joi.number().required(),
      })
    )
    .optional(),
  tripStops: Joi.array()
    .items(tripStopSchema)
    .optional(),
  tripSegments: Joi.array().items(tripSegmentSchema).optional(),
  tripFareSegments: Joi.array().items(tripSegmentSchema).optional(),
  tripFares: Joi.array()
    .items(tripFareSchema)
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
  ticket_template_id: ticketTemplateIdSchema,
  ticketTemplateId: ticketTemplateIdSchema,
  trip_type: tripTypeSchema,
  tripType: tripTypeSchema,
  workers: Joi.array()
    .items(
      Joi.object({
        worker_id: Joi.number().required(),
      })
    )
    .optional(),
  tripStops: Joi.array()
    .items(tripStopSchema)
    .optional(),
  tripSegments: Joi.array().items(tripSegmentSchema).optional(),
  tripFareSegments: Joi.array().items(tripSegmentSchema).optional(),
  tripFares: Joi.array()
    .items(tripFareSchema)
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
  method: Joi.alternatives()
    .try(
      Joi.string().valid("Efectivo", "Credito", "Debito"),
      Joi.array()
        .items(Joi.string().valid("Efectivo", "Credito", "Debito"))
        .min(1)
    )
    .allow("", null)
    .optional()
    .messages({
      "alternatives.types": "El campo method debe ser un texto o un array de opciones válidas",
      "alternatives.match": "El campo method contiene opciones no válidas",
      "array.min": "El campo method debe contener al menos una opción",
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
