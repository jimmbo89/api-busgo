const { BranchWorker, Branch, Worker, Role, Company, sequelize } = require('../models');
const logger = require('../../config/logger');
const { BranchWorkerRepository, BranchRepository, WorkerRepository, RoleRepository, TicketTypeRepository } = require('../repositories');
const { ROLE_TYPES } = require('../constants/roleTypes');

const branchWorkerErrorDetails = {
    WorkerBranchAlreadyAssociated: 'El trabajador ya está asociado a la sucursal indicada.',
    WorkerBranchCompanyMismatch: 'Las sucursales asociadas deben pertenecer a la misma empresa del trabajador.',
    WorkerBranchNotAllowedForCompanyRole: 'Un trabajador con rol de tipo Empresa no debe tener sucursales autorizadas.',
};

const workerCompanyIds = async (workerId) => {
    const relations = await BranchWorkerRepository.findByWorker(workerId);
    return new Set(
        relations
            .map((relation) => Number(relation.branch?.company_id))
            .filter((companyId) => Number.isInteger(companyId) && companyId > 0)
    );
};

const userCompanyIds = async (userId) => {
    if (!userId) {
        return [];
    }

    const companies = await Company.findAll({
        where: { user_id: userId },
        attributes: ['id'],
    });

    return companies.map((company) => company.id);
};

const ensureBranchBelongsToWorkerCompany = async (workerId, branch, allowedCompanyIds = []) => {
    const companyIds = await workerCompanyIds(workerId);
    const branchCompanyId = Number(branch.company_id);
    const userCompanies = new Set(
        (allowedCompanyIds || [])
            .map((companyId) => Number(companyId))
            .filter((companyId) => Number.isInteger(companyId) && companyId > 0)
    );

    if (
        userCompanies.size === 0 ||
        !Number.isInteger(branchCompanyId) ||
        branchCompanyId <= 0
    ) {
        throw new Error('WorkerBranchCompanyMismatch');
    }

    if (
        !userCompanies.has(branchCompanyId)
    ) {
        throw new Error('WorkerBranchCompanyMismatch');
    }

    if (
        companyIds.size > 0 &&
        !companyIds.has(branchCompanyId)
    ) {
        throw new Error('WorkerBranchCompanyMismatch');
    }
};

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
                roleId: branchWorker.worker.role_id,
                roleName: branchWorker.worker.role?.name
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
                roleId: branchWorker.worker.role_id,
                role_id: branchWorker.worker.role_id,
                roleName: branchWorker.worker.role?.name
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
                role: branchWorker.worker.role?.name,
                role_id: branchWorker.worker.role_id,
                roleId: branchWorker.worker.role_id,
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
          const allowedCompanyIds = await userCompanyIds(req.user?.id);
          const workers = await BranchWorkerRepository.findWorkersWithoutBranch(
              branch_id,
              type,
              allowedCompanyIds
          );
     
          // Mapeamos los resultados para obtener solo los IDs y nombres
          const mappedWorkers = workers.map((worker) => {
            const relation = (worker.branchWorkers || []).find(
              (branchWorker) => Number(branchWorker.branch_id) === Number(branch_id)
            );

            return {
              id: worker.id,
              worker_id: worker.id,
              name: worker.name,
              image: worker.image,
              email: worker.email,
              role_id: worker.role_id,
              roleName: worker.role.name,
              associated: Boolean(relation),
              association_id: relation?.id || null,
            };
          });

          const roles = await RoleRepository.findByType(type);
      
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

        const { branch_id, worker_id } = req.body;

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

        try {
            const role = await Role.findByPk(worker.role_id);
            if (role?.type === ROLE_TYPES.COMPANY) {
                return res.status(400).json({
                    error: 'WorkerBranchNotAllowedForCompanyRole',
                    details: branchWorkerErrorDetails.WorkerBranchNotAllowedForCompanyRole,
                });
            }

            const allowedCompanyIds = await userCompanyIds(req.user?.id);
            await ensureBranchBelongsToWorkerCompany(worker_id, branch, allowedCompanyIds);

            const existingRelation = await BranchWorker.findOne({
                where: { worker_id, branch_id },
            });
            if (existingRelation) {
                return res.status(409).json({
                    error: 'WorkerBranchAlreadyAssociated',
                    details: branchWorkerErrorDetails.WorkerBranchAlreadyAssociated,
                });
            }

            const branchWorker = await BranchWorkerRepository.create({
                branch_id: branch_id,
                worker_id: worker_id,
            });
            res.status(201).json({ msg: 'BranchWorkerCreated', branchWorker });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('BranchWorkerController->store: ' + errorMsg);
            const status = error.message === 'WorkerBranchAlreadyAssociated' ? 409 :
                error.message.startsWith('WorkerBranch') ? 400 : 500;
            res.status(status).json({
                error: status === 500 ? 'ServerError' : error.message,
                details: branchWorkerErrorDetails[error.message] || errorMsg,
            });
        }
    },

    // Obtener una relación específica Branch-Worker por ID
    async show(req, res) {
        logger.info(`${req.user.name} - Busca la relación Branch-Worker con ID: ${req.body.id}`);

        try {
            const branchWorker = await BranchWorker.findByPk(req.body.id, {
                include: [
                    { model: Branch, as: 'branch', attributes: ['id', 'name'] },
                    {
                        model: Worker,
                        as: 'worker',
                        attributes: ['id', 'name', 'role_id'],
                        include: [{ model: Role, as: 'role', attributes: ['id', 'name', 'type'] }]
                    }
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
                roleId: branchWorker.worker.role_id,
                roleName: branchWorker.worker.role?.name
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

        const { id, branch_id, worker_id } = req.body;
        try {
            const branchWorker = await BranchWorker.findByPk(id);
            if (!branchWorker) {
                logger.error(`BranchWorkerController->update: Relación no encontrada con ID ${id}`);
                return res.status(404).json({ msg: 'BranchWorkerNotFound' });
            }

            const targetWorkerId = worker_id || branchWorker.worker_id;
            const worker = await Worker.findByPk(targetWorkerId);
            if (!worker) {
                logger.error(`BranchWorkerController->update: Trabajador no encontrado con ID ${targetWorkerId}`);
                return res.status(404).json({ msg: 'WorkerNotFound' });
            }

            let targetBranch = null;
            const hasBranchChange = branch_id !== undefined && branch_id !== null && branch_id !== '';
            const hasWorkerChange = worker_id !== undefined && worker_id !== null && worker_id !== '';

            if (hasBranchChange) {
                const branch = await Branch.findByPk(branch_id);
                if (!branch) {
                    logger.error(`BranchWorkerController->update: Sucursal no encontrada con ID ${branch_id}`);
                    return res.status(404).json({ msg: 'BranchNotFound' });
                }
                targetBranch = branch;
            } else if (hasWorkerChange) {
                targetBranch = await Branch.findByPk(branchWorker.branch_id);
            }

            const relationChanged =
                (hasBranchChange && Number(branch_id) !== Number(branchWorker.branch_id)) ||
                (hasWorkerChange && Number(worker_id) !== Number(branchWorker.worker_id));
            const role = await Role.findByPk(worker.role_id);

            if (relationChanged && role?.type === ROLE_TYPES.COMPANY) {
                return res.status(400).json({
                    error: 'WorkerBranchNotAllowedForCompanyRole',
                    details: branchWorkerErrorDetails.WorkerBranchNotAllowedForCompanyRole,
                });
            }

            if (targetBranch) {
                const allowedCompanyIds = await userCompanyIds(req.user?.id);
                await ensureBranchBelongsToWorkerCompany(
                    targetWorkerId,
                    targetBranch,
                    allowedCompanyIds
                );
            }

            if (relationChanged) {
                const existingRelation = await BranchWorker.findOne({
                    where: {
                        worker_id: targetWorkerId,
                        branch_id: targetBranch?.id || branchWorker.branch_id,
                    },
                });
                if (existingRelation && Number(existingRelation.id) !== Number(branchWorker.id)) {
                    return res.status(409).json({
                        error: 'WorkerBranchAlreadyAssociated',
                        details: branchWorkerErrorDetails.WorkerBranchAlreadyAssociated,
                    });
                }
            }

            const updatedData = {
                role_id: worker.role_id,
            };

            if (branch_id !== undefined && branch_id !== null && branch_id !== '') {
                updatedData.branch_id = branch_id;
            }
            if (worker_id !== undefined && worker_id !== null && worker_id !== '') {
                updatedData.worker_id = worker_id;
            }

             // Actualizar la tarea solo si hay datos para cambiar
             if (Object.keys(updatedData).length > 0) {
                await BranchWorkerRepository.update(branchWorker, updatedData);
                logger.info(`Relacion trabajador-sucursal actualizada exitosamente (ID: ${branchWorker.id})`);
            }
            res.status(200).json({ msg: 'BranchWorkerUpdated', branchWorker });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('BranchWorkerController->update: ' + errorMsg);
            const status = error.message === 'WorkerBranchAlreadyAssociated' ? 409 :
                error.message.startsWith('WorkerBranch') ? 400 : 500;
            res.status(status).json({
                error: status === 500 ? 'ServerError' : error.message,
                details: branchWorkerErrorDetails[error.message] || errorMsg,
            });
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

            const worker = await Worker.findByPk(branchWorker.worker_id);
            const role = worker ? await Role.findByPk(worker.role_id) : null;
            if (role?.type === ROLE_TYPES.BRANCH) {
                const relationCount = await BranchWorker.count({
                    where: { worker_id: branchWorker.worker_id },
                });
                if (relationCount <= 1) {
                    return res.status(400).json({
                        error: 'WorkerBranchRequiredForBranchRole',
                        details: 'Un trabajador con rol de tipo Sucursal debe tener al menos una sucursal autorizada.',
                    });
                }
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

