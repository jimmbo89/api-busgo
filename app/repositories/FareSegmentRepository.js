const logger = require('../../config/logger');
const { FareSegment, Company, Route, RouteStop, Location } = require('../models');

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

  async create(body) {
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
    });
  },

  async update(fareSegment, body) {
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
      await fareSegment.update(updatedData);
      logger.info(`FareSegment actualizado exitosamente (ID: ${fareSegment.id})`);
    }

    return fareSegment;
  },

  async delete(fareSegment) {
    return await fareSegment.destroy();
  },
};

module.exports = FareSegmentRepository;
