const Joi = require('joi');
const { ROLE_TYPES, ROLE_TYPE_VALUES } = require('../../constants/roleTypes');

const storeRoleSchema = Joi.object({
    name: Joi.string().max(255).required(),
    description: Joi.string().allow(null).empty('').optional(),
    type: Joi.string().valid(...ROLE_TYPE_VALUES).empty('').default(ROLE_TYPES.COMPANY)
});

const updateRoleSchema = Joi.object({
    name: Joi.string().max(255).allow(null).empty('').optional(),
    description: Joi.string().allow(null).empty('').optional(),
    type: Joi.string().valid(...ROLE_TYPE_VALUES).allow(null).empty('').optional(),
    id: Joi.number().required(),
});

const idRoleSchema = Joi.object({
    id: Joi.number().required()
});

const typeRoleSchema = Joi.object({
    type: Joi.string().valid(...ROLE_TYPE_VALUES).required()
});

module.exports = {
    storeRoleSchema,
    updateRoleSchema,
    idRoleSchema,
    typeRoleSchema,
};
