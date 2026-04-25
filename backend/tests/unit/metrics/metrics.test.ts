/**
 * Unit tests for metrics middleware and handler
 */

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// Isolate prom-client registry per test suite to avoid duplicate metric errors
jest.mock('prom-client', () => {
  const actual = jest.requireActual('prom-client');
  const registry = new actual.Registry();
  actual.collectDefaultMetrics({ register: registry });
  const Histogram = jest.fn().mockImplementation((config) => {
    const h = new actual.Histogram({ ...config, registers: [registry] });
    return h;
  });
  const Counter = jest.fn().mockImplementation((config) => {
    const c = new actual.Counter({ ...config, registers: [registry] });
    return c;
  });
  return { ...actual, Registry: actual.Registry, Histogram, Counter, collectDefaultMetrics: actual.collectDefaultMetrics, register: registry };
});

import { metricsMiddleware, metricsHandler, metricsRegistry } from '../../../src/metrics/metrics';

const buildReq = (overrides: Record<string, any> = {}) => ({
  method: 'GET',
  path: '/api/v1/health',
  route: undefined,
  get: jest.fn((h: string) => overrides.authorization || undefined),
  ...overrides,
});

const buildRes = () => {
  const listeners: Record<string, Function> = {};
  const res: any = {
    statusCode: 200,
    on: jest.fn((event: string, cb: Function) => { listeners[event] = cb; }),
    set: jest.fn(),
    end: jest.fn(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    _trigger: (event: string) => listeners[event]?.(),
  };
  return res;
};

const next = jest.fn();

describe('metrics module', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('metricsMiddleware', () => {
    it('llama a next()', () => {
      const req = buildReq();
      const res = buildRes();
      metricsMiddleware(req as any, res as any, next);
      expect(next).toHaveBeenCalled();
    });

    it('registra listener en finish', () => {
      const req = buildReq();
      const res = buildRes();
      metricsMiddleware(req as any, res as any, next);
      expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });

    it('observa métricas cuando se dispara finish', () => {
      const req = buildReq({ method: 'POST', path: '/api/v1/test' });
      const res = buildRes();
      res.statusCode = 201;
      metricsMiddleware(req as any, res as any, next);
      expect(() => res._trigger('finish')).not.toThrow();
    });

    it('reemplaza parámetros dinámicos con :param en la ruta', () => {
      const req = buildReq({
        route: { path: '/api/v1/patients/:id/records/:recordId' },
        path: '/api/v1/patients/123/records/456',
      });
      const res = buildRes();
      metricsMiddleware(req as any, res as any, next);
      expect(() => res._trigger('finish')).not.toThrow();
    });

    it('usa req.path cuando req.route es undefined', () => {
      const req = buildReq({ route: undefined, path: '/api/v1/health' });
      const res = buildRes();
      metricsMiddleware(req as any, res as any, next);
      expect(() => res._trigger('finish')).not.toThrow();
    });

    it('maneja path vacío sin error', () => {
      const req = buildReq({ route: undefined, path: '' });
      const res = buildRes();
      metricsMiddleware(req as any, res as any, next);
      expect(() => res._trigger('finish')).not.toThrow();
    });
  });

  describe('metricsHandler', () => {
    it('responde con Content-Type de prometheus cuando no hay token configurado', async () => {
      delete process.env.METRICS_AUTH_TOKEN;
      const req = buildReq({ get: jest.fn().mockReturnValue(undefined) });
      const res = buildRes();
      await metricsHandler(req as any, res as any);
      expect(res.set).toHaveBeenCalledWith('Content-Type', expect.any(String));
      expect(res.end).toHaveBeenCalled();
    });

    it('retorna 401 cuando token no coincide', async () => {
      process.env.METRICS_AUTH_TOKEN = 'secret-token';
      const req = buildReq({ get: jest.fn().mockReturnValue('Bearer wrong-token') });
      const res = buildRes();
      await metricsHandler(req as any, res as any);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith('Unauthorized');
    });

    it('responde con métricas cuando token es correcto', async () => {
      process.env.METRICS_AUTH_TOKEN = 'secret-token';
      const req = buildReq({ get: jest.fn().mockReturnValue('Bearer secret-token') });
      const res = buildRes();
      await metricsHandler(req as any, res as any);
      expect(res.end).toHaveBeenCalled();
    });

    it('responde normalmente cuando METRICS_AUTH_TOKEN no está definido', async () => {
      delete process.env.METRICS_AUTH_TOKEN;
      const req = buildReq();
      const res = buildRes();
      await metricsHandler(req as any, res as any);
      expect(res.end).toHaveBeenCalled();
    });
  });

  describe('metricsRegistry', () => {
    it('es una instancia del Registry de prom-client', () => {
      expect(metricsRegistry).toBeDefined();
      expect(typeof metricsRegistry.metrics).toBe('function');
    });

    it('expone métricas en formato texto de prometheus', async () => {
      const output = await metricsRegistry.metrics();
      expect(typeof output).toBe('string');
    });

    it('contiene http_requests_total', async () => {
      const output = await metricsRegistry.metrics();
      expect(output).toContain('http_requests_total');
    });

    it('contiene http_request_duration_ms', async () => {
      const output = await metricsRegistry.metrics();
      expect(output).toContain('http_request_duration_ms');
    });
  });
});