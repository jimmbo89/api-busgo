const Joi = require('joi');

const branch_idIncidentSchema = Joi.object({
  branch_id: Joi.number().required().messages({
    "number.base": "El campo id debe ser un número entero",
    "any.required": "El campo id es obligatorio",
  }),
  startDate: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/) // Formato YYYY-MM-DD
    .allow("", null) // Permitir vacío o null
    .optional() // Campo opcional
    .messages({
      "string.pattern.base": "El formato de endDate debe ser YYYY-MM-DD",
    }),
    endDate: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/) // Formato YYYY-MM-DD
    .allow("", null) // Permitir vacío o null
    .optional() // Campo opcional
    .messages({
      "string.pattern.base": "El formato de endDate debe ser YYYY-MM-DD",
    }),
});

module.exports = {
    branch_idIncidentSchema,
};
