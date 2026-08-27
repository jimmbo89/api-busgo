const Joi = require('joi');

const registerSchema = Joi.object({
    name: Joi.string().min(3).required(), // nombre entre 3 y 30 caracteres
    email: Joi.string().email().required(),       // email válido y obligatorio
    password: Joi.string().min(5).required(),     // contraseña de al menos 6 caracteres
    user: Joi.string().allow(null).empty('').optional(),
    rut: Joi.string().max(50).required(),
    address: Joi.string().allow(null).empty('').optional(),
    phone: Joi.string().max(20).allow(null).empty('').optional(),
});

const loginSchema = Joi.object({
    email: Joi.string().min(3).required(), // nombre entre 3 y 30 caracteres
    password: Joi.string().min(5).required(),     // contraseña de al menos 6 caracteres
    branch_id: Joi.number().integer().allow(null).optional().empty(""),     // contraseña de al menos 6 caracteres
    platform: Joi.string().allow(null).optional().empty(""),
});

const loginApkSerialSchema = loginSchema.keys({
    platform: Joi.string().required(),
    serial: Joi.string().max(100).required(),
});

const updatePasswordSchema = Joi.object({
    id: Joi.number().integer().required().messages({
        'any.required': 'El ID del usuario es obligatorio.',
        'number.base': 'El ID del usuario debe ser un número.',
        'number.integer': 'El ID del usuario debe ser un entero.',
    }),
    currentPassword: Joi.string().allow(null).empty('').optional(),
    newPassword: Joi.string().min(5).required().messages({
        'any.required': 'La nueva contraseña es obligatoria.',
        'string.min': 'La nueva contraseña debe tener al menos 8 caracteres.',
    }),
});

module.exports = {
    registerSchema,
    loginSchema,
    loginApkSerialSchema,
    updatePasswordSchema,
};
