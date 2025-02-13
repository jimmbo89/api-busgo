const Joi = require('joi');

const storePermissionSchema = Joi.object({
    name: Joi.string().max(255).required(),
    description: Joi.string().allow(null).empty('').optional(),
    module: Joi.string().allow(null).empty('').optional()
});

const updatePermissionSchema = Joi.object({
    name: Joi.string().max(255).allow(null).empty('').optional(),
    description: Joi.string().allow(null).empty('').optional(),
    module: Joi.string().allow(null).empty('').optional(),
    id: Joi.number().required(),
});

const idPermissionSchema = Joi.object({
    id: Joi.number().required()
});


module.exports = {
    storePermissionSchema,
    updatePermissionSchema,
    idPermissionSchema,
};
