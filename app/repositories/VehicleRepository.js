const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const { Vehicle, Structure } = require('../models'); // Aquí usamos el modelo Vehicle
const logger = require('../../config/logger'); // Logger para seguimiento
const ImageService = require('../services/ImageService');

const VehicleRepository = {
  // Obtener todos los vehículos
  async findAll() {
    return await Vehicle.findAll({
      attributes: ['id', 'brand', 'model', 'plate', 'internal_number', 'rut', 'seats', 'state', 'image', 'structure_id'],
      include: [
        {
          model: Structure,  // Incluir el modelo de Structure
          as: 'structure',   // Nombre de la relación que definiste en el modelo
        }
      ]
    });
  },

  // Buscar un vehículo por ID
  async findById(id) {
    return await Vehicle.findByPk(id, {
      attributes: ['id', 'brand', 'model', 'plate', 'internal_number', 'rut', 'seats', 'state', 'image', 'structure_id'],
      include: [
        {
          model: Structure,  // Incluir el modelo de Structure
          as: 'structure',   // Nombre de la relación que definiste en el modelo
        }
      ]
    });
  },

  // Buscar un vehículo por RUT, placa o número interno, excluyendo un vehículo específico
 async existsByRutOrPlate(rut = null, plate = null, internalNumber = null, excludeId = null) {
  const orConditions = [];

  if (rut != null) {
    orConditions.push({ rut });
  }
  if (plate != null) {
    orConditions.push({ plate });
  }
  if (internalNumber != null) {
    orConditions.push({ internal_number: internalNumber });
  }

  // Si no se pasó ningún identificador, no hay condición de búsqueda
  if (orConditions.length === 0) {
    return null;
  }

  const whereClause = excludeId
    ? { [Op.and]: [{ [Op.or]: orConditions }, { id: { [Op.ne]: excludeId } }] }
    : { [Op.or]: orConditions };

  return await Vehicle.findOne({ where: whereClause });
},

  // Crear un nuevo vehículo con manejo de imágenes
  async create(body, file) {
    const { brand, model, plate, internal_number, rut, seats, state, structure_id } = body;
    const vehicle = await Vehicle.create({
      structure_id,
      brand,
      model,
      plate,
      internal_number,
      rut,
      seats,
      state,
      image: 'vehicles/default.jpg', // Imagen por defecto
    });

    // Manejar archivo si se proporciona
    if (file) {
      const newFilename = ImageService.generateFilename('vehicles', vehicle.id, file.originalname);
      vehicle.image = await ImageService.moveFile(file, newFilename);
      await vehicle.update({ image: vehicle.image });
    }

    return vehicle;
  },

  // Actualizar un vehículo con manejo de imágenes
  async update(vehicle, body, file) {
    const fieldsToUpdate = ['brand', 'model', 'plate', 'internal_number', 'rut', 'seats', 'state', 'image', 'structure_id'];

    const updatedData = Object.keys(body)
      .filter(key => fieldsToUpdate.includes(key) && body[key] !== undefined)
      .reduce((obj, key) => {
        obj[key] = body[key];
        return obj;
      }, {});

    if (file) {
      if (vehicle.image && vehicle.image !== 'vehicles/default.jpg') {
        await ImageService.deleteFile(vehicle.image);
    }

    const newFilename = ImageService.generateFilename('vehicles', vehicle.id, file.originalname);
      updatedData.image = await ImageService.moveFile(file, newFilename);
    }

    if (Object.keys(updatedData).length > 0) {
      logger.info(`Vehículo actualizado exitosamente (ID: ${vehicle.id})`);
      return await vehicle.update(updatedData);
    }

    return await vehicle;
  },

  // Eliminar un vehículo
  async delete(vehicle) {
    if (vehicle.image && vehicle.image !== 'vehicles/default.jpg') {
      await ImageService.deleteFile(vehicle.image);
    }

    return await vehicle.destroy();
  },
};

module.exports = VehicleRepository;
