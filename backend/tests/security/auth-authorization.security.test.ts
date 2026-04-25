/**
 * Security Tests — Autenticación y Autorización
 *
 * Cubre:
 *   AUTH-01  JWT ausente / malformado / expirado / manipulado
 *   AUTH-02  Algoritmo none (JWT algorithm confusion)
 *   AUTH-03  Firma con secreto incorrecto
 *   AUTH-04  Token de otro rol (escalada horizontal)
 *   AUTH-05  Token para otro userId (suplantación de identidad)
 *   AUTH-06  Token de servicio interno inyectado en endpoint de usuario
 *   AUTHZ-01 Matriz de roles × endpoints de solo-admin
 *   AUTHZ-02 Matriz de roles × endpoints de doctor/admin
 *   AUTHZ-03 Acceso cruzado a recursos de otro paciente
 *   AUTHZ-04 RBAC — requirePermission rechaza roles sin permiso
 *   AUTHZ-05 Bypasses comunes: campo 'role' en body, query, header
 *   AUTHZ-06 Endpoint de deactivación de cuenta ajena
 *   AUTHZ-07 Endpoint de listado de usuarios restringido a admin
 *   AUTHZ-08 Acceso a estadísticas de usuarios restringido a admin
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../../src/utils/AppError';
import {
  authenticate,
  authorize,
  authorizeOwnerOrAdmin,
  authorizeInternalOrRoles,
  INTERNAL_REQUEST_HEADER,
} from '../../src/middleware/auth';
import { requireRole, requirePermission } from '../../src/middleware/rbac';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../src/models/User', () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));

jest.mock('jsonwebtoken', () => {
  const actual = jest.requireActual('jsonwebtoken');
  return { ...actual, verify: jest.fn() };
});

const UserModel = require('../../src/models/User').default as { findById: jest.Mock };
const jwtVerify = (jwt as any).verify as jest.Mock;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECRET = process.env['JWT_SECRET'] ?? 'test-jwt-secret';

const buildReq = (overrides: Partial<any> = {}): any => ({
  headers: {},
  params: {},
  body: {},
  ...overrides,
});

const buildRes = (): any => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { status, json };
};

const buildNext = (): jest.Mock => jest.fn();

const activeUser = (overrides: Partial<any> = {}) => ({
  _id: 'user-1',
  role: 'doctor',
  isActive: true,
  toObject: function () {
    return { _id: this._id, role: this.role, isActive: this.isActive };
  },
  ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH-01: JWT ausente / malformado / expirado / manipulado
// ─────────────────────────────────────────────────────────────────────────────

describe('AUTH-01 — Token ausente, malformado, expirado y manipulado', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rechaza request sin cabecera Authorization', async () => {
    const req = buildReq({ headers: {} });
    const next = buildNext();
    await authenticate(req, buildRes(), next);
    const err: AppError = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
  });

  it('rechaza cabecera sin prefijo Bearer', async () => {
    const req = buildReq({ headers: { authorization: 'Token abc123' } });
    const next = buildNext();
    await authenticate(req, buildRes(), next);
    const err: AppError = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
  });

  it('rechaza token vacío tras Bearer', async () => {
    jwtVerify.mockImplementation(() => { throw new (jwt as any).JsonWebTokenError('invalid'); });
    const req = buildReq({ headers: { authorization: 'Bearer ' } });
    const next = buildNext();
    await authenticate(req, buildRes(), next);
    const err: AppError = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
  });

  it('rechaza token con firma manipulada (último char cambiado)', async () => {
    jwtVerify.mockImplementation(() => { throw new (jwt as any).JsonWebTokenError('invalid'); });
    const req = buildReq({ headers: { authorization: 'Bearer eyJhb.eyJ1.XXXXX' } });
    const next = buildNext();
    await authenticate(req, buildRes(), next);
    const err: AppError = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
  });

  it('rechaza token expirado (TokenExpiredError)', async () => {
    jwtVerify.mockImplementation(() => { throw new (jwt as any).TokenExpiredError('expired', new Date()); });
    const req = buildReq({ headers: { authorization: 'Bearer expired.token.here' } });
    const next = buildNext();
    await authenticate(req, buildRes(), next);
    const err: AppError = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
    expect(err.message).toMatch(/expir/i);
  });

  it('rechaza token con payload correcto pero usuario inexistente en BD', async () => {
    jwtVerify.mockReturnValue({ userId: 'nonexistent-id' });
    UserModel.findById.mockResolvedValue(null);
    const req = buildReq({ headers: { authorization: 'Bearer valid.header.sig' } });
    const next = buildNext();
    await authenticate(req, buildRes(), next);
    const err: AppError = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
  });

  it('rechaza token de usuario inactivo', async () => {
    jwtVerify.mockReturnValue({ userId: 'inactive-id' });
    UserModel.findById.mockResolvedValue(activeUser({ isActive: false }));
    const req = buildReq({ headers: { authorization: 'Bearer valid.header.sig' } });
    const next = buildNext();
    await authenticate(req, buildRes(), next);
    const err: AppError = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
    expect(err.message).toMatch(/inactiv/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH-02: JWT Algorithm Confusion (alg: none)
// ─────────────────────────────────────────────────────────────────────────────

describe('AUTH-02 — JWT algorithm confusion (alg: none)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rechaza token con alg:none (verificación lanza JsonWebTokenError)', async () => {
    // Simula lo que haría jwt.verify con un token alg:none al requerir un secreto
    jwtVerify.mockImplementation(() => { throw new (jwt as any).JsonWebTokenError('invalid algorithm'); });

    const noneHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ userId: 'attacker', role: 'admin' })).toString('base64url');
    const noneToken = `${noneHeader}.${payload}.`;

    const req = buildReq({ headers: { authorization: `Bearer ${noneToken}` } });
    const next = buildNext();
    await authenticate(req, buildRes(), next);

    const err: AppError = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
  });

  it('rechaza token con alg:RS256 cuando el servidor usa HS256 (firma inválida)', async () => {
    jwtVerify.mockImplementation(() => { throw new (jwt as any).JsonWebTokenError('invalid signature'); });
    const req = buildReq({ headers: { authorization: 'Bearer rs256.token.forged' } });
    const next = buildNext();
    await authenticate(req, buildRes(), next);
    const err: AppError = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH-03: Firma con secreto incorrecto
// ─────────────────────────────────────────────────────────────────────────────

describe('AUTH-03 — Token firmado con secreto incorrecto', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rechaza token firmado con secreto diferente al del servidor', async () => {
    jwtVerify.mockImplementation(() => { throw new (jwt as any).JsonWebTokenError('invalid signature'); });
    const req = buildReq({ headers: { authorization: 'Bearer wrong.secret.token' } });
    const next = buildNext();
    await authenticate(req, buildRes(), next);
    const err: AppError = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
  });

  it('rechaza token con secreto vacío', async () => {
    jwtVerify.mockImplementation(() => { throw new (jwt as any).JsonWebTokenError('secretOrPublicKey must have a value'); });
    const req = buildReq({ headers: { authorization: 'Bearer empty.secret.token' } });
    const next = buildNext();
    await authenticate(req, buildRes(), next);
    const err: AppError = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH-04: Escalada de privilegios horizontal (token de otro rol)
// ─────────────────────────────────────────────────────────────────────────────

describe('AUTH-04 — Escalada de privilegios con token de rol inferior', () => {
  beforeEach(() => jest.clearAllMocks());

  const SCENARIOS: Array<{ requestRole: string; requiredRoles: string[]; expectAllowed: boolean }> = [
    { requestRole: 'patient', requiredRoles: ['admin'],         expectAllowed: false },
    { requestRole: 'patient', requiredRoles: ['doctor'],        expectAllowed: false },
    { requestRole: 'patient', requiredRoles: ['doctor','admin'],expectAllowed: false },
    { requestRole: 'doctor',  requiredRoles: ['admin'],         expectAllowed: false },
    { requestRole: 'doctor',  requiredRoles: ['doctor'],        expectAllowed: true  },
    { requestRole: 'doctor',  requiredRoles: ['doctor','admin'],expectAllowed: true  },
    { requestRole: 'admin',   requiredRoles: ['admin'],         expectAllowed: true  },
    { requestRole: 'admin',   requiredRoles: ['doctor'],        expectAllowed: true  },
    { requestRole: 'admin',   requiredRoles: ['patient'],       expectAllowed: true  },
  ];

  SCENARIOS.forEach(({ requestRole, requiredRoles, expectAllowed }) => {
    it(`rol '${requestRole}' intentando acceder a ruta [${requiredRoles.join('|')}] → ${expectAllowed ? 'permitido' : 'denegado'}`, () => {
      const req = buildReq({ user: activeUser({ role: requestRole }) });
      const next = buildNext();
      authorize(...requiredRoles)(req, buildRes(), next);

      if (expectAllowed) {
        expect(next).toHaveBeenCalledWith();
      } else {
        const err: AppError = next.mock.calls[0][0];
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(403);
      }
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH-05: Suplantación de identidad (token de otro userId)
// ─────────────────────────────────────────────────────────────────────────────

describe('AUTH-05 — Suplantación de identidad vía userId de otro usuario', () => {
  beforeEach(() => jest.clearAllMocks());

  it('attachs el usuario del token (no el del body)', async () => {
    const realUser = activeUser({ _id: 'real-user', role: 'patient' });
    jwtVerify.mockReturnValue({ userId: 'real-user' });
    UserModel.findById.mockResolvedValue(realUser);

    const req = buildReq({
      headers: { authorization: 'Bearer valid.token.here' },
      body: { userId: 'victim-user', role: 'admin' },  // intento de suplantación
    });
    const next = buildNext();
    await authenticate(req, buildRes(), next);

    expect(next).toHaveBeenCalledWith();
    // El request.user debe ser el del token, no el del body
    expect(req.user._id).toBe('real-user');
    expect(req.user.role).toBe('patient');
  });

  it('authorizeOwnerOrAdmin bloquea a paciente que intenta acceder a recurso de otro paciente', () => {
    const req = buildReq({
      user: activeUser({ _id: 'attacker', role: 'patient' }),
      params: { userId: 'victim' },  // userId diferente al del token
    });
    const next = buildNext();
    authorizeOwnerOrAdmin(req, buildRes(), next);
    const err: AppError = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
  });

  it('authorizeOwnerOrAdmin permite al propio paciente acceder a su recurso', () => {
    const req = buildReq({
      user: activeUser({ _id: 'owner', role: 'patient' }),
      params: { userId: 'owner' },  // mismo userId
    });
    const next = buildNext();
    authorizeOwnerOrAdmin(req, buildRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it('authorizeOwnerOrAdmin permite al admin acceder a cualquier recurso', () => {
    const req = buildReq({
      user: activeUser({ _id: 'admin-id', role: 'admin' }),
      params: { userId: 'anyone' },
    });
    const next = buildNext();
    authorizeOwnerOrAdmin(req, buildRes(), next);
    expect(next).toHaveBeenCalledWith();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH-06: Token de servicio interno en endpoints de usuario
// ─────────────────────────────────────────────────────────────────────────────

describe('AUTH-06 — Abuso del token de servicio interno', () => {
  beforeEach(() => jest.clearAllMocks());

  const VALID_INTERNAL_TOKEN = 'internal-test-token';
  const INVALID_INTERNAL_TOKEN = 'hacked-internal-token';

  it('token interno válido + rol permitido → acceso concedido', () => {
    const req = buildReq({
      headers: { [INTERNAL_REQUEST_HEADER]: VALID_INTERNAL_TOKEN },
      user: activeUser({ role: 'admin' }),
    });
    const next = buildNext();
    authorizeInternalOrRoles(['admin'], [VALID_INTERNAL_TOKEN])(req, buildRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it('token interno inválido → debe verificar rol normal', () => {
    const req = buildReq({
      headers: { [INTERNAL_REQUEST_HEADER]: INVALID_INTERNAL_TOKEN },
      user: activeUser({ role: 'patient' }),
    });
    const next = buildNext();
    authorizeInternalOrRoles(['admin'], [VALID_INTERNAL_TOKEN])(req, buildRes(), next);
    // No tiene el token válido, y su rol no cumple → 403
    const err: AppError = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
  });

  it('token interno en endpoint de usuario sin lista de tokens permitidos → denegado sin rol', () => {
    const req = buildReq({
      headers: { [INTERNAL_REQUEST_HEADER]: VALID_INTERNAL_TOKEN },
      user: activeUser({ role: 'patient' }),
    });
    const next = buildNext();
    // Sin lista de allowedTokens → el token interno no es reconocido
    authorizeInternalOrRoles(['doctor', 'admin'], [])(req, buildRes(), next);
    const err: AppError = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
  });

  it('sin usuario y sin token interno válido → 401', () => {
    const req = buildReq({
      headers: { [INTERNAL_REQUEST_HEADER]: INVALID_INTERNAL_TOKEN },
    });
    const next = buildNext();
    authorizeInternalOrRoles(['admin'], [VALID_INTERNAL_TOKEN])(req, buildRes(), next);
    const err: AppError = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTHZ-01–02: Matriz RBAC via requireRole
// ─────────────────────────────────────────────────────────────────────────────

describe('AUTHZ-01/02 — Matriz de roles con requireRole', () => {
  const MATRIX: Array<{ role: string; minRole: 'patient' | 'doctor' | 'admin'; allowed: boolean }> = [
    { role: 'patient', minRole: 'patient', allowed: true  },
    { role: 'patient', minRole: 'doctor',  allowed: false },
    { role: 'patient', minRole: 'admin',   allowed: false },
    { role: 'doctor',  minRole: 'patient', allowed: true  },
    { role: 'doctor',  minRole: 'doctor',  allowed: true  },
    { role: 'doctor',  minRole: 'admin',   allowed: false },
    { role: 'admin',   minRole: 'patient', allowed: true  },
    { role: 'admin',   minRole: 'doctor',  allowed: true  },
    { role: 'admin',   minRole: 'admin',   allowed: true  },
  ];

  MATRIX.forEach(({ role, minRole, allowed }) => {
    it(`requireRole('${minRole}') con user.role='${role}' → ${allowed ? 'next()' : '403'}`, () => {
      const req = buildReq({ user: { role } });
      const res = buildRes();
      const next = buildNext();
      requireRole(minRole)(req, res, next);

      if (allowed) {
        expect(next).toHaveBeenCalledWith();
        expect(res.status).not.toHaveBeenCalled();
      } else {
        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
      }
    });
  });

  it('requireRole sin usuario → 401', () => {
    const req = buildReq({});
    const res = buildRes();
    const next = buildNext();
    requireRole('patient')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTHZ-04: Matriz de permisos via requirePermission
// ─────────────────────────────────────────────────────────────────────────────

describe('AUTHZ-04 — Matriz de permisos con requirePermission', () => {
  const PERMISSION_MATRIX: Array<{ role: string; permission: string; allowed: boolean }> = [
    // patient — solo sus propias historias/citas/prescripciones
    { role: 'patient', permission: 'medical-histories:read',   allowed: true  },
    { role: 'patient', permission: 'medical-histories:create', allowed: true  },
    { role: 'patient', permission: 'medical-histories:update', allowed: false },
    { role: 'patient', permission: 'medical-histories:delete', allowed: false },
    { role: 'patient', permission: 'reports:generate',         allowed: false },
    { role: 'patient', permission: 'dsr:delete',               allowed: false },
    { role: 'patient', permission: 'users:manage',             allowed: false },
    { role: 'patient', permission: 'analytics:admin',          allowed: false },
    { role: 'patient', permission: 'bi:export',                allowed: false },
    { role: 'patient', permission: 'fhir:create',              allowed: false },

    // doctor — puede leer/crear pero no eliminar historias ni gestionar usuarios
    { role: 'doctor',  permission: 'medical-histories:read',   allowed: true  },
    { role: 'doctor',  permission: 'medical-histories:create', allowed: true  },
    { role: 'doctor',  permission: 'medical-histories:update', allowed: true  },
    { role: 'doctor',  permission: 'medical-histories:delete', allowed: false },
    { role: 'doctor',  permission: 'reports:generate',         allowed: false },
    { role: 'doctor',  permission: 'reports:read',             allowed: true  },
    { role: 'doctor',  permission: 'dsr:delete',               allowed: false },
    { role: 'doctor',  permission: 'users:manage',             allowed: false },
    { role: 'doctor',  permission: 'analytics:admin',          allowed: false },
    { role: 'doctor',  permission: 'bi:export',                allowed: true  },
    { role: 'doctor',  permission: 'fhir:read',                allowed: true  },
    { role: 'doctor',  permission: 'fhir:delete',              allowed: false },
    { role: 'doctor',  permission: 'integrations:manage',      allowed: false },

    // admin — acceso completo
    { role: 'admin',   permission: 'medical-histories:delete', allowed: true  },
    { role: 'admin',   permission: 'reports:generate',         allowed: true  },
    { role: 'admin',   permission: 'dsr:delete',               allowed: true  },
    { role: 'admin',   permission: 'users:manage',             allowed: true  },
    { role: 'admin',   permission: 'analytics:admin',          allowed: true  },
    { role: 'admin',   permission: 'integrations:manage',      allowed: true  },
    { role: 'admin',   permission: 'fhir:delete',              allowed: true  },
  ];

  PERMISSION_MATRIX.forEach(({ role, permission, allowed }) => {
    it(`requirePermission('${permission}') con role='${role}' → ${allowed ? 'next()' : '403'}`, () => {
      const req = buildReq({ user: { role } });
      const res = buildRes();
      const next = buildNext();
      requirePermission(permission)(req, res, next);

      if (allowed) {
        expect(next).toHaveBeenCalledWith();
        expect(res.status).not.toHaveBeenCalled();
      } else {
        expect(res.status).toHaveBeenCalledWith(403);
      }
    });
  });

  it('requirePermission sin usuario → 401', () => {
    const req = buildReq({});
    const res = buildRes();
    const next = buildNext();
    requirePermission('reports:read')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('requirePermission con role desconocido → 403', () => {
    const req = buildReq({ user: { role: 'superuser' } });
    const res = buildRes();
    const next = buildNext();
    requirePermission('reports:read')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTHZ-05: Intentos de bypass mediante campos en body/query/headers
// ─────────────────────────────────────────────────────────────────────────────

describe('AUTHZ-05 — Bypass de autorización vía campos extra en body/query/header', () => {
  beforeEach(() => jest.clearAllMocks());

  it('campo role:admin en body no otorga privilegios de admin', () => {
    // El middleware authorize usa req.user.role (del token), no req.body.role
    const req = buildReq({
      user: activeUser({ role: 'patient' }),
      body: { role: 'admin' },
    });
    const next = buildNext();
    authorize('admin')(req, buildRes(), next);
    const err: AppError = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
  });

  it('campo role:admin en query string no otorga privilegios de admin', () => {
    const req = buildReq({
      user: activeUser({ role: 'patient' }),
      query: { role: 'admin' },
    });
    const next = buildNext();
    authorize('admin')(req, buildRes(), next);
    const err: AppError = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
  });

  it('header x-role:admin no otorga privilegios de admin', async () => {
    jwtVerify.mockReturnValue({ userId: 'patient-id' });
    UserModel.findById.mockResolvedValue(activeUser({ _id: 'patient-id', role: 'patient' }));

    const req = buildReq({
      headers: {
        authorization: 'Bearer patient.token.here',
        'x-role': 'admin',
      },
    });
    const next = buildNext();
    await authenticate(req, buildRes(), next);

    expect(next).toHaveBeenCalledWith(); // Autenticado correctamente
    expect(req.user.role).toBe('patient'); // Rol del token, no del header
  });

  it('campo isAdmin:true en body no eleva privilegios', () => {
    const req = buildReq({
      user: activeUser({ role: 'patient' }),
      body: { isAdmin: true, admin: true },
    });
    const next = buildNext();
    authorize('admin')(req, buildRes(), next);
    const err: AppError = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTHZ-06/07/08: Endpoints administrativos
// ─────────────────────────────────────────────────────────────────────────────

describe('AUTHZ-06/07/08 — Endpoints administrativos rechazados a roles inferiores', () => {
  it('authorize rechaza a patient en ruta de solo-admin (users:manage)', () => {
    const req = buildReq({ user: activeUser({ role: 'patient' }) });
    const next = buildNext();
    authorize('admin')(req, buildRes(), next);
    const err: AppError = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
    expect(err.message).toMatch(/admin/i);
  });

  it('authorize rechaza a doctor en ruta de solo-admin', () => {
    const req = buildReq({ user: activeUser({ role: 'doctor' }) });
    const next = buildNext();
    authorize('admin')(req, buildRes(), next);
    const err: AppError = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
  });

  it('requirePermission rechaza a patient en users:manage', () => {
    const req = buildReq({ user: { role: 'patient' } });
    const res = buildRes();
    const next = buildNext();
    requirePermission('users:manage')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('requirePermission rechaza a doctor en dsr:delete', () => {
    const req = buildReq({ user: { role: 'doctor' } });
    const res = buildRes();
    const next = buildNext();
    requirePermission('dsr:delete')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('requirePermission rechaza a patient en reports:generate', () => {
    const req = buildReq({ user: { role: 'patient' } });
    const res = buildRes();
    const next = buildNext();
    requirePermission('reports:generate')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Casos edge — payloads JWT no estándar
// ─────────────────────────────────────────────────────────────────────────────

describe('AUTH — Payloads JWT no estándar', () => {
  beforeEach(() => jest.clearAllMocks());

  it('token válido pero sin campo userId → usuario no encontrado → 401', async () => {
    jwtVerify.mockReturnValue({ sub: 'some-id' }); // 'userId' no presente
    UserModel.findById.mockResolvedValue(null);
    const req = buildReq({ headers: { authorization: 'Bearer valid.nosub.token' } });
    const next = buildNext();
    await authenticate(req, buildRes(), next);
    const err: AppError = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
  });

  it('userId con caracteres especiales → busca en BD sin error', async () => {
    jwtVerify.mockReturnValue({ userId: "'; DROP TABLE users; --" });
    UserModel.findById.mockResolvedValue(null); // Mongoose no haría nada malo
    const req = buildReq({ headers: { authorization: 'Bearer injection.attempt.token' } });
    const next = buildNext();
    await authenticate(req, buildRes(), next);
    // No debe producir excepción no controlada
    const err: AppError = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
  });

  it('userId como objeto (NoSQL injection en payload) → 401', async () => {
    jwtVerify.mockReturnValue({ userId: { $gt: '' } }); // NoSQL operator
    UserModel.findById.mockResolvedValue(null);
    const req = buildReq({ headers: { authorization: 'Bearer nosql.payload.token' } });
    const next = buildNext();
    await authenticate(req, buildRes(), next);
    const err: AppError = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
  });
});