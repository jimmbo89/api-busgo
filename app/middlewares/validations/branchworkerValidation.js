const Joi = require('joi');
const { ROLE_TYPE_VALUES } = require('../../constants/roleTypes');

const storeBranchWorkerSchema = Joi.object({
    branch_id: Joi.number().required(),
    worker_id: Joi.number().required(),
    // Campo legado: el rol efectivo siempre se obtiene desde Worker.role_id.
    role_id: Joi.number().allow(null).optional(),
});

const updateBranchWorkerSchema = Joi.object({
    branch_id: Joi.number().allow(null).empty('').optional(),
    worker_id: Joi.number().allow(null).empty('').optional(),
    // Campo legado: el rol efectivo siempre se obtiene desde Worker.role_id.
    role_id: Joi.number().allow(null).empty('').optional(),
    id: Joi.number().required(),
});

const worker_idBranchWorkerSchema = Joi.object({
    worker_id: Joi.number().allow(null).empty('').optional(),
});


const idBranchWorkerSchema = Joi.object({
    id: Joi.number().required()
});

const typeRoleBranchSchema = Joi.object({
    type: Joi.string().valid(...ROLE_TYPE_VALUES).required(),
    branch_id: Joi.number().required(),
});

module.exports = {
    storeBranchWorkerSchema,
    updateBranchWorkerSchema,
    idBranchWorkerSchema,
    typeRoleBranchSchema,
    worker_idBranchWorkerSchema
};
