const { BranchWorker, Branch, Worker, Role, Vehicle } = require('../models');
const { Op } = require('sequelize');

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

    async findByWorker(workerId) {
        return await BranchWorker.findAll({
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
                    attributes: ['id', 'name', 'image'],
                }
            ]
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

    async updateRoleForWorker(workerId, newRoleId) {
    await BranchWorker.update(
      { role_id: newRoleId },
      {
        where: { worker_id: workerId }
      }
    );
  }
};

module.exports = BranchWorkerRepository;
