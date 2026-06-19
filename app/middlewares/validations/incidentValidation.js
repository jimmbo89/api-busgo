const Joi = require('joi');

const incidentDateSchema = Joi.object({
  company_id: Joi.number().integer().positive().optional().messages({
    "number.base": "El campo company_id debe ser un número entero",
    "number.integer": "El campo company_id debe ser un número entero",
    "number.positive": "El campo company_id debe ser mayor que cero",
  }),
  branch_id: Joi.number().integer().positive().optional().messages({
    "number.base": "El campo branch_id debe ser un número entero",
    "number.integer": "El campo branch_id debe ser un número entero",
    "number.positive": "El campo branch_id debe ser mayor que cero",
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
}).xor("company_id", "branch_id").messages({
  "object.missing": "Debes enviar company_id o branch_id",
  "object.xor": "Debes enviar solo company_id o branch_id",
});

module.exports = {
    incidentDateSchema,
};
