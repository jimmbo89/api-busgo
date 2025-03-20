const Joi = require('joi');

// Validación para crear una nueva empresa
const storeBranchSchema = Joi.object({
    company_id: Joi.number().required(),
    name: Joi.string().max(255).required(),
    rut: Joi.string().max(50).allow(null).empty('').optional(),
    address: Joi.string().allow(null).empty('').optional(),
    phone: Joi.string().max(20).allow(null).empty('').optional(),
    image: Joi.any()
            .custom((value, helpers) => {
                if (value) {
                    // Validar tipo MIME
                    const validMimeTypes = ['image/jpg', 'image/jpeg', 'image/png', 'image/gif'];
                    const fileType = value.type;
    
                    if (!validMimeTypes.includes(fileType)) {
                        return helpers.message('El archivo debe ser una imagen válida (jpg, jpeg, png, gif)');
                    }
    
                    // Validar tamaño (500 KB)
                    const maxSize = 500 * 1024;  // 500 KB
                    if (value.size > maxSize) {
                        return helpers.message('El archivo debe ser una imagen válida de máximo 500 KB');
                    }
                }
                return value;
            })
            .allow(null).optional() // Permite que sea nulo u opcional
            .messages({
                'any.required': 'El campo image es obligatorio.',
            }),
});

// Validación para actualizar una empresa
const updateBranchSchema = Joi.object({
    id: Joi.number().required(),
    company_id: Joi.number().allow(null).empty('').optional(),
    name: Joi.string().max(255).allow(null).empty('').optional(),
    rut: Joi.string().max(50).allow(null).empty('').optional(),
    address: Joi.string().allow(null).empty('').optional(),
    phone: Joi.string().max(20).allow(null).empty('').optional(),
    image: Joi.any()
            .custom((value, helpers) => {
                if (value) {
                    // Validar tipo MIME
                    const validMimeTypes = ['image/jpg', 'image/jpeg', 'image/png', 'image/gif'];
                    const fileType = value.type;
    
                    if (!validMimeTypes.includes(fileType)) {
                        return helpers.message('El archivo debe ser una imagen válida (jpg, jpeg, png, gif)');
                    }
    
                    // Validar tamaño (500 KB)
                    const maxSize = 500 * 1024;  // 500 KB
                    if (value.size > maxSize) {
                        return helpers.message('El archivo debe ser una imagen válida de máximo 500 KB');
                    }
                }
                return value;
            })
            .allow(null).optional() // Permite que sea nulo u opcional
            .messages({
                'any.required': 'El campo image es obligatorio.',
            }),
});

// Validación para obtener una empresa por ID
const idBranchSchema = Joi.object({
    id: Joi.number().required(),
});


module.exports = {
    storeBranchSchema,
    updateBranchSchema,
    idBranchSchema,
};
