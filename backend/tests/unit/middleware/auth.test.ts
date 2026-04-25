import { AppError } from '../../../src/utils/AppError';
import { authenticate, authorize, authorizeOwnerOrAdmin, optionalAuth } from '../../../src/middleware/auth';

jest.mock('../../../src/models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn()
  }
}));

jest.mock('jsonwebtoken', () => {
  const verify = jest.fn();
  class MockJsonWebTokenError extends Error {}
  class MockTokenExpiredError extends Error {}
  const exported = {
    verify,
    JsonWebTokenError: MockJsonWebTokenError,
    TokenExpiredError: MockTokenExpiredError
  };
  return {
    __esModule: true,
    ...exported,
    default: exported
  };
});

const userModel = require('../../../src/models/User').default as { findById: jest.Mock };
const findByIdMock = userModel.findById;

const jsonwebtokenModule = require('jsonwebtoken') as {
  verify: jest.Mock;
  JsonWebTokenError: new (...args: any[]) => Error;
  TokenExpiredError: new (...args: any[]) => Error;
};
const verifyMock = jsonwebtokenModule.verify;
const MockJsonWebTokenError = jsonwebtokenModule.JsonWebTokenError;
const MockTokenExpiredError = jsonwebtokenModule.TokenExpiredError;

describe('auth middleware', () => {
  const next = jest.fn();

  const buildRequest = (headers: Record<string, string> = {}) =>
    ({
      headers
    } as any);

  const buildUser = (overrides: Partial<any> = {}) => ({
    _id: 'user-id',
    role: 'doctor',
    isActive: true,
    toObject: () => ({
      _id: 'user-id',
      role: 'doctor',
      ...overrides
    }),
    ...overrides
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('lanza error cuando no se envía token', async () => {
      const req = buildRequest();

      await authenticate(req, {} as any, next);

      const error = next.mock.calls[0][0] as AppError;
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Token de acceso requerido');
      expect(error.statusCode).toBe(401);
    });

    it('retorna AppError cuando el token es inválido', async () => {
      verifyMock.mockImplementation(() => {
        throw new MockJsonWebTokenError('invalid');
      });

      const req = buildRequest({ authorization: 'Bearer invalid-token' });

      await authenticate(req, {} as any, next);

      const error = next.mock.calls[0][0] as AppError;
      expect(error.message).toBe('Token inválido');
      expect(error.statusCode).toBe(401);
    });

    it('retorna AppError cuando el token está expirado', async () => {
      verifyMock.mockImplementation(() => {
        throw new MockTokenExpiredError('expired');
      });

      const req = buildRequest({ authorization: 'Bearer expired-token' });

      await authenticate(req, {} as any, next);

      const error = next.mock.calls[0][0] as AppError;
      expect(error.message).toBe('Token expirado');
      expect(error.statusCode).toBe(401);
    });

    it('propaga errores no relacionados con JWT', async () => {
      const unexpected = new Error('database failure');
      verifyMock.mockReturnValue({ userId: 'user-id' });
      findByIdMock.mockRejectedValue(unexpected);

      const req = buildRequest({ authorization: 'Bearer token' });

      await authenticate(req, {} as any, next);

      expect(next).toHaveBeenCalledWith(unexpected);
    });

    it('retorna AppError cuando el usuario no existe', async () => {
      verifyMock.mockReturnValue({ userId: 'user-id' });
      findByIdMock.mockResolvedValue(null);

      const req = buildRequest({ authorization: 'Bearer token' });

      await authenticate(req, {} as any, next);

      const error = next.mock.calls[0][0] as AppError;
      expect(error.message).toBe('Token inválido - Usuario no encontrado');
      expect(error.statusCode).toBe(401);
    });

    it('retorna AppError cuando el usuario está inactivo', async () => {
      verifyMock.mockReturnValue({ userId: 'user-id' });
      findByIdMock.mockResolvedValue({
        ...buildUser({ isActive: false })
      });

      const req = buildRequest({ authorization: 'Bearer token' });

      await authenticate(req, {} as any, next);

      const error = next.mock.calls[0][0] as AppError;
      expect(error.message).toBe('Token inválido - Usuario inactivo');
      expect(error.statusCode).toBe(401);
    });

    it('adjunta el usuario al request cuando el token es válido', async () => {
      verifyMock.mockReturnValue({ userId: 'user-id' });
      const userDoc = buildUser({ name: 'Test User' });
      findByIdMock.mockResolvedValue(userDoc);

      const req: any = buildRequest({ authorization: 'Bearer valid-token' });
      const nextSuccess = jest.fn();

      await authenticate(req, {} as any, nextSuccess);

      expect(req.user).toMatchObject({ role: 'doctor', name: 'Test User', _id: 'user-id' });
      expect(nextSuccess).toHaveBeenCalledWith();
    });
  });

  describe('authorize', () => {
    it('permite acceso cuando el rol está autorizado', () => {
      const middleware = authorize('admin', 'doctor');
      const req: any = { user: { role: 'doctor' } };
      const nextSuccess = jest.fn();

      middleware(req, {} as any, nextSuccess);

      expect(nextSuccess).toHaveBeenCalledWith();
    });

    it('retorna AppError cuando no hay usuario en la petición', () => {
      const middleware = authorize('admin');
      middleware({} as any, {} as any, next);

      const error = next.mock.calls[0][0] as AppError;
      expect(error.message).toBe('No autenticado');
      expect(error.statusCode).toBe(401);
    });

    it('retorna AppError cuando el rol no está permitido', () => {
      const middleware = authorize('admin');
      const req: any = { user: { role: 'doctor' } };

      middleware(req, {} as any, next);

      const error = next.mock.calls[0][0] as AppError;
      expect(error.message).toContain('Acceso denegado');
      expect(error.statusCode).toBe(403);
    });
  });

  describe('authorizeOwnerOrAdmin', () => {
    it('permite acceso a administradores', () => {
      const req: any = { user: { role: 'admin' } };
      const nextSuccess = jest.fn();

      authorizeOwnerOrAdmin(req, {} as any, nextSuccess);

      expect(nextSuccess).toHaveBeenCalledWith();
    });

    it('permite acceso al propietario del recurso', () => {
      const req: any = {
        user: { role: 'patient', _id: 'abc' },
        params: { userId: 'abc' },
        body: {}
      };
      const nextSuccess = jest.fn();

      authorizeOwnerOrAdmin(req, {} as any, nextSuccess);

      expect(nextSuccess).toHaveBeenCalledWith();
    });

    it('permite acceso cuando el userId está en el body', () => {
      const req: any = {
        user: { role: 'doctor', _id: 'user-123' },
        params: {},
        body: { userId: 'user-123' }
      };
      const nextSuccess = jest.fn();

      authorizeOwnerOrAdmin(req, {} as any, nextSuccess);

      expect(nextSuccess).toHaveBeenCalledWith();
    });

    it('deniega acceso cuando no es admin ni propietario', () => {
      const req: any = {
        user: { role: 'patient', _id: 'abc' },
        params: { userId: 'different' },
        body: {}
      };

      authorizeOwnerOrAdmin(req, {} as any, next);

      const error = next.mock.calls[0][0] as AppError;
      expect(error.message).toBe(
        'Acceso denegado. Solo el propietario o administrador pueden acceder'
      );
      expect(error.statusCode).toBe(403);
    });
  });

  describe('optionalAuth', () => {
    it('adjunta usuario cuando el token es válido', async () => {
      verifyMock.mockReturnValue({ userId: 'user-id' });
      findByIdMock.mockResolvedValue(buildUser());

      const req: any = buildRequest({ authorization: 'Bearer valid-token' });
      const nextSuccess = jest.fn();

      await optionalAuth(req, {} as any, nextSuccess);

      expect(req.user).toMatchObject({ _id: 'user-id', role: 'doctor' });
      expect(nextSuccess).toHaveBeenCalledWith();
    });

    it('continúa sin usuario cuando no se envía token', async () => {
      const req: any = buildRequest();
      const nextSuccess = jest.fn();

      await optionalAuth(req, {} as any, nextSuccess);

      expect(req.user).toBeUndefined();
      expect(nextSuccess).toHaveBeenCalledWith();
    });

    it('no propaga errores cuando el token es inválido', async () => {
      verifyMock.mockImplementation(() => {
        throw new MockJsonWebTokenError('invalid');
      });

      const req: any = buildRequest({ authorization: 'Bearer invalid-token' });
      const nextSuccess = jest.fn();

      await optionalAuth(req, {} as any, nextSuccess);

      expect(req.user).toBeUndefined();
      expect(nextSuccess).toHaveBeenCalledWith();
    });

    it('omite adjuntar usuario cuando está inactivo', async () => {
      verifyMock.mockReturnValue({ userId: 'user-id' });
      findByIdMock.mockResolvedValue(buildUser({ isActive: false }));

      const req: any = buildRequest({ authorization: 'Bearer valid-token' });
      const nextSuccess = jest.fn();

      await optionalAuth(req, {} as any, nextSuccess);

      expect(req.user).toBeUndefined();
      expect(nextSuccess).toHaveBeenCalledWith();
    });
  });
});

