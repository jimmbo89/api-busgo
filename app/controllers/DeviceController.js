const logger = require('../../config/logger'); // Logger para seguimiento
const {
    BranchRepository,
    BranchVehicleRepository,
    DeviceRepository,
    DeviceVehicleRepository,
} = require('../repositories');
const DeviceService = require('../services/DeviceService');

const isActive = (value) => value === true || Number(value) === 1;

const getDeviceVehicleStatus = (relation) => {
    if (!relation) {
        return 'NOT_ASSOCIATED';
    }

    return isActive(relation.active)
        ? 'ASSOCIATED_ACTIVE'
        : 'ASSOCIATED_INACTIVE';
};

const deviceMutationErrorDetails = {
    DeviceVehicleActionsInvalid:
        'El campo vehicles debe contener una lista válida de acciones de asociación.',
    DeviceVehicleActionInvalid:
        'Cada vehículo debe indicar una acción válida: associate, activate, deactivate o delete.',
    DeviceVehicleCreateActionInvalid:
        'Al crear un dispositivo solo se permite la acción associate.',
    DeviceVehicleAssociationIdNotAllowed:
        'La acción associate no debe incluir association_id.',
    DeviceVehicleAssociationIdRequired:
        'Las acciones deactivate y delete requieren association_id.',
    DeviceVehicleDuplicateOperation:
        'No se puede procesar más de una acción para la misma asociación en una solicitud.',
    VehicleNotAvailableForBranch:
        'Uno de los vehículos seleccionados no está asociado a la sucursal del dispositivo.',
    DeviceVehicleAssociationNotFound:
        'La asociación indicada no pertenece al dispositivo que se está editando.',
    DeviceVehicleAssociationVehicleMismatch:
        'El vehículo no corresponde a la asociación indicada.',
    ActiveDeviceVehicleConflict:
        'Un dispositivo solo puede tener un vehículo asociado activo.',
};

const getDeviceMutationStatus = (error) => {
    if (error.message === 'DeviceNotFound') {
        return 404;
    }

    if (error.message === 'ActiveDeviceVehicleConflict') {
        return 409;
    }

    if (error.message.startsWith('DeviceVehicle') ||
        error.message === 'VehicleNotAvailableForBranch') {
        return 400;
    }

    return 500;
};

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
                return res.status(204).json({ msg: 'BranchNotFound' });
            }

        try {
            const [devices, branchVehicles] = await Promise.all([
                DeviceRepository.findByBranch(branch_id),
                BranchVehicleRepository.findByBranch(branch_id),
            ]);

            if (!devices.length) {
                return res.status(204).json({ msg: 'DevicesNotFound' });
            }

            const vehicleById = new Map();
            branchVehicles.forEach((branchVehicle) => {
                const vehicle = branchVehicle.vehicle;
                if (vehicle && !vehicleById.has(Number(vehicle.id))) {
                    vehicleById.set(Number(vehicle.id), vehicle);
                }
            });

            const deviceVehicles = await DeviceVehicleRepository.findByDevicesAndVehicles(
                devices.map((device) => device.id),
                Array.from(vehicleById.keys())
            );

            const relationByDeviceAndVehicle = new Map();
            deviceVehicles.forEach((relation) => {
                const key = `${relation.device_id}:${relation.vehicle_id}`;
                const currentRelation = relationByDeviceAndVehicle.get(key);

                if (!currentRelation || isActive(relation.active)) {
                    relationByDeviceAndVehicle.set(key, relation);
                }
            });

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
                vehicles: Array.from(vehicleById.values()).map((vehicle) => {
                    const relation = relationByDeviceAndVehicle.get(
                        `${device.id}:${vehicle.id}`
                    );

                    return {
                        id: vehicle.id,
                        plate: vehicle.plate,
                        internal_number: vehicle.internal_number,
                        internalNumber: vehicle.internal_number,
                        image: vehicle.image,
                        seats: vehicle.seats,
                        state: vehicle.state,
                        device_vehicle_id: relation?.id || null,
                        device_vehicle_branch_id: relation?.branch_id || null,
                        device_vehicle_status: getDeviceVehicleStatus(relation),
                        associated: Boolean(relation),
                        association_active: relation
                            ? isActive(relation.active)
                            : false,
                    };
                }),
            }));

            res.status(200).json({ devices: mappedDevices });
        } catch (error) {
            logger.error('DeviceController->index: ' + error.message);
            res.status(500).json({ error: 'ServerError', details: error.message });
        }
    },

    async isDeviceAssociatedWithCompany(req, res) {
        logger.info(`${req.body.mac??req.body.serial } - Verifica si un dispositivo está asociado a una compañía`);
    
        const { mac, serial, company_id } = req.body;
    
        try {
            // Verificar si la compañía existe
            /*const company = await CompanyRepository.findById(companyId);
            if (!company) {
                logger.error(`DeviceController->isDeviceAssociatedWithCompany: Compañía no encontrada con ID ${companyId}`);
                return res.status(400).json({ msg: 'CompanyNotFound' });
            }*/
    
            // Verificar si el dispositivo está asociado a la compañía
             const result = await DeviceRepository.isDeviceAssociatedWithCompany(mac, serial, company_id);

            res.status(200).json(result);
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

            const result = await DeviceService.create({
                body: req.body,
                file: req.file,
            });

            res.status(201).json({
                device: result.device,
                deviceVehicles: result.deviceVehicles,
            });
        } catch (error) {
            const status = getDeviceMutationStatus(error);
            logger.error('DeviceController->store: ' + error.message);
            res.status(status).json({
                error: status === 500 ? 'ServerError' : 'Error de asociación del vehículo',
                details: deviceMutationErrorDetails[error.message] || error.message,
            });
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

        const result = await DeviceService.update({
            id,
            body: req.body,
            file: req.file,
        });

            res.status(200).json({
                device: result.device,
                deviceVehicles: result.deviceVehicles,
            });
        } catch (error) {
            const status = getDeviceMutationStatus(error);
            logger.error('DeviceController->update: ' + error.message);
            res.status(status).json({
                error: status === 500 ? 'ServerError' : 'Error de asociación del vehículo',
                details: deviceMutationErrorDetails[error.message] || error.message,
            });
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
