const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const { Device, Branch } = require('../models');
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
