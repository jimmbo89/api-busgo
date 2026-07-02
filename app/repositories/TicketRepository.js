const { Sequelize, Op } = require("sequelize");
const QRCode = require("qrcode");
const bwipjs = require("bwip-js");
const fs = require("fs");
const crypto = require("crypto");
const {
  Ticket,
  TicketItem,
  TicketType,
  TripFare,
  FareSegmentTicketType,
  TripStop,
  Branch,
  User,
  Trip,
  Location,
  Route,
  RouteStop,
  FareSegment,
  Vehicle,
  Company,
  Worker,
  TripWorker,
  sequelize,
} = require("../models");
const ImageService = require("../services/ImageService");
const logger = require("../../config/logger"); // Logger para seguimiento

const fareSegmentTicketInclude = [
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
];

const ticketItemInclude = [
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
    ],
  },
];

const extractTicketFareSegments = (ticket, fareSegmentMap = new Map()) => {
  const segments = [];
  const seenIds = new Set();

  const pushSegment = (segment) => {
    if (!segment || segment.id === undefined || segment.id === null) {
      return;
    }

    const segmentId = Number(segment.id);
    if (!Number.isFinite(segmentId) || seenIds.has(segmentId)) {
      return;
    }

    seenIds.add(segmentId);
    segments.push(segment);
  };

  pushSegment(ticket?.fareSegment || null);

  const mappedSegment = fareSegmentMap.get(Number(ticket?.fare_segment_id));
  if (mappedSegment) {
    pushSegment(mappedSegment);
  }

  for (const ticketItem of Array.isArray(ticket?.ticketItems) ? ticket.ticketItems : []) {
    const segment =
      ticketItem?.tripFare?.fareSegmentTicketType?.fareSegment ||
      ticketItem?.tripFare?.fareSegment ||
      ticketItem?.fareSegment ||
      null;
    pushSegment(segment);
  }

  return segments;
};

const TicketRepository = {
  async findAll() {
    return await Ticket.findAll({
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
        "promotions",
        'tickettypes'
      ],
      include: [
        {
          model: Branch,
          as: "branch",
          attributes: ["id", "name"],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"], // Agregar más atributos de User según sea necesario
        },
        {
          model: Trip,
          as: "trip",
          attributes: ["id", "date", "schedule", "start", "end"],
          include: [
            {
              model: Vehicle,
              as: "vehicle",
              attributes: ["id", "plate", "internal_number", "image", "seats"],
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
          ],
        },
      ],
    });
  },

  async findAllDate(branchId, date = null, endDate = null, workerId = null) {
    const today = new Date();
    const formattedToday = today.toLocaleDateString('es-CL', {
        timeZone: 'America/Santiago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).split('-').reverse().join('-');
    const searchDate = date && date.trim() !== "" ? date : formattedToday; // Usa date si existe, sino formattedToday

    const whereClause = {
      branch_id: branchId, // Siempre filtramos por branch_id
      date: endDate && endDate.trim() !== "" 
        ? { [Op.between]: [searchDate, endDate] } // Rango de fechas
        : searchDate, // Fecha única (searchDate puede ser date o formattedToday)
    };
    return await Ticket.findAll({
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
        "print",
        "promotions",
        "tickettypes",
        [sequelize.fn("DATE_FORMAT", sequelize.col("Ticket.createdAt"), "%H:%i"), "saleTime"],
      ],
      where: whereClause,
      include: [
        {
          model: Branch,
          as: "branch",
          attributes: ["id", "name"],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"], // Agregar más atributos de User según sea necesario
        },
        {
          model: Trip,
          as: "trip",
          attributes: ["id", "date", "schedule", "start", "end"],
          required: true, // Excluir tickets sin trip asociado
          include: [
            {
              model: Vehicle,
              as: "vehicle",
              attributes: ["id", "plate", "internal_number", "image", "seats"],
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
          ],
        },
        ...ticketItemInclude,
        ...fareSegmentTicketInclude,
      ],
    });
  },

  async findById(id) {
    return await Ticket.findByPk(id, {
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
        "print",
        "promotions",
        "tickettypes",
        "sequenceNumber"
      ],
      include: [
        {
          model: Branch,
          as: "branch",
          attributes: ["id", "name", "rut", "image", "address"],
          include: [
            {
              model: Company,
              as: "company",
              attributes: ["id", "name", "rut", "image", "address"],
            },
          ],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
        {
          model: Trip,
          as: "trip",
          attributes: ["id", "date", "schedule", "start", "end"],
          include: [
            {
              model: Route,
              as: "route",
              attributes: ["id", "name"],
              include: [
                {
                  model: Location,
                  as: "origin",
                  attributes: ["id", "address"],
                },
                {
                  model: Location,
                  as: "destination",
                  attributes: ["id", "address"],
                },
              ],
            },
          ],
        },
        ...ticketItemInclude,
      ],
    });
  },

  async findByIdOrSequence(searchValue) {
  return await Ticket.findOne({
    where: {
      [Op.or]: [
        { id: searchValue },
        { sequenceNumber: searchValue }
      ]
    },
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
      "print",
      "promotions",
      "tickettypes",
      "sequenceNumber" // Recomendado agregarlo a los attributes si lo vas a usar
    ],
    include: [
      {
        model: Branch,
        as: "branch",
        attributes: ["id", "name", "rut", "image", "address"],
        include: [
          {
            model: Company,
            as: "company",
            attributes: ["id", "name", "rut", "image", "address"],
          },
        ],
      },
      {
        model: User,
        as: "user",
        attributes: ["id", "name", "email"],
      },
      {
        model: Trip,
        as: "trip",
        attributes: ["id", "date", "schedule", "start", "end"],
        include: [
          {
            model: Route,
            as: "route",
            attributes: ["id", "name"],
            include: [
              {
                model: Location,
                as: "origin",
                attributes: ["id", "address"],
              },
              {
                model: Location,
                as: "destination",
                attributes: ["id", "address"],
              },
              ],
            },
          ],
        },
        ...ticketItemInclude,
      ],
    });
  },

  async create(body, options = {}) {
    const {
      branch_id,
      user_id,
      trip_id,
      fare_segment_id,
      method,
      status,
      quantity,
      price,
      seats,
      date,
      adults,
      minors,
      pay,
      total,
      transactionStatus,
      sequenceNumber,
      extraData,
      transactionTip,
      transactionCashback,
      promotions,
    } = body;

    try {
      const ticket = await Ticket.create({
        branch_id,
        user_id,
        trip_id,
        fare_segment_id,
        method,
        status,
        quantity,
        price,
        seats,
        date,
        adults,
        minors,
        pay,
        total,
        transactionStatus,
        sequenceNumber,
        extraData,
        transactionTip,
        transactionCashback,
        promotions,
      }, options);

      logger.info(`Ticket creado exitosamente (ID: ${ticket.id})`);
      return ticket;
    } catch (error) {
      logger.error(`Error creando el ticket: ${error.message}`);
      throw new Error("Error creando el ticket");
    }
  },

  async update(ticket, body, options = {}) {
    const fieldsToUpdate = [
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
      "pay",
      "transactionStatus",
      "sequenceNumber",
      "extraData",
      "transactionTip",
      "transactionCashback",
      "promotions",
    ];

    const updatedData = Object.keys(body)
      .filter((key) => fieldsToUpdate.includes(key) && body[key] !== undefined)
      .reduce((obj, key) => {
        obj[key] = body[key];
        return obj;
      }, {});

    if (Object.keys(updatedData).length > 0) {
      try {
        await ticket.update(updatedData, options);
        logger.info(`Ticket actualizado exitosamente (ID: ${ticket.id})`);
      } catch (error) {
        logger.error(`Error actualizando el ticket: ${error.message}`);
        throw new Error("Error actualizando el ticket");
      }
    }

    return ticket;
  },

  async delete(ticket) {
    try {
      if (ticket.qr) {
        await ImageService.deleteFile(ticket.qr);
      }
      if (ticket.barcode) {
        await ImageService.deleteFile(ticket.barcode);
      }

      await ticket.destroy();
      logger.info(`Ticket eliminado exitosamente (ID: ${ticket.id})`);
    } catch (error) {
      logger.error(`Error eliminando el ticket: ${error.message}`);
      throw new Error("Error eliminando el ticket");
    }
  },

  async getSeats(ticket_id) {
    const tickets = await Ticket.findAll({
      where: {
        id,
        [Op.ne]: ticket_id, // Excluye el ticket actual
      },
      attributes: ["seats"], // Obtiene solo los asientos reservados
    });

    return tickets.reduce((acc, ticket) => {
      // Asegúrate de que los asientos están correctamente accesibles
      if (Array.isArray(ticket.seats)) {
        acc = acc.concat(ticket.seats);
      }
      return acc;
    }, []);
  },

  async checkReservedSeats(tripId, selectedSeats, ticketId = null) {
    try {
      // Define las condiciones de búsqueda
      const conditions = {
        trip_id: tripId,
      };

      // Si es una edición, excluye el ticket actual
      if (ticketId) {
        conditions.id = {
          [Op.ne]: ticketId, // Excluye el ticket actual
        };
      }

      // Recupera todos los tickets que cumplan las condiciones
      const tickets = await Ticket.findAll({
        where: conditions,
        attributes: ["seats"], // Obtiene solo los asientos reservados
      });

      // Si no hay tickets, no hay asientos reservados, por lo que no hay conflicto
      if (tickets.length === 0) {
        return [];
      }

      // Combina los asientos ya reservados en un único array
      const reservedSeats = tickets.reduce((acc, ticket) => {
        // Asegúrate de que los asientos están correctamente accesibles
        if (Array.isArray(ticket.seats)) {
          acc = acc.concat(ticket.seats);
        }
        return acc;
      }, []);

      // Normaliza los asientos seleccionados a números (por si vienen como strings)
      const normalizedSelectedSeats = selectedSeats.map((seat) => Number(seat));

      // Verifica si hay conflicto entre los asientos seleccionados y los reservados
      const reservedSet = new Set(reservedSeats); // Convierte a Set para búsquedas rápidas

      // Filtra los asientos seleccionados que ya están reservados
      const conflictingSeats = normalizedSelectedSeats.filter((seat) =>
        reservedSet.has(seat)
      );
      // Retorna los asientos en conflicto
      return conflictingSeats;
    } catch (error) {
      logger.error(
        `Error verificando los asientos reservados Repository: ${error.message}`
      );
      throw new Error("Error al verificar asientos reservados");
    }
  },

  async checkReservedSeatsBySegment(tripId, selectedSeats, fareSegmentId, ticketId = null) {
    try {
      const normalizedSelectedSeats = Array.isArray(selectedSeats)
        ? selectedSeats.map((seat) => Number(seat))
        : [];
      const normalizedFareSegmentIds = Array.isArray(fareSegmentId)
        ? fareSegmentId
            .map((item) => Number(item))
            .filter((item) => Number.isFinite(item) && item > 0)
        : fareSegmentId !== undefined && fareSegmentId !== null && fareSegmentId !== ""
          ? [Number(fareSegmentId)].filter((item) => Number.isFinite(item) && item > 0)
          : [];

      if (
        normalizedSelectedSeats.length === 0 ||
        normalizedFareSegmentIds.length === 0
      ) {
        return [];
      }

      const trip = await Trip.findByPk(tripId, {
        attributes: ["id", "route_id"],
        include: [
          {
            model: TripStop,
            as: "tripStops",
            attributes: ["id", "route_stop_id", "stop_order", "active"],
            required: false,
          },
          {
            model: TripFare,
            as: "tripFares",
            attributes: ["id", "fare_segment_ticket_type_id", "base_price", "price", "active"],
            required: false,
            include: [
              {
                model: FareSegmentTicketType,
                as: "fareSegmentTicketType",
                attributes: ["id", "fare_segment_id", "ticket_type_id", "base_price", "active"],
                include: [
                  {
                    model: FareSegment,
                    as: "fareSegment",
                    attributes: ["id", "origin_route_stop_id", "destination_route_stop_id", "active"],
                  },
                ],
              },
            ],
          },
        ],
      });

      if (!trip) {
        return [];
      }

      const tripStopOrderMap = new Map();
      const tripStops = Array.isArray(trip.tripStops) ? trip.tripStops : [];
      for (const tripStop of tripStops) {
        const routeStopId = Number(tripStop.route_stop_id);
        const stopOrder = Number(tripStop.stop_order);
        if (routeStopId && stopOrder) {
          tripStopOrderMap.set(routeStopId, stopOrder);
        }
      }

      const targetFareSegments = (Array.isArray(trip.tripFares) ? trip.tripFares : [])
        .map((tripFare) => tripFare?.fareSegmentTicketType?.fareSegment)
        .filter((fareSegment) => fareSegment && normalizedFareSegmentIds.includes(Number(fareSegment.id)));

      if (!targetFareSegments.length) {
        return normalizedSelectedSeats;
      }

      const targetOrders = targetFareSegments
        .map((fareSegment) => {
          const originOrder = tripStopOrderMap.get(Number(fareSegment.origin_route_stop_id));
          const destinationOrder = tripStopOrderMap.get(Number(fareSegment.destination_route_stop_id));
          if (!originOrder || !destinationOrder) {
            return null;
          }
          return { originOrder, destinationOrder, fareSegment };
        })
        .filter(Boolean);

      if (!targetOrders.length) {
        return normalizedSelectedSeats;
      }

      const existingTickets = await Ticket.findAll({
        where: {
          trip_id: tripId,
          ...(ticketId ? { id: { [Op.ne]: ticketId } } : {}),
        },
        attributes: ["id", "seats", "fare_segment_id"],
        include: [
          {
            model: FareSegment,
            as: "fareSegment",
            attributes: ["id", "origin_route_stop_id", "destination_route_stop_id", "active"],
          },
          ...ticketItemInclude,
        ],
      });

      const conflictingSeats = new Set();
      const selectedSeatSet = new Set(normalizedSelectedSeats);

      for (const existingTicket of existingTickets) {
        const existingSeats = Array.isArray(existingTicket.seats)
          ? existingTicket.seats.map((seat) => Number(seat))
          : [];
        const seatIntersection = existingSeats.filter((seat) => selectedSeatSet.has(seat));
        if (seatIntersection.length === 0) {
          continue;
        }

        const existingFareSegments = extractTicketFareSegments(existingTicket);
        if (!existingFareSegments.length) {
          seatIntersection.forEach((seat) => conflictingSeats.add(seat));
          continue;
        }

        const overlaps = existingFareSegments.some((existingFareSegment) => {
          const existingOriginOrder = tripStopOrderMap.get(
            Number(existingFareSegment.origin_route_stop_id)
          );
          const existingDestinationOrder = tripStopOrderMap.get(
            Number(existingFareSegment.destination_route_stop_id)
          );
          if (!existingOriginOrder || !existingDestinationOrder) {
            return false;
          }

          return targetOrders.some(({ originOrder, destinationOrder }) =>
            existingOriginOrder < destinationOrder && existingDestinationOrder > originOrder
          );
        });

        if (overlaps) {
          seatIntersection.forEach((seat) => conflictingSeats.add(seat));
        }
      }

      return Array.from(conflictingSeats);
    } catch (error) {
      logger.error(
        `Error verificando los asientos por tramo Repository: ${error.message}`
      );
      throw new Error("Error al verificar asientos por tramo");
    }
  },

  async generateTicketCodes(ticketData, ticket = null, options = {}) {
    try {
      // Datos que quieres incluir en el código QR y el código de barras
      const ticketInfo = JSON.stringify(ticketData); // Usa los datos del ticket
      // Definir un string que se usará como clave base
      const baseKey = "bulletin"; // Usa el string que desees

      // Generar la clave de 32 bytes con SHA-256
      const secretKey = crypto.createHash("sha256").update(baseKey).digest();
      const qr = await this.encryptData(ticketData, secretKey);
      const barcode = await this.generateUniqueBarcode();

      // Ruta para guardar los archivos generados
      /*const qrCodesFolder = path.join(__dirname, "../../public", "qrscodes");

      // Si la carpeta no existe, créala
      if (!fs.existsSync(qrCodesFolder)) {
        fs.mkdirSync(qrCodesFolder, { recursive: true });
      }

      // Generar QR code (en base64)
      const qrCodeFileName = `${ticketData.id}Qr.png`;
      const qrCodePath = path.join(qrCodesFolder, qrCodeFileName);

      // Generar el código QR y guardarlo como imagen
      await QRCode.toFile(qrCodePath, ticketInfo);

      // Generar Código de barras (EAN-13 por ejemplo)
      const barcodeFileName = `${ticketData.id}Code.png`;
      const barcodePath = path.join(qrCodesFolder, barcodeFileName);

      // Verificar la longitud del ID para el código de barras
      let barcodeId = ticketData.id.toString();
      if (barcodeId.length !== 12 && barcodeId.length !== 13) {
        // Ajustar el código de barras a 12 o 13 dígitos (agregar ceros al inicio si es necesario)
        while (barcodeId.length < 12) {
          barcodeId = "0" + barcodeId; // Agregar ceros al inicio
        }
        // Si tiene más de 13 dígitos, truncamos a 13
        barcodeId = barcodeId.substring(0, 13);
      }

      const barcodeData = await bwipjs.toBuffer({
        bcid: "ean13", // Tipo de código de barras (EAN-13 es solo un ejemplo)
        text: barcodeId, // Usamos el ID del ticket o cualquier identificador único
        scale: 3,
        height: 10,
        includetext: true,
        backgroundcolor: "#FFFFFF", // Fondo blanco en formato hexadecimal
        barcolor: "#000000", // Código de barras negro
      });

      // Guardar el código de barras como imagen
      fs.writeFileSync(barcodePath, barcodeData);*/
      if (ticket) {
        await ticket.update({
          qr: qr.toString(), // Asegúrate de que se está pasando un string
          barcode: barcode.toString(), // Asegúrate de que se está pasando un string
        }, options);
      }

      // Retorna las rutas de los archivos generados
      return { qr, barcode };
    } catch (error) {
      logger.error("Error al generar los códigos del ticket:", error);
      throw error;
    }
  },

  // Función para desencriptar
  /*async decryptData(encryptedData) {
    const baseKey = "bulletin"; // Usa el string que desees

    // Generar la clave de 32 bytes con SHA-256
    const secretKey = crypto.createHash("sha256").update(baseKey).digest();
    const iv = "2017111319891230";
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(secretKey),
      Buffer.from(iv, "hex")
    );
    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return JSON.parse(decrypted);
  },*/
  async decryptData(encryptedData) {
    try {
        const baseKey = "bulletin";
        const secretKey = crypto.createHash("sha256").update(baseKey).digest();
        const iv = Buffer.from("2017111319891230", "utf8");
        
        logger.info(`Input recibido:, ${JSON.stringify({
            encryptedData: encryptedData,
            iv: iv,
            secretKey: secretKey.toString('hex')
        })}`);

        const decipher = crypto.createDecipheriv("aes-256-cbc", secretKey, iv);
        let decrypted = decipher.update(encryptedData, "hex", "utf8");
        decrypted += decipher.final("utf8");
        
        const result = JSON.parse(decrypted);
        logger.info(`Desencriptación exitosa: ${JSON.stringify(result)}`);
        return result;
        
    } catch (error) {
        logger.error("Error en decryptData:", {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
  },
  // Función para encriptar un objeto JSON
  async encryptData(data, secretKey) {
    const iv = "2017111319891230"; // IV fijo de 16 bytes
    const cipher = crypto.createCipheriv(
      "aes-256-cbc",
      Buffer.from(secretKey),
      iv
    );
    let encrypted = cipher.update(JSON.stringify(data), "utf8", "hex");
    encrypted += cipher.final("hex");
    return encrypted; // Retorna un string
  },

  async generateUniqueBarcode() {
    let barcode;
    let isUnique = false;

    while (!isUnique) {
      // Genera un barcode único de 13 dígitos
      barcode = Math.floor(
        1000000000000 + Math.random() * 9000000000000
      ).toString();

      // Verifica si el barcode ya existe en la base de datos
      const existingTicket = await Ticket.findOne({ where: { barcode } });

      if (!existingTicket) {
        isUnique = true;
      }
    }
    return barcode; // Retorna el barcode como string
  },

  async getpassengers(tripId) {
    try {
      const result = await Ticket.findOne({
        attributes: [
          [Sequelize.fn("SUM", Sequelize.col("quantity")), "total_quantity"],
          [Sequelize.fn("SUM", Sequelize.col("adults")), "total_adults"],
          [Sequelize.fn("SUM", Sequelize.col("minors")), "total_minors"],
        ],
        where: { trip_id: tripId },
      });

      // Procesamos el resultado para devolver números y asegurarnos de que no haya valores null
      const passengers = result
        ? {
            total_quantity: Number(result.dataValues.total_quantity || 0),
            total_adults: Number(result.dataValues.total_adults || 0),
            total_minors: Number(result.dataValues.total_minors || 0),
          }
        : { total_quantity: 0, total_adults: 0, total_minors: 0 };

      return passengers;
    } catch (error) {
      logger.error("Error al obtener los totales:", error);
      throw error;
    }
  },

  async getMonthlySales(month, type, branchId = null) {
    //const currentMonth = moment().format("YYYY-MM");

    const whereClause = {
      [Op.and]: [
        sequelize.where(
          sequelize.fn("DATE_FORMAT", sequelize.col("date"), "%Y-%m"),
          month
        ),
        //{ pay: 1 },
      ],
    };

    // Si el type es "Sucursal", agregar la condición de branch_id
    if (type === "Sucursal" && branchId) {
      whereClause[Op.and].push({ branch_id: branchId });
    }

    const result = await Ticket.findOne({
      attributes: [
        [sequelize.fn("COUNT", sequelize.col("id")), "tickets_vendidos"],
        [sequelize.fn("SUM", sequelize.col("total")), "ingreso_generado"],
      ],
      where: whereClause,
      raw: true,
    });

    return {
      ticketsVendidos: result.tickets_vendidos || 0,
      ingresoGenerado: result.ingreso_generado || 0,
    };
  },
  async getDailySales(date, type, branchId = null, branchIds = null) {
    const whereClause = {
      [Op.and]: [
        sequelize.where(
          sequelize.fn("DATE", sequelize.col("Ticket.date")),
          date
        ),
      ],
    };

    if (branchId) {
      whereClause[Op.and].push({ branch_id: branchId });
    }

    if (Array.isArray(branchIds) && branchIds.length > 0) {
      whereClause[Op.and].push({ branch_id: { [Op.in]: branchIds } });
    }

    const result = await Ticket.findOne({
      attributes: [
        [sequelize.fn("COUNT", sequelize.col("Ticket.id")), "tickets_vendidos"],
        [sequelize.fn("SUM", sequelize.col("Ticket.total")), "ingreso_generado"],
      ],
      where: whereClause,
      raw: true,
    });

    return {
      ticketsVendidos: result?.tickets_vendidos || 0,
      ingresoGenerado: result?.ingreso_generado || 0,
    };
  },

  async getOccupancyRate(month, type, branchId = null) {
    try {
      // Condiciones base
      const whereClause = {
        [Op.and]: [
          sequelize.where(
            sequelize.fn("DATE_FORMAT", sequelize.col("Trip.date"), "%Y-%m"),
            month
          ), // Filtrar viajes del mes actual
        ],
      };

      // Si type es "Sucursal", agregar la condición de branch_id
      if (type === "Sucursal" && branchId) {
        whereClause[Op.and].push({ branch_id: branchId });
      }

      // Obtener todos los viajes que cumplen con las condiciones
      const trips = await Trip.findAll({
        where: whereClause,
        include: [
          {
            model: Ticket,
            as: "tickets",
            attributes: ["quantity"], // Incluir la columna quantity de los tickets
            required: false, // Permitir viajes sin tickets
          },
        ],
      });

      // Calcular el total de viajes y el total de pasajeros manualmente
      let totalTrips = 0;
      let totalPassengers = 0;

      trips.forEach((trip) => {
        totalTrips += 1; // Cada viaje cuenta como 1
        if (trip.tickets && trip.tickets.length > 0) {
          trip.tickets.forEach((ticket) => {
            totalPassengers += ticket.quantity || 0; // Sumar la cantidad de pasajeros de cada ticket
          });
        }
      });

      // Calcular la tasa de ocupación (promedio de pasajeros por viaje)
      const occupancyRate = totalTrips > 0 ? totalPassengers / totalTrips : 0;

      return Number(occupancyRate.toFixed(2)); // Redondear a 2 decimales
    } catch (error) {
      logger.error("Error al calcular la tasa de ocupación:", error);
      throw error;
    }
  },
  async getDailyOccupancyRate(date, type, branchId = null, branchIds = null) {
    try {
      // Condiciones base
      const whereClause = {
        [Op.and]: [
          sequelize.where(
            sequelize.fn("DATE", sequelize.col("Trip.date")),
            date // Usar la fecha completa YYYY-MM-DD
          ),
        ],
      };

      if (branchId) {
        whereClause[Op.and].push({ branch_id: branchId });
      }

      if (Array.isArray(branchIds) && branchIds.length > 0) {
        whereClause[Op.and].push({ branch_id: { [Op.in]: branchIds } });
      }

      // Obtener todos los viajes que cumplen con las condiciones
      const trips = await Trip.findAll({
        where: whereClause,
        include: [
          {
            model: Ticket,
            as: "tickets",
            attributes: ["quantity"], // Incluir la columna quantity de los tickets
            required: false, // Permitir viajes sin tickets
          },
        ],
      });

      // Calcular el total de viajes y el total de pasajeros manualmente
      let totalTrips = 0;
      let totalPassengers = 0;

      trips.forEach((trip) => {
        totalTrips += 1; // Cada viaje cuenta como 1
        if (trip.tickets && trip.tickets.length > 0) {
          trip.tickets.forEach((ticket) => {
            totalPassengers += ticket.quantity || 0; // Sumar la cantidad de pasajeros de cada ticket
          });
        }
      });

      // Calcular la tasa de ocupación (promedio de pasajeros por viaje)
      const occupancyRate = totalTrips > 0 ? totalPassengers / totalTrips : 0;

      return Number(occupancyRate.toFixed(2)); // Redondear a 2 decimales
    } catch (error) {
      logger.error("Error al calcular la tasa de ocupación diaria:", error);
      throw error;
    }
  },
  async getYearlyEarnings(month, type, branchId, branchIds = null) {
    try {
      const year = month.split("-")[0]; // Extraer el año del parámetro month

      // Condiciones base
      const whereClause = {
        [Op.and]: [
          sequelize.where(sequelize.fn("YEAR", sequelize.col("Ticket.date")), year), // Filtrar por el año extraído
          //{ pay: 1 }, // Solo tickets pagados
        ],
      };

      if (branchId) {
        whereClause[Op.and].push({ branch_id: branchId });
      }

      if (Array.isArray(branchIds) && branchIds.length > 0) {
        whereClause[Op.and].push({ branch_id: { [Op.in]: branchIds } });
      }

      // Obtener las ganancias agrupadas por mes
      const earningsByMonth = await Ticket.findAll({
        attributes: [
          [sequelize.fn("MONTH", sequelize.col("Ticket.date")), "month"], // Extraer el mes
          [sequelize.fn("SUM", sequelize.col("Ticket.total")), "totalEarnings"], // Sumar las ganancias
        ],
        where: whereClause,
        group: [sequelize.fn("MONTH", sequelize.col("Ticket.date"))], // Agrupar por mes
        raw: true,
      });

      // Crear un array para almacenar las ganancias de cada mes (inicializado con 0)
      const monthlyEarnings = new Array(12).fill(0);

      // Rellenar el array con las ganancias obtenidas (convertidas a enteros)
      earningsByMonth.forEach((item) => {
        const monthIndex = item.month - 1; // Los meses en SQL van de 1 a 12, en JavaScript de 0 a 11
        monthlyEarnings[monthIndex] =
          Math.round(parseFloat(item.totalEarnings)) || 0; // Convertir a entero
      });

      return monthlyEarnings;
    } catch (error) {
      logger.error("Error al obtener las ganancias anuales:", error);
      throw error;
    }
  },
  async getTripsWithDetails(month, type, branchId) {
    // Condiciones base
    const whereClause = {
      [Op.and]: [
        sequelize.where(
          sequelize.fn("DATE_FORMAT", sequelize.col("Trip.date"), "%Y-%m"),
          month
        ), // Filtrar viajes del mes actual
      ],
    };

    // Si type es "Sucursal", agregar la condición de branch_id
    if (type === "Sucursal" && branchId) {
      whereClause[Op.and].push({ branch_id: branchId });
    }

    return await Trip.findAll({
      attributes: [
        "id",
        "date",
        "schedule",
        "arrival",
        "start",
        "end",
        "branch_id",
        "vehicle_id",
        "route_id",
        "price",
      ],
      where: whereClause,
      order: [['createdAt', 'ASC']],
      include: [
        {
          model: Branch,
          as: "branch",
          attributes: ["id", "name"],
        },
        {
          model: Vehicle,
          as: "vehicle",
          attributes: ["id", "plate", "internal_number", "seats", "image", "brand"],
        },
        {
          model: Route,
          as: "route",
          attributes: ["id", "name", "estimated"],
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
          //where: {pay: 1}
        },
      ],
    });
  },

  async getDailyTripsWithDetails(date, type, branchId) {
    // Condiciones base
    const whereClause = {
      [Op.and]: [
        sequelize.where(
          sequelize.fn("DATE", sequelize.col("Trip.date")),
          date
        ), // Filtrar viajes del día específico
      ],
    };

    // Si type es "Sucursal", agregar la condición de branch_id
    if (type === "Sucursal" && branchId) {
      whereClause[Op.and].push({ branch_id: branchId });
    }

    return await Trip.findAll({
      attributes: [
        "id",
        "date",
        "schedule",
        "arrival",
        "start",
        "end",
        "branch_id",
        "vehicle_id",
        "route_id",
        "price",
      ],
      where: whereClause,
      order: [['createdAt', 'ASC']], // Orden cronológico de creación
      include: [
        {
          model: Branch,
          as: "branch",
          attributes: ["id", "name"],
        },
        {
          model: Vehicle,
          as: "vehicle",
          attributes: ["id", "plate", "internal_number", "seats", "image", "brand"],
        },
        {
          model: Route,
          as: "route",
          attributes: ["id", "name", "estimated"],
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
  },

 async getTicketsSoldDate(type, id, date, endDate) {
  const tripWhereClause = {};

  if (endDate && endDate.trim() !== "") {
    tripWhereClause.date = { [Op.between]: [date, endDate] };
  } else {
    tripWhereClause.date = date;
  }

  const tickets = await Ticket.findAll({
    include: [
      {
        model: Trip,
        as: 'trip',
        where: tripWhereClause,
        required: true,
        include: [
          {
            model: Branch,
            as: 'branch',
            required: true,
            include: [
              {
                model: Company,
                as: 'company',
                where: type === 'Company' ? { id } : null,
                required: type === 'Company' // Si es por compañía, debe existir
              }
            ]
          }
        ]
      }
    ],
    // Si es por sucursal, ya se filtra por branch.id en el include anterior
    // Pero si es por compañía, no necesitamos where extra aquí
  });

  return tickets;
},

  async getTicketsSoldDateWorker(branchId, date, endDate, workerId) {
  const tripWhereClause = {};

  // Filtro de fecha
  if (endDate && endDate.trim() !== "") {
    tripWhereClause.date = { [Op.between]: [date, endDate] };
  } else {
    tripWhereClause.date = date;
  }

  const tickets = await Ticket.findAll({
    include: [
      {
        model: Trip,
        as: 'trip',
        where: tripWhereClause,
        required: true, // INNER JOIN: el ticket debe tener un viaje
        include: [
          {
            model: Branch,
            as: 'branch',
            where: { id: branchId }, // Filtrar por branch_id aquí
            required: true, // INNER JOIN con branch
            include: [
              {
                model: Company,
                as: 'company',
                required: false // Siempre incluir compañía, pero sin forzar existencia
              }
            ]
          },
          {
            model: TripWorker,
            as: 'tripworkers',
            where: { worker_id: workerId },
            required: true // El viaje debe tener al trabajador asignado
          }
        ]
      }
    ]
  });

  return tickets;
},

  async findByQRWithTrip(qr) {
    try {
    const ticket = await Ticket.findOne({ 
      where: { qr: qr },
      include: [{
        model: Trip,
        as: 'trip'
      },
      ...ticketItemInclude,
      ...fareSegmentTicketInclude]
    });

    if (!ticket) {
      logger.warn(`Ticket no encontrado para QR: ${qr?.substring(0, 20)}...`);
      return null;
    }

    logger.debug(`Ticket encontrado: ID ${ticket.id}, Trip ID ${ticket.trip_id}`);
    return ticket;
  } catch (error) {
    logger.error("Error en findByQRWithTrip:", {
      error: error.message,
      qrLength: qr?.length,
      stack: error.stack
    });
    throw error;
  }
},

async findBySequenceNumberWithTrip(sequenceNumber) {
  try {
    const ticket = await Ticket.findOne({ 
      where: { sequenceNumber: sequenceNumber },
      include: [
        {
          model: Trip,
          as: "trip",
          attributes: ["id", "date", "schedule", "start", "end"],
          include: [
            {
              model: Vehicle,
              as: "vehicle",
              attributes: ["id", "plate", "internal_number", "image", "seats"],
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
          ],
        },
        ...ticketItemInclude,
        ...fareSegmentTicketInclude,
      ]
    });

    if (!ticket) {
      logger.warn(`Ticket no encontrado para sequenceNumber: ${sequenceNumber}`);
      return null;
    }

    logger.debug(`Ticket encontrado: ID ${ticket.id}, Trip ID ${ticket.trip_id}, SequenceNumber: ${ticket.sequenceNumber}`);
    return ticket;
  } catch (error) {
    logger.error("Error en findBySequenceNumberWithTrip:", {
      error: error.message,
      sequenceNumber: sequenceNumber,
      stack: error.stack
    });
    throw error;
  }
},

async findWithPrintStatus(filters) {
    const { ticket_id, date, branch_id, limit = 100 } = filters;
    const today = new Date();
    const formattedToday = today.toLocaleDateString('es-CL', {
        timeZone: 'America/Santiago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).split('-').reverse().join('-');
    const searchDate = date || formattedToday;
    const whereClause = {
      branch_id: branch_id,
      date: searchDate
    };

    if (ticket_id) {
      whereClause.id = ticket_id;
    }

    return await Ticket.findAll({
      where: whereClause,
      limit: parseInt(limit),
      order: [['createdAt', 'DESC']], // Orden cronológico inverso (más nuevos primero)
      include: [
        {
          model: Trip,
          as: 'trip',
          attributes: ['id', 'date', 'schedule', 'arrival'],
          include: [
            {
              model: Route,
              as: 'route',
              attributes: ['id', 'name'],
              include: [
                { model: Location, as: 'origin', attributes: ['address'] },
                { model: Location, as: 'destination', attributes: ['address'] }
              ]
            }
          ]
        },
        ...ticketItemInclude,
        ...fareSegmentTicketInclude,
        {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'name', 'address', 'phone'],
          include: [
            {
              model: Company,
              as: 'company',
              attributes: ['rut']
            }
          ]
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ]
    });
  }
};

module.exports = TicketRepository;
