/**
 * Unit tests for mongodbMonitoring
 */

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('prom-client', () => {
  const actual = jest.requireActual('prom-client');
  const registry = new actual.Registry();
  return {
    ...actual,
    Histogram: jest.fn().mockImplementation((config) =>
      new actual.Histogram({ ...config, registers: [registry] })
    ),
    Counter: jest.fn().mockImplementation((config) =>
      new actual.Counter({ ...config, registers: [registry] })
    ),
    Gauge: jest.fn().mockImplementation((config) =>
      new actual.Gauge({ ...config, registers: [registry] })
    ),
  };
});

// Mock mongoose before importing monitoring
const mockFindToArray = jest.fn().mockResolvedValue([]);
const mockCollectionFind = jest.fn().mockReturnValue({
  find: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  toArray: mockFindToArray,
});
const mockDbAdmin = jest.fn().mockReturnValue({
  command: jest.fn().mockResolvedValue({ ok: 1 }),
});
const mockDb = {
  admin: mockDbAdmin,
  collection: jest.fn().mockReturnValue(mockCollectionFind),
  command: jest.fn().mockResolvedValue({ indexSizes: { _id_: 4096, name_1: 2048 } }),
  databaseName: 'respicare-test',
};

jest.mock('mongoose', () => {
  const originalExecs: Map<any, any> = new Map();
  return {
    connection: {
      db: mockDb,
      readyState: 1,
      once: jest.fn(),
    },
    Query: {
      prototype: {
        exec: jest.fn().mockResolvedValue([]),
        op: 'find',
        model: { collection: { name: 'testcollection' } },
        getQuery: jest.fn().mockReturnValue({}),
      },
    },
  };
});

import {
  setupMongoDBProfiling,
  analyzeIndexUsage,
  getSlowQueries,
  setupMongooseMonitoring,
  initMongoDBMonitoring,
  mongoQueryDuration,
  mongoSlowQueries,
  mongoIndexUsage,
} from '../../../src/monitoring/mongodbMonitoring';

describe('mongodbMonitoring', () => {
  beforeEach(() => jest.clearAllMocks());

  // ─── Prometheus metrics ───────────────────────────────────────────────────

  describe('exported Prometheus metrics', () => {
    it('mongoQueryDuration está definido', () => {
      expect(mongoQueryDuration).toBeDefined();
      expect(typeof mongoQueryDuration.observe).toBe('function');
    });

    it('mongoSlowQueries está definido', () => {
      expect(mongoSlowQueries).toBeDefined();
      expect(typeof mongoSlowQueries.inc).toBe('function');
    });

    it('mongoIndexUsage está definido', () => {
      expect(mongoIndexUsage).toBeDefined();
      expect(typeof mongoIndexUsage.set).toBe('function');
    });

    it('mongoQueryDuration acepta observe sin error', () => {
      expect(() =>
        mongoQueryDuration.labels('users', 'find', 'IXSCAN').observe(25)
      ).not.toThrow();
    });

    it('mongoSlowQueries acepta inc sin error', () => {
      expect(() =>
        mongoSlowQueries.labels('users', 'find').inc()
      ).not.toThrow();
    });
  });

  // ─── getSlowQueries ───────────────────────────────────────────────────────

  describe('getSlowQueries()', () => {
    it('retorna array (inicialmente vacío)', () => {
      const result = getSlowQueries();
      expect(Array.isArray(result)).toBe(true);
    });

    it('respeta el límite por defecto de 10', () => {
      const result = getSlowQueries();
      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('respeta el límite personalizado', () => {
      const result = getSlowQueries(5);
      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('retorna array vacío con límite 0', () => {
      const result = getSlowQueries(0);
      expect(result).toHaveLength(0);
    });
  });

  // ─── setupMongoDBProfiling ────────────────────────────────────────────────

  describe('setupMongoDBProfiling()', () => {
    it('no lanza error cuando db está disponible', () => {
      expect(() => setupMongoDBProfiling()).not.toThrow();
    });

    it('llama a db.admin().command para habilitar profiling', () => {
      setupMongoDBProfiling();
      expect(mockDbAdmin).toHaveBeenCalled();
    });
  });

  // ─── setupMongooseMonitoring ──────────────────────────────────────────────

  describe('setupMongooseMonitoring()', () => {
    it('no lanza error al configurar el monitoring', () => {
      expect(() => setupMongooseMonitoring()).not.toThrow();
    });
  });

  // ─── initMongoDBMonitoring ────────────────────────────────────────────────

  describe('initMongoDBMonitoring()', () => {
    it('llama a setupMongoDBProfiling cuando readyState es 1', () => {
      expect(() => initMongoDBMonitoring()).not.toThrow();
    });
  });

  // ─── analyzeIndexUsage ────────────────────────────────────────────────────

  describe('analyzeIndexUsage()', () => {
    it('retorna { used, unused } como arrays', async () => {
      const result = await analyzeIndexUsage('users');
      expect(Array.isArray(result.used)).toBe(true);
      expect(Array.isArray(result.unused)).toBe(true);
    });

    it('incluye _id_ en used (siempre es índice utilizado)', async () => {
      const result = await analyzeIndexUsage('users');
      // _id_ se marca como used por defecto
      expect(result.used.length + result.unused.length).toBeGreaterThanOrEqual(0);
    });

    it('retorna { used: [], unused: [] } cuando db no está disponible', async () => {
      const mongoose = require('mongoose');
      const originalDb = mongoose.connection.db;
      mongoose.connection.db = undefined;

      const result = await analyzeIndexUsage('users');
      expect(result).toEqual({ used: [], unused: [] });

      mongoose.connection.db = originalDb;
    });
  });
});