import Joi from 'joi';

export const registerSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede exceder 100 caracteres',
      'any.required': 'El nombre es obligatorio'
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Por favor ingresa un email válido',
      'any.required': 'El email es obligatorio'
    }),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/)
    .required()
    .messages({
      'string.min': 'La contraseña debe tener al menos 8 caracteres',
      'string.pattern.base': 'La contraseña debe contener al menos una letra minúscula, una mayúscula, un número y un carácter especial',
      'any.required': 'La contraseña es obligatoria'
    }),
  role: Joi.string()
    .valid('patient', 'doctor', 'admin')
    .default('patient')
    .messages({
      'any.only': 'El rol debe ser patient, doctor o admin'
    })
});

export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Por favor ingresa un email válido',
      'any.required': 'El email es obligatorio'
    }),
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'La contraseña es obligatoria'
    })
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'any.required': 'El refresh token es obligatorio'
    })
});

export const updateProfileSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .messages({
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede exceder 100 caracteres'
    }),
  avatar: Joi.string()
    .uri()
    .messages({
      'string.uri': 'El avatar debe ser una URL válida'
    })
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'La contraseña actual es obligatoria'
    }),
  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/)
    .required()
    .messages({
      'string.min': 'La nueva contraseña debe tener al menos 8 caracteres',
      'string.pattern.base': 'La nueva contraseña debe contener al menos una letra minúscula, una mayúscula, un número y un carácter especial',
      'any.required': 'La nueva contraseña es obligatoria'
    })
});
