const { BranchWorker, Branch, Worker, Role, Vehicle, Company } = require('../models');
const { Op } = require('sequelize');
const BranchRepository = require('./BranchRepository');

const BranchWorkerRepository = {
    // Obtener todas las relaciones Branch-Vehicle con sus relaciones
    async findAll() {
        return await await BranchWorker.findAll({
            include: [
                { model: Branch, as: 'branch', atributes: ['id', 'name'] },
                { model: Worker, as: 'worker', atributes: ['id', 'name', 'name'] },
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
                    attributes: ['id', 'name', 'image'],  // Trae los atributos del worker
                    include: [{
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
                }
            ]
        });
    },

    async create(body, options = {}) {
        return await BranchWorker.create(body, options);
    },

    async update(branchWorker, body, options = {}) {
        return await branchWorker.update(body, options);
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
          attributes: ['id', 'user_id', 'name', 'image']
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
        role_id: bw.role_id,
        role: bw.role ? { id: bw.role.id, name: bw.role.name } : null
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
          attributes: ['id', 'user_id', 'name', 'image']
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
        role_id: bw.role_id,
        role: bw.role ? { id: bw.role.id, name: bw.role.name } : null
      }));

      return {
        id: branch.id,
        name: branch.name,
        image: branch.image,
        workers
      };
    });
  },

    async findWorkersWithoutBranch() {
    return await Worker.findAll({
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
            attributes: ['id', 'name'],
        },
        {
            model: BranchWorker,
            as: 'branchWorkers', // Asegúrate de que este alias esté bien definido en el modelo Worker
            required: false, // Esto hace un LEFT JOIN
            where: {
            worker_id: { [Op.col]: 'Worker.id' }, // Relación manual si es necesario
            },
            attributes: [], // No queremos datos de BranchWorker
        },
        ],
        where: {
        '$branchWorkers.worker_id$': { [Op.is]: null }, // Donde no existe relación
        },
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
