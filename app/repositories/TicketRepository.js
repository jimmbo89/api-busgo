const { Sequelize, Op } = require("sequelize");
const QRCode = require("qrcode");
const bwipjs = require("bwip-js");
const fs = require("fs");
const path = require("path");
const {
  Ticket,
  Branch,
  User,
  Trip,
  Location,
  Route,
  Vehicle,
  sequelize,
} = require("../models");
const ImageService = require("../services/ImageService");
const logger = require("../../config/logger"); // Logger para seguimiento

const TicketRepository = {
  async findAll() {
    return await Ticket.findAll({
      attributes: [
        "id",
        "branch_id",
        "user_id",
        "trip_id",
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
              attributes: ["id", "plate", "image", "seats"],
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

  async findAllDate(branchId) {
    const today = new Date();
    const formattedToday = today.toISOString().split("T")[0];
    return await Ticket.findAll({
      attributes: [
        "id",
        "branch_id",
        "user_id",
        "trip_id",
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
      ],
      where: {
        branch_id: branchId, // Filtra por branch_id
        date: {
          [Op.eq]: formattedToday, // Filtra solo los viajes cuyo campo 'date' sea igual a la fecha de hoy
        },
      },
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
              attributes: ["id", "plate", "image", "seats"],
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

  async findById(id) {
    return await Ticket.findByPk(id, {
      attributes: [
        "id",
        "branch_id",
        "user_id",
        "trip_id",
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
      ],
    });
  },

  async create(body) {
    const {
      branch_id,
      user_id,
      trip_id,
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
    } = body;

    try {
      const ticket = await Ticket.create({
        branch_id,
        user_id,
        trip_id,
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
      });

      logger.info(`Ticket creado exitosamente (ID: ${ticket.id})`);
      return ticket;
    } catch (error) {
      logger.error(`Error creando el ticket: ${error.message}`);
      throw new Error("Error creando el ticket");
    }
  },

  async update(ticket, body) {
    const fieldsToUpdate = [
      "branch_id",
      "user_id",
      "trip_id",
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
    ];

    const updatedData = Object.keys(body)
      .filter((key) => fieldsToUpdate.includes(key) && body[key] !== undefined)
      .reduce((obj, key) => {
        obj[key] = body[key];
        return obj;
      }, {});

    if (Object.keys(updatedData).length > 0) {
      try {
        await ticket.update(updatedData);
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

      // Verifica si hay conflicto entre los asientos seleccionados y los reservados
      // Convertimos ambos arrays en conjuntos para comparar fácilmente
      const reservedSet = new Set(reservedSeats);
      const selectedSet = new Set(selectedSeats);

      // Filtra los asientos seleccionados que ya están reservados
      const conflictingSeats = selectedSeats.filter((seat) =>
        reservedSet.has(seat)
      );

      // Retorna los asientos en conflicto
      return conflictingSeats;
    } catch (error) {
      console.error(
        `Error verificando los asientos reservados Repository: ${error.message}`
      );
      throw new Error("Error al verificar asientos reservados");
    }
  },

  async generateTicketCodes(ticketData, ticket = null) {
    try {
      // Datos que quieres incluir en el código QR y el código de barras
      const ticketInfo = JSON.stringify(ticketData); // Usa los datos del ticket

      // Ruta para guardar los archivos generados
      const qrCodesFolder = path.join(__dirname, "../../public", "qrscodes");

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
      fs.writeFileSync(barcodePath, barcodeData);
      if (ticket) {
        await ticket.update({
          qr: "qrscodes/" + ticketData.id + "Qr.png",
          barcode: "qrscodes/" + ticketData.id + "Code.png",
        });
      }

      // Retorna las rutas de los archivos generados
      return { qrCodePath, barcodePath };
    } catch (error) {
      logger.error("Error al generar los códigos del ticket:", error);
      throw error;
    }
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
            as: 'tickets',
            attributes: ['quantity'], // Incluir la columna quantity de los tickets
            required: false, // Permitir viajes sin tickets
          },
        ],
      });
  
      // Calcular el total de viajes y el total de pasajeros manualmente
      let totalTrips = 0;
      let totalPassengers = 0;
  
      trips.forEach(trip => {
        totalTrips += 1; // Cada viaje cuenta como 1
        if (trip.tickets && trip.tickets.length > 0) {
          trip.tickets.forEach(ticket => {
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
  async getYearlyEarnings(month, type, branchId) {
    try {
      const year = month.split("-")[0]; // Extraer el año del parámetro month
  
      // Condiciones base
      const whereClause = {
        [Op.and]: [
          sequelize.where(sequelize.fn("YEAR", sequelize.col("date")), year), // Filtrar por el año extraído
          //{ pay: 1 }, // Solo tickets pagados
        ],
      };
  
      // Si type es "Sucursal", agregar la condición de branch_id
      if (type === "Sucursal" && branchId) {
        whereClause[Op.and].push({ branch_id: branchId });
      }
  
      // Obtener las ganancias agrupadas por mes
      const earningsByMonth = await Ticket.findAll({
        attributes: [
          [sequelize.fn("MONTH", sequelize.col("date")), "month"], // Extraer el mes
          [sequelize.fn("SUM", sequelize.col("total")), "totalEarnings"], // Sumar las ganancias
        ],
        where: whereClause,
        group: [sequelize.fn("MONTH", sequelize.col("date"))], // Agrupar por mes
        raw: true,
      });
  
      // Crear un array para almacenar las ganancias de cada mes (inicializado con 0)
      const monthlyEarnings = new Array(12).fill(0);
  
      // Rellenar el array con las ganancias obtenidas (convertidas a enteros)
      earningsByMonth.forEach((item) => {
        const monthIndex = item.month - 1; // Los meses en SQL van de 1 a 12, en JavaScript de 0 a 11
        monthlyEarnings[monthIndex] = Math.round(parseFloat(item.totalEarnings)) || 0; // Convertir a entero
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
      include: [
        {
          model: Branch,
          as: "branch",
          attributes: ["id", "name"],
        },
        {
          model: Vehicle,
          as: "vehicle",
          attributes: ["id", "plate", "seats", "image", "brand"],
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
      ]
    });
  }
};

module.exports = TicketRepository;
