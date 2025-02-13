const Joi = require('joi');

const getNotificationsSchema = Joi.object({
    cursor: Joi.string()
        .isoDate()
        .optional().allow(null, '').empty('')
        .messages({
            'string.isoDate': 'El cursor debe ser una fecha válida en formato ISO 8601.'
        }),
        limit: Joi.number().integer().allow(null, '').optional().empty(null)
});

module.exports = {
    getNotificationsSchema
};