import {
  buildCacheKey,
  deleteCachedValue,
  getCachedValue,
  invalidateCacheByPattern,
  setCachedValue
} from '../../../src/services/cacheService';

jest.mock('../../../src/config/redisClient', () => ({
  getRedisClient: jest.fn()
}));

jest.mock('../../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn()
  }
}));

const redisClientModule = require('../../../src/config/redisClient') as {
  getRedisClient: jest.Mock;
};
const getRedisClientMock = redisClientModule.getRedisClient;

const loggerModule = require('../../../src/utils/logger') as {
  logger: {
    debug: jest.Mock;
    warn: jest.Mock;
  };
};
const loggerMock = loggerModule.logger;

describe('cacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('buildCacheKey', () => {
    it('genera la misma clave para cargas útiles con orden diferente', () => {
      const payloadA = { b: 2, a: 1, nested: { y: 'y', x: 'x' } };
      const payloadB = { nested: { x: 'x', y: 'y' }, a: 1, b: 2 };

      const keyA = buildCacheKey('namespace', 'identifier', payloadA);
      const keyB = buildCacheKey('namespace', 'identifier', payloadB);

      expect(keyA).toBe(keyB);
      expect(keyA.startsWith('namespace:identifier:')).toBe(true);
    });
  });

  describe('getCachedValue', () => {
    it('devuelve null cuando no existe cliente Redis', async () => {
      getRedisClientMock.mockReturnValue(null);

      const result = await getCachedValue('missing-key');

      expect(result).toBeNull();
    });

    it('devuelve el valor parseado cuando existe en cache', async () => {
      const cachedValue = { foo: 'bar' };
      const redisMock = {
        get: jest.fn().mockResolvedValue(JSON.stringify(cachedValue))
      };
      getRedisClientMock.mockReturnValue(redisMock);

      const result = await getCachedValue('cached-key');

      expect(redisMock.get).toHaveBeenCalledWith('cached-key');
      expect(result).toEqual(cachedValue);
    });

    it('registra advertencia y devuelve null cuando la lectura falla', async () => {
      const redisMock = {
        get: jest.fn().mockRejectedValue(new Error('Redis failure'))
      };
      getRedisClientMock.mockReturnValue(redisMock);

      const result = await getCachedValue('error-key');

      expect(result).toBeNull();
      expect(loggerMock.warn).toHaveBeenCalledWith(
        'No fue posible recuperar el valor en cache',
        expect.objectContaining({
          key: 'error-key'
        })
      );
    });
  });

  describe('setCachedValue', () => {
    it('almacena el valor en cache con TTL por defecto', async () => {
      const redisMock = {
        set: jest.fn().mockResolvedValue(undefined)
      };
      getRedisClientMock.mockReturnValue(redisMock);

      await setCachedValue('cache-key', { value: 1 });

      expect(redisMock.set).toHaveBeenCalledWith(
        'cache-key',
        JSON.stringify({ value: 1 }),
        expect.objectContaining({ EX: 120 })
      );
    });

    it('registra advertencia cuando ocurre un fallo al guardar', async () => {
      const redisMock = {
        set: jest.fn().mockRejectedValue(new Error('write error'))
      };
      getRedisClientMock.mockReturnValue(redisMock);

      await setCachedValue('cache-key', { value: 1 });

      expect(loggerMock.warn).toHaveBeenCalledWith(
        'No fue posible almacenar el valor en cache',
        expect.objectContaining({ key: 'cache-key' })
      );
    });
  });

  describe('deleteCachedValue', () => {
    it('elimina la clave cuando existe cliente Redis', async () => {
      const redisMock = {
        del: jest.fn().mockResolvedValue(1)
      };
      getRedisClientMock.mockReturnValue(redisMock);

      await deleteCachedValue('cache-key');

      expect(redisMock.del).toHaveBeenCalledWith('cache-key');
    });

    it('registra advertencia cuando ocurre un fallo al eliminar', async () => {
      const redisMock = {
        del: jest.fn().mockRejectedValue(new Error('delete error'))
      };
      getRedisClientMock.mockReturnValue(redisMock);

      await deleteCachedValue('cache-key');

      expect(loggerMock.warn).toHaveBeenCalledWith(
        'No fue posible eliminar la clave del cache',
        expect.objectContaining({ key: 'cache-key' })
      );
    });
  });

  describe('invalidateCacheByPattern', () => {
    it('elimina claves coincidentes y registra depuración', async () => {
      const keys = ['key:1', 'key:2'];
      const redisMock = {
        scanIterator: jest.fn().mockImplementation(function* () {
          for (const key of keys) {
            yield key;
          }
        }),
        del: jest.fn().mockResolvedValue(keys.length)
      };
      getRedisClientMock.mockReturnValue(redisMock);

      await invalidateCacheByPattern('key:*');

      expect(redisMock.scanIterator).toHaveBeenCalledWith({ MATCH: 'key:*', COUNT: 100 });
      expect(redisMock.del).toHaveBeenCalledWith(keys);
      expect(loggerMock.debug).toHaveBeenCalledWith('Cache invalidated by pattern', {
        pattern: 'key:*',
        removedKeys: keys.length
      });
    });

    it('omite eliminaciones cuando no se encuentran coincidencias', async () => {
      const redisMock = {
        scanIterator: jest.fn().mockImplementation(function* () {
          // sin resultados
        }),
        del: jest.fn()
      };
      getRedisClientMock.mockReturnValue(redisMock);

      await invalidateCacheByPattern('empty:*');

      expect(redisMock.del).not.toHaveBeenCalled();
      expect(loggerMock.debug).not.toHaveBeenCalled();
    });

    it('maneja errores durante la invalidación sin lanzar excepciones', async () => {
      const redisMock = {
        scanIterator: jest.fn().mockImplementation(() => {
          throw new Error('scan error');
        }),
        del: jest.fn()
      };
      getRedisClientMock.mockReturnValue(redisMock);

      await invalidateCacheByPattern('key:*');

      expect(loggerMock.warn).toHaveBeenCalledWith(
        'Fallo al invalidar claves por patrón',
        expect.objectContaining({ pattern: 'key:*' })
      );
    });
  });
});
