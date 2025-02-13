const { Op } = require('sequelize');
const { Company } = require('../models');
const ImageService = require('../services/ImageService');
const logger = require('../../config/logger'); // Logger para seguimiento

const CompanyRepository = {
  // Obtener todas las compañías
  async findAll() {
    return await Company.findAll({
      attributes: ['id', 'name', 'address', 'image', 'rut', 'phone'],
    });
  },

  // Buscar una compañía por ID
  async findById(id) {
    return await Company.findByPk(id, {
      attributes: ['id', 'name', 'address', 'image', 'rut', 'phone'],
    });
  },

  // Buscar una compañía por RUT, excluyendo una compañía específica
  async existsByRut(rut, excludeId = null) {
    const whereCondition = excludeId ? { rut, id: { [Op.ne]: excludeId } } : { rut };
    return await Company.findOne({ where: whereCondition });
  },

  // Crear una nueva compañía con manejo de imágenes
  async create(body, file) {
    const { name, address, rut, phone, user_id } = body;
    const company = await Company.create({
      name,
      address,
      rut,
      phone,
      user_id,
      image: 'companies/default.jpg', // Imagen predeterminada
    });

    // Manejar archivo si se proporciona
    if (file) {
      const newFilename = ImageService.generateFilename('companies', company.id, file.originalname);
      company.image = await ImageService.moveFile(file, newFilename);
      await company.update({ image: company.image });
    }

    return company;
  },

  // Actualizar una compañía con manejo de imágenes
  async update(company, body, file) {
    const fieldsToUpdate = ['name', 'address', 'rut', 'phone', 'image'];

    const updatedData = Object.keys(body)
      .filter((key) => fieldsToUpdate.includes(key) && body[key] !== undefined)
      .reduce((obj, key) => {
        obj[key] = body[key];
        return obj;
      }, {});

    if (file) {
      // Eliminar imagen anterior si no es la predeterminada
      if (company.image && company.image !== 'companies/default.jpg') {
        await ImageService.deleteFile(company.image);
      }
      const newFilename = ImageService.generateFilename('companies', company.id, file.originalname);
      updatedData.image = await ImageService.moveFile(file, newFilename);
    }

    if (Object.keys(updatedData).length > 0) {
      await company.update(updatedData);
      logger.info(`Compañía actualizada exitosamente (ID: ${company.id})`);
    }

    return company;
  },

  // Eliminar una compañía
  async delete(company) {
    if (company.image && company.image !== 'companies/default.jpg') {
      await ImageService.deleteFile(company.image);
    }

    return await company.destroy();
  },
};

module.exports = CompanyRepository;
