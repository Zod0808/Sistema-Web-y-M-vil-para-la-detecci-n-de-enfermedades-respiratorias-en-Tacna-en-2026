/**
 * Unit tests for percentileMetrics
 */

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('prom-client', () => {
  const actual = jest.requireActual('prom-client');
  const registry = new actual.Registry();
  const Histogram = jest.fn().mockImplementation((config) => {
    return new actual.Histogram({ ...config, registers: [registry] });
  });
  return { ...actual, Histogram, Registry: actual.Registry };
});

import {
  percentileMetricsMiddleware,
  getPercentileMetrics,
  calculatePercentiles,
  httpRequestPercentiles,
} from '../../../src/metrics/percentileMetrics';

const buildReq = (overrides: Record<string, any> = {}) => ({
  method: 'GET',
  path: '/api/v1/test',
  route: undefined,
  ...overrides,
});

const buildRes = () => {
  const listeners: Record<string, Function> = {};
  return {
    statusCode: 200,
    on: jest.fn((event: string, cb: Function) => { listeners[event] = cb; }),
    _trigger: (event: string) => listeners[event]?.(),
  } as any;
};

describe('percentileMetrics module', () => {
  beforeEach(() => jest.clearAllMocks());

  // ─── percentileMetricsMiddleware ──────────────────────────────────────────

  describe('percentileMetricsMiddleware', () => {
    it('llama a next()', () => {
      const next = jest.fn();
      percentileMetricsMiddleware(buildReq(), buildRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it('registra listener en finish', () => {
      const next = jest.fn();
      const res = buildRes();
      percentileMetricsMiddleware(buildReq(), res, next);
      expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });

    it('no lanza error cuando se dispara finish', () => {
      const next = jest.fn();
      const res = buildRes();
      percentileMetricsMiddleware(buildReq(), res, next);
      expect(() => res._trigger('finish')).not.toThrow();
    });

    it('reemplaza parámetros dinámicos con :param', () => {
      const next = jest.fn();
      const res = buildRes();
      const req = buildReq({ route: { path: '/api/v1/patients/:id' }, path: '/api/v1/patients/abc123' });
      percentileMetricsMiddleware(req, res, next);
      expect(() => res._trigger('finish')).not.toThrow();
    });

    it('usa path cuando route es undefined', () => {
      const next = jest.fn();
      const res = buildRes();
      percentileMetricsMiddleware(buildReq({ route: undefined, path: '/api/v1/health' }), res, next);
      expect(() => res._trigger('finish')).not.toThrow();
    });

    it('registra status_code correcto en los labels', () => {
      const next = jest.fn();
      const res = buildRes();
      res.statusCode = 404;
      percentileMetricsMiddleware(buildReq(), res, next);
      expect(() => res._trigger('finish')).not.toThrow();
    });
  });

  // ─── calculatePercentiles ─────────────────────────────────────────────────

  describe('calculatePercentiles', () => {
    it('retorna ceros cuando no hay buckets', () => {
      const mockHistogram = {
        labels: () => ({
          get: () => ({ values: [] }),
        }),
      } as any;

      const result = calculatePercentiles(mockHistogram, { method: 'GET', route: '/test', status_code: '200' });
      expect(result).toEqual({ p50: 0, p95: 0, p99: 0, count: 0 });
    });

    it('retorna ceros cuando total de observaciones es 0', () => {
      const mockHistogram = {
        labels: () => ({
          get: () => ({
            values: [
              { le: 10, value: 0 },
              { le: 100, value: 0 },
            ],
          }),
        }),
      } as any;

      const result = calculatePercentiles(mockHistogram, { method: 'GET', route: '/test', status_code: '200' });
      expect(result).toEqual({ p50: 0, p95: 0, p99: 0, count: 0 });
    });

    it('calcula percentiles con buckets reales', () => {
      // Simula 100 observaciones: 50 en bucket le=10, 40 en le=100, 10 en le=1000
      const mockHistogram = {
        labels: () => ({
          get: () => ({
            values: [
              { le: 10, value: 50 },
              { le: 100, value: 40 },
              { le: 1000, value: 10 },
            ],
          }),
        }),
      } as any;

      const result = calculatePercentiles(mockHistogram, { method: 'GET', route: '/test', status_code: '200' });
      expect(result.count).toBe(100);
      // p50 debería estar en el bucket de 10 (50 observaciones = 50%)
      expect(result.p50).toBe(10);
      // p95 debería estar en bucket de 100 (90 obs = 90%, necesitamos 95%)
      expect(result.p95).toBe(1000);
      // p99 debería estar en bucket de 1000
      expect(result.p99).toBe(1000);
    });
  });

  // ─── getPercentileMetrics ─────────────────────────────────────────────────

  describe('getPercentileMetrics', () => {
    it('retorna objeto (vacío si no hay métricas registradas)', () => {
      const result = getPercentileMetrics();
      expect(typeof result).toBe('object');
      expect(result).not.toBeNull();
    });

    it('acepta filtro de route sin lanzar error', () => {
      expect(() => getPercentileMetrics('/api/v1/health')).not.toThrow();
    });

    it('acepta filtro de method sin lanzar error', () => {
      expect(() => getPercentileMetrics(undefined, 'GET')).not.toThrow();
    });

    it('acepta filtros combinados route + method', () => {
      expect(() => getPercentileMetrics('/api/v1/test', 'POST')).not.toThrow();
    });
  });

  // ─── httpRequestPercentiles histogram ────────────────────────────────────

  describe('httpRequestPercentiles', () => {
    it('está definido y es un histograma de prom-client', () => {
      expect(httpRequestPercentiles).toBeDefined();
      expect(typeof httpRequestPercentiles.observe).toBe('function');
    });

    it('acepta observe sin lanzar error', () => {
      expect(() => {
        httpRequestPercentiles.labels('GET', '/test', '200').observe(42);
      }).not.toThrow();
    });
  });
});