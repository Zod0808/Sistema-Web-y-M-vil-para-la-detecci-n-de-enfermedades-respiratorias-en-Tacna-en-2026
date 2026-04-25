import Joi from 'joi';

const symptomSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'El nombre del síntoma debe tener al menos 2 caracteres',
      'string.max': 'El nombre del síntoma no puede exceder 100 caracteres',
      'any.required': 'El nombre del síntoma es obligatorio'
    }),
  severity: Joi.string()
    .valid('mild', 'moderate', 'severe')
    .required()
    .messages({
      'any.only': 'La severidad debe ser mild, moderate o severe',
      'any.required': 'La severidad es obligatoria'
    }),
  duration: Joi.string()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.min': 'La duración debe tener al menos 1 carácter',
      'string.max': 'La duración no puede exceder 50 caracteres',
      'any.required': 'La duración es obligatoria'
    }),
  description: Joi.string()
    .max(500)
    .allow('')
    .messages({
      'string.max': 'La descripción no puede exceder 500 caracteres'
    })
});

const locationSchema = Joi.object({
  latitude: Joi.number()
    .min(-90)
    .max(90)
    .required()
    .messages({
      'number.min': 'La latitud debe estar entre -90 y 90',
      'number.max': 'La latitud debe estar entre -90 y 90',
      'any.required': 'La latitud es obligatoria'
    }),
  longitude: Joi.number()
    .min(-180)
    .max(180)
    .required()
    .messages({
      'number.min': 'La longitud debe estar entre -180 y 180',
      'number.max': 'La longitud debe estar entre -180 y 180',
      'any.required': 'La longitud es obligatoria'
    }),
  address: Joi.string()
    .max(200)
    .allow('')
    .messages({
      'string.max': 'La dirección no puede exceder 200 caracteres'
    })
});

export const createMedicalHistorySchema = Joi.object({
  patientId: Joi.string()
    .required()
    .messages({
      'any.required': 'El ID del paciente es obligatorio'
    }),
  patientName: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'El nombre del paciente debe tener al menos 2 caracteres',
      'string.max': 'El nombre del paciente no puede exceder 100 caracteres',
      'any.required': 'El nombre del paciente es obligatorio'
    }),
  age: Joi.number()
    .integer()
    .min(0)
    .max(150)
    .required()
    .messages({
      'number.base': 'La edad debe ser un número',
      'number.integer': 'La edad debe ser un número entero',
      'number.min': 'La edad no puede ser negativa',
      'number.max': 'La edad no puede exceder 150 años',
      'any.required': 'La edad es obligatoria'
    }),
  diagnosis: Joi.string()
    .min(2)
    .max(200)
    .required()
    .messages({
      'string.min': 'El diagnóstico debe tener al menos 2 caracteres',
      'string.max': 'El diagnóstico no puede exceder 200 caracteres',
      'any.required': 'El diagnóstico es obligatorio'
    }),
  symptoms: Joi.array()
    .items(symptomSchema)
    .max(20)
    .messages({
      'array.max': 'No se pueden registrar más de 20 síntomas'
    }),
  description: Joi.string()
    .max(1000)
    .allow('')
    .messages({
      'string.max': 'La descripción no puede exceder 1000 caracteres'
    }),
  date: Joi.date()
    .max('now')
    .messages({
      'date.max': 'La fecha no puede ser futura'
    }),
  location: locationSchema,
  images: Joi.array()
    .items(Joi.string().uri())
    .max(10)
    .messages({
      'array.max': 'No se pueden adjuntar más de 10 imágenes',
      'string.uri': 'Las imágenes deben ser URLs válidas'
    }),
  audioNotes: Joi.string()
    .max(500)
    .allow('')
    .messages({
      'string.max': 'Las notas de audio no pueden exceder 500 caracteres'
    }),
  isOffline: Joi.boolean()
    .default(false),
  syncStatus: Joi.string()
    .valid('pending', 'synced', 'error')
    .default('pending')
});

export const updateMedicalHistorySchema = Joi.object({
  patientName: Joi.string()
    .min(2)
    .max(100)
    .messages({
      'string.min': 'El nombre del paciente debe tener al menos 2 caracteres',
      'string.max': 'El nombre del paciente no puede exceder 100 caracteres'
    }),
  age: Joi.number()
    .integer()
    .min(0)
    .max(150)
    .messages({
      'number.base': 'La edad debe ser un número',
      'number.integer': 'La edad debe ser un número entero',
      'number.min': 'La edad no puede ser negativa',
      'number.max': 'La edad no puede exceder 150 años'
    }),
  diagnosis: Joi.string()
    .min(2)
    .max(200)
    .messages({
      'string.min': 'El diagnóstico debe tener al menos 2 caracteres',
      'string.max': 'El diagnóstico no puede exceder 200 caracteres'
    }),
  symptoms: Joi.array()
    .items(symptomSchema)
    .max(20)
    .messages({
      'array.max': 'No se pueden registrar más de 20 síntomas'
    }),
  description: Joi.string()
    .max(1000)
    .allow('')
    .messages({
      'string.max': 'La descripción no puede exceder 1000 caracteres'
    }),
  date: Joi.date()
    .max('now')
    .messages({
      'date.max': 'La fecha no puede ser futura'
    }),
  location: locationSchema,
  images: Joi.array()
    .items(Joi.string().uri())
    .max(10)
    .messages({
      'array.max': 'No se pueden adjuntar más de 10 imágenes',
      'string.uri': 'Las imágenes deben ser URLs válidas'
    }),
  audioNotes: Joi.string()
    .max(500)
    .allow('')
    .messages({
      'string.max': 'Las notas de audio no pueden exceder 500 caracteres'
    }),
  syncStatus: Joi.string()
    .valid('pending', 'synced', 'error')
});

export const syncOfflineHistoriesSchema = Joi.object({
  histories: Joi.array()
    .items(createMedicalHistorySchema)
    .min(1)
    .max(100)
    .required()
    .messages({
      'array.min': 'Debe haber al menos una historia médica',
      'array.max': 'No se pueden sincronizar más de 100 historias a la vez',
      'any.required': 'Las historias médicas son obligatorias'
    })
});
