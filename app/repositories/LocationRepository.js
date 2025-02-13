const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const { Location } = require('../models');
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
};

module.exports = LocationRepository;
