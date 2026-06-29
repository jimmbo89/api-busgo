const logger = require('../../config/logger');
const { FareSegmentRepository, CompanyRepository, RouteRepository, RouteStopRepository } = require('../repositories');

const mapRouteStop = (routeStop) => routeStop
  ? {
      id: routeStop.id,
      locationId: routeStop.location_id,
      location_id: routeStop.location_id,
      locationName: routeStop.location?.address,
      locationCity: routeStop.location?.city,
      locationCountry: routeStop.location?.country,
      locationImage: routeStop.location?.image,
      stopOrder: routeStop.stop_order,
      stop_order: routeStop.stop_order,
      active: routeStop.active,
    }
  : null;

const mapFareSegment = (fareSegment) => ({
  id: fareSegment.id,
  companyId: fareSegment.company_id,
  company_id: fareSegment.company_id,
  companyName: fareSegment.company?.name,
  companyRut: fareSegment.company?.rut,
  routeId: fareSegment.route_id,
  route_id: fareSegment.route_id,
  routeName: fareSegment.route?.name,
  originRouteStopId: fareSegment.origin_route_stop_id,
  origin_route_stop_id: fareSegment.origin_route_stop_id,
  destinationRouteStopId: fareSegment.destination_route_stop_id,
  destination_route_stop_id: fareSegment.destination_route_stop_id,
  serviceClass: fareSegment.service_class,
  service_class: fareSegment.service_class,
  basePrice: Number(fareSegment.base_price ?? 0),
  base_price: Number(fareSegment.base_price ?? 0),
  currency: fareSegment.currency,
  validFrom: fareSegment.valid_from,
  valid_from: fareSegment.valid_from,
  validTo: fareSegment.valid_to,
  valid_to: fareSegment.valid_to,
  priority: fareSegment.priority,
  active: fareSegment.active,
  originRouteStop: mapRouteStop(fareSegment.originRouteStop),
  destinationRouteStop: mapRouteStop(fareSegment.destinationRouteStop),
});

const loadValidatedRouteStops = async (companyId, routeId, originRouteStopId, destinationRouteStopId) => {
  const originRouteStop = await RouteStopRepository.findById(originRouteStopId);
  if (!originRouteStop) {
    throw new Error('OriginRouteStopNotFound');
  }

  const destinationRouteStop = await RouteStopRepository.findById(destinationRouteStopId);
  if (!destinationRouteStop) {
    throw new Error('DestinationRouteStopNotFound');
  }

  if (
    Number(originRouteStop.company_id) !== Number(companyId) ||
    Number(destinationRouteStop.company_id) !== Number(companyId)
  ) {
    throw new Error('RouteStopCompanyMismatch');
  }

  if (
    Number(originRouteStop.route_id) !== Number(routeId) ||
    Number(destinationRouteStop.route_id) !== Number(routeId)
  ) {
    throw new Error('RouteStopRouteMismatch');
  }

  if (Number(originRouteStop.id) === Number(destinationRouteStop.id)) {
    throw new Error('FareSegmentSameRouteStop');
  }

  if (Number(originRouteStop.stop_order) >= Number(destinationRouteStop.stop_order)) {
    throw new Error('FareSegmentStopOrderInvalid');
  }

  return { originRouteStop, destinationRouteStop };
};

const getFareSegmentBusinessError = (error) => {
  const message = error?.message || '';

  if (message === 'OriginRouteStopNotFound') return { status: 404, msg: 'OriginRouteStopNotFound' };
  if (message === 'DestinationRouteStopNotFound') return { status: 404, msg: 'DestinationRouteStopNotFound' };
  if (message === 'RouteStopCompanyMismatch') return { status: 400, msg: 'RouteStopCompanyMismatch' };
  if (message === 'RouteStopRouteMismatch') return { status: 400, msg: 'RouteStopRouteMismatch' };
  if (message === 'FareSegmentSameRouteStop') return { status: 400, msg: 'FareSegmentSameRouteStop' };
  if (message === 'FareSegmentStopOrderInvalid') return { status: 400, msg: 'FareSegmentStopOrderInvalid' };

  return null;
};

const FareSegmentController = {
  async index(req, res) {
    logger.info(`${req.user.name} - Busca todos los tramos tarifarios`);

    try {
      const fareSegments = await FareSegmentRepository.findAll();

      if (!fareSegments.length) {
        return res.status(204).json({ msg: 'FareSegmentsNotFound' });
      }

      return res.status(200).json({
        fareSegments: fareSegments.map(mapFareSegment),
      });
    } catch (error) {
      const errorMsg = error.message || 'Error desconocido';
      logger.error('FareSegmentController->index: ' + errorMsg);
      return res.status(500).json({ error: 'ServerError', details: errorMsg });
    }
  },

  async byRoute(req, res) {
    logger.info(`${req.user.name} - Busca tramos tarifarios por ruta`);

    try {
      const { route_id } = req.body;
      const route = await RouteRepository.findById(route_id);
      if (!route) {
        return res.status(404).json({ msg: 'RouteNotFound' });
      }

      const fareSegments = await FareSegmentRepository.findByRoute(route_id);
      if (!fareSegments.length) {
        return res.status(204).json({ msg: 'FareSegmentsNotFound' });
      }

      return res.status(200).json({
        fareSegments: fareSegments.map(mapFareSegment),
      });
    } catch (error) {
      const errorMsg = error.message || 'Error desconocido';
      logger.error('FareSegmentController->byRoute: ' + errorMsg);
      return res.status(500).json({ error: 'ServerError', details: errorMsg });
    }
  },

  async byCompany(req, res) {
    logger.info(`${req.user.name} - Busca tramos tarifarios por compania`);

    try {
      const { company_id } = req.body;
      const company = await CompanyRepository.findById(company_id);
      if (!company) {
        return res.status(404).json({ msg: 'CompanyNotFound' });
      }

      const fareSegments = await FareSegmentRepository.findByCompany(company_id);
      if (!fareSegments.length) {
        return res.status(204).json({ msg: 'FareSegmentsNotFound' });
      }

      return res.status(200).json({
        fareSegments: fareSegments.map(mapFareSegment),
      });
    } catch (error) {
      const errorMsg = error.message || 'Error desconocido';
      logger.error('FareSegmentController->byCompany: ' + errorMsg);
      return res.status(500).json({ error: 'ServerError', details: errorMsg });
    }
  },

  async store(req, res) {
    logger.info(`${req.user.name} - Crea un nuevo tramo tarifario`);
    logger.info('Datos recibidos al crear un tramo tarifario');
    logger.info(JSON.stringify(req.body));

    try {
      const { company_id, route_id, origin_route_stop_id, destination_route_stop_id } = req.body;

      const company = await CompanyRepository.findById(company_id);
      if (!company) {
        return res.status(404).json({ msg: 'CompanyNotFound' });
      }

      const route = await RouteRepository.findById(route_id);
      if (!route) {
        return res.status(404).json({ msg: 'RouteNotFound' });
      }

      await loadValidatedRouteStops(
        company_id,
        route_id,
        origin_route_stop_id,
        destination_route_stop_id
      );

      const fareSegment = await FareSegmentRepository.create(req.body);

      return res.status(201).json({
        msg: 'FareSegmentCreated',
        fareSegment: mapFareSegment(await FareSegmentRepository.findById(fareSegment.id)),
      });
    } catch (error) {
      const businessError = getFareSegmentBusinessError(error);
      if (businessError) {
        return res.status(businessError.status).json({ msg: businessError.msg });
      }
      const errorMsg = error.message || 'Error desconocido';
      logger.error('FareSegmentController->store: ' + errorMsg);
      return res.status(500).json({ error: 'ServerError', details: errorMsg });
    }
  },

  async show(req, res) {
    logger.info(`${req.user.name} - Busca un tramo tarifario con ID ${req.body.id}`);

    try {
      const fareSegment = await FareSegmentRepository.findById(req.body.id);
      if (!fareSegment) {
        return res.status(404).json({ msg: 'FareSegmentNotFound' });
      }

      return res.status(200).json({
        fareSegment: mapFareSegment(fareSegment),
      });
    } catch (error) {
      const errorMsg = error.message || 'Error desconocido';
      logger.error('FareSegmentController->show: ' + errorMsg);
      return res.status(500).json({ error: 'ServerError', details: errorMsg });
    }
  },

  async update(req, res) {
    logger.info(`${req.user.name} - Actualiza el tramo tarifario con ID ${req.body.id}`);
    logger.info('Datos recibidos al editar un tramo tarifario');
    logger.info(JSON.stringify(req.body));

    try {
      const fareSegment = await FareSegmentRepository.findById(req.body.id);
      if (!fareSegment) {
        return res.status(404).json({ msg: 'FareSegmentNotFound' });
      }

      if (req.body.company_id) {
        const company = await CompanyRepository.findById(req.body.company_id);
        if (!company) {
          return res.status(404).json({ msg: 'CompanyNotFound' });
        }
      }

      if (req.body.route_id) {
        const route = await RouteRepository.findById(req.body.route_id);
        if (!route) {
          return res.status(404).json({ msg: 'RouteNotFound' });
        }
      }

      const companyId = req.body.company_id ?? fareSegment.company_id;
      const routeId = req.body.route_id ?? fareSegment.route_id;
      const originRouteStopId = req.body.origin_route_stop_id ?? fareSegment.origin_route_stop_id;
      const destinationRouteStopId = req.body.destination_route_stop_id ?? fareSegment.destination_route_stop_id;

      await loadValidatedRouteStops(
        companyId,
        routeId,
        originRouteStopId,
        destinationRouteStopId
      );

      const updatedFareSegment = await FareSegmentRepository.update(fareSegment, req.body);

      return res.status(200).json({
        msg: 'FareSegmentUpdated',
        fareSegment: mapFareSegment(await FareSegmentRepository.findById(updatedFareSegment.id)),
      });
    } catch (error) {
      const businessError = getFareSegmentBusinessError(error);
      if (businessError) {
        return res.status(businessError.status).json({ msg: businessError.msg });
      }
      const errorMsg = error.message || 'Error desconocido';
      logger.error('FareSegmentController->update: ' + errorMsg);
      return res.status(500).json({ error: 'ServerError', details: errorMsg });
    }
  },

  async destroy(req, res) {
    logger.info(`${req.user.name} - Elimina el tramo tarifario con ID ${req.body.id}`);

    try {
      const fareSegment = await FareSegmentRepository.findById(req.body.id);
      if (!fareSegment) {
        return res.status(404).json({ msg: 'FareSegmentNotFound' });
      }

      await FareSegmentRepository.delete(fareSegment);
      return res.status(200).json({ msg: 'FareSegmentDeleted' });
    } catch (error) {
      const errorMsg = error.message || 'Error desconocido';
      logger.error('FareSegmentController->destroy: ' + errorMsg);
      return res.status(500).json({ error: 'ServerError', details: errorMsg });
    }
  },
};

module.exports = FareSegmentController;
