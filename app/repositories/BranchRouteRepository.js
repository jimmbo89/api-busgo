const { BranchRoute, Branch, Route, Location } = require('../models');
const { Op } = require('sequelize');

const BranchRouteRepository = {
    // Obtener todas las relaciones Branch-Vehicle con sus relaciones
    async findAll() {
        return await BranchRoute.findAll({
            include: [
                { model: Branch, as: 'branch', attributes: ['id', 'name', 'image'] },
                { model: Route, as: 'route', attributes: ['id', 'name'],
                    include: [
                        {
                          model: Location,
                          as: 'origin',
                          attributes: ['id', 'address', 'image'],
                        },
                        {
                          model: Location,
                          as: 'destination',
                          attributes: ['id', 'address', 'image'],
                        },
                      ],
                 }
            ]
        });
    },

    async findByBranch(branchId) {
        return await BranchRoute.findAll({
            where: {
                branch_id: branchId // Filtramos por el ID de la sucursal
            },
            include: [
                { 
                    model: Route, 
                    as: 'route', 
                    attributes: ['id', 'name', 'estimated', 'origin_id', 'destination_id'],
                    include: [
                        {
                          model: Location,
                          as: 'origin',
                          attributes: ['id', 'address', 'image'],
                        },
                        {
                          model: Location,
                          as: 'destination',
                          attributes: ['id', 'address', 'image'],
                        },
                      ],
                }
            ]
        });
    },
};

module.exports = BranchRouteRepository;
