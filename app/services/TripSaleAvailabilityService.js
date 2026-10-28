'use strict';

const isEnabled = (value) => (
  value === undefined ||
  value === null ||
  value === true ||
  value === 1 ||
  value === '1'
);

const normalizeDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
};

const getRouteStopId = (tripStop) => Number(
  tripStop?.route_stop_id ?? tripStop?.routeStop?.id ?? NaN
);

const getTripFareId = (item) => Number(
  item?.trip_fare_id ?? item?.tripFareId ?? NaN
);

const getFareSegmentId = (tripFare) => Number(
  tripFare?.tripSegment?.source_fare_segment_id ??
    tripFare?.fareSegmentTicketType?.fareSegment?.id ??
    tripFare?.fareSegmentTicketType?.fare_segment_id ??
    NaN
);

const getError = (code, tripFare, details = {}) => ({
  code,
  details: {
    trip_fare_id: tripFare?.id ?? null,
    fare_segment_id: getFareSegmentId(tripFare),
    ...details,
  },
});

const isFareSegmentValidForTripDate = (fareSegment, tripDate) => {
  if (!isEnabled(fareSegment?.active)) return false;

  const currentDate = normalizeDate(tripDate);
  const validFrom = normalizeDate(fareSegment?.valid_from);
  const validTo = normalizeDate(fareSegment?.valid_to);

  if (currentDate && validFrom && currentDate < validFrom) return false;
  if (currentDate && validTo && currentDate > validTo) return false;

  return true;
};

const isFareSegmentInactive = (fareSegment) => (
  !isEnabled(fareSegment?.active)
);

const findTripFare = (trip, tripFareId) => {
  const normalizedId = Number(tripFareId);
  if (!Number.isInteger(normalizedId) || normalizedId <= 0) return null;

  return (Array.isArray(trip?.tripFares) ? trip.tripFares : []).find(
    (tripFare) => Number(tripFare?.id) === normalizedId
  ) || null;
};

const validateTripFareAvailability = ({ trip, tripFare }) => {
  if (!tripFare || Number(tripFare.trip_id) !== Number(trip?.id)) {
    return getError('TripFareNotIncluded', tripFare);
  }

  const directFares = Array.isArray(trip?.tripFares)
    ? trip.tripFares.filter((item) => item?.tripSegment)
    : [];
  const hasDirectConfiguration = directFares.length > 0 ||
    (Array.isArray(trip?.tripSegments) && trip.tripSegments.length > 0);
  if (hasDirectConfiguration && !tripFare.tripSegment) {
    return getError('TripFareNotIncluded', tripFare, {
      reason: 'direct_trip_configuration_has_priority',
    });
  }

  if (!isEnabled(tripFare.active)) {
    return getError('TripFareInactive', tripFare);
  }

  const directSegment = tripFare.tripSegment;
  const hasDirectSegment = Boolean(
    directSegment &&
      Number(directSegment.origin_trip_stop_id) > 0 &&
      Number(directSegment.destination_trip_stop_id) > 0
  );
  const fareSegmentTicketType = tripFare.fareSegmentTicketType;
  const fareSegment = fareSegmentTicketType?.fareSegment;

  if (hasDirectSegment) {
    const directTicketType = tripFare.ticketType || fareSegmentTicketType?.ticketType;
    if (directTicketType && !isEnabled(directTicketType.active)) {
      return getError('TripFareUnavailable', tripFare, {
        ticket_type_id: directTicketType.id,
      });
    }

    if (isFareSegmentInactive(directSegment)) {
      return getError('TripSegmentInactive', tripFare, {
        trip_segment_id: directSegment.id,
      });
    }

    if (!isFareSegmentValidForTripDate(directSegment, trip?.date)) {
      return getError('FareSegmentOutOfValidity', tripFare, {
        trip_segment_id: directSegment.id,
      });
    }
  } else {
    if (!fareSegmentTicketType || !isEnabled(fareSegmentTicketType.active)) {
      return getError('TripFareUnavailable', tripFare);
    }

    const legacyTicketType = fareSegmentTicketType?.ticketType;
    if (legacyTicketType && !isEnabled(legacyTicketType.active)) {
      return getError('TripFareUnavailable', tripFare, {
        ticket_type_id: legacyTicketType.id,
      });
    }

    if (!fareSegment) {
      return getError('TripFareUnavailable', tripFare);
    }

    if (isFareSegmentInactive(fareSegment)) {
      return getError('FareSegmentInactive', tripFare);
    }

    if (!isFareSegmentValidForTripDate(fareSegment, trip?.date)) {
      return getError('FareSegmentOutOfValidity', tripFare);
    }
  }

  const tripStops = Array.isArray(trip?.tripStops) ? trip.tripStops : null;

  // findByIdWithTickets always returns this array in production. If a legacy
  // caller supplies a reduced trip projection, preserve its previous behavior.
  if (!tripStops) return null;

  const originStop = hasDirectSegment
    ? tripStops.find(
        (tripStop) => Number(tripStop.id) === Number(directSegment.origin_trip_stop_id)
      )
    : tripStops.find(
        (tripStop) => getRouteStopId(tripStop) === Number(fareSegment.origin_route_stop_id)
      );
  const destinationStop = hasDirectSegment
    ? tripStops.find(
        (tripStop) => Number(tripStop.id) === Number(directSegment.destination_trip_stop_id)
      )
    : tripStops.find(
        (tripStop) => getRouteStopId(tripStop) === Number(fareSegment.destination_route_stop_id)
      );

  if (!originStop || !destinationStop) {
    return getError('TripStopsUnavailable', tripFare, {
      ...(hasDirectSegment
        ? {
            origin_trip_stop_id: Number(directSegment.origin_trip_stop_id),
            destination_trip_stop_id: Number(directSegment.destination_trip_stop_id),
          }
        : {
            origin_route_stop_id: Number(fareSegment.origin_route_stop_id),
            destination_route_stop_id: Number(fareSegment.destination_route_stop_id),
          }),
    });
  }

  if (
    !isEnabled(originStop.active) ||
    !isEnabled(originStop.routeStop?.active) ||
    !isEnabled(originStop.location?.active)
  ) {
    return getError('TripOriginStopUnavailable', tripFare, {
      ...(hasDirectSegment
        ? { trip_stop_id: Number(directSegment.origin_trip_stop_id) }
        : { route_stop_id: Number(fareSegment.origin_route_stop_id) }),
    });
  }

  if (
    !isEnabled(destinationStop.active) ||
    !isEnabled(destinationStop.routeStop?.active) ||
    !isEnabled(destinationStop.location?.active)
  ) {
    return getError('TripDestinationStopUnavailable', tripFare, {
      ...(hasDirectSegment
        ? { trip_stop_id: Number(directSegment.destination_trip_stop_id) }
        : { route_stop_id: Number(fareSegment.destination_route_stop_id) }),
    });
  }

  const canBoard = originStop.can_board ?? originStop.routeStop?.allows_boarding;
  const canAlight = destinationStop.can_alight ?? destinationStop.routeStop?.allows_alighting;
  if (!isEnabled(canBoard)) {
    return getError('TripOriginStopUnavailable', tripFare, {
      ...(hasDirectSegment
        ? { trip_stop_id: Number(directSegment.origin_trip_stop_id) }
        : { route_stop_id: Number(fareSegment.origin_route_stop_id) }),
      reason: 'can_board',
    });
  }

  if (!isEnabled(canAlight)) {
    return getError('TripDestinationStopUnavailable', tripFare, {
      ...(hasDirectSegment
        ? { trip_stop_id: Number(directSegment.destination_trip_stop_id) }
        : { route_stop_id: Number(fareSegment.destination_route_stop_id) }),
      reason: 'can_alight',
    });
  }

  const originOrder = Number(originStop.stop_order ?? originStop.routeStop?.stop_order);
  const destinationOrder = Number(
    destinationStop.stop_order ?? destinationStop.routeStop?.stop_order
  );

  if (
    !Number.isFinite(originOrder) ||
    !Number.isFinite(destinationOrder) ||
    originOrder >= destinationOrder
  ) {
    return getError('TripSegmentOrderInvalid', tripFare, {
      ...(hasDirectSegment
        ? {
            origin_trip_stop_id: Number(directSegment.origin_trip_stop_id),
            destination_trip_stop_id: Number(directSegment.destination_trip_stop_id),
          }
        : {
            origin_route_stop_id: Number(fareSegment.origin_route_stop_id),
            destination_route_stop_id: Number(fareSegment.destination_route_stop_id),
          }),
      origin_order: originOrder,
      destination_order: destinationOrder,
    });
  }

  return null;
};

const validateTripSaleAvailability = ({
  trip,
  ticketItems = [],
  fareSegmentIds = [],
  requireFare = false,
}) => {
  const tripFares = Array.isArray(trip?.tripFares) ? trip.tripFares : null;
  if (!tripFares) return null;

  const hasTicketItems = Array.isArray(ticketItems) && ticketItems.length > 0;
  const hasFareSegmentIds = Array.isArray(fareSegmentIds) && fareSegmentIds.some(
    (fareSegmentId) => Number.isInteger(Number(fareSegmentId)) && Number(fareSegmentId) > 0
  );
  const hasDirectConfiguration = (
    (Array.isArray(trip?.tripSegments) && trip.tripSegments.length > 0) ||
    tripFares.some((tripFare) => tripFare?.tripSegment)
  );
  if (!hasTicketItems && !hasFareSegmentIds && (requireFare || hasDirectConfiguration)) {
    return {
      code: 'TripFareRequired',
      details: {},
    };
  }

  const validatedTripFareIds = new Set();
  for (const item of Array.isArray(ticketItems) ? ticketItems : []) {
    const tripFareId = getTripFareId(item);
    if (!Number.isInteger(tripFareId) || tripFareId <= 0) {
      return {
        code: 'TripFareNotIncluded',
        details: {},
      };
    }

    const tripFare = findTripFare(trip, tripFareId);
    const error = validateTripFareAvailability({ trip, tripFare });
    if (error) return error;
    validatedTripFareIds.add(tripFareId);
  }

  for (const rawFareSegmentId of Array.isArray(fareSegmentIds) ? fareSegmentIds : []) {
    const fareSegmentId = Number(rawFareSegmentId);
    if (!Number.isInteger(fareSegmentId) || fareSegmentId <= 0) continue;

    const matchingTripFares = tripFares.filter(
      (tripFare) => getFareSegmentId(tripFare) === fareSegmentId
    );
    if (matchingTripFares.length === 0) {
      return {
        code: 'TripFareNotIncluded',
        details: { fare_segment_id: fareSegmentId },
      };
    }

    if (matchingTripFares.some((tripFare) => (
      validatedTripFareIds.has(Number(tripFare.id))
    ))) {
      continue;
    }

    for (const tripFare of matchingTripFares) {
      const error = validateTripFareAvailability({ trip, tripFare });
      if (error) return error;
    }
  }

  return null;
};

module.exports = {
  findTripFare,
  isFareSegmentValidForTripDate,
  validateTripFareAvailability,
  validateTripSaleAvailability,
};
