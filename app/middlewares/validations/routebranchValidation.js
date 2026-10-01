const Joi = require('joi');

const routeBranchSchema = Joi.object({
    route_id: Joi.number().integer().positive().required(),
    branch_id: Joi.number().integer().positive(),
    branch_ids: Joi.array()
        .items(Joi.number().integer().positive())
        .min(1),
    price: Joi.number().precision(2).allow(null).empty('').optional(),
}).xor('branch_id', 'branch_ids');

const routeIdBranchSchema = Joi.object({
    route_id: Joi.number().integer().positive().required(),
});

module.exports = {
    routeBranchSchema,
    routeIdBranchSchema,
};
