const logger = require('../../config/logger');
const {
  TripFare,
  Company,
  Trip,
  FareSegmentTicketType,
  TicketType,
  FareSegment,
  RouteStop,
  Location,
  TripSegment,
  TripStop,
} = require('../models');

const valuesAreEqual = (currentValue, incomingValue) => {
  if (currentValue === null || currentValue === undefined || incomingValue === null || incomingValue === undefined) {
    return (currentValue === null || currentValue === undefined) &&
      (incomingValue === null || incomingValue === undefined);
  }

  if (currentValue instanceof Date || incomingValue instanceof Date) {
    const currentTime = new Date(currentValue).getTime();
    const incomingTime = new Date(incomingValue).getTime();
    if (Number.isFinite(currentTime) && Number.isFinite(incomingTime)) {
      return currentTime === incomingTime;
    }
  }

  if (typeof currentValue === 'boolean' || typeof incomingValue === 'boolean') {
    return Boolean(currentValue) === Boolean(incomingValue);
  }

  const currentNumber = Number(currentValue);
  const incomingNumber = Number(incomingValue);
  const areNumeric = [currentValue, incomingValue].every((value) =>
    typeof value === 'number' ||
    (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)))
  );

  return areNumeric
    ? currentNumber === incomingNumber
    : String(currentValue) === String(incomingValue);
};

const tripFareInclude = [
  { model: Company, as: 'company', attributes: ['id', 'name', 'rut'] },
  {
    model: Trip,
    as: 'trip',
    attributes: ['id', 'branch_id', 'vehicle_id', 'route_id', 'date', 'schedule', 'arrival', 'start', 'end', 'price'],
  },
  {
    model: FareSegmentTicketType,
    as: 'fareSegmentTicketType',
    attributes: ['id', 'fare_segment_id', 'ticket_type_id', 'base_price', 'active'],
    include: [
      {
        model: TicketType,
        as: 'ticketType',
        attributes: ['id', 'name', 'description', 'active'],
      },
      {
        model: FareSegment,
        as: 'fareSegment',
        attributes: ['id', 'company_id', 'route_id', 'origin_route_stop_id', 'destination_route_stop_id', 'base_price', 'currency', 'valid_from', 'valid_to', 'priority', 'active'],
        include: [
          {
            model: RouteStop,
            as: 'originRouteStop',
            include: [
              {
                model: Location,
                as: 'location',
                attributes: ['id', 'address', 'country', 'city', 'image', 'active'],
              },
            ],
          },
          {
            model: RouteStop,
            as: 'destinationRouteStop',
            include: [
              {
                model: Location,
                as: 'location',
                attributes: ['id', 'address', 'country', 'city', 'image', 'active'],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    model: TripSegment,
    as: 'tripSegment',
    required: false,
    include: [
      {
        model: TripStop,
        as: 'originTripStop',
        include: [
          { model: Location, as: 'location' },
          { model: RouteStop, as: 'routeStop' },
        ],
      },
      {
        model: TripStop,
        as: 'destinationTripStop',
        include: [
          { model: Location, as: 'location' },
          { model: RouteStop, as: 'routeStop' },
        ],
      },
    ],
  },
  {
    model: TicketType,
    as: 'ticketType',
    required: false,
    attributes: ['id', 'name', 'description', 'active'],
  },
];

const TripFareRepository = {
  async findAll() {
    return await TripFare.findAll({
      include: tripFareInclude,
      order: [['trip_id', 'ASC'], ['id', 'ASC']],
    });
  },

  async findById(id) {
    return await TripFare.findByPk(id, {
      include: tripFareInclude,
    });
  },

  async findByTrip(tripId, options = {}) {
    return await TripFare.findAll({
      where: { trip_id: tripId },
      include: tripFareInclude,
      order: [['id', 'ASC']],
      ...options,
    });
  },

  async findByCompany(companyId, options = {}) {
    return await TripFare.findAll({
      where: { company_id: companyId },
      include: tripFareInclude,
      order: [['trip_id', 'ASC'], ['id', 'ASC']],
      ...options,
    });
  },

  async create(body, options = {}) {
    const {
      company_id,
      trip_id,
      fare_segment_ticket_type_id,
      trip_segment_id,
      ticket_type_id,
      base_price,
      price,
      active,
      source_type,
    } = body;

    return await TripFare.create(
      {
        company_id,
        trip_id,
        fare_segment_ticket_type_id,
        trip_segment_id: trip_segment_id ?? null,
        ticket_type_id: ticket_type_id ?? null,
        base_price: base_price ?? 0,
        price: price ?? base_price ?? 0,
        active: active ?? true,
        source_type: source_type ?? 'auto',
      },
      options
    );
  },

  async update(tripFare, body, options = {}) {
    const fieldsToUpdate = [
      'company_id',
      'trip_id',
      'fare_segment_ticket_type_id',
      'trip_segment_id',
      'ticket_type_id',
      'base_price',
      'price',
      'active',
      'source_type',
    ];

    const requestedData = Object.keys(body)
      .filter((key) => fieldsToUpdate.includes(key) && body[key] !== undefined)
      .reduce((obj, key) => {
        obj[key] = body[key];
        return obj;
      }, {});
    const updatedData = Object.keys(requestedData)
      .filter((key) => !valuesAreEqual(tripFare.get(key), requestedData[key]))
      .reduce((obj, key) => {
        obj[key] = requestedData[key];
        return obj;
      }, {});

    if (Object.keys(updatedData).length > 0) {
      await tripFare.update(updatedData, options);
      logger.info(`TripFare actualizado exitosamente (ID: ${tripFare.id})`);
    }

    return tripFare;
  },

  async delete(tripFare, options = {}) {
    return await tripFare.destroy(options);
  },

  async deleteByTrip(tripId, options = {}) {
    return await TripFare.destroy({
      where: { trip_id: tripId },
      ...options,
    });
  },
};

module.exports = TripFareRepository;
