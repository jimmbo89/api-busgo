const {
  FareSegmentTicketType,
  TicketType,
  FareSegment,
  RouteStop,
  Location,
} = require('../models');

const fareSegmentTicketTypeInclude = [
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
];

const FareSegmentTicketTypeRepository = {
  async findByFareSegmentId(fareSegmentId, options = {}) {
    return await FareSegmentTicketType.findAll({
      where: { fare_segment_id: fareSegmentId },
      include: fareSegmentTicketTypeInclude,
      order: [['id', 'ASC']],
      ...options,
    });
  },

  async findById(id, options = {}) {
    return await FareSegmentTicketType.findByPk(id, {
      include: fareSegmentTicketTypeInclude,
      ...options,
    });
  },

  async create(body, options = {}) {
    const {
      fare_segment_id,
      ticket_type_id,
      base_price,
      active,
    } = body;

    return await FareSegmentTicketType.create(
      {
        fare_segment_id,
        ticket_type_id,
        base_price,
        active: active ?? true,
      },
      options
    );
  },

  async update(fareSegmentTicketType, body, options = {}) {
    const fieldsToUpdate = ['ticket_type_id', 'base_price', 'active'];

    const updatedData = Object.keys(body)
      .filter((key) => fieldsToUpdate.includes(key) && body[key] !== undefined)
      .reduce((obj, key) => {
        obj[key] = body[key];
        return obj;
      }, {});

    if (Object.keys(updatedData).length > 0) {
      await fareSegmentTicketType.update(updatedData, options);
    }

    return fareSegmentTicketType;
  },

  async delete(fareSegmentTicketType, options = {}) {
    return await fareSegmentTicketType.destroy(options);
  },
};

module.exports = FareSegmentTicketTypeRepository;
