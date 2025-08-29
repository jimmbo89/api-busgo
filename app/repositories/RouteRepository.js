const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const { Route, Location, Sequelize, Branch } = require('../models'); // Aquí usamos el modelo Route
const logger = require('../../config/logger'); // Logger para seguimiento

const RouteRepository = {
  // Obtener todas las rutas
  async findAll() {
    return await Route.findAll({
      attributes: ['id', 'name', 'origin_id', 'destination_id', 'distance', 'estimated', 'status'],
      include: [
        {
          model: Location, // Relación con el modelo de origen
          as: 'origin',
          attributes: ['id', 'address', 'image'], // Atributos a incluir de la tabla de origen
        },
        {
          model: Location, // Relación con el modelo de destino
          as: 'destination',
          attributes: ['id', 'address', 'image'], // Atributos a incluir de la tabla de destino
        },
      ],
    });
  },

  // Buscar una ruta por ID
  async findById(id) {
    return await Route.findByPk(id, {
      attributes: ['id', 'name', 'origin_id', 'destination_id', 'distance', 'estimated', 'status'],
      include: [
        {
          model: Location,
          as: 'origin',
          attributes: ['id', 'address', 'image'],
        },
        {
          model: Location,
          as: 'destination',
          attributes: ['id', 'address', 'image'],
        },
      ],
    });
  },

  // Buscar una ruta por nombre, excluyendo una ruta específica
  async existsByName(name, excludeId = null) {
    const whereCondition = excludeId ? { name, id: { [Op.ne]: excludeId } } : { name };
    return await Route.findOne({ where: whereCondition });
  },

  // Crear una nueva ruta
  async create(body) {
    const { name, origin_id, destination_id, distance, estimated, status } = body;

    const route = await Route.create({
      name,
      origin_id,
      destination_id,
      distance,
      estimated,
      status,
    });

    return route;
  },

  // Actualizar una ruta
  async update(route, body) {
    const fieldsToUpdate = ['name', 'origin_id', 'destination_id', 'distance', 'estimated', 'status'];

    const updatedData = Object.keys(body)
      .filter(key => fieldsToUpdate.includes(key) && body[key] !== undefined)
      .reduce((obj, key) => {
        obj[key] = body[key];
        return obj;
      }, {});

    if (Object.keys(updatedData).length > 0) {
      await route.update(updatedData);
      logger.info(`Ruta actualizada exitosamente (ID: ${route.id})`);
    }

    return await route.update(updatedData);
  },

  // Eliminar una ruta
  async delete(route) {
    return await route.destroy();
  },

  // 👇 Nuevo: Obtener rutas asociadas a una branch (solo sus origin_id)
  async findAssociatedRoutesByBranchId(branchId) {
    return await Route.findAll({
      attributes: ['origin_id'],
      include: [
        {
          model: Branch,
          as: 'branches',
          where: { id: branchId },
          attributes: [],
          through: { attributes: [] },
        },
      ],
      raw: true,
    });
  },

  // 👇 Nuevo: Obtener rutas cuyo origin_id esté en el array dado
  async findByOriginIds(originIds) {
    if (!originIds.length) return [];

    return await Route.findAll({
      where: { origin_id: originIds },
      attributes: ['id', 'name', 'origin_id', 'destination_id', 'distance', 'estimated', 'status'],
      include: [
        {
          model: Location,
          as: 'origin',
          attributes: ['id', 'address', 'image'],
        },
        {
          model: Location,
          as: 'destination',
          attributes: ['id', 'address', 'image'],
        },
      ],
    });
  },

  // 👇 Nuevo: Obtener rutas cuyo origin_id NO esté en uso por ninguna branch
  async findRoutesWithUnusedOrigins() {
  // Paso 1: Obtener los origin_id que están en uso por ALGUNA branch
  const usedOriginIdsResult = await Route.findAll({
  attributes: ['origin_id'],
  include: [
    {
      model: Branch,
      as: 'branches',
      attributes: [],
      through: { attributes: [] },
      required: true, 
    },
  ],
  where: {
    origin_id: { [Op.ne]: null }
  },
  raw: true,
});

  logger.info('origenes empleados ya');
  logger.info(JSON.stringify(usedOriginIdsResult));
  const usedOriginIds = usedOriginIdsResult.map(r => r.origin_id);

  // Paso 2: Buscar rutas cuyo origin_id NO esté en esa lista
  const whereClause = usedOriginIds.length > 0
    ? { origin_id: { [Op.notIn]: usedOriginIds } }
    : {};

  return await Route.findAll({
    where: whereClause,
    attributes: ['id', 'name', 'origin_id', 'destination_id', 'distance', 'estimated', 'status'],
    include: [
      {
        model: Location,
        as: 'origin',
        attributes: ['id', 'address', 'image'],
      },
      {
        model: Location,
        as: 'destination',
        attributes: ['id', 'address', 'image'],
      },
    ],
  });
},
};

module.exports = RouteRepository;
