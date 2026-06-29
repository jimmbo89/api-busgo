const logger = require('../../config/logger');
const { TripStop, Trip, Branch, Company, Route, RouteStop, Location } = require('../models');
const { TripStopRepository, CompanyRepository, TripRepository, RouteStopRepository } = require('../repositories');

const mapTripStop = (tripStop) => ({
  id: tripStop.id,
  companyId: tripStop.company_id,
  company_id: tripStop.company_id,
  companyName: tripStop.company?.name,
  companyRut: tripStop.company?.rut,
  tripId: tripStop.trip_id,
  trip_id: tripStop.trip_id,
  tripDate: tripStop.trip?.date,
  tripSchedule: tripStop.trip?.schedule,
  routeId: tripStop.trip?.route_id,
  route_id: tripStop.trip?.route_id,
  routeName: tripStop.trip?.route?.name,
  branchId: tripStop.trip?.branch_id,
  branch_id: tripStop.trip?.branch_id,
  branchName: tripStop.trip?.branch?.name,
  routeStopId: tripStop.route_stop_id,
  route_stop_id: tripStop.route_stop_id,
  locationId: tripStop.routeStop?.location_id,
  location_id: tripStop.routeStop?.location_id,
  locationName: tripStop.routeStop?.location?.address,
  locationCity: tripStop.routeStop?.location?.city,
  locationCountry: tripStop.routeStop?.location?.country,
  image: tripStop.routeStop?.location?.image,
  locationImage: tripStop.routeStop?.location?.image,
  stopOrder: tripStop.stop_order,
  stop_order: tripStop.stop_order,
  arrivalTime: tripStop.arrival_time,
  arrival_time: tripStop.arrival_time,
  departureTime: tripStop.departure_time,
  departure_time: tripStop.departure_time,
  canBoard: tripStop.can_board,
  can_board: tripStop.can_board,
  canAlight: tripStop.can_alight,
  can_alight: tripStop.can_alight,
  active: tripStop.active,
  sourceType: tripStop.source_type,
  source_type: tripStop.source_type,
});

const TripStopController = {
  async index(req, res) {
    logger.info(`${req.user.name} - Busca todas las paradas de viajes`);

    try {
      const tripStops = await TripStopRepository.findAll();

      if (!tripStops.length) {
        return res.status(204).json({ msg: 'TripStopsNotFound' });
      }

      return res.status(200).json({
        tripStops: tripStops.map(mapTripStop),
      });
    } catch (error) {
      const errorMsg = error.message || 'Error desconocido';
      logger.error('TripStopController->index: ' + errorMsg);
      return res.status(500).json({ error: 'ServerError', details: errorMsg });
    }
  },

  async byTrip(req, res) {
    logger.info(`${req.user.name} - Busca paradas de viaje por trip`);

    try {
      const { trip_id } = req.body;
      const trip = await TripRepository.findById(trip_id);
      if (!trip) {
        return res.status(404).json({ msg: 'TripNotFound' });
      }

      const tripStops = await TripStopRepository.findByTrip(trip_id);
      if (!tripStops.length) {
        return res.status(204).json({ msg: 'TripStopsNotFound' });
      }

      return res.status(200).json({
        tripStops: tripStops.map(mapTripStop),
      });
    } catch (error) {
      const errorMsg = error.message || 'Error desconocido';
      logger.error('TripStopController->byTrip: ' + errorMsg);
      return res.status(500).json({ error: 'ServerError', details: errorMsg });
    }
  },

  async byCompany(req, res) {
    logger.info(`${req.user.name} - Busca paradas de viaje por compañía`);

    try {
      const { company_id } = req.body;
      const company = await CompanyRepository.findById(company_id);
      if (!company) {
        return res.status(404).json({ msg: 'CompanyNotFound' });
      }

      const tripStops = await TripStopRepository.findByCompany(company_id);
      if (!tripStops.length) {
        return res.status(204).json({ msg: 'TripStopsNotFound' });
      }

      return res.status(200).json({
        tripStops: tripStops.map(mapTripStop),
      });
    } catch (error) {
      const errorMsg = error.message || 'Error desconocido';
      logger.error('TripStopController->byCompany: ' + errorMsg);
      return res.status(500).json({ error: 'ServerError', details: errorMsg });
    }
  },

  async store(req, res) {
    logger.info(`${req.user.name} - Crea una nueva parada de viaje`);
    logger.info('Datos recibidos al crear una parada de viaje');
    logger.info(JSON.stringify(req.body));

    try {
      const { company_id, trip_id, route_stop_id } = req.body;

      const company = await CompanyRepository.findById(company_id);
      if (!company) {
        return res.status(404).json({ msg: 'CompanyNotFound' });
      }

      const trip = await Trip.findByPk(trip_id, {
        include: [
          {
            model: Branch,
            as: 'branch',
            include: [{ model: Company, as: 'company', attributes: ['id'] }],
          },
          {
            model: Route,
            as: 'route',
            attributes: ['id', 'name'],
          },
        ],
      });
      if (!trip) {
        return res.status(404).json({ msg: 'TripNotFound' });
      }

      const routeStop = await RouteStop.findByPk(route_stop_id, {
        include: [
          { model: Company, as: 'company', attributes: ['id'] },
          { model: Route, as: 'route', attributes: ['id'] },
          {
            model: Location,
            as: 'location',
            attributes: ['id', 'address', 'country', 'city', 'image', 'active'],
          },
        ],
      });
      if (!routeStop) {
        return res.status(404).json({ msg: 'RouteStopNotFound' });
      }

      const tripCompanyId = trip.branch?.company_id;
      if (Number(tripCompanyId) !== Number(company_id)) {
        return res.status(400).json({ msg: 'CompanyMismatch' });
      }

      if (Number(routeStop.company_id) !== Number(company_id)) {
        return res.status(400).json({ msg: 'RouteStopCompanyMismatch' });
      }

      if (Number(routeStop.route_id) !== Number(trip.route_id)) {
        return res.status(400).json({ msg: 'RouteStopRouteMismatch' });
      }

      const tripStop = await TripStopRepository.create(req.body);

      return res.status(201).json({
        msg: 'TripStopCreated',
        tripStop: mapTripStop(await TripStopRepository.findById(tripStop.id)),
      });
    } catch (error) {
      const errorMsg = error.message || 'Error desconocido';
      logger.error('TripStopController->store: ' + errorMsg);
      return res.status(500).json({ error: 'ServerError', details: errorMsg });
    }
  },

  async show(req, res) {
    logger.info(`${req.user.name} - Busca una parada de viaje con ID ${req.body.id}`);

    try {
      const tripStop = await TripStopRepository.findById(req.body.id);
      if (!tripStop) {
        return res.status(404).json({ msg: 'TripStopNotFound' });
      }

      return res.status(200).json({
        tripStop: mapTripStop(tripStop),
      });
    } catch (error) {
      const errorMsg = error.message || 'Error desconocido';
      logger.error('TripStopController->show: ' + errorMsg);
      return res.status(500).json({ error: 'ServerError', details: errorMsg });
    }
  },

  async update(req, res) {
    logger.info(`${req.user.name} - Actualiza la parada de viaje con ID ${req.body.id}`);
    logger.info('Datos recibidos al editar una parada de viaje');
    logger.info(JSON.stringify(req.body));

    try {
      const tripStop = await TripStop.findByPk(req.body.id);
      if (!tripStop) {
        return res.status(404).json({ msg: 'TripStopNotFound' });
      }

      const nextCompanyId = req.body.company_id ?? tripStop.company_id;
      const nextTripId = req.body.trip_id ?? tripStop.trip_id;
      const nextRouteStopId = req.body.route_stop_id ?? tripStop.route_stop_id;

      const company = await CompanyRepository.findById(nextCompanyId);
      if (!company) {
        return res.status(404).json({ msg: 'CompanyNotFound' });
      }

      const trip = await Trip.findByPk(nextTripId, {
        include: [
          {
            model: Branch,
            as: 'branch',
            include: [{ model: Company, as: 'company', attributes: ['id'] }],
          },
          {
            model: Route,
            as: 'route',
            attributes: ['id', 'name'],
          },
        ],
      });
      if (!trip) {
        return res.status(404).json({ msg: 'TripNotFound' });
      }

      const routeStop = await RouteStop.findByPk(nextRouteStopId);
      if (!routeStop) {
        return res.status(404).json({ msg: 'RouteStopNotFound' });
      }

      if (Number(trip.branch?.company_id) !== Number(nextCompanyId)) {
        return res.status(400).json({ msg: 'CompanyMismatch' });
      }

      if (Number(routeStop.company_id) !== Number(nextCompanyId)) {
        return res.status(400).json({ msg: 'RouteStopCompanyMismatch' });
      }

      if (Number(routeStop.route_id) !== Number(trip.route_id)) {
        return res.status(400).json({ msg: 'RouteStopRouteMismatch' });
      }

      const updatedTripStop = await TripStopRepository.update(tripStop, req.body);

      return res.status(200).json({
        msg: 'TripStopUpdated',
        tripStop: mapTripStop(updatedTripStop),
      });
    } catch (error) {
      const errorMsg = error.message || 'Error desconocido';
      logger.error('TripStopController->update: ' + errorMsg);
      return res.status(500).json({ error: 'ServerError', details: errorMsg });
    }
  },

  async destroy(req, res) {
    logger.info(`${req.user.name} - Elimina la parada de viaje con ID ${req.body.id}`);

    try {
      const tripStop = await TripStopRepository.findById(req.body.id);
      if (!tripStop) {
        return res.status(404).json({ msg: 'TripStopNotFound' });
      }

      await TripStopRepository.delete(tripStop);
      return res.status(200).json({ msg: 'TripStopDeleted' });
    } catch (error) {
      const errorMsg = error.message || 'Error desconocido';
      logger.error('TripStopController->destroy: ' + errorMsg);
      return res.status(500).json({ error: 'ServerError', details: errorMsg });
    }
  },
};

module.exports = TripStopController;
