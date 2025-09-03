const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const { Location, BranchRoute, Route } = require('../models');
const logger = require('../../config/logger'); // Logger para seguimiento
const ImageService = require('../services/ImageService');

const LocationRepository = {
  // Obtener todas las ubicaciones
  async findAll() {
    return await Location.findAll({
      attributes: ['id', 'latitude', 'longitude', 'address', 'country', 'city', 'image'],
    });
  },

  // Buscar una ubicación por ID
  async findById(id) {
    return await Location.findByPk(id, {
      attributes: ['id', 'latitude', 'longitude', 'address', 'country', 'city', 'image'],
    });
  },

  // Buscar una ubicación por dirección, país y ciudad, excluyendo una ubicación específica
  async existsByAddress(address = null, country = null, city = null, excludeId = null) {
    const whereCondition = {
      ...(address && { address }),
      ...(country && { country }),
      ...(city && { city }),
      ...(excludeId && { id: { [Op.ne]: excludeId } }),
    };
    return await Location.findOne({ where: whereCondition });
  },

 // Crear una nueva ubicación
 async create(body, file) {
  const { latitude, longitude, address, country, city } = body;

 const location = await Location.create({
    latitude,
    longitude,
    address,
    country,
    city,
    image: 'locations/default.jpg',
  });

  // Manejar archivo si se proporciona
  if (file) {
    const newFilename = ImageService.generateFilename(
      "locations",
      location.id,
      file.originalname
    );
    location.image = await ImageService.moveFile(file, newFilename);
    await location.update({ image: location.image });
  }

  return location;
},

// Actualizar una ubicación
async update(location, body, file) {
  const fieldsToUpdate = ['latitude', 'longitude', 'address', 'country', 'city', 'image'];

  const updatedData = Object.keys(body)
    .filter(key => fieldsToUpdate.includes(key) && body[key] !== undefined)
    .reduce((obj, key) => {
      obj[key] = body[key];
      return obj;
    }, {});

  if (file) {
    if (location.image && location.image !== "locations/default.jpg") {
      await ImageService.deleteFile(location.image);
    }

    const newFilename = ImageService.generateFilename(
      "locations",
      location.id,
      file.originalname
    );
    updatedData.image = await ImageService.moveFile(file, newFilename);
  }

  if (Object.keys(updatedData).length > 0) {
    await location.update(updatedData);
    logger.info(`Ubicación actualizada exitosamente (ID: ${location.id})`);
  }

  return location;
},

  // Eliminar una ubicación
  async delete(location) {
    if (location.image && location.image !== 'locations/default.jpg') {
      await ImageService.deleteFile(location.image);
    }

    return await location.destroy();
  },

async findOriginsAndDestinationsByBranch(branchId) {

    // Paso 1: Obtener rutas asociadas a la sucursal
    const branchRoutes = await BranchRoute.findAll({
        where: { branch_id: branchId },
        include: [
            {
                model: Route,
                as: 'route',
                include: [
                    {
                        model: Location,
                        as: 'origin',
                        attributes: ['id'] // solo necesitamos el id
                    }
                ]
            }
        ]
    });

    // Extraer los origin_ids válidos
    const originIdsInBranch = branchRoutes
        .map(br => br.route.origin?.id)
        .filter(id => id);

    let origins = [];
    let destinations = [];

    if (originIdsInBranch.length > 0) {
        // Caso 1: Sí hay rutas → tomamos el primer origin_id (único esperado)
        const originId = originIdsInBranch[0];

        // Origen: la ubicación con ese ID
        const origin = await Location.findByPk(originId, {
            include: [
                { model: Route, as: 'originRoutes' },
                { model: Route, as: 'destinationRoutes' }
            ]
        });

        origins = origin ? [origin] : [];

        // Destinos: todas las ubicaciones que NO son este origen
        destinations = await Location.findAll({
            where: { id: { [Op.not]: originId } },
            include: [
                { model: Route, as: 'originRoutes' },
                { model: Route, as: 'destinationRoutes' }
            ]
        });

    } else {
        // Caso 2: No hay rutas asociadas a esta sucursal

        // Obtener todos los origin_id de rutas asociadas a CUALQUIER sucursal
        const allBranchRoutes = await BranchRoute.findAll({
            include: [
                {
                    model: Route,
                    as: 'route',
                    attributes: ['origin_id']
                }
            ],
            attributes: []
        });

        const allOriginIdsInAnyBranch = [...new Set(
            allBranchRoutes
                .map(br => br.route.origin_id)
                .filter(id => id)
        )];

        // Orígenes: ubicaciones que NUNCA han sido origen en rutas con sucursal
        origins = await Location.findAll({
            where: { 
                id: allOriginIdsInAnyBranch.length > 0 
                    ? { [Op.notIn]: allOriginIdsInAnyBranch } 
                    : {} // Si no hay orígenes en ninguna sucursal, todos son válidos
            },
            include: [
                { model: Route, as: 'originRoutes' },
                { model: Route, as: 'destinationRoutes' }
            ]
        });

        // Destinos: mismos que los orígenes (por coherencia con la lógica de "no ser origen en sucursales")
        // Alternativa: podrías devolver todas las ubicaciones si prefieres más libertad
        destinations = await Location.findAll({
        include: [
            { model: Route, as: 'originRoutes' },
            { model: Route, as: 'destinationRoutes' }
        ]
    });
    }

    return { origins, destinations };
}
/**async findOriginsAndDestinationsByBranch(branchId) {
    const { Op } = require('sequelize');

    // Paso 1: Obtener rutas asociadas a la sucursal
    const branchRoutes = await BranchRoute.findAll({
        where: { branch_id: branchId },
        include: [
            {
                model: Route,
                as: 'route',
                include: [
                    {
                        model: Location,
                        as: 'origin',
                        attributes: ['id']
                    },
                    {
                        model: Location,
                        as: 'destination',
                        attributes: ['id']
                    }
                ]
            }
        ]
    });

    // Extraer los origin_ids y destination_ids válidos
    const originIdsInBranch = branchRoutes
        .map(br => br.route.origin?.id)
        .filter(id => id);

    const destinationIdsInBranch = branchRoutes
        .map(br => br.route.destination?.id)
        .filter(id => id);

    let origins = [];
    let destinations = [];

    if (originIdsInBranch.length > 0) {
        // Caso 1: Sí hay rutas → tomamos el primer origin_id (único esperado)
        const originId = originIdsInBranch[0];

        const origin = await Location.findByPk(originId, {
            include: [
                { model: Route, as: 'originRoutes' },
                { model: Route, as: 'destinationRoutes' }
            ]
        });

        origins = origin ? [origin] : [];

        // ✅ NUEVO: Destinos = todas las ubicaciones que NO están en destinationIdsInBranch
        // (independientemente de si son origen o no, la regla ahora es: no repetir destinos de rutas de esta sucursal)
        destinations = await Location.findAll({
            where: { 
                id: destinationIdsInBranch.length > 0
                    ? { [Op.notIn]: destinationIdsInBranch }
                    : {} // Si no hay destinos aún, todos son válidos
            },
            include: [
                { model: Route, as: 'originRoutes' },
                { model: Route, as: 'destinationRoutes' }
            ]
        });

    } else {
        // Caso 2: No hay rutas asociadas a esta sucursal

        const allBranchRoutes = await BranchRoute.findAll({
            include: [
                {
                    model: Route,
                    as: 'route',
                    attributes: ['origin_id']
                }
            ],
            attributes: []
        });

        const allOriginIdsInAnyBranch = [...new Set(
            allBranchRoutes
                .map(br => br.route.origin_id)
                .filter(id => id)
        )];

        // Orígenes: ubicaciones que nunca han sido origen en ninguna sucursal
        origins = await Location.findAll({
            where: { 
                id: allOriginIdsInAnyBranch.length > 0 
                    ? { [Op.notIn]: allOriginIdsInAnyBranch } 
                    : {}
            },
            include: [
                { model: Route, as: 'originRoutes' },
                { model: Route, as: 'destinationRoutes' }
            ]
        });

        // Destinos: ✅ TODAS las ubicaciones (sin restricción, porque no hay rutas)
        destinations = await Location.findAll({
            include: [
                { model: Route, as: 'originRoutes' },
                { model: Route, as: 'destinationRoutes' }
            ]
        });
    }

    return { origins, destinations };
} */
};

module.exports = LocationRepository;
