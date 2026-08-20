const { Sequelize, Op } = require("sequelize");
const {
  Trip,
  Branch,
  Vehicle,
  Route,
  Location,
  TripCodeSequence,
  TripWorker,
  TripStop,
  TripFare,
  RouteStop,
  FareSegment,
  FareSegmentTicketType,
  TicketType,
  TicketItem,
  Worker,
  Ticket,
  Structure,
  Company,
  sequelize,
} = require("../models");
const logger = require("../../config/logger"); // Logger para seguimiento

const formatTripDateCode = (tripDate) => {
  if (!tripDate) {
    return null;
  }

  const normalizedDate = typeof tripDate === "string"
    ? tripDate.slice(0, 10)
    : new Date(tripDate).toISOString().slice(0, 10);

  return normalizedDate.replace(/-/g, "");
};
const formatTripCode = (tripDate, sequence) =>
  `${formatTripDateCode(tripDate)}-${String(sequence).padStart(3, "0")}`;
const normalizeSaleMode = (value) => {
  if (value === undefined || value === null || value === "") {
    return "normal";
  }

  return String(value).trim().toLowerCase();
};
const reserveTripSequence = async (tripDate, transaction) => {
  await sequelize.query(
    `
      INSERT IGNORE INTO trip_code_sequences (trip_date, last_sequence, createdAt, updatedAt)
      VALUES (:trip_date, 0, NOW(), NOW())
    `,
    {
      replacements: {
        trip_date: tripDate,
      },
      transaction,
    }
  );

  const sequenceRow = await TripCodeSequence.findOne({
    where: {
      trip_date: tripDate,
    },
    transaction,
    lock: Sequelize.Transaction.LOCK.UPDATE,
  });

  if (!sequenceRow) {
    throw new Error("TripCodeSequenceNotFound");
  }

  const nextSequence = Number(sequenceRow.last_sequence || 0) + 1;
  await sequenceRow.update({ last_sequence: nextSequence }, { transaction });
  return nextSequence;
};

const tripFareInclude = [
  {
    model: TripFare,
    as: "tripFares",
    attributes: [
      "id",
      "company_id",
      "trip_id",
      "fare_segment_ticket_type_id",
      "base_price",
      "price",
      "active",
      "source_type",
    ],
    include: [
      {
        model: FareSegmentTicketType,
        as: "fareSegmentTicketType",
        attributes: ["id", "fare_segment_id", "ticket_type_id", "base_price", "active"],
        include: [
          {
            model: TicketType,
            as: "ticketType",
            attributes: ["id", "name", "description", "active"],
          },
          {
            model: FareSegment,
            as: "fareSegment",
            attributes: [
              "id",
              "company_id",
              "route_id",
              "origin_route_stop_id",
              "destination_route_stop_id",
              "base_price",
              "currency",
              "valid_from",
              "valid_to",
              "priority",
              "active",
            ],
            include: [
              {
                model: RouteStop,
                as: "originRouteStop",
                include: [
                  {
                    model: Location,
                    as: "location",
                    attributes: ["id", "address", "country", "city", "image", "active"],
                  },
                ],
              },
              {
                model: RouteStop,
                as: "destinationRouteStop",
                include: [
                  {
                    model: Location,
                    as: "location",
                    attributes: ["id", "address", "country", "city", "image", "active"],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

const tripStopDetailInclude = [
  {
    model: RouteStop,
    as: "routeStop",
    attributes: [
      "id",
      "company_id",
      "route_id",
      "location_id",
      "stop_order",
      "distance_km",
      "minutes_from_origin",
      "allows_boarding",
      "allows_alighting",
      "active",
    ],
    include: [
      {
        model: Location,
        as: "location",
        attributes: ["id", "address", "country", "city", "image", "active"],
      },
    ],
  },
];

const tripFareDetailInclude = [
  {
    model: FareSegmentTicketType,
    as: "fareSegmentTicketType",
    attributes: ["id", "fare_segment_id", "ticket_type_id", "base_price", "active"],
    include: [
      {
        model: TicketType,
        as: "ticketType",
        attributes: ["id", "name", "description", "active"],
      },
      {
        model: FareSegment,
        as: "fareSegment",
        attributes: [
          "id",
          "company_id",
          "route_id",
          "origin_route_stop_id",
          "destination_route_stop_id",
          "base_price",
          "currency",
          "valid_from",
          "valid_to",
          "priority",
          "active",
        ],
        include: [
          {
            model: RouteStop,
            as: "originRouteStop",
            include: [
              {
                model: Location,
                as: "location",
                attributes: ["id", "address", "country", "city", "image", "active"],
              },
            ],
          },
          {
            model: RouteStop,
            as: "destinationRouteStop",
            include: [
              {
                model: Location,
                as: "location",
                attributes: ["id", "address", "country", "city", "image", "active"],
              },
            ],
          },
        ],
      },
    ],
  },
];

const segmentTicketInclude = {
  model: Ticket,
  as: "tickets",
  attributes: [
    "id",
    "branch_id",
    "user_id",
    "trip_id",
    "fare_segment_id",
    "method",
    "status",
    "quantity",
    "price",
    "total",
    "seats",
    "date",
    "adults",
    "minors",
    "qr",
    "barcode",
    "qr_status",
    "sequenceNumber",
    "promotions",
    "tickettypes",
  ],
  required: false,
  include: [
    {
      model: FareSegment,
      as: "fareSegment",
      attributes: [
        "id",
        "company_id",
        "route_id",
        "origin_route_stop_id",
        "destination_route_stop_id",
        "service_class",
        "base_price",
        "currency",
        "valid_from",
        "valid_to",
        "priority",
        "active",
      ],
      include: [
        {
          model: RouteStop,
          as: "originRouteStop",
          include: [
            {
              model: Location,
              as: "location",
              attributes: ["id", "address", "country", "city", "image", "active"],
            },
          ],
        },
        {
          model: RouteStop,
          as: "destinationRouteStop",
          include: [
            {
              model: Location,
              as: "location",
              attributes: ["id", "address", "country", "city", "image", "active"],
            },
          ],
        },
      ],
    },
    {
      model: TicketItem,
      as: "ticketItems",
      attributes: [
        "id",
        "ticket_id",
        "ticket_type_id",
        "trip_fare_id",
        "ticket_type_name",
        "ticket_type_description",
        "quantity",
        "base_price",
        "unit_price",
        "subtotal",
        "currency",
        "active",
        "source_type",
      ],
      include: [
        {
          model: TicketType,
          as: "ticketType",
          attributes: ["id", "name", "description", "active"],
        },
        {
          model: TripFare,
          as: "tripFare",
          attributes: ["id", "company_id", "trip_id", "fare_segment_ticket_type_id", "base_price", "price", "active", "source_type"],
          include: tripFareDetailInclude,
        },
      ],
    },
  ],
};

const buildSegmentTripFareFilterInclude = (originLocationId, destinationLocationId, currentDate) => [
  {
    model: TripFare,
    as: "tripFares",
    attributes: ["id", "trip_id", "fare_segment_ticket_type_id"],
    required: true,
    where: { active: true },
    include: [
      {
        model: FareSegmentTicketType,
        as: "fareSegmentTicketType",
        attributes: ["id", "fare_segment_id", "ticket_type_id", "active"],
        required: true,
        where: { active: true },
        include: [
          {
            model: FareSegment,
            as: "fareSegment",
            attributes: ["id", "route_id", "origin_route_stop_id", "destination_route_stop_id", "active", "valid_from", "valid_to"],
            required: true,
            where: {
              active: true,
              [Op.and]: [
                {
                  [Op.or]: [
                    { valid_from: null },
                    { valid_from: { [Op.lte]: currentDate } },
                  ],
                },
                {
                  [Op.or]: [
                    { valid_to: null },
                    { valid_to: { [Op.gte]: currentDate } },
                  ],
                },
              ],
            },
            include: [
              {
                model: RouteStop,
                as: "originRouteStop",
                attributes: ["id", "location_id"],
                required: true,
                where: { location_id: originLocationId },
              },
              {
                model: RouteStop,
                as: "destinationRouteStop",
                attributes: ["id", "location_id"],
                required: true,
                where: { location_id: destinationLocationId },
              },
            ],
          },
        ],
      },
    ],
  },
];

const buildSegmentTripFareInclude = (originLocationId, destinationLocationId, currentDate) => [
  {
    model: TripFare,
    as: "tripFares",
    attributes: [
      "id",
      "company_id",
      "trip_id",
      "fare_segment_ticket_type_id",
      "base_price",
      "price",
      "active",
      "source_type",
    ],
    required: true,
    where: { active: true },
    include: [
      {
        model: FareSegmentTicketType,
        as: "fareSegmentTicketType",
        attributes: ["id", "fare_segment_id", "ticket_type_id", "base_price", "active"],
        required: true,
        where: { active: true },
        include: [
          {
            model: TicketType,
            as: "ticketType",
            attributes: ["id", "name", "description", "active"],
          },
          {
            model: FareSegment,
            as: "fareSegment",
            attributes: [
              "id",
              "company_id",
              "route_id",
              "origin_route_stop_id",
              "destination_route_stop_id",
              "base_price",
              "currency",
              "valid_from",
              "valid_to",
              "priority",
              "active",
            ],
            required: true,
            where: {
              active: true,
              [Op.and]: [
                {
                  [Op.or]: [
                    { valid_from: null },
                    { valid_from: { [Op.lte]: currentDate } },
                  ],
                },
                {
                  [Op.or]: [
                    { valid_to: null },
                    { valid_to: { [Op.gte]: currentDate } },
                  ],
                },
              ],
            },
            include: [
              {
                model: RouteStop,
                as: "originRouteStop",
                attributes: [
                  "id",
                  "company_id",
                  "route_id",
                  "location_id",
                  "stop_order",
                  "distance_km",
                  "minutes_from_origin",
                  "allows_boarding",
                  "allows_alighting",
                  "active",
                ],
                required: true,
                where: { location_id: originLocationId },
                include: [
                  {
                    model: Location,
                    as: "location",
                    attributes: ["id", "address", "country", "city", "image", "active"],
                  },
                ],
              },
              {
                model: RouteStop,
                as: "destinationRouteStop",
                attributes: [
                  "id",
                  "company_id",
                  "route_id",
                  "location_id",
                  "stop_order",
                  "distance_km",
                  "minutes_from_origin",
                  "allows_boarding",
                  "allows_alighting",
                  "active",
                ],
                required: true,
                where: { location_id: destinationLocationId },
                include: [
                  {
                    model: Location,
                    as: "location",
                    attributes: ["id", "address", "country", "city", "image", "active"],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

const TripRepository = {
  async findAll() {
    return await Trip.findAll({
      attributes: [
        "id",
        "code",
        "date",
        "schedule",
        "arrival",
        "start",
        "end",
        "branch_id",
        "vehicle_id",
        "route_id",
        "price",
        "saleMode",
        "trip_template_id",
      ],
      include: [
        {
          model: Branch,
          as: "branch",
          attributes: ["id", "name"],
        },
        {
          model: Vehicle,
          as: "vehicle",
          attributes: ["id", "plate", "internal_number", "seats", "image"],
          include: [
            {
              model: Structure,
              as: "structure",
            },
          ],
        },
        {
          model: Route,
          as: "route",
          attributes: ["id", "name"],
          include: [
            {
              model: Location, // Relación con el modelo de origen
              as: "origin",
              attributes: ["id", "address", "image"], // Atributos a incluir de la tabla de origen
            },
            {
              model: Location, // Relación con el modelo de destino
              as: "destination",
              attributes: ["id", "address", "image"], // Atributos a incluir de la tabla de destino
            },
          ],
        },
        ...tripFareInclude,
      ],
    });
  },

  async findDate(branchId, workerId = null, date = null, ticket_id = null) {
    const today = new Date();
    const formattedToday = today.toLocaleDateString('es-CL', {
        timeZone: 'America/Santiago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).split('-').reverse().join('-');
    const searchDate = date || formattedToday;
    // Construir el objeto `where` dinámicamente
    const whereClause = {
      branch_id: branchId, // Filtra por branch_id (siempre aplicado)
    };

    if (workerId) {
        whereClause[Op.or] = [
        // Viajes del día actual (fecha normal)
        { date: { [Op.eq]: searchDate } },
        
        // Viajes que:
        // 1) empezaron antes de hoy
        // 2) no han terminado (end es null)
        // 3) arrival coincide con searchDate (hoy)
        {
          [Op.and]: [
            { start: { [Op.lte]: today } },
            { end: { [Op.is]: null } },
            Sequelize.where(
              Sequelize.fn('DATE', Sequelize.col('arrival')),
              { [Op.eq]: searchDate }
            )
          ]
        }
      ];
    } else {
      // Si no hay workerId, solo filtramos por fecha
      whereClause.date = { [Op.eq]: searchDate };
    }
    return await Trip.findAll({
      attributes: [
        "id",
        "code",
        "date",
        "schedule",
        "arrival",
        "start",
        "end",
        "branch_id",
        "vehicle_id",
        "route_id",
        "price",
        "saleMode",
        "trip_template_id",
      ],
      where: whereClause, // Usar el objeto `where` construido dinámicamente
       order: [['date', 'ASC'], ['schedule', 'ASC']],
      include: [
        {
          model: Branch,
          as: "branch",
          attributes: ["id", "name"],
        },
        {
          model: Vehicle,
          as: "vehicle",
          attributes: ["id", "plate", "internal_number", "seats", "image"],
          include: [
            {
              model: Structure,
              as: "structure",
            },
          ],
        },
        {
          model: Route,
          as: "route",
          attributes: ["id", "name"],
          include: [
            {
              model: Location, // Relación con el modelo de origen
              as: "origin",
              attributes: ["id", "address", "image"], // Atributos a incluir de la tabla de origen
            },
            {
              model: Location, // Relación con el modelo de destino
              as: "destination",
              attributes: ["id", "address", "image"], // Atributos a incluir de la tabla de destino
            },
          ],
        },
        {
          model: Ticket,
          as: "tickets",
          attributes: ["id", "seats", "qr_status", "quantity", "fare_segment_id", "user_id", "status", "method", "date", "price", "total"],
          required: false,
          include: [
            {
              model: TicketItem,
              as: "ticketItems",
              attributes: [
                "id",
                "ticket_id",
                "ticket_type_id",
                "trip_fare_id",
                "ticket_type_name",
                "ticket_type_description",
                "quantity",
                "base_price",
                "unit_price",
                "subtotal",
                "currency",
                "active",
                "source_type",
              ],
              include: [
                {
                  model: TripFare,
                  as: "tripFare",
                  attributes: [
                    "id",
                    "company_id",
                    "trip_id",
                    "fare_segment_ticket_type_id",
                    "base_price",
                    "price",
                    "active",
                    "source_type",
                  ],
                  include: [
                    {
                      model: FareSegmentTicketType,
                      as: "fareSegmentTicketType",
                      attributes: ["id", "fare_segment_id", "ticket_type_id", "base_price", "active"],
                      include: [
                        {
                          model: FareSegment,
                          as: "fareSegment",
                          attributes: [
                            "id",
                            "company_id",
                            "route_id",
                            "origin_route_stop_id",
                            "destination_route_stop_id",
                            "base_price",
                            "currency",
                            "valid_from",
                            "valid_to",
                            "priority",
                            "active",
                          ],
                          include: [
                            {
                              model: RouteStop,
                              as: "originRouteStop",
                              include: [
                                {
                                  model: Location,
                                  as: "location",
                                  attributes: ["id", "address", "country", "city", "image", "active"],
                                },
                              ],
                            },
                            {
                              model: RouteStop,
                              as: "destinationRouteStop",
                              include: [
                                {
                                  model: Location,
                                  as: "location",
                                  attributes: ["id", "address", "country", "city", "image", "active"],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          model: TripStop,
          as: "tripStops",
          attributes: [
            "id",
            "company_id",
            "trip_id",
            "route_stop_id",
            "stop_order",
            "arrival_time",
            "departure_time",
            "can_board",
            "can_alight",
            "active",
            "source_type",
          ],
          include: [
            {
              model: RouteStop,
              as: "routeStop",
              attributes: [
                "id",
                "company_id",
                "route_id",
                "location_id",
                "stop_order",
                "distance_km",
                "minutes_from_origin",
                "allows_boarding",
                "allows_alighting",
                "active",
              ],
              include: [
                {
                  model: Location,
                  as: "location",
                  attributes: ["id", "address", "country", "city", "image", "active"],
                },
              ],
            },
          ],
        },
        {
          model: Worker, // Incluir los trabajadores relacionados
          as: "workers",
          attributes: ["id", "name"], // Atributos que deseas incluir de Worker
          through: { attributes: [] }, // Excluir atributos de la tabla intermedia (TripWorker)
          where: workerId ? { id: workerId } : {}, // Filtro por workerId (si se proporciona)
        },
        ...tripFareInclude,
      ],
    });
  },

  async findDateBySegment(branchId, originLocationId, destinationLocationId, currentDate, workerId = null) {
    const today = new Date();
    const formattedToday = today.toLocaleDateString('es-CL', {
      timeZone: 'America/Santiago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).split('-').reverse().join('-');
    const searchDate = currentDate || formattedToday;

    const whereClause = {
      branch_id: branchId,
      date: { [Op.eq]: searchDate },
    };

    if (workerId) {
      whereClause[Op.or] = [
        { date: { [Op.eq]: searchDate } },
        {
          [Op.and]: [
            { start: { [Op.lte]: today } },
            { end: { [Op.is]: null } },
            Sequelize.where(
              Sequelize.fn('DATE', Sequelize.col('arrival')),
              { [Op.eq]: searchDate }
            ),
          ],
        },
      ];
      delete whereClause.date;
    }

    return await Trip.findAll({
      attributes: [
        "id",
        "code",
        "date",
        "schedule",
        "arrival",
        "start",
        "end",
        "branch_id",
        "vehicle_id",
        "route_id",
        "price",
        "saleMode",
        "trip_template_id",
      ],
      where: whereClause,
      order: [['date', 'ASC'], ['schedule', 'ASC']],
      include: [
        {
          model: Branch,
          as: "branch",
          attributes: ["id", "name"],
        },
        {
          model: Vehicle,
          as: "vehicle",
          attributes: ["id", "plate", "internal_number", "seats", "image"],
          include: [
            {
              model: Structure,
              as: "structure",
            },
          ],
        },
        {
          model: Route,
          as: "route",
          attributes: ["id", "code", "name"],
          include: [
            {
              model: Location,
              as: "origin",
              attributes: ["id", "address", "image"],
            },
            {
              model: Location,
              as: "destination",
              attributes: ["id", "address", "image"],
            },
          ],
        },
        {
          model: Ticket,
          as: "tickets",
          attributes: ["id", "seats", "qr_status", "quantity", "fare_segment_id", "user_id", "status", "method", "date", "price", "total"],
          required: false,
          include: [
            {
              model: FareSegment,
              as: "fareSegment",
              attributes: ["id", "company_id", "route_id", "origin_route_stop_id", "destination_route_stop_id", "active"],
            },
            {
              model: TicketItem,
              as: "ticketItems",
              attributes: [
                "id",
                "ticket_id",
                "ticket_type_id",
                "trip_fare_id",
                "ticket_type_name",
                "ticket_type_description",
                "quantity",
                "base_price",
                "unit_price",
                "subtotal",
                "currency",
                "active",
                "source_type",
              ],
              include: [
                {
                  model: TripFare,
                  as: "tripFare",
                  attributes: [
                    "id",
                    "company_id",
                    "trip_id",
                    "fare_segment_ticket_type_id",
                    "base_price",
                    "price",
                    "active",
                    "source_type",
                  ],
                  include: [
                    {
                      model: FareSegmentTicketType,
                      as: "fareSegmentTicketType",
                      attributes: ["id", "fare_segment_id", "ticket_type_id", "base_price", "active"],
                      include: [
                        {
                          model: FareSegment,
                          as: "fareSegment",
                          attributes: ["id", "company_id", "route_id", "origin_route_stop_id", "destination_route_stop_id", "active"],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          model: TripStop,
          as: "tripStops",
          attributes: [
            "id",
            "company_id",
            "trip_id",
            "route_stop_id",
            "stop_order",
            "arrival_time",
            "departure_time",
            "can_board",
            "can_alight",
            "active",
            "source_type",
          ],
          include: [
            {
              model: RouteStop,
              as: "routeStop",
              attributes: [
                "id",
                "company_id",
                "route_id",
                "location_id",
                "stop_order",
                "distance_km",
                "minutes_from_origin",
                "allows_boarding",
                "allows_alighting",
                "active",
              ],
              include: [
                {
                  model: Location,
                  as: "location",
                  attributes: ["id", "address", "country", "city", "image", "active"],
                },
              ],
            },
          ],
        },
        ...buildSegmentTripFareInclude(originLocationId, destinationLocationId, searchDate),
      ],
    });
  },

  async findDateForBranchDate(branchId, date = null) {
    const today = new Date();
    const formattedToday = today.toLocaleDateString('es-CL', {
      timeZone: 'America/Santiago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).split('-').reverse().join('-');
    const searchDate = date || formattedToday;

    return await Trip.findAll({
      attributes: [
        "id",
        "code",
        "date",
        "schedule",
        "arrival",
        "start",
        "end",
        "branch_id",
        "vehicle_id",
        "route_id",
        "price",
        "saleMode",
        "trip_template_id",
      ],
      where: {
        branch_id: branchId,
        date: { [Op.eq]: searchDate },
      },
      order: [['date', 'ASC'], ['schedule', 'ASC']],
      include: [
        {
          model: Branch,
          as: "branch",
          attributes: ["id", "name"],
        },
        {
          model: Vehicle,
          as: "vehicle",
          attributes: ["id", "plate", "internal_number", "seats", "image"],
          include: [
            {
              model: Structure,
              as: "structure",
            },
          ],
        },
        {
          model: Route,
          as: "route",
          attributes: ["id", "code", "name"],
          include: [
            {
              model: Location,
              as: "origin",
              attributes: ["id", "address", "image"],
            },
            {
              model: Location,
              as: "destination",
              attributes: ["id", "address", "image"],
            },
          ],
        },
        {
          model: TripStop,
          as: "tripStops",
          attributes: [
            "id",
            "company_id",
            "trip_id",
            "route_stop_id",
            "stop_order",
            "arrival_time",
            "departure_time",
            "can_board",
            "can_alight",
            "active",
            "source_type",
          ],
          include: [
            {
              model: RouteStop,
              as: "routeStop",
              attributes: [
                "id",
                "company_id",
                "route_id",
                "location_id",
                "stop_order",
                "distance_km",
                "minutes_from_origin",
                "allows_boarding",
                "allows_alighting",
                "active",
              ],
              include: [
                {
                  model: Location,
                  as: "location",
                  attributes: ["id", "address", "country", "city", "image", "active"],
                },
              ],
            },
          ],
        },
        ...tripFareInclude,
      ],
    });
  },

  async findDateForBranchDateBase(branchId, date = null) {
    const today = new Date();
    const formattedToday = today.toLocaleDateString('es-CL', {
      timeZone: 'America/Santiago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).split('-').reverse().join('-');
    const searchDate = date || formattedToday;

    return await Trip.findAll({
      attributes: [
        "id",
        "code",
        "date",
        "schedule",
        "arrival",
        "start",
        "end",
        "branch_id",
        "vehicle_id",
        "route_id",
        "price",
        "saleMode",
        "trip_template_id",
      ],
      where: {
        branch_id: branchId,
        date: { [Op.eq]: searchDate },
      },
      order: [['date', 'ASC'], ['schedule', 'ASC']],
      include: [
        {
          model: Branch,
          as: "branch",
          attributes: ["id", "name"],
        },
        {
          model: Vehicle,
          as: "vehicle",
          attributes: ["id", "plate", "internal_number", "seats", "image"],
          include: [
            {
              model: Structure,
              as: "structure",
            },
          ],
        },
        {
          model: Route,
          as: "route",
          attributes: ["id", "code", "name"],
          include: [
            {
              model: Location,
              as: "origin",
              attributes: ["id", "address", "image"],
            },
            {
              model: Location,
              as: "destination",
              attributes: ["id", "address", "image"],
            },
          ],
        },
      ],
    });
  },

  async getTripStopsByTripIds(tripIds) {
    const normalizedTripIds = Array.from(
      new Set(
        (Array.isArray(tripIds) ? tripIds : [])
          .map((tripId) => Number(tripId))
          .filter((tripId) => Number.isFinite(tripId) && tripId > 0)
      )
    );

    if (normalizedTripIds.length === 0) {
      return new Map();
    }

    const tripStops = await TripStop.findAll({
      where: {
        trip_id: { [Op.in]: normalizedTripIds },
      },
      attributes: [
        "id",
        "company_id",
        "trip_id",
        "route_stop_id",
        "stop_order",
        "arrival_time",
        "departure_time",
        "can_board",
        "can_alight",
        "active",
        "source_type",
      ],
      include: tripStopDetailInclude,
      order: [
        ["trip_id", "ASC"],
        ["stop_order", "ASC"],
        ["id", "ASC"],
      ],
    });

    const tripStopsByTripId = new Map(
      normalizedTripIds.map((tripId) => [tripId, []])
    );

    for (const tripStop of tripStops) {
      const tripId = Number(tripStop.trip_id);
      if (!tripStopsByTripId.has(tripId)) {
        tripStopsByTripId.set(tripId, []);
      }

      tripStopsByTripId.get(tripId).push(tripStop);
    }

    return tripStopsByTripId;
  },

  async getTripFaresByTripIds(tripIds) {
    const normalizedTripIds = Array.from(
      new Set(
        (Array.isArray(tripIds) ? tripIds : [])
          .map((tripId) => Number(tripId))
          .filter((tripId) => Number.isFinite(tripId) && tripId > 0)
      )
    );

    if (normalizedTripIds.length === 0) {
      return new Map();
    }

    const tripFares = await TripFare.findAll({
      where: {
        trip_id: { [Op.in]: normalizedTripIds },
      },
      attributes: [
        "id",
        "company_id",
        "trip_id",
        "fare_segment_ticket_type_id",
        "base_price",
        "price",
        "active",
        "source_type",
      ],
      include: tripFareDetailInclude,
      order: [
        ["trip_id", "ASC"],
        ["id", "ASC"],
      ],
    });

    const tripFaresByTripId = new Map(
      normalizedTripIds.map((tripId) => [tripId, []])
    );

    for (const tripFare of tripFares) {
      const tripId = Number(tripFare.trip_id);
      if (!tripFaresByTripId.has(tripId)) {
        tripFaresByTripId.set(tripId, []);
      }

      tripFaresByTripId.get(tripId).push(tripFare);
    }

    return tripFaresByTripId;
  },

  async findDateBySegmentBase(branchId, originLocationId, destinationLocationId, currentDate, workerId = null, options = {}) {
    const today = new Date();
    const formattedToday = today.toLocaleDateString('es-CL', {
      timeZone: 'America/Santiago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).split('-').reverse().join('-');
    const searchDate = currentDate || formattedToday;

    const whereClause = {
      branch_id: branchId,
      date: { [Op.eq]: searchDate },
    };

    if (workerId) {
      whereClause[Op.or] = [
        { date: { [Op.eq]: searchDate } },
        {
          [Op.and]: [
            { start: { [Op.lte]: today } },
            { end: { [Op.is]: null } },
            Sequelize.where(
              Sequelize.fn('DATE', Sequelize.col('arrival')),
              { [Op.eq]: searchDate }
            ),
          ],
        },
      ];
      delete whereClause.date;
    }

    const include = [
      {
        model: Branch,
        as: "branch",
        attributes: ["id", "name"],
      },
      {
        model: Vehicle,
        as: "vehicle",
        attributes: ["id", "plate", "internal_number", "seats", "image"],
        include: [
          {
            model: Structure,
            as: "structure",
          },
        ],
      },
      {
        model: Route,
        as: "route",
        attributes: ["id", "code", "name"],
        include: [
          {
            model: Location,
            as: "origin",
            attributes: ["id", "address", "image"],
          },
          {
            model: Location,
            as: "destination",
            attributes: ["id", "address", "image"],
          },
        ],
      },
      ...buildSegmentTripFareFilterInclude(originLocationId, destinationLocationId, searchDate),
    ];

    if (options.includeTickets) {
      include.push(segmentTicketInclude);
    }

    return await Trip.findAll({
      attributes: [
        "id",
        "code",
        "date",
        "schedule",
        "arrival",
        "start",
        "end",
        "branch_id",
        "vehicle_id",
        "route_id",
        "price",
        "saleMode",
        "trip_template_id",
      ],
      where: whereClause,
      order: [['date', 'ASC'], ['schedule', 'ASC']],
      include,
    });
  },

  async getSegmentTripFaresByTripIds(tripIds, originLocationId, destinationLocationId, currentDate) {
    const normalizedTripIds = Array.from(
      new Set(
        (Array.isArray(tripIds) ? tripIds : [])
          .map((tripId) => Number(tripId))
          .filter((tripId) => Number.isFinite(tripId) && tripId > 0)
      )
    );

    if (normalizedTripIds.length === 0) {
      return new Map();
    }

    const trips = await Trip.findAll({
      attributes: ["id"],
      where: {
        id: { [Op.in]: normalizedTripIds },
      },
      include: buildSegmentTripFareInclude(originLocationId, destinationLocationId, currentDate),
      order: [["id", "ASC"]],
    });

    const faresByTripId = new Map(
      normalizedTripIds.map((tripId) => [tripId, []])
    );

    for (const trip of trips) {
      const tripId = Number(trip.id);
      if (!faresByTripId.has(tripId)) {
        faresByTripId.set(tripId, []);
      }

      faresByTripId.get(tripId).push(...(Array.isArray(trip.tripFares) ? trip.tripFares : []));
    }

    return faresByTripId;
  },

  async findDateWeb(branchId, workerId = null, date = null, ticket_id = null) {
  // Zona horaria fija para Chile
  const timeZone = 'America/Santiago';

  // Función auxiliar para formatear fecha en 'YYYY-MM-DD' en la zona horaria dada
  const formatDate = (d) => {
    return new Date(d).toLocaleDateString('sv-SE', { timeZone }); // 'sv-SE' da YYYY-MM-DD
  };

  const today = new Date();
  const startDate = formatDate(today);
  const endDate = formatDate(new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)); // +30 días
  // Si se pasa una fecha específica, usamos solo esa (como antes)
  const useRange = !date;
  const searchDate = date || startDate;

  const whereClause = {
    branch_id: branchId,
  };

  if (workerId) {
    if (useRange) {
      // Rango de fechas + lógica de viajes activos
      whereClause[Op.or] = [
        // Viajes programados en el rango de fechas
        {
          date: {
            [Op.gte]: startDate,
            [Op.lte]: endDate,
          },
        },
        // Viajes activos (sin end) cuyo arrival está en el rango
        {
          [Op.and]: [
            { start: { [Op.lte]: new Date(endDate) } }, // start <= fin del rango
            { end: { [Op.is]: null } },
            Sequelize.where(
              Sequelize.fn('DATE', Sequelize.col('arrival')),
              {
                [Op.gte]: startDate,
                [Op.lte]: endDate,
              }
            ),
          ],
        },
      ];
    } else {
      // Comportamiento original si se pasa una fecha específica
      whereClause[Op.or] = [
        { date: { [Op.eq]: searchDate } },
        {
          [Op.and]: [
            { start: { [Op.lte]: today } },
            { end: { [Op.is]: null } },
            Sequelize.where(
              Sequelize.fn('DATE', Sequelize.col('arrival')),
              { [Op.eq]: searchDate }
            ),
          ],
        },
      ];
    }
  } else {
    // Sin workerId: solo viajes con campo `date` en el rango
    if (useRange) {
      whereClause.date = {
        [Op.gte]: startDate,
        [Op.lte]: endDate,
      };
    } else {
      whereClause.date = { [Op.eq]: searchDate };
    }
  }

    return await Trip.findAll({
      attributes: [
        "id",
        "code",
        "date",
        "schedule",
      "arrival",
      "start",
      "end",
      "branch_id",
      "vehicle_id",
      "route_id",
      "price",
      "saleMode",
      "trip_template_id",
    ],
    where: whereClause,
    order: [['date', 'ASC'], ['schedule', 'ASC']],
    include: [
      {
        model: Branch,
        as: "branch",
        attributes: ["id", "name"],
      },
      {
        model: Vehicle,
        as: "vehicle",
        attributes: ["id", "plate", "internal_number", "seats", "image"],
        include: [
          {
            model: Structure,
            as: "structure",
          },
        ],
      },
      {
        model: Route,
        as: "route",
        attributes: ["id", "name"],
        include: [
          {
            model: Location,
            as: "origin",
            attributes: ["id", "address", "image"],
          },
          {
            model: Location,
            as: "destination",
            attributes: ["id", "address", "image"],
          },
        ],
      },
      {
        model: Ticket,
        as: "tickets",
        attributes: ["id", "seats", "qr_status", "quantity"],
      },
      {
        model: Worker,
        as: "workers",
        attributes: ["id", "name"],
        through: { attributes: [] },
        where: workerId ? { id: workerId } : {},
      },
    ],
  });
},

  async findById(id) {
    return await Trip.findByPk(id, {
      attributes: [
        "id",
        "code",
        "date",
        "schedule",
        "arrival",
        "start",
        "end",
        "branch_id",
        "vehicle_id",
        "route_id",
        "price",
        "saleMode",
        "trip_template_id",
      ],
      include: [
        {
          model: Branch,
          as: "branch",
          attributes: ["id", "name"],
        },
        {
          model: Vehicle,
          as: "vehicle",
          attributes: ["id", "plate", "internal_number", "image"],
          include: [
            {
              model: Structure,
              as: "structure",
            },
          ],
        },
        {
          model: Route,
          as: "route",
          attributes: ["id", "code", "name"],
          include: [
            {
              model: Location, // Relación con el modelo de origen
              as: "origin",
              attributes: ["id", "address", "image"], // Atributos a incluir de la tabla de origen
            },
            {
              model: Location, // Relación con el modelo de destino
              as: "destination",
              attributes: ["id", "address", "image"], // Atributos a incluir de la tabla de destino
            },
          ],
        },
      ],
    });
  },

  async findByIdWithTickets(id, options = {}) {
    return await Trip.findByPk(id, {
      attributes: [
        "id",
        "code",
        "date",
        "schedule",
        "arrival",
        "start",
        "end",
        "branch_id",
        "vehicle_id",
        "route_id",
        "price",
        "saleMode",
        "trip_template_id",
      ],
      include: [
        {
          model: Branch,
          as: "branch",
          attributes: ["id", "name"],
        },
        {
          model: Vehicle,
          as: "vehicle",
          attributes: ["id", "plate", "internal_number", "seats", "image"],
          include: [
            {
              model: Structure,
              as: "structure",
            },
          ],
        },
        {
          model: Route,
          as: "route",
          attributes: ["id", "code", "name"],
          include: [
            {
              model: Location,
              as: "origin",
              attributes: ["id", "address", "image"],
            },
            {
              model: Location,
              as: "destination",
              attributes: ["id", "address", "image"],
            },
          ],
        },
        {
          model: TripStop,
          as: "tripStops",
          attributes: [
            "id",
            "company_id",
            "trip_id",
            "route_stop_id",
            "stop_order",
            "arrival_time",
            "departure_time",
            "can_board",
            "can_alight",
            "active",
            "source_type",
          ],
          include: [
            {
              model: RouteStop,
              as: "routeStop",
              attributes: [
                "id",
                "company_id",
                "route_id",
                "location_id",
                "stop_order",
                "distance_km",
                "minutes_from_origin",
                "allows_boarding",
                "allows_alighting",
                "active",
              ],
              include: [
                {
                  model: Location,
                  as: "location",
                  attributes: ["id", "address", "country", "city", "image", "active"],
                },
              ],
            },
          ],
        },
        {
          model: Ticket,
          as: "tickets",
          attributes: ["id", "seats", "quantity"],
        },
        ...tripFareInclude,
      ],
      ...options,
    });
  },

  async create(body, options = {}) {
    //logger.info("Creando viaje...");
    //logger.info(body);
    const {
      date,
      schedule,
      arrival,
      start,
      end,
      branch_id,
      vehicle_id,
      route_id,
      price,
      trip_template_id,
    } = body;
    const saleMode = normalizeSaleMode(body.saleMode ?? body.sale_mode);

    const transaction = options.transaction || await sequelize.transaction();
    const ownsTransaction = !options.transaction;

    try {
      const trip = await Trip.create({
        date,
        schedule,
        arrival,
        start,
        end,
        branch_id,
        vehicle_id,
        route_id,
        price: price ?? null,
        saleMode,
        trip_template_id: trip_template_id ?? null,
      }, { ...options, transaction });

      const sequence = await reserveTripSequence(date, transaction);
      const tripCode = formatTripCode(date, sequence);

      await trip.update({ code: tripCode }, { transaction });

      logger.info(`Viaje creado exitosamente (ID: ${trip.id})`);
      if (ownsTransaction) {
        await transaction.commit();
      }
      return trip;
    } catch (error) {
      if (ownsTransaction && transaction && !transaction.finished) {
        await transaction.rollback();
      }
      logger.error(`Error creando el viaje: ${error.message}`);
      throw new Error("Error creando el viaje");
    }
  },

  async update(trip, body, options = {}) {
    const fieldsToUpdate = [
      "date",
      "schedule",
      "arrival",
      "start",
      "end",
      "branch_id",
      "vehicle_id",
      "route_id",
      "price",
      "saleMode",
      "trip_template_id",
    ];

    const normalizedBody = { ...body };
    if (Object.prototype.hasOwnProperty.call(body, "sale_mode")) {
      normalizedBody.saleMode = normalizeSaleMode(body.saleMode ?? body.sale_mode);
      delete normalizedBody.sale_mode;
    } else if (Object.prototype.hasOwnProperty.call(body, "saleMode")) {
      normalizedBody.saleMode = normalizeSaleMode(body.saleMode);
    }

    const updatedData = Object.keys(normalizedBody)
      .filter((key) => fieldsToUpdate.includes(key) && normalizedBody[key] !== undefined)
      .reduce((obj, key) => {
        obj[key] = normalizedBody[key];
        return obj;
      }, {});

    if (Object.keys(updatedData).length > 0) {
      try {
        await trip.update(updatedData, options);
        logger.info(`Viaje actualizado exitosamente (ID: ${trip.id})`);
      } catch (error) {
        logger.error(`Error actualizando el viaje: ${error.message}`);
        throw new Error("Error actualizando el viaje");
      }
    }

    return trip;
  },

  async delete(trip) {
    try {
      await trip.destroy();
      logger.info(`Viaje eliminado exitosamente (ID: ${trip.id})`);
    } catch (error) {
      logger.error(`Error eliminando el viaje: ${error.message}`);
      throw new Error("Error eliminando el viaje");
    }
  },

  /*async existsByUpdatedFields(trip, updatedFields) {
    const whereClause = {};

    // Solo verificamos campos que son diferentes a los originales
    if (updatedFields.date !== undefined && updatedFields.date !== trip.date) {
        whereClause.date = updatedFields.date;
    }
    if (updatedFields.schedule !== undefined && updatedFields.schedule !== trip.schedule) {
        whereClause.schedule = updatedFields.schedule;
    }
    if (updatedFields.branch_id !== undefined && updatedFields.branch_id !== trip.branch_id) {
        whereClause.branch_id = updatedFields.branch_id;
    }
    if (updatedFields.vehicle_id !== undefined && updatedFields.vehicle_id !== trip.vehicle_id) {
        whereClause.vehicle_id = updatedFields.vehicle_id;
    }
    if (updatedFields.route_id !== undefined && updatedFields.route_id !== trip.route_id) {
        whereClause.route_id = updatedFields.route_id;
    }

    // Si hay campos modificados, buscamos si ya existe otro viaje con esos valores
    if (Object.keys(whereClause).length > 0) {
        whereClause.id = { [Op.ne]: trip.id }; // Excluir el viaje actual

        const existingTrip = await Trip.findOne({ where: whereClause });
        return existingTrip; // Si existe, significa que hay un duplicado
    }

    return null; // No hay cambios relevantes, no hay duplicado
},*/
async existsByUpdatedFields(trip, updatedFields) {
    const whereClause = {};

    // Solo verificamos campos que son diferentes a los originales
    if (updatedFields.date !== undefined && updatedFields.date !== trip.date) {
        whereClause.date = updatedFields.date;
    } else {
        whereClause.date = trip.date; // Mantener el valor original si no cambia
    }
    
    if (updatedFields.schedule !== undefined && updatedFields.schedule !== trip.schedule) {
        whereClause.schedule = updatedFields.schedule;
    } else {
        whereClause.schedule = trip.schedule; // Mantener el valor original si no cambia
    }
    
    if (updatedFields.branch_id !== undefined && updatedFields.branch_id !== trip.branch_id) {
        whereClause.branch_id = updatedFields.branch_id;
    } else {
        whereClause.branch_id = trip.branch_id; // Mantener el valor original si no cambia
    }
    
    if (updatedFields.vehicle_id !== undefined && updatedFields.vehicle_id !== trip.vehicle_id) {
        whereClause.vehicle_id = updatedFields.vehicle_id;
    } else {
        whereClause.vehicle_id = trip.vehicle_id; // Mantener el valor original si no cambia
    }
    
    if (updatedFields.route_id !== undefined && updatedFields.route_id !== trip.route_id) {
        whereClause.route_id = updatedFields.route_id;
    } else {
        whereClause.route_id = trip.route_id; // Mantener el valor original si no cambia
    }

    // Siempre excluir el viaje actual
    whereClause.id = { [Op.ne]: trip.id };

    const existingTrip = await Trip.findOne({ where: whereClause });
    return existingTrip;
},
  async updateTripWorkers(trip, body) {
    try {
      let { id: trip_id, branch_id, date, workers } = body; // Extraer los datos necesarios del body
      if (!date) {
        date = trip.date;
      }
      if (!branch_id) {
        branch_id = trip.branch_id;
      }
      // Obtener las relaciones actuales con sus IDs y worker_id
      const currentWorkers = await TripWorker.findAll({
        where: { trip_id, branch_id, date },
        attributes: ["id", "worker_id"], // Incluye el ID de la relación
      });

      // Crear un mapa: { worker_id: id }
      const currentWorkerMap = currentWorkers.reduce((map, worker) => {
        map[worker.worker_id] = worker.id; // Relacionar worker_id con el ID de la relación
        return map;
      }, {});

      // Obtener los IDs de los trabajadores del array recibido
      const newWorkerIds = workers.map((worker) => worker.worker_id);

      // Determinar los `worker_id` a eliminar (presentes en la base de datos, pero no en el array recibido)
      const workersToRemove = Object.keys(currentWorkerMap)
        .filter((worker_id) => !newWorkerIds.includes(parseInt(worker_id)))
        .map((worker_id) => currentWorkerMap[worker_id]); // Obtener el ID de la relación

      // Determinar los `worker_id` a agregar (presentes en el array recibido, pero no en la base de datos)
      const workersToAdd = newWorkerIds.filter(
        (worker_id) => !currentWorkerMap[worker_id]
      );

      // Eliminar relaciones obsoletas por ID
      if (workersToRemove.length > 0) {
        await TripWorker.destroy({
          where: {
            id: workersToRemove, // Elimina por ID directamente
          },
        });
      }

      // Agregar nuevas relaciones
      if (workersToAdd.length > 0) {
        const newRelations = workersToAdd.map((worker_id) => ({
          trip_id,
          branch_id,
          date,
          worker_id,
        }));
        await TripWorker.bulkCreate(newRelations);
      }

      logger.info("Trip workers actualizado correctamente.");
    } catch (error) {
      logger.error("Error actualizando trip workers:", error);
    }
  },

  async getTripsDate(type, id, date, endDate) {
    try {
      const whereClause = {};
      if (endDate && endDate.trim() !== "") {
        whereClause.date = {
          [Op.between]: [date, endDate], // Rango de fechas (inclusive)
        };
      } else {
        // Filtrar por una sola fecha si no se proporciona endDate
        whereClause.date = date;
      }

      if (type === "Company") {
        whereClause["$branch.company_id$"] = id;
      } else if (type === "Sucursal") {
        whereClause.branch_id = id;
      }

      const trips = await Trip.findAll({
        attributes: [
          "id",
          "code",
          "date",
          "schedule",
          "arrival",
          "start",
          "end",
          "branch_id",
          "vehicle_id",
          "route_id",
          "price",
          "saleMode",
          "trip_template_id",
        ],
        where: whereClause,
        include: [
          {
            model: Branch,
            as: "branch",
            include: [
              {
                model: Company,
                as: "company",
              },
            ],
          },
          {
            model: Ticket,
            as: "tickets",
          },
          {
            model: Vehicle,
            as: "vehicle",
            attributes: ["id", "plate", "internal_number", "image"],
          },
          {
            model: Route,
            as: "route",
            attributes: ["id", "code", "name"],
            include: [
              {
                model: Location, // Relación con el modelo de origen
                as: "origin",
                attributes: ["id", "address", "image"], // Atributos a incluir de la tabla de origen
              },
              {
                model: Location, // Relación con el modelo de destino
                as: "destination",
                attributes: ["id", "address", "image"], // Atributos a incluir de la tabla de destino
              },
            ],
          },
        ],
      });

      return trips;
    } catch (error) {
      logger.error("Error al obtener los viajes y tickets:", error);
      throw error; // Re-lanzar el error para que pueda ser manejado en el nivel superior
    }
  },

  async getTripsDateWorker(branchId, date, endDate, workerId) {
    try {
      const now = new Date();
      const todayChile = now.toLocaleDateString("es-CL", {
        timeZone: "America/Santiago",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).split("-").reverse().join("-");
      const searchDate = date || todayChile;
      const whereClause = {
        branch_id: branchId, // Siempre filtramos por branch_id
      };

      whereClause[Op.or] = [
        { start: { [Op.is]: null } },
        {
          [Op.and]: [
            { start: { [Op.not]: null } },
            { end: { [Op.is]: null } }
          ]
        }
      ];

      if (endDate && endDate.trim() !== "") {
        whereClause[Op.and] = whereClause[Op.and] || [];
        whereClause[Op.and].push({
          date: {
            [Op.between]: [searchDate, endDate],
          }
        });
      } else {
        whereClause[Op.and] = whereClause[Op.and] || [];
        whereClause[Op.and].push({ date: searchDate });
      }

      const trips = await Trip.findAll({
        attributes: [
          "id",
          "code",
          "date",
          "schedule",
          "arrival",
          "start",
          "end",
          "branch_id",
          "vehicle_id",
          "route_id",
          "price",
          "saleMode",
          "trip_template_id",
        ],
        where: whereClause,
        include: [
          {
            model: Ticket,
            as: "tickets",
            attributes: ["quantity", "total", "user_id", "qr_status"],
            required: false,
          },
          {
            model: Vehicle,
            as: "vehicle",
            attributes: ["id", "plate", "internal_number", "image", "seats"],
          },
          {
            model: Route,
            as: "route",
            attributes: ["id", "code", "name"],
            include: [
              {
                model: Location,
                as: "origin",
                attributes: ["id", "address", "image"],
              },
              {
                model: Location,
                as: "destination",
                attributes: ["id", "address", "image"],
              },
            ],
          },
          {
            model: TripWorker,
            as: "tripworkers",
            where: { worker_id: workerId },
            required: true,
          },
        ],
        order: [
          ['date', 'ASC'],
          ['schedule', 'ASC']
        ],
      });

      return trips;
    } catch (error) {
      logger.error("Error al obtener los viajes y tickets:", error);
      throw error;
    }
  },

  async findTripsByBranchAndWorker(branchId, date, endDate, userId) {
    // Obtener fecha actual en zona horaria de Chile (America/Santiago)
    const now = new Date();
    const todayChile = now.toLocaleDateString('es-CL', {
      timeZone: 'America/Santiago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).split('-').reverse().join('-'); // Formato: YYYY-MM-DD

    // Si no se proporciona date, usar la fecha actual de Chile
    const searchDate = date || todayChile;

    const whereClause = {
      branch_id: branchId, // Siempre filtramos por branch_id
    };

    // Construir la cláusula WHERE para incluir solo viajes activos/pendientes:
    // 1. Viajes que NO han iniciado (start IS NULL) - sin importar la fecha
    // 2. Viajes que han iniciado pero NO han finalizado (start IS NOT NULL AND end IS NULL) - sin importar la fecha
    // EXCLUIR: Viajes que ya finalizaron (end IS NOT NULL)
    whereClause[Op.or] = [
      // Caso 1: Viajes que aún no han iniciado
      { start: { [Op.is]: null } },
      // Caso 2: Viajes que iniciaron pero no han finalizado
      {
        [Op.and]: [
          { start: { [Op.not]: null } },
          { end: { [Op.is]: null } }
        ]
      }
    ];

    // Si se proporciona endDate, filtramos también por rango de fechas
    // Esto limita la búsqueda a un rango específico de dates
    delete whereClause[Op.or];

    if (endDate && endDate.trim() !== "") {
      // Agregamos la condición de fecha al filtro con AND
      whereClause[Op.and] = whereClause[Op.and] || [];
      whereClause[Op.and].push({
        date: {
          [Op.between]: [searchDate, endDate],
        }
      });
    } else {
      // Si no hay endDate, filtramos por la fecha de búsqueda (date o todayChile)
      whereClause[Op.and] = whereClause[Op.and] || [];
      whereClause[Op.and].push({ date: searchDate });
    }

    return await Trip.findAll({
      attributes: [
        "id",
        "code",
        "date",
        "schedule",
        "arrival",
        "start",
        "end",
        "branch_id",
        "vehicle_id",
        "route_id",
        "price",
        "saleMode",
        "trip_template_id",
      ],
      include: [
        {
          model: Ticket,
          as: "tickets",
          attributes: ["quantity", "total", "user_id"], // Necesario para calcular pasajeros y monto por viaje
          where: { user_id: userId },
          required: true,
        },
        {
          model: Vehicle,
          as: "vehicle",
          attributes: ["id", "plate", "internal_number", "image"],
        },
        {
          model: Route,
          as: "route",
          attributes: ["id", "code", "name"],
          include: [
            {
              model: Location, // Relación con el modelo de origen
              as: "origin",
              attributes: ["id", "address", "image"], // Atributos a incluir de la tabla de origen
            },
            {
              model: Location, // Relación con el modelo de destino
              as: "destination",
              attributes: ["id", "address", "image"], // Atributos a incluir de la tabla de destino
            },
          ],
        },
      ],
      where: whereClause,
      order: [
        ['date', 'ASC'],      // Primero ordenar por fecha (viajes de otros días primero)
        ['schedule', 'ASC']   // Luego por horario de salida
      ],
    });
  },

  async getPendingTripsWithDetails({ date = null, currentTime = null, branchId = null, branchIds = null, limit = 5 } = {}) {
    try {
      const whereClause = {
        [Op.or]: [
          { start: { [Op.is]: null } },
          {
            [Op.and]: [{ start: { [Op.not]: null } }, { end: { [Op.is]: null } }],
          },
        ],
      };

      if (date) {
        whereClause[Op.and] = [
          sequelize.where(sequelize.fn("DATE", sequelize.col("Trip.date")), date)
        ];
      }

      if (currentTime) {
        whereClause[Op.and] = whereClause[Op.and] || [];
        whereClause[Op.and].push({
          schedule: { [Op.gte]: currentTime },
        });
      }

      if (branchId) {
        whereClause.branch_id = branchId;
      } else if (Array.isArray(branchIds) && branchIds.length > 0) {
        whereClause.branch_id = { [Op.in]: branchIds };
      }

      return await Trip.findAll({
        attributes: [
          "id",
          "code",
          "date",
          "schedule",
          "arrival",
          "start",
          "end",
          "branch_id",
          "vehicle_id",
          "route_id",
          "price",
          "saleMode",
          "trip_template_id",
        ],
        where: whereClause,
        order: [["date", "ASC"], ["schedule", "ASC"], ["id", "ASC"]],
        limit,
        include: [
          {
            model: Branch,
            as: "branch",
            attributes: ["id", "name", "company_id"],
            include: [
              {
                model: Company,
                as: "company",
                attributes: ["id", "name"],
              },
            ],
          },
          {
            model: Vehicle,
            as: "vehicle",
            attributes: ["id", "plate", "internal_number", "seats", "image", "brand"],
          },
          {
            model: Route,
            as: "route",
            attributes: ["id", "code", "name", "estimated"],
            include: [
              {
                model: Location,
                as: "origin",
                attributes: ["id", "address", "image"],
              },
              {
                model: Location,
                as: "destination",
                attributes: ["id", "address", "image"],
              },
            ],
          },
          {
            model: Ticket,
            as: "tickets",
            attributes: ["id", "quantity", "total"],
            required: false,
          },
        ],
      });
    } catch (error) {
      logger.error("Error al obtener los viajes pendientes:", error);
      throw error;
    }
  },
};

module.exports = TripRepository;


