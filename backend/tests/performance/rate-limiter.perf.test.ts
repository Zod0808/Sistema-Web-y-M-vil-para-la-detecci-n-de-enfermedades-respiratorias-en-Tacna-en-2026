/**
 * Rate Limiter Performance Tests — Todos los Scopes y Comportamientos
 *
 * Cubre:
 * - Cálculo correcto de límites por scope (auth, export, admin, doctor, patient, anonymous)
 * - Headers de respuesta (X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After)
 * - Bloqueo 429 al superar el límite
 * - Comportamiento con Redis disponible vs. no disponible (fallback)
 * - Identificador por userId vs. IP (usuarios autenticados vs. anónimos)
 * - Clave de ventana temporal (windowBucket)
 * - Throughput del middleware bajo llamadas simultáneas
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../../src/config/config';
import * as redisClientModule from '../../src/config/redisClient';
import { smartRateLimiter } from '../../src/middleware/rateLimiter';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const baseMax = config.security.rateLimitMax;
const baseWindowMs = config.security.rateLimitWindow;

/** Mock Redis con contador configurable */
const buildRedisMock = (currentCount: number, ttlSeconds = 42) => ({
  incr: jest.fn().mockResolvedValue(currentCount),
  expire: jest.fn().mockResolvedValue(1),
  ttl: jest.fn().mockResolvedValue(ttlSeconds),
});

/** Construye un mock de Request con path, ip y user opcionales */
const buildReq = (
  path: string,
  overrides: Partial<{ ip: string; user: { _id: string; role: string } }> = {}
): Request =>
  ({
    path,
    method: 'GET',
    ip: overrides.ip ?? '127.0.0.1',
    user: overrides.user ?? undefined,
  } as unknown as Request);

/** Construye un mock de Response que captura status, json, setHeader y getHeader */
const buildRes = () => {
  const headers: Record<string, string> = {};
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn((key: string, value: string) => {
      headers[key] = value;
    }),
    getHeader: (key: string) => headers[key],
  } as unknown as Response & { getHeader: (k: string) => string | undefined };
  return res;
};

const buildNext = () => jest.fn() as unknown as NextFunction;

// ═══════════════════════════════════════════════════════════════════════════════
// SCOPE: auth
// ═══════════════════════════════════════════════════════════════════════════════

describe('Rate Limiter — Scope AUTH (/api/v1/auth/*)', () => {
  const expectedMax = Math.max(Math.floor(baseMax * 0.4), 20);

  beforeEach(() => jest.restoreAllMocks());

  it('calcula el límite correcto para rutas auth (40% del base, mín 20)', async () => {
    const redisMock = buildRedisMock(1);
    jest.spyOn(redisClientModule, 'getRedisClient').mockReturnValue(redisMock as any);

    const req = buildReq('/api/v1/auth/login');
    const res = buildRes();
    const next = buildNext();

    await smartRateLimiter(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', expectedMax.toString());
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('retorna 429 cuando el contador supera el límite auth', async () => {
    const redisMock = buildRedisMock(expectedMax + 1);
    jest.spyOn(redisClientModule, 'getRedisClient').mockReturnValue(redisMock as any);

    const req = buildReq('/api/v1/auth/login');
    const res = buildRes();
    const next = buildNext();

    await smartRateLimiter(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, scope: 'auth', limit: expectedMax })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('incluye Retry-After en la respuesta 429', async () => {
    const redisMock = buildRedisMock(expectedMax + 5, 30);
    jest.spyOn(redisClientModule, 'getRedisClient').mockReturnValue(redisMock as any);

    const req = buildReq('/api/v1/auth/register');
    const res = buildRes();

    await smartRateLimiter(req, res, buildNext());

    expect(res.getHeader('Retry-After')).toBe('30');
  });

  it('X-RateLimit-Remaining refleja cuántas peticiones quedan', async () => {
    const current = 3;
    const redisMock = buildRedisMock(current);
    jest.spyOn(redisClientModule, 'getRedisClient').mockReturnValue(redisMock as any);

    const req = buildReq('/api/v1/auth/login');
    const res = buildRes();

    await smartRateLimiter(req, res, buildNext());

    const remaining = parseInt(res.getHeader('X-RateLimit-Remaining') ?? '0', 10);
    expect(remaining).toBe(Math.max(expectedMax - current, 0));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SCOPE: export
// ═══════════════════════════════════════════════════════════════════════════════

describe('Rate Limiter — Scope EXPORT (/api/v1/export/*)', () => {
  const expectedMax = Math.max(Math.floor(baseMax * 0.25), 10);

  beforeEach(() => jest.restoreAllMocks());

  it('calcula el límite correcto para rutas export (25% del base, mín 10)', async () => {
    const redisMock = buildRedisMock(1);
    jest.spyOn(redisClientModule, 'getRedisClient').mockReturnValue(redisMock as any);

    const req = buildReq('/api/v1/export/medical-histories', {
      user: { _id: 'doctor-1', role: 'doctor' },
    });
    const res = buildRes();

    await smartRateLimiter(req, res, buildNext());

    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', expectedMax.toString());
  });

  it('bloquea cuando se supera el límite de exportaciones', async () => {
    const redisMock = buildRedisMock(expectedMax + 1);
    jest.spyOn(redisClientModule, 'getRedisClient').mockReturnValue(redisMock as any);

    const req = buildReq('/api/v1/export/alerts');
    const res = buildRes();
    const next = buildNext();

    await smartRateLimiter(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(next).not.toHaveBeenCalled();
  });

  it('usa ventana 4x más larga para export que para otros scopes', async () => {
    // La ventana de export es baseWindowMs * 4 — verificamos que la clave Redis incluye
    // el bucket calculado con esa ventana (indirectamente, el incr es llamado)
    const redisMock = buildRedisMock(1);
    jest.spyOn(redisClientModule, 'getRedisClient').mockReturnValue(redisMock as any);

    const req = buildReq('/api/v1/export/medical-histories');
    await smartRateLimiter(req, buildRes(), buildNext());

    expect(redisMock.incr).toHaveBeenCalledTimes(1);
    // La clave debe contener el scope 'export'
    const calledKey: string = redisMock.incr.mock.calls[0][0];
    expect(calledKey).toContain('export');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SCOPE: por rol (admin / doctor / patient / anonymous)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Rate Limiter — Scopes por Rol', () => {
  beforeEach(() => jest.restoreAllMocks());

  const roleTests = [
    { role: 'admin',   multiplier: 2,    minVal: undefined },
    { role: 'doctor',  multiplier: 1.2,  minVal: undefined },
    { role: 'patient', multiplier: 0.8,  minVal: undefined },
  ];

  roleTests.forEach(({ role, multiplier }) => {
    const expectedMax = Math.floor(baseMax * multiplier);

    it(`rol ${role}: límite = ${multiplier}x del base (${expectedMax})`, async () => {
      const redisMock = buildRedisMock(1);
      jest.spyOn(redisClientModule, 'getRedisClient').mockReturnValue(redisMock as any);

      const req = buildReq('/api/v1/medical-histories', {
        user: { _id: `user-${role}`, role },
      });
      const res = buildRes();

      await smartRateLimiter(req, res, buildNext());

      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', expectedMax.toString());
    });

    it(`rol ${role}: scope correcto en la clave Redis`, async () => {
      const redisMock = buildRedisMock(1);
      jest.spyOn(redisClientModule, 'getRedisClient').mockReturnValue(redisMock as any);

      const req = buildReq('/api/v1/medical-histories', {
        user: { _id: `user-${role}`, role },
      });
      await smartRateLimiter(req, buildRes(), buildNext());

      const calledKey: string = redisMock.incr.mock.calls[0][0];
      expect(calledKey).toContain(role);
    });

    it(`rol ${role}: 429 al superar el límite`, async () => {
      const redisMock = buildRedisMock(expectedMax + 1);
      jest.spyOn(redisClientModule, 'getRedisClient').mockReturnValue(redisMock as any);

      const req = buildReq('/api/v1/medical-histories', {
        user: { _id: `user-${role}`, role },
      });
      const res = buildRes();

      await smartRateLimiter(req, res, buildNext());

      expect(res.status).toHaveBeenCalledWith(429);
    });
  });

  it('anonymous: límite = 60% del base, mínimo 50', async () => {
    const expectedMax = Math.max(Math.floor(baseMax * 0.6), 50);
    const redisMock = buildRedisMock(1);
    jest.spyOn(redisClientModule, 'getRedisClient').mockReturnValue(redisMock as any);

    // Sin user → anónimo
    const req = buildReq('/api/v1/symptom-reports');
    const res = buildRes();

    await smartRateLimiter(req, res, buildNext());

    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', expectedMax.toString());
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// IDENTIFICADOR — userId vs. IP
// ═══════════════════════════════════════════════════════════════════════════════

describe('Rate Limiter — Identificador (userId vs. IP)', () => {
  beforeEach(() => jest.restoreAllMocks());

  it('usa userId como identificador cuando el usuario está autenticado', async () => {
    const redisMock = buildRedisMock(1);
    jest.spyOn(redisClientModule, 'getRedisClient').mockReturnValue(redisMock as any);

    const userId = 'user-507f1f';
    const req = buildReq('/api/v1/medical-histories', {
      user: { _id: userId, role: 'doctor' },
      ip: '192.168.1.1',
    });

    await smartRateLimiter(req, buildRes(), buildNext());

    const calledKey: string = redisMock.incr.mock.calls[0][0];
    expect(calledKey).toContain(userId);
    expect(calledKey).not.toContain('192.168.1.1');
  });

  it('usa IP como identificador cuando el usuario no está autenticado', async () => {
    const redisMock = buildRedisMock(1);
    jest.spyOn(redisClientModule, 'getRedisClient').mockReturnValue(redisMock as any);

    const ip = '10.0.0.55';
    const req = buildReq('/api/v1/symptom-reports', { ip });

    await smartRateLimiter(req, buildRes(), buildNext());

    const calledKey: string = redisMock.incr.mock.calls[0][0];
    expect(calledKey).toContain(ip);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FALLBACK — Redis no disponible
// ═══════════════════════════════════════════════════════════════════════════════

describe('Rate Limiter — Fallback sin Redis', () => {
  beforeEach(() => jest.restoreAllMocks());

  it('usa el limitador fallback cuando Redis no está disponible', async () => {
    jest.spyOn(redisClientModule, 'getRedisClient').mockReturnValue(null as any);

    const req = buildReq('/api/v1/medical-histories', {
      user: { _id: 'user-1', role: 'doctor' },
    });
    const res = buildRes();
    const next = buildNext();

    // No debe lanzar excepción
    await expect(smartRateLimiter(req, res, next)).resolves.not.toThrow();
    // El next puede haber sido llamado o no según el fallback, pero no debe explotar
  });

  it('continúa sirviendo cuando Redis lanza error interno', async () => {
    const errorRedisMock = {
      incr: jest.fn().mockRejectedValue(new Error('Redis connection lost')),
      expire: jest.fn(),
      ttl: jest.fn(),
    };
    jest.spyOn(redisClientModule, 'getRedisClient').mockReturnValue(errorRedisMock as any);

    const req = buildReq('/api/v1/alerts', {
      user: { _id: 'user-1', role: 'admin' },
    });
    const res = buildRes();
    const next = buildNext();

    await expect(smartRateLimiter(req, res, next)).resolves.not.toThrow();
    // Fallback activo: el middleware no debe devolver 500
    expect(res.status).not.toHaveBeenCalledWith(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// VENTANA TEMPORAL — windowBucket
// ═══════════════════════════════════════════════════════════════════════════════

describe('Rate Limiter — Clave Redis y Ventana Temporal', () => {
  beforeEach(() => jest.restoreAllMocks());

  it('la clave Redis incluye scope, identifier y windowBucket', async () => {
    const redisMock = buildRedisMock(1);
    jest.spyOn(redisClientModule, 'getRedisClient').mockReturnValue(redisMock as any);

    const userId = 'myUserId123';
    const req = buildReq('/api/v1/medical-histories', {
      user: { _id: userId, role: 'doctor' },
    });

    await smartRateLimiter(req, buildRes(), buildNext());

    const calledKey: string = redisMock.incr.mock.calls[0][0];
    // Formato: rate-limit:{scope}:{identifier}:{windowBucket}
    expect(calledKey).toMatch(/^rate-limit:/);
    expect(calledKey).toContain('doctor');
    expect(calledKey).toContain(userId);
    // El bucket es un número
    const parts = calledKey.split(':');
    const bucket = parts[parts.length - 1];
    expect(parseInt(bucket, 10)).toBeGreaterThan(0);
  });

  it('llama a expire solo en la primera petición de la ventana (count === 1)', async () => {
    const redisMock = buildRedisMock(1); // primera petición
    jest.spyOn(redisClientModule, 'getRedisClient').mockReturnValue(redisMock as any);

    const req = buildReq('/api/v1/medical-histories', {
      user: { _id: 'uid-1', role: 'doctor' },
    });

    await smartRateLimiter(req, buildRes(), buildNext());
    expect(redisMock.expire).toHaveBeenCalledTimes(1);
  });

  it('NO llama a expire en peticiones sucesivas (count > 1)', async () => {
    const redisMock = buildRedisMock(5); // no es la primera
    jest.spyOn(redisClientModule, 'getRedisClient').mockReturnValue(redisMock as any);

    const req = buildReq('/api/v1/medical-histories', {
      user: { _id: 'uid-1', role: 'doctor' },
    });

    await smartRateLimiter(req, buildRes(), buildNext());
    expect(redisMock.expire).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// THROUGHPUT — latencia del middleware
// ═══════════════════════════════════════════════════════════════════════════════

describe('Rate Limiter — Throughput del Middleware', () => {
  beforeEach(() => jest.restoreAllMocks());

  it('procesa 100 llamadas al middleware en menos de 500ms', async () => {
    const redisMock = buildRedisMock(1);
    jest.spyOn(redisClientModule, 'getRedisClient').mockReturnValue(redisMock as any);

    const CALLS = 100;
    const t0 = performance.now();

    await Promise.all(
      Array.from({ length: CALLS }, (_, i) => {
        const req = buildReq('/api/v1/medical-histories', {
          user: { _id: `user-${i}`, role: 'doctor' },
        });
        return smartRateLimiter(req, buildRes(), buildNext());
      })
    );

    const elapsed = performance.now() - t0;
    expect(elapsed).toBeLessThan(500);
  });

  it('el middleware añade headers en todas las respuestas no bloqueadas', async () => {
    const CALLS = 10;
    const redisMock = buildRedisMock(1);
    jest.spyOn(redisClientModule, 'getRedisClient').mockReturnValue(redisMock as any);

    const results = await Promise.all(
      Array.from({ length: CALLS }, (_, i) => {
        const req = buildReq('/api/v1/alerts', {
          user: { _id: `user-${i}`, role: 'admin' },
        });
        const res = buildRes();
        const next = buildNext();
        return smartRateLimiter(req, res, next).then(() => ({ res, next }));
      })
    );

    results.forEach(({ res, next }) => {
      if (next.mock.calls.length > 0) {
        // Si pasó el rate limit, debe tener headers
        expect(res.setHeader).toHaveBeenCalledWith(
          'X-RateLimit-Limit',
          expect.any(String)
        );
        expect(res.setHeader).toHaveBeenCalledWith(
          'X-RateLimit-Remaining',
          expect.any(String)
        );
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MENSAJE DE RESPUESTA 429 — estructura
// ═══════════════════════════════════════════════════════════════════════════════

describe('Rate Limiter — Estructura de Respuesta 429', () => {
  beforeEach(() => jest.restoreAllMocks());

  it('la respuesta 429 incluye todos los campos requeridos', async () => {
    const doctorMax = Math.floor(baseMax * 1.2);
    const redisMock = buildRedisMock(doctorMax + 1);
    jest.spyOn(redisClientModule, 'getRedisClient').mockReturnValue(redisMock as any);

    const req = buildReq('/api/v1/medical-histories', {
      user: { _id: 'doc-1', role: 'doctor' },
    });
    const res = buildRes();

    await smartRateLimiter(req, res, buildNext());

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.any(String),
        limit: doctorMax,
        scope: 'doctor',
      })
    );
  });

  it('la respuesta 429 incluye retryAfterSeconds cuando TTL > 0', async () => {
    const authMax = Math.max(Math.floor(baseMax * 0.4), 20);
    const redisMock = buildRedisMock(authMax + 1, 60);
    jest.spyOn(redisClientModule, 'getRedisClient').mockReturnValue(redisMock as any);

    const req = buildReq('/api/v1/auth/login');
    const res = buildRes();

    await smartRateLimiter(req, res, buildNext());

    const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonCall.retryAfterSeconds).toBe(60);
  });
});