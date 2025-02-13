const Joi = require('joi');

const storeBranchWorkerSchema = Joi.object({
    branch_id: Joi.number().required(),
    worker_id: Joi.number().required(),
    role_id: Joi.number().required(),
});

const updateBranchWorkerSchema = Joi.object({
    branch_id: Joi.number().allow(null).empty('').optional(),
    worker_id: Joi.number().allow(null).empty('').optional(),
    role_id: Joi.number().allow(null).empty('').optional(),
    id: Joi.number().required(),
});


const idBranchWorkerSchema = Joi.object({
    id: Joi.number().required()
});

const typeRoleBranchSchema = Joi.object({
    type: Joi.string().required(),
    branch_id: Joi.number().required(),
});

module.exports = {
    storeBranchWorkerSchema,
    updateBranchWorkerSchema,
    idBranchWorkerSchema,
    typeRoleBranchSchema
};
