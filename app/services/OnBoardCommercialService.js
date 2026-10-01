'use strict';

const {
  RouteRepository,
  RouteStopRepository,
  FareSegmentRepository,
  BranchVehicleRepository,
  BranchRouteRepository,
} = require('../repositories');
const OnBoardContextService = require('./OnBoardContextService');

const isActive = (value) => value === true || Number(value) === 1;

const getChileDate = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.TZ || 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const values = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      values[part.type] = part.value;
    }
  }

  return `${values.year}-${values.month}-${values.day}`;
};

const isValidForDate = (fareSegment, currentDate) => {
  if (!isActive(fareSegment.active)) {
    return false;
  }

  if (fareSegment.valid_from && currentDate < String(fareSegment.valid_from)) {
    return false;
  }

  if (fareSegment.valid_to && currentDate > String(fareSegment.valid_to)) {
    return false;
  }

  return true;
};

const mapLocation = (location) => location
  ? {
      id: location.id,
      address: location.address,
      country: location.country,
      city: location.city,
      image: location.image,
      active: location.active,
    }
  : null;

const mapRoute = (route) => ({
  id: route.id,
  route_id: route.id,
  code: route.code,
  route_code: route.code,
  name: route.name,
  estimated: route.estimated,
  origin_id: route.origin_id,
  destination_id: route.destination_id,
  distance: route.distance,
  status: route.status,
  origin: mapLocation(route.origin),
  destination: mapLocation(route.destination),
});

const mapRouteStop = (routeStop) => ({
  id: routeStop.id,
  company_id: routeStop.company_id,
  route_id: routeStop.route_id,
  location_id: routeStop.location_id,
  stop_order: routeStop.stop_order,
  distance_km: routeStop.distance_km,
  minutes_from_origin: routeStop.minutes_from_origin,
  allows_boarding: routeStop.allows_boarding,
  allows_alighting: routeStop.allows_alighting,
  active: routeStop.active,
  location: mapLocation(routeStop.location),
});

const mapTripStop = (routeStop) => ({
  id: null,
  company_id: routeStop.company_id,
  trip_id: null,
  route_stop_id: routeStop.id,
  stop_order: routeStop.stop_order,
  arrival_time: null,
  departure_time: null,
  can_board: routeStop.allows_boarding,
  can_alight: routeStop.allows_alighting,
  active: true,
  source_type: 'auto',
  routeStop: mapRouteStop(routeStop),
});

const mapFareSegment = (fareSegment, originRouteStop, destinationRouteStop) => ({
  id: fareSegment.id,
  company_id: fareSegment.company_id,
  route_id: fareSegment.route_id,
  origin_route_stop_id: fareSegment.origin_route_stop_id,
  destination_route_stop_id: fareSegment.destination_route_stop_id,
  base_price: Number(fareSegment.base_price ?? 0),
  currency: fareSegment.currency,
  valid_from: fareSegment.valid_from,
  valid_to: fareSegment.valid_to,
  priority: fareSegment.priority,
  active: true,
  originRouteStop: mapRouteStop(originRouteStop),
  destinationRouteStop: mapRouteStop(destinationRouteStop),
});

const mapPassengerType = (fareSegment, fareSegmentTicketType) => {
  const basePrice = Number(fareSegmentTicketType.base_price ?? 0);
  const ticketType = fareSegmentTicketType.ticketType;

  return {
    id: fareSegmentTicketType.id,
    fare_segment_id: fareSegment.id,
    ticket_type_id: fareSegmentTicketType.ticket_type_id,
    name: ticketType.name,
    description: ticketType.description,
    base_price: basePrice,
    price: basePrice,
    active: true,
  };
};

const buildCommercialData = async ({ routeId, route }) => {
  const [routeStops, fareSegments] = await Promise.all([
    RouteStopRepository.findByRoute(routeId),
    FareSegmentRepository.findByRoute(routeId),
  ]);

  const activeRouteStops = routeStops.filter((routeStop) => isActive(routeStop.active));
  const routeStopsById = new Map(
    activeRouteStops.map((routeStop) => [Number(routeStop.id), routeStop])
  );
  const currentDate = getChileDate();
  const segments = [];

  for (const fareSegment of fareSegments) {
    if (!isValidForDate(fareSegment, currentDate)) {
      continue;
    }

    const originRouteStop = routeStopsById.get(Number(fareSegment.origin_route_stop_id));
    const destinationRouteStop = routeStopsById.get(Number(fareSegment.destination_route_stop_id));
    if (!originRouteStop || !destinationRouteStop) {
      continue;
    }

    const mappedFareSegment = mapFareSegment(
      fareSegment,
      originRouteStop,
      destinationRouteStop
    );
    const passengerTypes = (fareSegment.fareSegmentTicketTypes || [])
      .filter(
        (fareSegmentTicketType) =>
          isActive(fareSegmentTicketType.active) &&
          fareSegmentTicketType.ticketType &&
          isActive(fareSegmentTicketType.ticketType.active)
      )
      .map((fareSegmentTicketType) =>
        mapPassengerType(fareSegment, fareSegmentTicketType)
      );

    if (passengerTypes.length > 0) {
      segments.push({
        ...mappedFareSegment,
        passenger_types: passengerTypes,
      });
    }
  }

  return {
    saleMode: 'on_board',
    route: mapRoute(route),
    tripStops: activeRouteStops.map(mapTripStop),
    segments,
  };
};

const OnBoardCommercialService = {
  async findByRoute({ worker, device_id, route_id }) {
    const routeId = Number(route_id);
    if (!Number.isInteger(routeId) || routeId <= 0) {
      throw new Error('OnBoardRouteDataInvalid');
    }

    const context = await OnBoardContextService.resolve({ worker, device_id });
    const route = await RouteRepository.findById(routeId);

    if (!route) {
      throw new Error('OnBoardRouteNotFound');
    }

    if (!isActive(route.status)) {
      throw new Error('OnBoardRouteInactive');
    }

    const branchVehicles = await BranchVehicleRepository.findByVehicle(
      context.vehicle.id
    );
    const branchIds = branchVehicles.map((item) => Number(item.branch_id));
    const branchRoutes = await BranchRouteRepository.findByBranches(branchIds);
    const routeAvailable = branchRoutes.some(
      (branchRoute) => Number(branchRoute.route_id) === routeId
    );

    if (!routeAvailable) {
      throw new Error('OnBoardRouteUnavailableForVehicle');
    }

    return buildCommercialData({ routeId, route });
  },

  async getCommercialData({ route_id, route }) {
    const routeId = Number(route_id);
    if (!Number.isInteger(routeId) || routeId <= 0) {
      throw new Error('OnBoardRouteDataInvalid');
    }

    const resolvedRoute = route || await RouteRepository.findById(routeId);
    if (!resolvedRoute) {
      throw new Error('OnBoardRouteNotFound');
    }

    return buildCommercialData({ routeId, route: resolvedRoute });
  },
};

module.exports = OnBoardCommercialService;
