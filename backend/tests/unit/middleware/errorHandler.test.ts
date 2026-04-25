import { errorHandler, notFound } from '../../../src/middleware/errorHandler';
import { AppError } from '../../../src/utils/AppError';
import { logger } from '../../../src/utils/logger';

const createMockRequest = (overrides: Partial<any> = {}) =>
  ({
    url: '/test-endpoint',
    method: 'GET',
    ip: '127.0.0.1',
    get: jest.fn().mockReturnValue('jest-test-agent'),
    ...overrides
  } as any);

const createMockResponse = () => {
  const res: Partial<any> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as any;
};

describe('errorHandler middleware', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.spyOn(logger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env.NODE_ENV = originalEnv;
  });

  it('envía detalles completos en modo desarrollo para AppError', () => {
    process.env.NODE_ENV = 'development';
    const err = new AppError('Mensaje de prueba', 418);
    const req = createMockRequest();
    const res = createMockResponse();

    errorHandler(err, req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(418);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Mensaje de prueba',
        data: expect.objectContaining({
          statusCode: 418,
          isOperational: true
        })
      })
    );
  });

  it('transforma ValidationError en AppError con código 400 en producción', () => {
    process.env.NODE_ENV = 'production';
    const validationError: any = new Error('Validation failed');
    validationError.name = 'ValidationError';
    validationError.errors = {
      field: { message: 'Campo obligatorio' }
    };
    const req = createMockRequest();
    const res = createMockResponse();

    errorHandler(validationError, req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('Datos inválidos')
      })
    );
  });

  it('maneja errores por campos duplicados y cast de Mongoose', () => {
    process.env.NODE_ENV = 'production';
    const duplicateError: any = new Error('duplicate');
    duplicateError.code = 11000;
    duplicateError.keyValue = { email: 'duplicate@test.com' };

    const castError: any = new Error('Cast error');
    castError.name = 'CastError';
    castError.path = '_id';
    castError.value = '123';

    const req = createMockRequest();
    const res = createMockResponse();

    errorHandler(duplicateError, req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('duplicate@test.com')
      })
    );

    const resCast = createMockResponse();
    errorHandler(castError, req, resCast, jest.fn());
    expect(resCast.status).toHaveBeenCalledWith(404);
    expect(resCast.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('_id')
      })
    );
  });

  it('convierte errores de JWT en respuestas 401', () => {
    process.env.NODE_ENV = 'production';
    const jwtError: any = new Error('jwt error');
    jwtError.name = 'JsonWebTokenError';

    const expiredError: any = new Error('jwt expired');
    expiredError.name = 'TokenExpiredError';

    const req = createMockRequest();
    const resJwt = createMockResponse();
    const resExpired = createMockResponse();

    errorHandler(jwtError, req, resJwt, jest.fn());
    expect(resJwt.status).toHaveBeenCalledWith(401);
    expect(resJwt.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Token inválido' })
    );

    errorHandler(expiredError, req, resExpired, jest.fn());
    expect(resExpired.status).toHaveBeenCalledWith(401);
    expect(resExpired.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Token expirado' })
    );
  });

  it('oculta detalles de errores no operacionales en producción', () => {
    process.env.NODE_ENV = 'production';
    const unexpectedError = new Error('Fallo inesperado');
    const req = createMockRequest();
    const res = createMockResponse();

    errorHandler(unexpectedError, req, res, jest.fn());

    const calls = (logger.error as jest.Mock).mock.calls;
    expect(calls[0]).toEqual([
      'Error capturado:',
      expect.objectContaining({
        error: unexpectedError.message,
        method: 'GET',
        url: '/test-endpoint'
      })
    ]);
    expect(calls[1]).toEqual([
      'ERROR 💥',
      expect.objectContaining({
        message: 'Fallo inesperado',
        isOperational: false
      })
    ]);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Algo salió mal!'
      })
    );
  });
});

describe('notFound middleware', () => {
  it('genera AppError 404 para rutas inexistentes', () => {
    const next = jest.fn();
    const req = { originalUrl: '/unknown' } as any;

    notFound(req, {} as any, next);

    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(404);
    expect(error.message).toContain('/unknown');
  });
});


