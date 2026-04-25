import Joi from 'joi';
import { AppError } from '../../../src/utils/AppError';

type ValidationOptions = {
  validationErrors?: Array<{ type?: string; path?: string; msg: string; value?: unknown }>;
};

const loadValidationModule = (options: ValidationOptions = {}) => {
  jest.resetModules();

  const validationResultMock = jest.fn(() => ({
    isEmpty: () => (options.validationErrors ?? []).length === 0,
    array: () => options.validationErrors ?? []
  }));

  jest.doMock('express-validator', () => ({
    validationResult: validationResultMock
  }));

  const module = require('../../../src/middleware/validation') as typeof import('../../../src/middleware/validation');

  return {
    ...module,
    validationResultMock
  };
};

const createNext = () => jest.fn();

describe('validation middlewares', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  describe('validateRequest', () => {
    it('permite la continuación cuando el cuerpo es válido', () => {
      const { validateRequest } = loadValidationModule();
      const next = createNext();

      const middleware = validateRequest(
        Joi.object({
          nombre: Joi.string().required(),
          edad: Joi.number().integer().min(0)
        })
      );

      const req = { body: { nombre: 'Paciente', edad: 30 } } as any;

      expect(() => middleware(req, {} as any, next)).not.toThrow();
      expect(next).toHaveBeenCalledWith();
    });

    it('lanza AppError cuando el cuerpo es inválido', () => {
      const { validateRequest } = loadValidationModule();
      const next = createNext();

      const middleware = validateRequest(
        Joi.object({
          nombre: Joi.string().required(),
          edad: Joi.number().integer().min(0)
        })
      );

      const req = { body: { edad: -5 } } as any;

      expect(() => middleware(req, {} as any, next)).toThrowError(
        expect.objectContaining({ statusCode: 400 })
      );
    });
  });

  describe('validateQuery', () => {
    it('lanza AppError cuando los parámetros de query son inválidos', () => {
      const { validateQuery } = loadValidationModule();
      const middleware = validateQuery(
        Joi.object({
          limit: Joi.number().integer().min(1).max(100).required()
        })
      );

      const req = { query: { limit: 'cincuenta' } } as any;

      expect(() => middleware(req, {} as any, createNext())).toThrowError(
        expect.objectContaining({ statusCode: 400 })
      );
    });
  });

  describe('validateParams', () => {
    it('permite continuar cuando los parámetros son válidos', () => {
      const { validateParams } = loadValidationModule();
      const middleware = validateParams(
        Joi.object({
          id: Joi.string().alphanum().required()
        })
      );

      const req = { params: { id: 'ID123' } } as any;
      const next = createNext();

      expect(() => middleware(req, {} as any, next)).not.toThrow();
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('validate (express-validator)', () => {
    it('continúa cuando no hay errores de validación', () => {
      const { validate, validationResultMock } = loadValidationModule({ validationErrors: [] });
      const req = {} as any;
      const next = createNext();

      validate(req, {} as any, next);

      expect(validationResultMock).toHaveBeenCalledWith(req);
      expect(next).toHaveBeenCalledWith();
    });

    it('lanza AppError cuando existen errores de validación', () => {
      const { validate } = loadValidationModule({
        validationErrors: [
          {
            type: 'field',
            path: 'email',
            msg: 'Correo inválido',
            value: 'bad'
          }
        ]
      });

      const req = {} as any;

      expect(() => validate(req, {} as any, createNext())).toThrowError(
        expect.objectContaining({ statusCode: 400 })
      );
    });
  });
});


