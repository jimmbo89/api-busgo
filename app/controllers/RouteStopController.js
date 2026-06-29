const logger = require('../../config/logger');
const { RouteStop, Company, Route, Location } = require('../models');
const { RouteStopRepository, CompanyRepository, RouteRepository, LocationRepository } = require('../repositories');

const mapRouteStop = (routeStop) => ({
  id: routeStop.id,
  companyId: routeStop.company_id,
  company_id: routeStop.company_id,
  companyName: routeStop.company?.name,
  companyRut: routeStop.company?.rut,
  routeId: routeStop.route_id,
  route_id: routeStop.route_id,
  routeName: routeStop.route?.name,
  locationId: routeStop.location_id,
  location_id: routeStop.location_id,
  locationName: routeStop.location?.address,
  locationCity: routeStop.location?.city,
  locationCountry: routeStop.location?.country,
  locationImage: routeStop.location?.image,
  stopOrder: routeStop.stop_order,
  stop_order: routeStop.stop_order,
  distanceKm: Number(routeStop.distance_km ?? 0),
  distance_km: Number(routeStop.distance_km ?? 0),
  minutesFromOrigin: routeStop.minutes_from_origin,
  minutes_from_origin: routeStop.minutes_from_origin,
  allowsBoarding: routeStop.allows_boarding,
  allows_boarding: routeStop.allows_boarding,
  allowsAlighting: routeStop.allows_alighting,
  allows_alighting: routeStop.allows_alighting,
  active: routeStop.active,
});

const RouteStopController = {
  async index(req, res) {
    logger.info(`${req.user.name} - Busca todas las paradas de rutas`);

    try {
      const routeStops = await RouteStopRepository.findAll();

      if (!routeStops.length) {
        return res.status(204).json({ msg: 'RouteStopsNotFound' });
      }

      return res.status(200).json({
        routeStops: routeStops.map(mapRouteStop),
      });
    } catch (error) {
      const errorMsg = error.message || 'Error desconocido';
      logger.error('RouteStopController->index: ' + errorMsg);
      return res.status(500).json({ error: 'ServerError', details: errorMsg });
    }
  },

  async byRoute(req, res) {
    logger.info(`${req.user.name} - Busca paradas por ruta`);

    try {
      const { route_id } = req.body;
      const route = await RouteRepository.findById(route_id);
      if (!route) {
        return res.status(404).json({ msg: 'RouteNotFound' });
      }

      const routeStops = await RouteStopRepository.findByRoute(route_id);
      if (!routeStops.length) {
        return res.status(204).json({ msg: 'RouteStopsNotFound' });
      }

      return res.status(200).json({
        routeStops: routeStops.map(mapRouteStop),
      });
    } catch (error) {
      const errorMsg = error.message || 'Error desconocido';
      logger.error('RouteStopController->byRoute: ' + errorMsg);
      return res.status(500).json({ error: 'ServerError', details: errorMsg });
    }
  },

  async byCompany(req, res) {
    logger.info(`${req.user.name} - Busca paradas por compañía`);

    try {
      const { company_id } = req.body;
      const company = await CompanyRepository.findById(company_id);
      if (!company) {
        return res.status(404).json({ msg: 'CompanyNotFound' });
      }

      const routeStops = await RouteStopRepository.findByCompany(company_id);
      if (!routeStops.length) {
        return res.status(204).json({ msg: 'RouteStopsNotFound' });
      }

      return res.status(200).json({
        routeStops: routeStops.map(mapRouteStop),
      });
    } catch (error) {
      const errorMsg = error.message || 'Error desconocido';
      logger.error('RouteStopController->byCompany: ' + errorMsg);
      return res.status(500).json({ error: 'ServerError', details: errorMsg });
    }
  },

  async store(req, res) {
    logger.info(`${req.user.name} - Crea una nueva parada de ruta`);
    logger.info('Datos recibidos al crear una parada de ruta');
    logger.info(JSON.stringify(req.body));

    try {
      const { company_id, route_id, location_id } = req.body;

      const company = await CompanyRepository.findById(company_id);
      if (!company) {
        return res.status(404).json({ msg: 'CompanyNotFound' });
      }

      const route = await RouteRepository.findById(route_id);
      if (!route) {
        return res.status(404).json({ msg: 'RouteNotFound' });
      }

      const location = await LocationRepository.findById(location_id);
      if (!location) {
        return res.status(404).json({ msg: 'LocationNotFound' });
      }

      const routeStop = await RouteStopRepository.create(req.body);

      return res.status(201).json({
        msg: 'RouteStopCreated',
        routeStop: mapRouteStop(await RouteStopRepository.findById(routeStop.id)),
      });
    } catch (error) {
      const errorMsg = error.message || 'Error desconocido';
      logger.error('RouteStopController->store: ' + errorMsg);
      return res.status(500).json({ error: 'ServerError', details: errorMsg });
    }
  },

  async show(req, res) {
    logger.info(`${req.user.name} - Busca una parada de ruta con ID ${req.body.id}`);

    try {
      const routeStop = await RouteStopRepository.findById(req.body.id);
      if (!routeStop) {
        return res.status(404).json({ msg: 'RouteStopNotFound' });
      }

      return res.status(200).json({
        routeStop: mapRouteStop(routeStop),
      });
    } catch (error) {
      const errorMsg = error.message || 'Error desconocido';
      logger.error('RouteStopController->show: ' + errorMsg);
      return res.status(500).json({ error: 'ServerError', details: errorMsg });
    }
  },

  async update(req, res) {
    logger.info(`${req.user.name} - Actualiza la parada de ruta con ID ${req.body.id}`);
    logger.info('Datos recibidos al editar una parada de ruta');
    logger.info(JSON.stringify(req.body));

    try {
      const routeStop = await RouteStop.findByPk(req.body.id);
      if (!routeStop) {
        return res.status(404).json({ msg: 'RouteStopNotFound' });
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

      if (req.body.location_id) {
        const location = await LocationRepository.findById(req.body.location_id);
        if (!location) {
          return res.status(404).json({ msg: 'LocationNotFound' });
        }
      }

      const updatedRouteStop = await RouteStopRepository.update(routeStop, req.body);

      return res.status(200).json({
        msg: 'RouteStopUpdated',
        routeStop: mapRouteStop(updatedRouteStop),
      });
    } catch (error) {
      const errorMsg = error.message || 'Error desconocido';
      logger.error('RouteStopController->update: ' + errorMsg);
      return res.status(500).json({ error: 'ServerError', details: errorMsg });
    }
  },

  async destroy(req, res) {
    logger.info(`${req.user.name} - Elimina la parada de ruta con ID ${req.body.id}`);

    try {
      const routeStop = await RouteStopRepository.findById(req.body.id);
      if (!routeStop) {
        return res.status(404).json({ msg: 'RouteStopNotFound' });
      }

      await RouteStopRepository.delete(routeStop);
      return res.status(200).json({ msg: 'RouteStopDeleted' });
    } catch (error) {
      const errorMsg = error.message || 'Error desconocido';
      logger.error('RouteStopController->destroy: ' + errorMsg);
      return res.status(500).json({ error: 'ServerError', details: errorMsg });
    }
  },
};

module.exports = RouteStopController;
