const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const { Branch, Company } = require('../models');
const ImageService = require('../services/ImageService');
const logger = require('../../config/logger'); // Logger para seguimiento

const BranchRepository = {
  // Obtener todas las sucursales
  async findAll() {
    return await Branch.findAll({
      attributes: ['id', 'name', 'address', 'image', 'rut', 'phone', 'company_id'],
      include: {
        model: Company,
        as: 'company',
        attributes: ['id', 'name', 'image'],
      },
    });
  },

  // Buscar una sucursal por ID
  async findById(id) {
    return await Branch.findByPk(id, {
    attributes: ['id', 'name', 'address', 'image', 'rut', 'phone', 'company_id'],
      include: {
        model: Company,
        as: 'company',
        attributes: ['id', 'name', 'image'],
      },
    });
  },

  async findIdsByCompanyId(company_id) {
    const branches = await Branch.findAll({
      attributes: ['id'],
      where: { company_id },
      raw: true,
    });

    return branches.map((branch) => branch.id);
  },

  // Buscar una sucursal por RUT, excluyendo una sucursal específica
  async existsByRut(rut, excludeId = null) {
    const whereCondition = excludeId ? { rut, id: { [Op.ne]: excludeId } } : { rut };
    return await Branch.findOne({ where: whereCondition });
  },

  // Crear una nueva sucursal con manejo de imágenes
  async create(body, file) {
    const { name, address, rut, phone, image, company_id } = body;
    const branch = await Branch.create({
      name,
      address,
      rut,
      phone,
      image: 'branches/default.jpg',
      company_id, // Asociar la sucursal a la compañía
  });

  // Manejar archivo si se proporciona
  if (file) {
    const newFilename = ImageService.generateFilename('branches', branch.id, file.originalname);
    branch.image = await ImageService.moveFile(file, newFilename);
    await branch.update({ image: branch.image });
  }
  return branch;
  },

  // Actualizar una sucursal con manejo de imágenes
  async update(branch, body, file) {
    const fieldsToUpdate = [ 'name', 'address', 'rut', 'phone', 'image', 'company_id' ];

            const updatedData = Object.keys(body)
                .filter(key => fieldsToUpdate.includes(key) && body[key] !== undefined)
                .reduce((obj, key) => {
                    obj[key] = body[key];
                    return obj;
                }, {});

                if (file) {
                  // Eliminar imagen anterior si no es la predeterminada
                  if (branch.image && branch.image !== 'branches/default.jpg') {
                    await ImageService.deleteFile(branch.image);
                  }
                  const newFilename = ImageService.generateFilename('branches', branch.id, file.originalname);
                  updatedData.image = await ImageService.moveFile(file, newFilename);
                }
            

            if (Object.keys(updatedData).length > 0) {
                await branch.update(updatedData);
                logger.info(`Sucursal actualizada exitosamente (ID: ${branch.id})`);
            }
        return branch;
  },

  // Eliminar una sucursal
  async delete(branch) {
    // Eliminar imagen anterior si no es la predeterminada
    if (branch.image && branch.image !== 'branches/default.jpg') {
      await ImageService.deleteFile(branch.image);
    }

  return await branch.destroy();
  },
};

module.exports = BranchRepository;
