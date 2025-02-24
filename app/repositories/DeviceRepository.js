const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const { Device, Branch, Company } = require('../models');
const logger = require('../../config/logger'); // Logger para seguimiento
const ImageService = require('../services/ImageService');

const  DeviceRepository = {
    async findAll() {
        return await Device.findAll({
            attributes: ['id', 'name', 'mac', 'version', 'image', 'serial', 'status', 'maintenance', 'acquisition', 'notes', 'branch_id'],
            include: {
                model: Branch, as: 'branch',
                attributes: ['id', 'name'],
            },
        });
    },

    async isDeviceAssociatedWithCompany(mac, serial, companyId = null) {
        try {
            // Construir dinámicamente el objeto `where`
            const whereClause = {};
            if (mac) {
                whereClause.mac = mac;
            }
            if (serial) {
                whereClause.serial = serial;
            }

            // Si no hay ningún filtro (mac y serial son null), retornar false
            if (Object.keys(whereClause).length === 0) {
                return false;
            }

            // Construir dinámicamente el objeto `include`
            const includeClause = [
                {
                    model: Branch,
                    as: 'branch',
                    include: [],
                },
            ];

            // Si companyId está presente, agregar el filtro de compañía
            if (companyId) {
                includeClause[0].include.push({
                    model: Company,
                    as: 'company',
                    where: { id: companyId },
                });
            }

            // Buscar el dispositivo
            const device = await Device.findOne({
                where: whereClause,
                include: includeClause,
            });

            // Si se encuentra el dispositivo, retornar true
            return !!device;
        } catch (error) {
            throw new Error(`Error en DeviceRepository->isDeviceAssociatedWithCompany: ${error.message}`);
        }
    },

    async findById(id) {
        return await Device.findByPk(id, {
            attributes: ['id', 'name', 'mac', 'version', 'image', 'serial', 'status', 'maintenance', 'acquisition', 'notes', 'branch_id'],
            include: {
                model: Branch, as: 'branch',
                attributes: ['id', 'name'],
            },
        });
    },

    async findByBranch(branchId) {
        return await Device.findAll({
            attributes: ['id', 'name', 'mac', 'version', 'image', 'serial', 'status', 'maintenance', 'acquisition', 'notes', 'branch_id'],
            where: { branch_id: branchId },
            include: {
                model: Branch,
                as: 'branch',
                attributes: ['id', 'name', 'image'],
            },
        });
    },

    async create(body, file) {
        // Filtrar solo los campos necesarios del body
        const { name, mac, version, serial, status, maintenance, acquisition, notes, branch_id, } = body;

        const device = await Device.create({
            name,
            mac,
            version,
            serial,
            status,
            maintenance,
            acquisition,
            notes,
            branch_id,
            image: 'devices/default.jpg', // Imagen por defecto
        });

        // Manejar archivo si se proporciona
        if (file) {
            const newFilename = ImageService.generateFilename('devices', device.id, file.originalname);
            device.image = await ImageService.moveFile(file, newFilename);
            await device.update({ image: device.image });
        }

        return device;
    },

    async update(device, body, file) {
        const fieldsToUpdate = ['name', 'mac', 'version', 'serial', 'status', 'maintenance', 'acquisition', 'notes', 'branch_id'];

            const updatedData = Object.keys(body)
                .filter(key => fieldsToUpdate.includes(key) && body[key] !== undefined)
                .reduce((obj, key) => {
                    obj[key] = body[key];
                    return obj;
                }, {});

            if (file) {
                if (device.image && device.image !== 'devices/default.jpg') {
                    await ImageService.deleteFile(device.image);
                }

                const newFilename = ImageService.generateFilename('devices', device.id, file.originalname);
                  updatedData.image = await ImageService.moveFile(file, newFilename);
            }

            if (Object.keys(updatedData).length > 0) {
                await device.update(updatedData);
                logger.info(`Dispositivo actualizado exitosamente (ID: ${device.id})`);
            }
        return await device.update(updatedData);
    },

    async delete(device) {
        if (device.image && device.image !== 'devices/default.jpg') {
            await ImageService.deleteFile(device.image);
        }

        return await device.destroy();
    },

    async existsByMacOrSerial(mac, serial, excludeId = null) {
        const whereClause = excludeId
            ? { [Op.or]: [{ mac }, { serial }], id: { [Op.ne]: excludeId } }
            : { [Op.or]: [{ mac }, { serial }] };

        return await Device.findOne({ where: whereClause });
    }
};

module.exports =  DeviceRepository;
