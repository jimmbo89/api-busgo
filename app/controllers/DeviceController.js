const logger = require('../../config/logger'); // Logger para seguimiento
const {BranchRepository, DeviceRepository} = require('../repositories');

const DeviceController = {
    // Obtener todos los dispositivos
    async index(req, res) {
        logger.info(`${req.user.name} - Entra a buscar los dispositivos`);

        try {
            const devices = await DeviceRepository.findAll();

            if (!devices.length) {
                return res.status(204).json({ msg: 'DevicesNotFound' });
            }

            const mappedDevices = devices.map(device => ({
                id: device.id,
                branchId: device.branch_id,
                name: device.name,
                mac: device.mac,
                version: device.version,
                image: device.image,
                serial: device.serial,
                status: device.status,
                maintenance: device.maintenance,
                acquisition: device.acquisition,
                notes: device.notes,
                branchName: device.branch.name,
            }));

            res.status(200).json({ devices: mappedDevices });
        } catch (error) {
            logger.error('DeviceController->index: ' + error.message);
            res.status(500).json({ error: 'ServerError', details: error.message });
        }
    },

    // Obtener todos los dispositivos
    async indexBranch(req, res) {
        logger.info(`${req.user.name} - Entra a buscar los dispositivos de una sucursal dada`);

        const { branch_id } = req.body;

        const branch = await BranchRepository.findById(branch_id);
            if (!branch) {
                logger.error(`DeviceController->indexBranch: Sucursal no encontrada con ID ${branch_id}`);
                return res.status(400).json({ msg: 'BranchNotFound' });
            }

        try {
            const devices = await DeviceRepository.findByBranch(branch_id);

            if (!devices.length) {
                return res.status(400).json({ msg: 'DevicesNotFound' });
            }

            const mappedDevices = devices.map(device => ({
                id: device.id,
                branchId: device.branch_id,
                branch_id: device.branch_id,
                name: device.name,
                mac: device.mac,
                version: device.version,
                image: device.image,
                serial: device.serial,
                status: device.status,
                maintenance: device.maintenance,
                acquisition: device.acquisition,
                notes: device.notes,
                branchName: device.branch.name,
                branchImage: device.branch.image,
            }));

            res.status(200).json({ devices: mappedDevices });
        } catch (error) {
            logger.error('DeviceController->index: ' + error.message);
            res.status(500).json({ error: 'ServerError', details: error.message });
        }
    },

    async isDeviceAssociatedWithCompany(req, res) {
        logger.info(`${req.body.mac??req.body.serial } - Verifica si un dispositivo está asociado a una compañía`);
    
        const { mac, serial, companyId } = req.body;
    
        try {
            // Verificar si la compañía existe
            /*const company = await CompanyRepository.findById(companyId);
            if (!company) {
                logger.error(`DeviceController->isDeviceAssociatedWithCompany: Compañía no encontrada con ID ${companyId}`);
                return res.status(400).json({ msg: 'CompanyNotFound' });
            }*/
    
            // Verificar si el dispositivo está asociado a la compañía
            const isAssociated = await DeviceRepository.isDeviceAssociatedWithCompany(mac, serial, companyId);
    
            // Respuesta
            res.status(200).json({ isAssociated });
        } catch (error) {
            logger.error('DeviceController->isDeviceAssociatedWithCompany: ' + error.message);
            res.status(500).json({ error: 'ServerError', details: error.message });
        }
    },

    // Crear un nuevo dispositivo
    async store(req, res) {
        logger.info(`${req.user.name} - Crea un nuevo dispositivo`);
        logger.info('Datos recibidos al crear un dispositivo');
        logger.info(JSON.stringify(req.body));

        const { mac, serial, branch_id } = req.body;

        try {
            // Verificar si la sucursal existe
            const branch = await BranchRepository.findById(branch_id);
            if (!branch) {
                logger.error(`DeviceController->store: Sucursal no encontrada con ID ${branch_id}`);
                return res.status(400).json({ msg: 'BranchNotFound' });
            }

            // Verificar unicidad de MAC y Serial
            const existingDevice = await DeviceRepository.existsByMacOrSerial(mac, serial);

            if (existingDevice) {
                logger.error('MAC o Serial ya están registrados en otro dispositivo');
                return res.status(400).json({ error: 'DuplicateDevice', msg: 'MAC o Serial ya están registrados.' });
            }

            const device = await DeviceRepository.create(req.body, req.file);

            res.status(201).json({ device: device });
        } catch (error) {
            logger.error('DeviceController->store: ' + error.message);
            res.status(500).json({ error: 'ServerError', details: error.message });
        }
    },

    // Obtener un dispositivo por ID
    async show(req, res) {
        logger.info(`${req.user.name} - Busca un dispositivo con ID ${req.body.id}`);

        try {
            const device = await DeviceRepository.findById(req.body.id);

            if (!device) {
                return res.status(404).json({ msg: 'DeviceNotFound' });
            }

            const mappedDevices = {
                id: device.id,
                branchId: device.branch_id,
                name: device.name,
                mac: device.mac,
                version: device.version,
                image: device.image,
                serial: device.serial,
                status: device.status,
                maintenance: device.maintenance,
                acquisition: device.acquisition,
                notes: device.notes,
                branchName: device.branch.name,
            };

            res.status(200).json({ device: mappedDevices });
        } catch (error) {
            logger.error('DeviceController->show: ' + error.message);
            res.status(500).json({ error: 'ServerError', details: error.message });
        }
    },

    // Actualizar un dispositivo
    async update(req, res) {
        logger.info(`${req.user.name} - Actualiza el dispositivo con ID ${req.body.id}`);
        logger.info('Datos recibidos al editar un dispositivo');
        logger.info(JSON.stringify(req.body));

        const { id, mac, serial, branch_id} = req.body;

        try {
            const device = await DeviceRepository.findById(req.body.id);
            if (!device) {
                return res.status(404).json({ msg: 'DeviceNotFound' });
            }

            if (branch_id) {
            // Verificar si la sucursal existe
            const branch = await BranchRepository.findById(branch_id);
            if (!branch) {
                logger.error(`DeviceController->update: Sucursal no encontrada con ID ${branch_id}`);
                return res.status(404).json({ msg: 'BranchNotFound' });
            }    
            }

            // Verificar unicidad de MAC y Serial solo si están presentes
        if (mac || serial) {
            const existingDevice = await DeviceRepository.existsByMacOrSerial(mac, serial, id);

            if (existingDevice) {
                logger.error('MAC o Serial ya están registrados en otro dispositivo');
                return res.status(400).json({ error: 'DuplicateDevice', msg: 'MAC o Serial ya están registrados.' });
            }
        }

        const deviceUpdate = await DeviceRepository.update(device, req.body, req.file);

            res.status(200).json({ device :deviceUpdate });
        } catch (error) {
            logger.error('DeviceController->update: ' + error.message);
            res.status(500).json({ error: 'ServerError', details: error.message });
        }
    },

    // Eliminar un dispositivo
    async destroy(req, res) {
        logger.info(`${req.user.name} - Elimina el dispositivo con ID ${req.body.id}`);

        try {
            const device = await DeviceRepository.findById(req.body.id);

            if (!device) {
                return res.status(404).json({ msg: 'DeviceNotFound' });
            }
            const deviceDestroy = await DeviceRepository.delete(device);

            res.status(200).json({ msg: 'DeviceDeleted' });
        } catch (error) {
            logger.error('DeviceController->destroy: ' + error.message);
            res.status(500).json({ error: 'ServerError', details: error.message });
        }
    },
};

module.exports = DeviceController;
