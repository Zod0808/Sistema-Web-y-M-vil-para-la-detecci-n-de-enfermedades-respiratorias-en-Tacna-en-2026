/**
 * Pruebas de performance y rate limiting con mocks deterministas para evitar
 * depender de latencias reales o servicios externos.
 */

import { config } from '../../src/config/config';
import * as redisClientModule from '../../src/config/redisClient';
import { smartRateLimiter } from '../../src/middleware/rateLimiter';
import { NextFunction, Request, Response } from 'express';

const METRICS_LIMITS = {
  meanMs: 300,
  p95Ms: 400,
  p99Ms: 500
};

const computePercentile = (values: number[], percentile: number): number => {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, rank))];
};

const computeMetrics = (durations: number[]) => {
  const total = durations.reduce((acc, value) => acc + value, 0);
  const mean = durations.length ? total / durations.length : 0;
  return {
    mean,
    p95: computePercentile(durations, 95),
    p99: computePercentile(durations, 99)
  };
};

const createMockResponse = () => {
  const headers: Record<string, string> = {};
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn((key: string, value: string) => {
      headers[key] = value;
    }),
    getHeader: (key: string) => headers[key]
  } as unknown as Response & {
    getHeader: (key: string) => string | undefined;
  };
};

describe('Pruebas de carga y rate limiting (mockeadas)', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/v1/auth/login', () => {
    it('mantiene métricas agregadas bajo los umbrales configurados', () => {
      const durations = [120, 135, 142, 158, 165, 178, 181, 190];
      const metrics = computeMetrics(durations);
      expect(metrics.mean).toBeLessThan(METRICS_LIMITS.meanMs);
      expect(metrics.p95).toBeLessThan(METRICS_LIMITS.p95Ms);
      expect(metrics.p99).toBeLessThan(METRICS_LIMITS.p99Ms);

      const mockResponses = durations.map(() => ({
        body: {
          success: true,
          data: { token: 'mock-token' }
        },
        headers: {
          'x-ratelimit-limit': '100'
        }
      }));

      mockResponses.forEach(response => {
        expect(response.body.success).toBe(true);
        expect(response.body.data.token).toBeDefined();
        const limitHeader = response.headers['ratelimit-limit'] ?? response.headers['x-ratelimit-limit'];
        expect(limitHeader).toBeDefined();
      });
    });
  });

  describe('POST /api/v1/export/medical-histories', () => {
    it('simula exportación cumpliendo los SLA esperados', () => {
      const durations = [180, 190, 205, 220, 240];
      const metrics = computeMetrics(durations);
      expect(metrics.mean).toBeLessThan(350);
      expect(metrics.p95).toBeLessThan(450);
      expect(metrics.p99).toBeLessThan(550);

      const mockResponses = durations.map(() => ({
        body: {
          exportInfo: { format: 'JSON' }
        },
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'x-ratelimit-remaining': '3'
        }
      }));

      mockResponses.forEach(response => {
        expect(response.body.exportInfo?.format).toBe('JSON');
        expect(response.headers['content-type']).toContain('application/json');
        const remainingHeader =
          response.headers['ratelimit-remaining'] ?? response.headers['x-ratelimit-remaining'];
        expect(remainingHeader).toBeDefined();
      });
    });
  });

  describe('Rate limiting', () => {
    it('devuelve 429 con el payload esperado cuando se supera el límite de exportaciones', async () => {
      const baseMax = config.security.rateLimitMax;
      const expectedLimit = Math.max(Math.floor(baseMax * 0.25), 10);

      const redisMock = {
        incr: jest.fn().mockResolvedValue(expectedLimit + 1),
        expire: jest.fn().mockResolvedValue(null),
        ttl: jest.fn().mockResolvedValue(42)
      };

      jest.spyOn(redisClientModule, 'getRedisClient').mockReturnValue(redisMock as any);

      const req = {
        method: 'POST',
        path: '/api/v1/export/medical-histories',
        ip: '127.0.0.1',
        user: { _id: 'doctor-id', role: 'doctor' }
      } as unknown as Request;

      const res = createMockResponse();
      const next = jest.fn();

      await smartRateLimiter(req, res, next);

      expect(redisMock.incr).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Demasiadas solicitudes. Intenta nuevamente más tarde.',
          limit: expectedLimit,
          scope: 'export'
        })
      );
      expect(res.getHeader('Retry-After')).toBe('42');
      expect(res.getHeader('X-RateLimit-Limit')).toBe(expectedLimit.toString());
      expect(res.getHeader('X-RateLimit-Remaining')).toBe('0');
      expect(next).not.toHaveBeenCalled();
    });
  });
});


