const logger = require('../../config/logger'); // Logger para seguimiento
const { TripWorkerRepository, TripRepository, WorkerRepository, BranchRepository } = require('../repositories');

const TripWorkerController = {
    // Obtener todos los trip workers
    async index(req, res) {
        logger.info(`${req.user.name} - Entra a buscar los trip workers`);

        try {
            const tripWorkers = await TripWorkerRepository.findAll();

            if (!tripWorkers.length) {
                return res.status(204).json({ msg: 'TripWorkersNotFound' });
            }

            const mappedTripWorkers = tripWorkers.map(tripWorker => ({
                id: tripWorker.id,
                branchId: tripWorker.branch_id,
                tripId: tripWorker.trip_id,
                workerId: tripWorker.worker_id,
                date: tripWorker.date,
                branchName: tripWorker.branch.name, // Incluir los datos de la sucursal asociada
                tripName: tripWorker.trip.route.name+'-'+tripWorker.trip.schedule, // Incluir los detalles del viaje asociado
                workerName: tripWorker.worker.name, // Incluir los datos del trabajador asociado
            }));

            res.status(200).json({ tripWorkers: mappedTripWorkers });
        } catch (error) {
            logger.error('TripWorkerController->index: ' + error.message);
            res.status(500).json({ error: 'ServerError', details: error.message });
        }
    },

    // Crear un nuevo trip worker
    async store(req, res) {
        logger.info(`${req.user.name} - Crea un nuevo trip worker`);
        logger.info('datos recibidos al crear un trip worker');
        logger.info(JSON.stringify(req.body));

        const { branch_id, trip_id, worker_id, date } = req.body;
        let tripWorker = {};
        try {
            // Verificar si ya existe un trip worker en la misma sucursal y con el mismo viaje y trabajador en la misma fecha
            const existingTripWorker = await TripWorkerRepository.existsByUpdatedFields({
                branch_id,
                trip_id,
                worker_id,
                date
            });

            if (existingTripWorker) {
                logger.error('Ya existe un trip worker en esa sucursal con el mismo viaje y trabajador en la misma fecha');
                return res.status(400).json({ error: 'DuplicateTripWorker', msg: 'Ya existe un trip worker con esos detalles en esta sucursal.' });
            }

            // Verificar si el viaje, trabajador y sucursal existen
            const trip = await TripRepository.findById(trip_id);
            if (!trip) {
                logger.error(`TripWorkerController->store: Viaje no encontrado con ID ${trip_id}`);
                return res.status(400).json({ msg: 'TripNotFound' });
            }

            const worker = await WorkerRepository.findById(worker_id);
            if (!worker) {
                logger.error(`TripWorkerController->store: Trabajador no encontrado con ID ${worker_id}`);
                return res.status(400).json({ msg: 'WorkerNotFound' });
            }

            const branch = await BranchRepository.findById(branch_id);
            if (!branch) {
                logger.error(`TripWorkerController->store: Sucursal no encontrada con ID ${branch_id}`);
                return res.status(400).json({ msg: 'BranchNotFound' });
            }

            tripWorker = await TripWorkerRepository.create(req.body);

            res.status(201).json({ 'tripWorker': tripWorker });
        } catch (error) {
            const errorMsg = error.details
                ? error.details.map(detail => detail.message).join(', ')
                : error.message || 'Error desconocido';

            logger.error('TripWorkerController->store:' + errorMsg);
            return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Obtener un trip worker por ID
    async show(req, res) {
        logger.info(`${req.user.name} - Busca un trip worker con ID ${req.body.id}`);

        try {
            const tripWorker = await TripWorkerRepository.findById(req.body.id);

            if (!tripWorker) {
                return res.status(404).json({ msg: 'TripWorkerNotFound' });
            }

            const mappedTripWorker = {
                id: tripWorker.id,
                branchId: tripWorker.branch_id,
                tripId: tripWorker.trip_id,
                workerId: tripWorker.worker_id,
                date: tripWorker.date,
                branchName: tripWorker.branch.name, // Incluir los datos de la sucursal asociada
                tripName: tripWorker.trip.route.name+'-'+tripWorker.trip.schedule, // Incluir los detalles del viaje asociado
                workerName: tripWorker.worker.name, // Incluir los datos del trabajador asociado
            };

            res.status(200).json({ tripWorker: mappedTripWorker });
        } catch (error) {
            const errorMsg = error.details
                ? error.details.map(detail => detail.message).join(', ')
                : error.message || 'Error desconocido';
        
            logger.error('TripWorkerController->show:' + errorMsg);
            return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Actualizar un trip worker
    async update(req, res) {
        logger.info(`${req.user.name} - Actualiza el trip worker con ID ${req.body.id}`);
        logger.info('datos recibidos al editar un trip worker');
        logger.info(JSON.stringify(req.body));

        const { id, branch_id, trip_id, worker_id, date } = req.body;

        try {
            const tripWorker = await TripWorkerRepository.findById(id);
            if (!tripWorker) {
                return res.status(404).json({ msg: 'TripWorkerNotFound' });
            }

            // Verificar si ya existe un trip worker en la misma sucursal con el mismo viaje y trabajador en la misma fecha (excluyendo el trip worker actual)
            const existingTripWorker = await TripWorkerRepository.existsByUpdatedFields({
                branch_id,
                trip_id,
                worker_id,
                date
            }, id);

            if (existingTripWorker) {
                logger.error('Ya existe un trip worker en esa sucursal con el mismo viaje y trabajador en la misma fecha');
                return res.status(400).json({ error: 'DuplicateTripWorker', msg: 'Ya existe un trip worker con esos detalles en esta sucursal.' });
            }

            // Verificar si el viaje, trabajador y sucursal existen
            const trip = await TripRepository.findById(trip_id);
            if (!trip) {
                logger.error(`TripWorkerController->update: Viaje no encontrado con ID ${trip_id}`);
                return res.status(400).json({ msg: 'TripNotFound' });
            }

            const worker = await WorkerRepository.findById(worker_id);
            if (!worker) {
                logger.error(`TripWorkerController->update: Trabajador no encontrado con ID ${worker_id}`);
                return res.status(400).json({ msg: 'WorkerNotFound' });
            }

            const branch = await BranchRepository.findById(branch_id);
            if (!branch) {
                logger.error(`TripWorkerController->update: Sucursal no encontrada con ID ${branch_id}`);
                return res.status(400).json({ msg: 'BranchNotFound' });
            }

            const updatedTripWorker = await TripWorkerRepository.update(tripWorker, req.body);

            res.status(200).json({ 'tripWorker': updatedTripWorker });
        } catch (error) {
            const errorMsg = error.details
                ? error.details.map(detail => detail.message).join(', ')
                : error.message || 'Error desconocido';
        
            logger.error('TripWorkerController->update:' + errorMsg);
            return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Eliminar un trip worker
    async destroy(req, res) {
        logger.info(`${req.user.name} - Elimina el trip worker con ID ${req.body.id}`);

        try {
            const tripWorker = await TripWorkerRepository.findById(req.body.id);

            if (!tripWorker) {
                return res.status(404).json({ msg: 'TripWorkerNotFound' });
            }

            await TripWorkerRepository.delete(tripWorker);

            res.status(200).json({ msg: 'TripWorkerDeleted' });
        } catch (error) {
            const errorMsg = error.details
                ? error.details.map(detail => detail.message).join(', ')
                : error.message || 'Error desconocido';
        
            logger.error('TripWorkerController->destroy:' + errorMsg);
            return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Método para asociar varios trabajadores a un viaje
    async associateWorkersTrip(req, res) {
        const {workers, trip_id, branch_id, date} = req.body;

        try {

            // Verificar si el viaje, trabajador y sucursal existen
            const trip = await TripRepository.findById(trip_id);
            if (!trip) {
                logger.error(`TripWorkerController->associateWorkersTrip: Viaje no encontrado con ID ${trip_id}`);
                return res.status(400).json({ msg: 'TripNotFound' });
            }

        // Creamos un array vacío para los trabajadores que no tienen duplicados
        const validWorkers = [];
        const errors = [];
        let tripWorker = [];
        // Crear o actualizar las relaciones en la tabla pivote
        const associations = await Promise.all(
            workers.map(async (worker) => {
            const { worker_id } = worker;

            // Verificar si la persona existe
            const workerInstance = await WorkerRepository.findById(worker_id);
            if (!workerInstance) {
                logger.error(`associateWorkersTrip: No se encontró un trabajador con ID ${worker_id}`);
                errors.push(`WorkerNotFound: ID ${worker_id}`);
                return ;
            }

            const existingAssociation = await TripWorkerRepository.existsByUpdatedFields({branch_id, trip_id, worker_id, date });
            if (!existingAssociation) {
                // Si no existe, lo agregamos al array de trabajadores válidos
                validWorkers.push(worker_id);
            }
            })
        );

        // Si hay errores, devolverlos
        if (errors.length !== 0) {
            return res.status(400).json({ errors });
        }
    

        // Si no hay trabajadores válidos para asociar
        if (validWorkers.length === 0) {
            return res.status(400).json({ msg: 'No hay trabajadores disponibles para asociar (todos ya están asociados).' });
        }

        /*if (filteredPeople.length > 0) {
            const { toAdd, toUpdate, toDelete } =
              await TaskRepository.syncTaskPeople(req.body.id, filteredPeople, t);
            associationsData =
              toAdd.length || toUpdate.length || toDelete.length
                ? { added: toAdd, updated: toUpdate, deleted: toDelete }
                : null;
          }*/
        // Si no hay duplicados, asociamos los trabajadores al viaje
        const result = await TripWorkerRepository.associateWorkersToTrip({
            workers: validWorkers,  // Solo pasamos los trabajadores sin duplicados
            trip_id,
            branch_id,
            date
        });
        

        res.status(200).json({'tripWorker': result});
        } catch (error) {
        res.status(500).json({ error: 'ServerError', details: error.message });
        }
    }
};

module.exports = TripWorkerController;
