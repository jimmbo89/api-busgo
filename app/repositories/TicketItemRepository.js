const { TicketItem, TicketType, TripFare, FareSegmentTicketType, FareSegment, RouteStop, Location } = require("../models");

const tripFareInclude = [
  {
    model: TripFare,
    as: "tripFare",
    attributes: ["id", "company_id", "trip_id", "fare_segment_ticket_type_id", "base_price", "price", "active", "source_type"],
    include: [
      {
        model: FareSegmentTicketType,
        as: "fareSegmentTicketType",
        attributes: ["id", "fare_segment_id", "ticket_type_id", "base_price", "active"],
        include: [
          {
            model: FareSegment,
            as: "fareSegment",
            attributes: [
              "id",
              "company_id",
              "route_id",
              "origin_route_stop_id",
              "destination_route_stop_id",
              "base_price",
              "currency",
              "valid_from",
              "valid_to",
              "priority",
              "active",
            ],
            include: [
              {
                model: RouteStop,
                as: "originRouteStop",
                include: [
                  {
                    model: Location,
                    as: "location",
                    attributes: ["id", "address", "country", "city", "image", "active"],
                  },
                ],
              },
              {
                model: RouteStop,
                as: "destinationRouteStop",
                include: [
                  {
                    model: Location,
                    as: "location",
                    attributes: ["id", "address", "country", "city", "image", "active"],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    model: TicketType,
    as: "ticketType",
    attributes: ["id", "name", "description", "active"],
  },
];

const normalizeTicketItemPayload = (ticketId, item = {}) => {
  const quantity = Number(item.quantity ?? item.cant ?? 1);
  const basePriceValue =
    item.base_price ?? item.basePrice ?? item.adjustment_details?.base_price ?? item.adjustmentDetails?.base_price ?? 0;
  const unitPriceValue =
    item.unit_price ?? item.unitPrice ?? item.adjustment_details?.unit_price ?? item.adjustmentDetails?.unit_price ?? basePriceValue;
  const subtotalValue =
    item.subtotal ?? item.subTotal ?? item.adjustment_details?.line_total ?? item.adjustmentDetails?.line_total ?? Number(unitPriceValue) * quantity;

  return {
    id: item.id ?? null,
    ticket_id: ticketId,
    ticket_type_id: item.ticket_type_id ?? item.ticketTypeId ?? null,
    trip_fare_id: item.trip_fare_id ?? item.tripFareId ?? null,
    ticket_type_name: item.ticket_type_name ?? item.ticketTypeName ?? item.name ?? null,
    ticket_type_description: item.ticket_type_description ?? item.ticketTypeDescription ?? item.description ?? null,
    quantity,
    base_price: basePriceValue !== undefined && basePriceValue !== null ? Number(basePriceValue) : 0,
    unit_price: unitPriceValue !== undefined && unitPriceValue !== null ? Number(unitPriceValue) : 0,
    subtotal: subtotalValue !== undefined && subtotalValue !== null ? Number(subtotalValue) : 0,
    currency: item.currency ?? "CLP",
    active: item.active ?? true,
    source_type: item.source_type ?? "auto",
  };
};

const TicketItemRepository = {
  async findByTicket(ticketId, options = {}) {
    return await TicketItem.findAll({
      where: { ticket_id: ticketId },
      order: [["id", "ASC"]],
      include: tripFareInclude,
      ...options,
    });
  },

  async create(ticketId, item, options = {}) {
    const payload = normalizeTicketItemPayload(ticketId, item);
    delete payload.id;
    return await TicketItem.create(payload, options);
  },

  async update(ticketItem, item, options = {}) {
    const payload = normalizeTicketItemPayload(ticketItem.ticket_id, item);
    delete payload.id;
    delete payload.ticket_id;
    return await ticketItem.update(payload, options);
  },

  async delete(ticketItem, options = {}) {
    return await ticketItem.destroy(options);
  },

  async deleteByTicketId(ticketId, options = {}) {
    return await TicketItem.destroy({ where: { ticket_id: ticketId }, ...options });
  },

  async sync(ticketId, items = [], options = {}) {
    const normalizedItems = Array.isArray(items) ? items : [];
    const existingItems = await TicketItem.findAll({
      where: { ticket_id: ticketId },
      order: [["id", "ASC"]],
      transaction: options.transaction || null,
    });

    const existingById = new Map();
    const existingByTripFareId = new Map();
    const existingByTicketTypeId = new Map();

    for (const item of existingItems) {
      existingById.set(String(item.id), item);
      if (item.trip_fare_id !== null && item.trip_fare_id !== undefined) {
        existingByTripFareId.set(String(item.trip_fare_id), item);
      }
      if (item.ticket_type_id !== null && item.ticket_type_id !== undefined) {
        existingByTicketTypeId.set(String(item.ticket_type_id), item);
      }
    }

    const incomingIds = new Set();

    for (const item of normalizedItems) {
      let existing = null;

      if (item.id) {
        incomingIds.add(String(item.id));
        existing = existingById.get(String(item.id)) || null;
      }

      if (!existing && item.trip_fare_id !== null && item.trip_fare_id !== undefined) {
        existing = existingByTripFareId.get(String(item.trip_fare_id)) || null;
      }

      if (!existing && item.ticket_type_id !== null && item.ticket_type_id !== undefined) {
        existing = existingByTicketTypeId.get(String(item.ticket_type_id)) || null;
      }

      if (existing) {
        incomingIds.add(String(existing.id));
        await this.update(existing, item, options);
        continue;
      }

      const created = await this.create(ticketId, item, options);
      incomingIds.add(String(created.id));
    }

    const itemsToDelete = existingItems.filter((item) => !incomingIds.has(String(item.id)));
    for (const item of itemsToDelete) {
      await this.delete(item, options);
    }

    return await this.findByTicket(ticketId, options);
  },
};

module.exports = TicketItemRepository;
