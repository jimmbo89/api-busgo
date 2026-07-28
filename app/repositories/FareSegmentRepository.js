const logger = require('../../config/logger');
const { Op } = require('sequelize');
const { FareSegment, Company, Route, RouteStop, Location, FareSegmentTicketType, TicketType } = require('../models');

const fareSegmentInclude = [
  { model: Company, as: 'company', attributes: ['id', 'name', 'rut'] },
  {
    model: Route,
    as: 'route',
    attributes: ['id', 'name', 'origin_id', 'destination_id', 'distance', 'estimated', 'status'],
  },
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
  {
    model: FareSegmentTicketType,
    as: 'fareSegmentTicketTypes',
    attributes: ['id', 'fare_segment_id', 'ticket_type_id', 'base_price', 'active'],
    include: [
      {
        model: TicketType,
        as: 'ticketType',
        attributes: ['id', 'name', 'description', 'active'],
      },
    ],
  },
];

const FareSegmentRepository = {
  async findAll() {
    return await FareSegment.findAll({
      include: fareSegmentInclude,
      order: [
        ['route_id', 'ASC'],
        ['priority', 'DESC'],
        ['id', 'ASC'],
      ],
    });
  },

  async findById(id) {
    return await FareSegment.findByPk(id, {
      include: fareSegmentInclude,
    });
  },

  async findByRoute(routeId) {
    return await FareSegment.findAll({
      where: { route_id: routeId },
      include: fareSegmentInclude,
      order: [
        ['priority', 'DESC'],
        ['id', 'ASC'],
      ],
    });
  },

  async findByRouteIds(routeIds) {
    const normalizedRouteIds = Array.from(
      new Set(
        (Array.isArray(routeIds) ? routeIds : [])
          .map((routeId) => Number(routeId))
          .filter((routeId) => Number.isFinite(routeId) && routeId > 0)
      )
    );

    if (normalizedRouteIds.length === 0) {
      return new Map();
    }

    const fareSegments = await FareSegment.findAll({
      where: { route_id: { [Op.in]: normalizedRouteIds } },
      include: fareSegmentInclude,
      order: [
        ['route_id', 'ASC'],
        ['priority', 'DESC'],
        ['id', 'ASC'],
      ],
    });

    const fareSegmentsByRouteId = new Map(
      normalizedRouteIds.map((routeId) => [routeId, []])
    );

    for (const fareSegment of fareSegments) {
      const routeId = Number(fareSegment.route_id);
      if (!fareSegmentsByRouteId.has(routeId)) {
        fareSegmentsByRouteId.set(routeId, []);
      }

      fareSegmentsByRouteId.get(routeId).push(fareSegment);
    }

    return fareSegmentsByRouteId;
  },

  async findByCompany(companyId) {
    return await FareSegment.findAll({
      where: { company_id: companyId },
      include: fareSegmentInclude,
      order: [
        ['route_id', 'ASC'],
        ['priority', 'DESC'],
        ['id', 'ASC'],
      ],
    });
  },

  async create(body, options = {}) {
    const {
      company_id,
      route_id,
      origin_route_stop_id,
      destination_route_stop_id,
      service_class,
      base_price,
      currency,
      valid_from,
      valid_to,
      priority,
      active,
    } = body;

    return await FareSegment.create({
      company_id,
      route_id,
      origin_route_stop_id,
      destination_route_stop_id,
      service_class: service_class ?? null,
      base_price: base_price ?? 0,
      currency: currency ?? 'CLP',
      valid_from: valid_from ?? null,
      valid_to: valid_to ?? null,
      priority: priority ?? 0,
      active: active ?? true,
    }, options);
  },

  async update(fareSegment, body, options = {}) {
    const fieldsToUpdate = [
      'company_id',
      'route_id',
      'origin_route_stop_id',
      'destination_route_stop_id',
      'service_class',
      'base_price',
      'currency',
      'valid_from',
      'valid_to',
      'priority',
      'active',
    ];

    const updatedData = Object.keys(body)
      .filter((key) => fieldsToUpdate.includes(key) && body[key] !== undefined)
      .reduce((obj, key) => {
        obj[key] = body[key];
        return obj;
      }, {});

    if (Object.keys(updatedData).length > 0) {
      await fareSegment.update(updatedData, options);
      logger.info(`FareSegment actualizado exitosamente (ID: ${fareSegment.id})`);
    }

    return fareSegment;
  },

  async delete(fareSegment, options = {}) {
    return await fareSegment.destroy(options);
  },
};

module.exports = FareSegmentRepository;
