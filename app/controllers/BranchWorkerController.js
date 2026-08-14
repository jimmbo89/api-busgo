const { BranchWorker, Branch, Worker, Role, sequelize } = require('../models');
const logger = require('../../config/logger');
const { BranchWorkerRepository, BranchRepository, WorkerRepository, RoleRepository, TicketTypeRepository } = require('../repositories');

const BranchWorkerController = {
    // Obtener todas las relaciones Branch-Worker
    async index(req, res) {
        logger.info(`${req.user.name} - Busca todas las relaciones Branch-Worker`);
        try {
            const branchWorkers = await BranchWorkerRepository.index();

            // Mapeamos los resultados para obtener solo los IDs y nombres
            const mappedBranchWorkers = branchWorkers.map(branchWorker => ({
                id: branchWorker.id,
                branchId: branchWorker.branch.id,
                branchName: branchWorker.branch.name,
                workerId: branchWorker.worker.id,
                workerName: branchWorker.worker.name,
                roleId: branchWorker.role.id,
                roleName: branchWorker.role.name
            }));

            res.status(200).json({ 'branchWorkers': mappedBranchWorkers });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('BranchWorkerController->index: ' + errorMsg);
            res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    async branch_workers(req, res) {
        logger.info(`${req.user.name} - Busca todas las relaciones Branch-Worker`);
        try {

            const { branch_id } = req.body;
        
            const branch = await BranchRepository.findById(branch_id);
            if (!branch) {
                logger.error(`BranchWorkerController->branch_workers: Sucursal no encontrada con ID ${branch_id}`);
                return res.status(404).json({ msg: 'BranchNotFound' });
            }

            const branchWorkers = await BranchWorkerRepository.findByBranch(req.body.branch_id);

            // Mapeamos los resultados para obtener solo los IDs y nombres
            const mappedBranchWorkers = branchWorkers.map(branchWorker => ({
                id: branchWorker.id,
                branchId: branchWorker.branch_id,
                branch_id: branchWorker.branch_id,
                workerId: branchWorker.worker_id,
                worker_id: branchWorker.worker_id,
                workerName: branchWorker.worker.name,
                workerImage: branchWorker.worker.image,
                roleId: branchWorker.role_id,
                role_id: branchWorker.role_id,
                roleName: branchWorker.role.name
            }));

            res.status(200).json({ 'branchWorkers': mappedBranchWorkers });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('BranchWorkerController->index: ' + errorMsg);
            res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    async worker_branches1(req, res) {
        logger.info(`${req.user.name} - Busca todas las sucursales asociadas a un worker`);
        try {
            let { worker_id:bodyWorkerId } = req.body;
            // Verifica si worker_id es undefined, null o 0
            let worker_id = bodyWorkerId || req.worker.id;
            
            // Buscar todas las relaciones Branch-Worker para el worker_id dado
            const workerBranches = await BranchWorkerRepository.findByWorker(worker_id);
    
            // Si no se encuentran relaciones, devolver un mensaje adecuado
            if (!workerBranches || workerBranches.length === 0) {
                logger.error(`BranchWorkerController->worker_branches: No se encontraron sucursales para el worker con ID ${worker_id}`);
                return res.status(404).json({ msg: 'NoBranchesFoundForWorker' });
            }
    
            // Mapear los resultados para obtener solo los datos necesarios de las sucursales
            const mappedBranches = workerBranches.map(branchWorker => ({
                id: branchWorker.branch.id,
                name: branchWorker.branch.name,
                role: branchWorker.role.name,
                role_id: branchWorker.role_id,
                roleId: branchWorker.role_id,
                image: branchWorker.branch.image,
            }));
    
            // Devolver la respuesta con las sucursales mapeadas
            res.status(200).json({ branches: mappedBranches });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('BranchWorkerController->worker_branches: ' + errorMsg);
            res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    async worker_branches(req, res) {
    logger.info(`${req.user.name} - Busca todas las sucursales con workers, incluyendo siempre al worker actual`);
    try {
        const { worker_id: bodyWorkerId } = req.body;
        const targetWorkerId = bodyWorkerId || req.worker.id;

        // Llamada al repositorio: toda la lógica está encapsulada
        const branches = await BranchWorkerRepository.findAllBranchesWithWorkersIncluding(targetWorkerId);

        if (!branches || branches.length === 0) {
        // Puedes decidir: ¿es error si no hay sucursales? O solo devolver array vacío.
        return res.status(404).json({ msg: 'NoBranchesFound' });
        }

        res.status(200).json({ branches });
    } catch (error) {
        const errorMsg = error.message || 'Error desconocido';
        logger.error('BranchWorkerController->worker_branches: ' + errorMsg);

        // Manejo específico de errores conocidos
        if (errorMsg === 'Target worker not found') {
        return res.status(404).json({ msg: 'WorkerNotFound' });
        }

        res.status(500).json({ error: 'ServerError', details: errorMsg });
    }
    },

    async worker_branches_ticket_types(req, res) {
    logger.info(`${req.user.name} - Busca sucursales con workers y tipos de pasaje`);
    try {
        const branches = await BranchWorkerRepository.findAllBranchesWithWorkers();

        if (!branches || branches.length === 0) {
        return res.status(404).json({ msg: 'NoBranchesFound' });
        }

        const ticketTypes = await TicketTypeRepository.findByActiveStatus(1);
        const mappedTicketTypes = ticketTypes.map((ticketType) => ({
        ...ticketType.toJSON(),
        adjustmentType: ticketType.adjustment_type,
        valueType: ticketType.value_type,
        adjustmentValue: ticketType.adjustment_value,
        }));

        res.status(200).json({
        branches,
        ticketTypes: mappedTicketTypes,
        });
    } catch (error) {
        const errorMsg = error.message || 'Error desconocido';
        logger.error('BranchWorkerController->worker_branches_ticket_types: ' + errorMsg);

        res.status(500).json({ error: 'ServerError', details: errorMsg });
    }
    },
    
    async getBranchWorkersRole(req, res) {
        logger.info(`${req.user.name} - Entra a la ruta unificada de Asociar trabajador a la sucursal`);

        const { branch_id, type } = req.body;
        
            const branch = await BranchRepository.findById(branch_id);
            if (!branch) {
                logger.error(`BranchWorkerController->branch_workers: Sucursal no encontrada con ID ${branch_id}`);
                return res.status(404).json({ msg: 'BranchNotFound' });
            }

        try {
          const workers = await BranchWorkerRepository.findWorkersWithoutBranch();
     
          // Mapeamos los resultados para obtener solo los IDs y nombres
          const mappedWorkers = workers.map((worker) => ({
            id: worker.id,
            worker_id: worker.id,
            name: worker.name,
            image: worker.image,
            email: worker.email,
            role_id: worker.role_id,
            roleName: worker.role.name
          }));

          const roles = await RoleRepository.findByType(null);
      
          if (!roles || roles.length === 0) {
            return res.status(404).json({ message: 'No se encontraron roles para el tipo especificado.' });
          }
    
          res.json({
            workers: mappedWorkers,
            roles: roles,
          });
        } catch (error) {
          const errorMsg = error.details
            ? error.details.map((detail) => detail.message).join(", ")
            : error.message || "Error desconocido";
    
          logger.error("BranchWorkerController->getBranchWorkersRole:" + errorMsg);
          return res.status(500).json({ error: "ServerError", details: errorMsg });
        }
      },

    // Crear una nueva relación Branch-Worker
    async store(req, res) {
        logger.info(`${req.user.name} - Crea una nueva relación Branch-Worker`);

        const { branch_id, worker_id, role_id } = req.body;

        const branch = await Branch.findByPk(branch_id);
        if (!branch) {
            logger.error(`BranchWorkerController->store: Sucursal no encontrada con ID ${branch_id}`);
            return res.status(404).json({ msg: 'BranchNotFound' });
        }

        const worker = await Worker.findByPk(worker_id);
        if (!worker) {
            logger.error(`BranchWorkerController->store: Trabajador no encontrada con ID ${worker_id}`);
            return res.status(404).json({ msg: 'WorkerNotFound' });
        }

        const role = await Role.findByPk(role_id);
        if (!role) {
            logger.error(`BranchWorkerController->store: Rol no encontrada con ID ${role_id}`);
            return res.status(404).json({ msg: 'RoleNotFound' });
        }
            
        try {
            const branchWorker = await BranchWorker.create({
                branch_id: branch_id,
                worker_id: worker_id,
                role_id: role_id
            });
            res.status(201).json({ msg: 'BranchWorkerCreated', branchWorker });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('BranchWorkerController->store: ' + errorMsg);
            res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Obtener una relación específica Branch-Worker por ID
    async show(req, res) {
        logger.info(`${req.user.name} - Busca la relación Branch-Worker con ID: ${req.body.id}`);

        try {
            const branchWorker = await BranchWorker.findByPk(req.body.id, {
                include: [
                    { model: Branch, as: 'branch', atributes: ['id', 'name'] },
                    { model: Worker, as: 'worker', atributes: ['id', 'name'] },
                    { model: Role, as: 'role', atributes: ['id', 'name'] }
                ]
            });
            if (!branchWorker) {
                return res.status(404).json({ msg: 'BranchWorkerNotFound' });
            }

            // Mapeamos los resultados para obtener solo los IDs y nombres
            const mappedBranchWorker = {
                id: branchWorker.id,
                branchId: branchWorker.branch.id,
                branchName: branchWorker.branch.name,
                workerId: branchWorker.worker.id,
                workerName: branchWorker.worker.name,
                roleId: branchWorker.role.id,
                roleName: branchWorker.role.name
            };
            res.status(200).json({ 'branchWorker': mappedBranchWorker });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('BranchWorkerController->show: ' + errorMsg);
            res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Actualizar una relación Branch-Worker
    async update(req, res) {
        logger.info(`${req.user.name} - Editando una relación Branch-Worker`);

        const { id, branch_id, worker_id, role_id } = req.body;
        try {
            const branchWorker = await BranchWorker.findByPk(id);
            if (!branchWorker) {
                logger.error(`BranchWorkerController->update: Relación no encontrada con ID ${id}`);
                return res.status(404).json({ msg: 'BranchWorkerNotFound' });
            }

            if (worker_id) {
                const worker = await Worker.findByPk(worker_id);
                if (!worker) {
                    logger.error(`BranchWorkerController->update: Trabajador no encontrado con ID ${worker_id}`);
                    return res.status(404).json({ msg: 'WorkerNotFound' });
                }
            }
    
            if (role_id) {
                const role = await Role.findByPk(role_id);
                if (!role) {
                    logger.error(`BranchWorkerController->update: Rol no encontrado con ID ${role_id}`);
                    return res.status(404).json({ msg: 'RoleNotFound' });
                }
            }

            if (branch_id) {
                const branch = await branch.findByPk(branch_id);
                if (!branch) {
                    logger.error(`BranchWorkerController->update: Sucursal no encontrada con ID ${branch_id}`);
                    return res.status(404).json({ msg: 'BranchNotFound' });
                }
            }

            const fieldsToUpdate = [ 'branch_id', 'role_id', 'worker_id' ];

            // Filtrar campos en req.body y construir el objeto updatedData
            const updatedData = Object.keys(req.body)
                .filter(key => fieldsToUpdate.includes(key) && req.body[key] !== undefined)
                .reduce((obj, key) => {
                    obj[key] = req.body[key];
                    return obj;
                }, {});

             // Actualizar la tarea solo si hay datos para cambiar
             if (Object.keys(updatedData).length > 0) {
                await branchWorker.update(updatedData);
                logger.info(`Relacion trabajador-sucursal actualizada exitosamente (ID: ${branchWorker.id})`);
            }
            res.status(200).json({ msg: 'BranchWorkerUpdated', branchWorker });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('BranchWorkerController->update: ' + errorMsg);
            res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Eliminar una relación Branch-Worker
    async destroy(req, res) {
        logger.info(`${req.user.name} - Eliminando una relación Branch-Worker`);

        try {
            const branchWorker = await BranchWorker.findByPk(req.body.id);
            if (!branchWorker) {
                logger.error(`BranchWorkerController->destroy: Relación no encontrada con ID ${req.body.id}`);
                return res.status(404).json({ msg: 'BranchWorkerNotFound' });
            }

            await branchWorker.destroy();
            res.status(200).json({ msg: 'BranchWorkerDeleted' });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('BranchWorkerController->destroy: ' + errorMsg);
            res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    }
};

module.exports = BranchWorkerController;

