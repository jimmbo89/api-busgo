const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const { Route, Location } = require('../models'); // Aquí usamos el modelo Route
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
};

module.exports = RouteRepository;
