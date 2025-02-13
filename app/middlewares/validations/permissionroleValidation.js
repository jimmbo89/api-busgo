const Joi = require('joi');

const storePermissionRoleSchema = Joi.object({
    permission_id: Joi.number().required(),
    role_id: Joi.number().required(),
});

const updatePermissionRoleSchema = Joi.object({
    permission_id: Joi.number().allow(null).empty('').optional(),
    role_id: Joi.number().allow(null).empty('').optional(),
    id: Joi.number().required(),
});


const idPermissionRoleSchema = Joi.object({
    id: Joi.number().required()
});

const role_idRoleSchema = Joi.object({
    role_id: Joi.number().required()
});

module.exports = {
    storePermissionRoleSchema,
    updatePermissionRoleSchema,
    idPermissionRoleSchema,
    role_idRoleSchema
};
