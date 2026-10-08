const { BranchWorker, Branch, Worker, Role, Vehicle, Company } = require('../models');
const BranchRepository = require('./BranchRepository');

const BranchWorkerRepository = {
    // Obtener todas las relaciones Branch-Vehicle con sus relaciones
    async findAll() {
        return await await BranchWorker.findAll({
            include: [
                { model: Branch, as: 'branch', atributes: ['id', 'name'] },
                {
                    model: Worker,
                    as: 'worker',
                    attributes: ['id', 'name', 'role_id'],
                    include: [{ model: Role, as: 'role', attributes: ['id', 'name', 'type'] }]
                },
                { model: Role, as: 'role', atributes: ['id', 'name'] }
            ]
        });
    },

    async findByBranch(branchId) {
        return await BranchWorker.findAll({
            where: {
                branch_id: branchId // Filtramos por el ID de la sucursal
            },
            include: [
                { 
                    model: Role, 
                    as: 'role', 
                    attributes: ['id', 'name']
                },
                { 
                    model: Worker, 
                    as: 'worker', 
                    attributes: ['id', 'name', 'image', 'role_id'],  // Trae los atributos del worker
                    include: [{ model: Role, as: 'role', attributes: ['id', 'name', 'type'] }, {
                        model: Vehicle,  // El modelo Vehicle
                        as: 'vehicles',  // El alias para la relación (asegúrate de que este sea el correcto)
                        attributes: ['id'],  // Solo traemos el ID de los vehículos
                        through: { attributes: [] }  // No traemos datos de la tabla intermedia
                    }]
                }
            ]
        });
    },

    async findByWorker(workerId, options = {}) {
        return await BranchWorker.findAll({
            ...options,
            where: {
                worker_id: workerId // Filtramos por el ID de la sucursal
            },
            include: [
                { 
                    model: Role, 
                    as: 'role', 
                    attributes: ['id', 'name']
                },
                { 
                    model: Branch, 
                    as: 'branch', 
                    attributes: ['id', 'name', 'image', 'address', 'rut', 'phone', 'company_id'],
                    include: [
                        {
                            model: Company,
                            as: 'company',
                            attributes: ['id', 'name', 'image'],
                        },
                    ],
                },
                {
                    model: Worker,
                    as: 'worker',
                    attributes: ['id', 'name', 'role_id'],
                    include: [{ model: Role, as: 'role', attributes: ['id', 'name', 'type'] }],
                }
            ]
        });
    },

    async create(body, options = {}) {
        const worker = await Worker.findByPk(body.worker_id, {
            transaction: options.transaction,
        });

        if (!worker) {
            throw new Error('WorkerNotFound');
        }

        return await BranchWorker.create(
            {
                ...body,
                role_id: worker.role_id,
            },
            options
        );
    },

    async update(branchWorker, body, options = {}) {
        const workerId = body.worker_id || branchWorker.worker_id;
        const worker = await Worker.findByPk(workerId, {
            transaction: options.transaction,
        });

        if (!worker) {
            throw new Error('WorkerNotFound');
        }

        return await branchWorker.update(
            {
                ...body,
                role_id: worker.role_id,
            },
            options
        );
    },

    async delete(branchWorker, options = {}) {
        return await branchWorker.destroy(options);
    },

    async findAllBranchesWithWorkersIncluding(targetWorkerId) {
    // 1. Obtener todas las sucursales
    const allBranches = await BranchRepository.findAll();

    if (!allBranches.length) {
      return [];
    }

    const branchIds = allBranches.map(b => b.id);

    // 2. Obtener todas las relaciones BranchWorker para esas sucursales
    const branchWorkers = await BranchWorker.findAll({
      where: {
        branch_id: branchIds
      },
      include: [
        {
          model: Worker,
          as: 'worker',
          attributes: ['id', 'user_id', 'name', 'image', 'role_id'],
          include: [{ model: Role, as: 'role', attributes: ['id', 'name', 'type'] }]
        },
        {
          model: Role,
          as: 'role',
          attributes: ['id', 'name']
        }
      ]
    });

    // 3. Obtener los datos del worker objetivo
    const targetWorker = await Worker.findByPk(targetWorkerId, {
        attributes: ['id', 'user_id', 'name', 'role_id'],
        include: [{
        model: Role,
        as: 'role', // debe coincidir con tu relación
        attributes: ['id', 'name']
        }]
    });

    if (!targetWorker) {
      throw new Error('Target worker not found');
    }

    // 4. Construir resultado
    return allBranches.map(branch => {
      const relationsForBranch = branchWorkers.filter(bw => bw.branch_id === branch.id);

      const associatedWorkers = relationsForBranch.map(bw => ({
        id: bw.worker.id,
        user_id: bw.worker.user_id,
        name: bw.worker.name,
        image: bw.worker.image,
          role_id: bw.worker.role_id,
          role: bw.worker.role ? { id: bw.worker.role.id, name: bw.worker.role.name, type: bw.worker.role.type } : null
      }));

      const isTargetIncluded = associatedWorkers.some(w => w.id === targetWorkerId);

      const workers = isTargetIncluded
        ? associatedWorkers
        : [
            ...associatedWorkers,
            {
              id: targetWorker.id,
              user_id: targetWorker.user_id,
              name: targetWorker.name,
              image: targetWorker.image,
              role_id: targetWorker.role_id,
              role: targetWorker.role.name
            }
          ];

      return {
        id: branch.id,
        name: branch.name,
        image: branch.image,
        workers
      };
    });
  },

    async findAllBranchesWithWorkers() {
    const allBranches = await BranchRepository.findAll();

    if (!allBranches.length) {
      return [];
    }

    const branchIds = allBranches.map(b => b.id);

    const branchWorkers = await BranchWorker.findAll({
      where: {
        branch_id: branchIds
      },
      include: [
        {
          model: Worker,
          as: 'worker',
          attributes: ['id', 'user_id', 'name', 'image', 'role_id'],
          include: [{ model: Role, as: 'role', attributes: ['id', 'name', 'type'] }]
        },
        {
          model: Role,
          as: 'role',
          attributes: ['id', 'name']
        }
      ]
    });

    return allBranches.map(branch => {
      const relationsForBranch = branchWorkers.filter(bw => bw.branch_id === branch.id);

      const workers = relationsForBranch.map(bw => ({
        id: bw.worker.id,
        user_id: bw.worker.user_id,
        name: bw.worker.name,
        image: bw.worker.image,
        role_id: bw.worker.role_id,
        role: bw.worker.role ? { id: bw.worker.role.id, name: bw.worker.role.name, type: bw.worker.role.type } : null
      }));

      return {
        id: branch.id,
        name: branch.name,
        image: branch.image,
        workers
      };
    });
  },

    async findWorkersWithoutBranch(branchId = null, roleType = null, allowedCompanyIds = []) {
    const targetBranch = branchId
      ? await Branch.findByPk(branchId, { attributes: ['id', 'company_id'] })
      : null;

    const workers = await Worker.findAll({
        attributes: [
        'id',
        'user_id',
        'name',
        'email',
        'image',
        'rut',
        'address',
        'phone',
        'role_id',
        ],
        include: [
        {
            model: Role,
            as: 'role',
            attributes: ['id', 'name', 'type'],
        },
        {
            model: BranchWorker,
            as: 'branchWorkers',
            required: false,
            attributes: ['id', 'branch_id', 'worker_id'],
            include: [{
              model: Branch,
              as: 'branch',
              attributes: ['id', 'company_id'],
            }],
        },
        ],
    });

    return workers.filter((worker) => {
      if (roleType && worker.role?.type !== roleType) {
        return false;
      }

      const relations = worker.branchWorkers || [];
      if (!targetBranch) {
        return relations.length === 0;
      }

      const targetCompanyId = Number(targetBranch.company_id);
      const userCompanies = new Set(
        (allowedCompanyIds || [])
          .map((companyId) => Number(companyId))
          .filter((companyId) => Number.isInteger(companyId) && companyId > 0)
      );
      if (
        userCompanies.size > 0 &&
        Number.isInteger(targetCompanyId) &&
        !userCompanies.has(targetCompanyId)
      ) {
        return false;
      }

      return relations.every((relation) => {
        const companyId = Number(relation.branch?.company_id);
        return !targetCompanyId || !companyId || companyId === targetCompanyId;
      });
    });
    },

    async updateRoleForWorker(workerId, newRoleId, options = {}) {
    await BranchWorker.update(
      { role_id: newRoleId },
      {
        where: { worker_id: workerId },
        ...options,
      }
    );
  }
};

module.exports = BranchWorkerRepository;
