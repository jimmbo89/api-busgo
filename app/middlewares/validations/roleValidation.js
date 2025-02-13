const Joi = require('joi');

const storeRoleSchema = Joi.object({
    name: Joi.string().max(255).required(),
    description: Joi.string().allow(null).empty('').optional(),
    type: Joi.string().allow(null).empty('').optional()
});

const updateRoleSchema = Joi.object({
    name: Joi.string().max(255).allow(null).empty('').optional(),
    description: Joi.string().allow(null).empty('').optional(),
    type: Joi.string().allow(null).empty('').optional(),
    id: Joi.number().required(),
});

const idRoleSchema = Joi.object({
    id: Joi.number().required()
});

const typeRoleSchema = Joi.object({
    type: Joi.string().required()
});

module.exports = {
    storeRoleSchema,
    updateRoleSchema,
    idRoleSchema,
    typeRoleSchema,
};
