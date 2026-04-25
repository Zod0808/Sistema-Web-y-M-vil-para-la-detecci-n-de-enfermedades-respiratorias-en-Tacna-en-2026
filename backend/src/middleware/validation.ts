import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { validationResult } from 'express-validator';
import { AppError } from '../utils/AppError';

// Middleware para validar requests con Joi
export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false, // Mostrar todos los errores
      stripUnknown: true, // Eliminar campos no definidos en el schema
      allowUnknown: false // No permitir campos desconocidos
    });

    if (error) {
      const errorMessages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      throw new AppError(`Datos de entrada inválidos: ${errorMessages.map(e => e.message).join(', ')}`, 400);
    }

    next();
  };
};

// Middleware para validar parámetros de query
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });

    if (error) {
      const errorMessages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      throw new AppError(`Parámetros de consulta inválidos: ${errorMessages.map(e => e.message).join(', ')}`, 400);
    }

    next();
  };
};

// Middleware para validar parámetros de ruta
export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });

    if (error) {
      const errorMessages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      throw new AppError(`Parámetros de ruta inválidos: ${errorMessages.map(e => e.message).join(', ')}`, 400);
    }

    next();
  };
};

// Middleware para validar con express-validator
export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.type === 'field' ? err.path : 'unknown',
      message: err.msg,
      value: err.type === 'field' ? err.value : undefined
    }));
    throw new AppError(`Datos de entrada inválidos: ${errorMessages.map(e => e.message).join(', ')}`, 400);
  }
  next();
};
