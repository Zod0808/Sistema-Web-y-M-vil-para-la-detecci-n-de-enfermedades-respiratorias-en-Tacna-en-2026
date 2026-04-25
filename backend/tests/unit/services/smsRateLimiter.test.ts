import { smsRateLimiter } from '../../../src/services/smsRateLimiter';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../src/config/redisClient', () => ({
  getRedisClient: jest.fn(),
}));

const { getRedisClient } = require('../../../src/config/redisClient');

const buildRedisClient = (overrides: Partial<Record<string, jest.Mock>> = {}) => ({
  get: jest.fn().mockResolvedValue('0'),
  incr: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(1),
  keys: jest.fn().mockResolvedValue([]),
  del: jest.fn().mockResolvedValue(1),
  ...overrides,
});

describe('smsRateLimiter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkRateLimit', () => {
    it('permite envío cuando Redis no está disponible (fail-open)', async () => {
      getRedisClient.mockReturnValue(null);

      const result = await smsRateLimiter.checkRateLimit('twilio');

      expect(result.allowed).toBe(true);
      expect(result.limits.minute.limit).toBe(1000);
    });

    it('permite envío cuando los contadores están por debajo del límite', async () => {
      const client = buildRedisClient({
        get: jest.fn().mockResolvedValue('5'), // 5 de 60 por minuto
      });
      getRedisClient.mockReturnValue(client);

      const result = await smsRateLimiter.checkRateLimit('twilio');

      expect(result.allowed).toBe(true);
      expect(result.limits.minute.current).toBe(5);
      expect(result.limits.minute.limit).toBe(60);
    });

    it('rechaza envío cuando se alcanza el límite por minuto', async () => {
      const client = buildRedisClient({
        get: jest.fn().mockResolvedValue('60'), // Exactamente en el límite
      });
      getRedisClient.mockReturnValue(client);

      const result = await smsRateLimiter.checkRateLimit('twilio');

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('rechaza envío cuando se alcanza el límite por hora', async () => {
      const client = buildRedisClient({
        get: jest.fn()
          .mockResolvedValueOnce('5')    // minuto: bajo
          .mockResolvedValueOnce('1000') // hora: en límite
          .mockResolvedValueOnce('500'), // día: bajo
      });
      getRedisClient.mockReturnValue(client);

      const result = await smsRateLimiter.checkRateLimit('twilio');

      expect(result.allowed).toBe(false);
    });

    it('rechaza envío cuando se alcanza el límite diario', async () => {
      const client = buildRedisClient({
        get: jest.fn()
          .mockResolvedValueOnce('5')     // minuto: bajo
          .mockResolvedValueOnce('500')   // hora: bajo
          .mockResolvedValueOnce('10000'), // día: en límite
      });
      getRedisClient.mockReturnValue(client);

      const result = await smsRateLimiter.checkRateLimit('twilio');

      expect(result.allowed).toBe(false);
    });

    it('incrementa los contadores cuando se permite el envío', async () => {
      const client = buildRedisClient({
        get: jest.fn().mockResolvedValue('1'),
      });
      getRedisClient.mockReturnValue(client);

      await smsRateLimiter.checkRateLimit('twilio');

      expect(client.incr).toHaveBeenCalledTimes(3); // minuto, hora, día
    });

    it('usa límites personalizados cuando se proveen', async () => {
      const client = buildRedisClient({
        get: jest.fn().mockResolvedValue('50'),
      });
      getRedisClient.mockReturnValue(client);

      const result = await smsRateLimiter.checkRateLimit('twilio', {
        perMinute: 10, // Límite muy bajo
        perHour: 100,
        perDay: 1000,
      });

      expect(result.allowed).toBe(false); // 50 > 10
      expect(result.limits.minute.limit).toBe(10);
    });

    it('usa límites de mock para proveedor desconocido', async () => {
      const client = buildRedisClient({
        get: jest.fn().mockResolvedValue('5'),
      });
      getRedisClient.mockReturnValue(client);

      const result = await smsRateLimiter.checkRateLimit('unknown_provider');

      expect(result.allowed).toBe(true);
      expect(result.limits.minute.limit).toBe(1000); // Mock limits
    });

    it('permite envío si Redis falla (fail-open)', async () => {
      const client = buildRedisClient({
        get: jest.fn().mockRejectedValue(new Error('Redis error')),
      });
      getRedisClient.mockReturnValue(client);

      const result = await smsRateLimiter.checkRateLimit('twilio');

      expect(result.allowed).toBe(true);
    });
  });

  describe('checkBurstLimit', () => {
    it('retorna true cuando Redis no está disponible', async () => {
      getRedisClient.mockReturnValue(null);

      const result = await smsRateLimiter.checkBurstLimit('twilio');

      expect(result).toBe(true);
    });

    it('permite envío dentro del límite de ráfaga', async () => {
      const client = buildRedisClient({
        incr: jest.fn().mockResolvedValue(5), // 5 de 10 permitidos
      });
      getRedisClient.mockReturnValue(client);

      const result = await smsRateLimiter.checkBurstLimit('twilio');

      expect(result).toBe(true);
    });

    it('rechaza envío cuando se supera el límite de ráfaga', async () => {
      const client = buildRedisClient({
        incr: jest.fn().mockResolvedValue(11), // 11 > 10 burst limit for twilio
      });
      getRedisClient.mockReturnValue(client);

      const result = await smsRateLimiter.checkBurstLimit('twilio');

      expect(result).toBe(false);
    });

    it('usa límite de burst personalizado cuando se provee', async () => {
      const client = buildRedisClient({
        incr: jest.fn().mockResolvedValue(3),
      });
      getRedisClient.mockReturnValue(client);

      const result = await smsRateLimiter.checkBurstLimit('twilio', 2); // Burst de 2

      expect(result).toBe(false); // 3 > 2
    });

    it('permite en caso de error de Redis', async () => {
      const client = buildRedisClient({
        incr: jest.fn().mockRejectedValue(new Error('Redis error')),
      });
      getRedisClient.mockReturnValue(client);

      const result = await smsRateLimiter.checkBurstLimit('twilio');

      expect(result).toBe(true);
    });
  });

  describe('getRateLimitStats', () => {
    it('retorna estadísticas vacías cuando Redis no está disponible', async () => {
      getRedisClient.mockReturnValue(null);

      const stats = await smsRateLimiter.getRateLimitStats('twilio');

      expect(stats.current.minute).toBe(0);
      expect(stats.current.hour).toBe(0);
      expect(stats.current.day).toBe(0);
      expect(stats.limits.perMinute).toBe(60);
    });

    it('retorna estadísticas correctas desde Redis', async () => {
      const client = buildRedisClient({
        get: jest.fn()
          .mockResolvedValueOnce('10')  // minuto
          .mockResolvedValueOnce('200') // hora
          .mockResolvedValueOnce('1500'), // día
      });
      getRedisClient.mockReturnValue(client);

      const stats = await smsRateLimiter.getRateLimitStats('twilio');

      expect(stats.current.minute).toBe(10);
      expect(stats.current.hour).toBe(200);
      expect(stats.current.day).toBe(1500);
      expect(stats.limits.perMinute).toBe(60);
    });

    it('retorna estadísticas vacías si Redis falla', async () => {
      const client = buildRedisClient({
        get: jest.fn().mockRejectedValue(new Error('Redis error')),
      });
      getRedisClient.mockReturnValue(client);

      const stats = await smsRateLimiter.getRateLimitStats('twilio');

      expect(stats.current.minute).toBe(0);
    });
  });

  describe('resetCounters', () => {
    it('no hace nada cuando Redis no está disponible', async () => {
      getRedisClient.mockReturnValue(null);

      await expect(smsRateLimiter.resetCounters('twilio')).resolves.not.toThrow();
    });

    it('elimina todos los contadores del proveedor', async () => {
      const keys = ['sms:ratelimit:twilio:minute:123', 'sms:ratelimit:twilio:hour:456'];
      const client = buildRedisClient({
        keys: jest.fn().mockResolvedValue(keys),
      });
      getRedisClient.mockReturnValue(client);

      await smsRateLimiter.resetCounters('twilio');

      expect(client.del).toHaveBeenCalledWith(keys);
    });

    it('no llama del cuando no hay claves', async () => {
      const client = buildRedisClient({
        keys: jest.fn().mockResolvedValue([]),
      });
      getRedisClient.mockReturnValue(client);

      await smsRateLimiter.resetCounters('twilio');

      expect(client.del).not.toHaveBeenCalled();
    });
  });
});