const Joi = require('joi');

const storeBranchRouteSchema = Joi.object({
    branch_id: Joi.number().integer().required(),
    route_id: Joi.number().integer().required(),
    price: Joi.number().precision(2).allow(null).empty('').optional()
});

const updateBranchRouteSchema = Joi.object({
    branch_id: Joi.number().integer().allow(null).optional(),
    route_id: Joi.number().integer().allow(null).optional(),
    price: Joi.number().precision(2).allow(null).optional(),
    id: Joi.number().integer().required()
});

const idBranchRouteSchema = Joi.object({
    id: Joi.number().integer().required()
});

module.exports = {
    storeBranchRouteSchema,
    updateBranchRouteSchema,
    idBranchRouteSchema,
};
