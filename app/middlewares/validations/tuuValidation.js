const Joi = require('joi');

// Esquema para las validaciones
const paymentSchema = Joi.object({

  amount: Joi.number().integer().min(100).max(99999999).required()
    .messages({
      'number.base': 'El monto debe ser un número.',
      'number.min': 'El monto debe ser mayor o igual a 100.',
      'number.max': 'El monto no puede ser mayor a 99999999.',
      'any.required': 'El monto es requerido.',
    }),
  device: Joi.string().required().messages({
    'string.base': 'El número de serie debe ser un texto.',
    'any.required': 'El número de serie es requerido.',
  }),
  description: Joi.string().required().messages({
    'string.base': 'La descripción debe ser un texto.',
    'any.required': 'La descripción es requerida.',
  }),
  dteType: Joi.number().integer().valid(48).required().messages({
    'number.base': 'El tipo de DTE debe ser un número.',
    'any.only': 'El tipo de DTE debe ser 48.',
    'any.required': 'El tipo de DTE es requerido.',
  }),
  idempotencyKey: Joi.string().pattern(/^[a-zA-Z0-9\-]{36}$/).optional().messages({
    'string.base': 'El ID de idempotencia debe ser una cadena de texto.',
    'string.pattern.base': 'El ID de idempotencia debe contener solo letras, números y guiones, y debe tener exactamente 36 caracteres.',
  }),
  exemptAmount: Joi.number().allow(null).optional().empty("").messages({
    'number.base': 'El monto exento debe ser un número.',
    'number.min': 'El monto exento no puede ser menor a 0.',
  }),
  status: Joi.string().required().messages({
    'string.base': 'El estado de la solicitud debe ser un texto.',
    'any.required': 'El estado de la solicitud es obligatorio.',
  }),
  customFields: Joi.array().items(
    Joi.object({
      name: Joi.string().required().messages({
        'string.base': 'El nombre del campo personalizado debe ser un texto.',
        'any.required': 'El nombre del campo personalizado es requerido.',
      }),
      value: Joi.string().required().messages({
        'string.base': 'El valor del campo personalizado debe ser un texto.',
        'any.required': 'El valor del campo personalizado es requerido.',
      }),
      print: Joi.boolean().optional().messages({
        'boolean.base': 'El atributo print debe ser un valor booleano.',
      })
    })
  ).optional().messages({
    'array.base': 'Los campos personalizados deben ser un arreglo.',
  })
});

const paymentDataSchema = Joi.object({

  Amount: Joi.number().required(), // Validar que Amount sea un número y sea obligatorio
  Device: Joi.string().required(), // Validar que Device sea una cadena y sea obligatorio
  Description: Joi.string().required(), // Validar que Description sea una cadena y sea obligatorio
  DteType: Joi.number().required(), // Validar que DteType sea un número y sea obligatorio
  extraData: Joi.object({
      exemptAmount: Joi.number().required(), // Validar que exemptAmount sea un número y sea obligatorio
      customFields: Joi.array().items(
          Joi.object({
              name: Joi.string().required(), // Validar que name sea una cadena y sea obligatorio
              value: Joi.string().required(), // Validar que value sea una cadena y sea obligatorio
              print: Joi.boolean().required(), // Validar que print sea un booleano y sea obligatorio
          })
      ).required(), // Validar que customFields sea un array y sea obligatorio
      sourceName: Joi.string().required(), // Validar que sourceName sea una cadena y sea obligatorio
      sourceVersion: Joi.string().required(), // Validar que sourceVersion sea una cadena y sea obligatorio
  }).required(), // Validar que extraData sea un objeto y sea obligatorio
});

module.exports = {
  paymentSchema,
  paymentDataSchema
};
