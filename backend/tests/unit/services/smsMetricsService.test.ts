import { smsMetricsService } from '../../../src/services/smsMetricsService';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// Build a mock Redis client
const buildRedisClient = (overrides: Partial<Record<string, jest.Mock>> = {}) => ({
  hIncrBy: jest.fn().mockResolvedValue(1),
  hIncrByFloat: jest.fn().mockResolvedValue(0.0075),
  lPush: jest.fn().mockResolvedValue(1),
  lTrim: jest.fn().mockResolvedValue('OK'),
  lRange: jest.fn().mockResolvedValue([]),
  setEx: jest.fn().mockResolvedValue('OK'),
  get: jest.fn().mockResolvedValue(null),
  hGetAll: jest.fn().mockResolvedValue({}),
  expire: jest.fn().mockResolvedValue(1),
  keys: jest.fn().mockResolvedValue([]),
  del: jest.fn().mockResolvedValue(1),
  ...overrides,
});

jest.mock('../../../src/config/redisClient', () => ({
  getRedisClient: jest.fn(),
}));

const { getRedisClient } = require('../../../src/config/redisClient');

describe('smsMetricsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('recordSMS', () => {
    it('no hace nada cuando Redis no está disponible', async () => {
      getRedisClient.mockReturnValue(null);

      await expect(
        smsMetricsService.recordSMS('twilio', 'msg-1', 'sent')
      ).resolves.not.toThrow();
    });

    it('registra envío de SMS con éxito', async () => {
      const client = buildRedisClient();
      getRedisClient.mockReturnValue(client);

      await smsMetricsService.recordSMS('twilio', 'msg-1', 'sent');

      expect(client.hIncrBy).toHaveBeenCalled();
      expect(client.setEx).toHaveBeenCalled();
    });

    it('registra costo cuando el proveedor tiene costo definido', async () => {
      const client = buildRedisClient();
      getRedisClient.mockReturnValue(client);

      await smsMetricsService.recordSMS('twilio', 'msg-2', 'sent');

      expect(client.hIncrByFloat).toHaveBeenCalled();
      expect(client.lPush).toHaveBeenCalled();
    });

    it('no registra costo para proveedor mock', async () => {
      const client = buildRedisClient();
      getRedisClient.mockReturnValue(client);

      await smsMetricsService.recordSMS('mock', 'msg-3', 'sent');

      // Mock no tiene costo, no debería llamar hIncrByFloat
      expect(client.hIncrByFloat).not.toHaveBeenCalled();
    });

    it('registra estadísticas diarias', async () => {
      const client = buildRedisClient();
      getRedisClient.mockReturnValue(client);

      await smsMetricsService.recordSMS('mock', 'msg-4', 'delivered');

      const hIncrByCalls = client.hIncrBy.mock.calls.map((c: any[]) => c[1]);
      expect(hIncrByCalls).toContain('sent');
      expect(hIncrByCalls).toContain('delivered');
    });

    it('no lanza error si Redis falla durante el registro', async () => {
      const client = buildRedisClient({ hIncrBy: jest.fn().mockRejectedValue(new Error('Redis error')) });
      getRedisClient.mockReturnValue(client);

      await expect(
        smsMetricsService.recordSMS('twilio', 'msg-5', 'sent')
      ).resolves.not.toThrow();
    });
  });

  describe('updateMessageStatus', () => {
    it('no hace nada cuando Redis no está disponible', async () => {
      getRedisClient.mockReturnValue(null);

      await expect(
        smsMetricsService.updateMessageStatus('msg-1', 'delivered')
      ).resolves.not.toThrow();
    });

    it('no actualiza cuando el mensaje no existe', async () => {
      const client = buildRedisClient({ get: jest.fn().mockResolvedValue(null) });
      getRedisClient.mockReturnValue(client);

      await smsMetricsService.updateMessageStatus('nonexistent', 'delivered');

      expect(client.hIncrBy).not.toHaveBeenCalled();
    });

    it('actualiza el estado del mensaje cuando existe', async () => {
      const messageData = JSON.stringify({ provider: 'twilio', status: 'sent', cost: 0.0075, timestamp: Date.now() });
      const client = buildRedisClient({ get: jest.fn().mockResolvedValue(messageData) });
      getRedisClient.mockReturnValue(client);

      await smsMetricsService.updateMessageStatus('msg-1', 'delivered');

      expect(client.hIncrBy).toHaveBeenCalled();
      expect(client.setEx).toHaveBeenCalled();
    });
  });

  describe('getMetrics', () => {
    it('retorna métricas vacías cuando Redis no está disponible', async () => {
      getRedisClient.mockReturnValue(null);

      const metrics = await smsMetricsService.getMetrics();

      expect(metrics.totalSent).toBe(0);
      expect(metrics.totalDelivered).toBe(0);
      expect(metrics.totalFailed).toBe(0);
      expect(metrics.successRate).toBe(0);
    });

    it('calcula métricas correctamente desde Redis', async () => {
      const client = buildRedisClient({
        hGetAll: jest.fn()
          .mockResolvedValueOnce({ sent: '100', delivered: '85', failed: '10', pending: '5' })
          .mockResolvedValueOnce({ total: '0.75' })
          .mockResolvedValue({}),
        keys: jest.fn().mockResolvedValue([]),
      });
      getRedisClient.mockReturnValue(client);

      const metrics = await smsMetricsService.getMetrics();

      expect(metrics.totalSent).toBe(100);
      expect(metrics.totalDelivered).toBe(85);
      expect(metrics.totalFailed).toBe(10);
      expect(metrics.totalPending).toBe(5);
      expect(metrics.successRate).toBe(85);
    });

    it('filtra por proveedor cuando se especifica', async () => {
      const client = buildRedisClient({
        hGetAll: jest.fn()
          .mockResolvedValueOnce({})
          .mockResolvedValueOnce({})
          .mockResolvedValueOnce({ sent: '20', delivered: '18', failed: '2' })
          .mockResolvedValue({}),
        keys: jest.fn().mockResolvedValue([]),
      });
      getRedisClient.mockReturnValue(client);

      const metrics = await smsMetricsService.getMetrics('twilio');

      expect(metrics.byProvider).toHaveProperty('twilio');
    });

    it('retorna métricas vacías si Redis falla', async () => {
      const client = buildRedisClient({
        hGetAll: jest.fn().mockRejectedValue(new Error('Redis error')),
      });
      getRedisClient.mockReturnValue(client);

      const metrics = await smsMetricsService.getMetrics();

      expect(metrics.totalSent).toBe(0);
    });
  });

  describe('getCosts', () => {
    it('retorna costos vacíos cuando Redis no está disponible', async () => {
      getRedisClient.mockReturnValue(null);

      const costs = await smsMetricsService.getCosts();

      expect(costs.total).toBe(0);
      expect(costs.records).toEqual([]);
    });

    it('retorna costos de todos los proveedores', async () => {
      const costRecord = JSON.stringify({
        provider: 'twilio',
        messageId: 'msg-1',
        cost: 0.0075,
        currency: 'USD',
        timestamp: new Date().toISOString(),
      });
      const client = buildRedisClient({
        lRange: jest.fn().mockResolvedValue([costRecord]),
      });
      getRedisClient.mockReturnValue(client);

      const costs = await smsMetricsService.getCosts();

      expect(Array.isArray(costs.records)).toBe(true);
    });

    it('filtra registros por rango de fechas', async () => {
      const pastRecord = JSON.stringify({
        provider: 'twilio',
        messageId: 'msg-old',
        cost: 0.0075,
        currency: 'USD',
        timestamp: new Date('2020-01-01').toISOString(),
      });
      const client = buildRedisClient({
        lRange: jest.fn().mockResolvedValue([pastRecord]),
      });
      getRedisClient.mockReturnValue(client);

      const startDate = new Date('2024-01-01');
      const costs = await smsMetricsService.getCosts(startDate);

      // El registro es de 2020, debería ser filtrado
      expect(costs.records).toHaveLength(0);
    });
  });

  describe('cleanupOldMetrics', () => {
    it('no hace nada cuando Redis no está disponible', async () => {
      getRedisClient.mockReturnValue(null);

      await expect(smsMetricsService.cleanupOldMetrics()).resolves.not.toThrow();
    });

    it('elimina claves de métricas antiguas', async () => {
      const client = buildRedisClient({
        keys: jest.fn().mockResolvedValue(['sms:daily:2020-01-01']),
        del: jest.fn().mockResolvedValue(1),
      });
      getRedisClient.mockReturnValue(client);

      await smsMetricsService.cleanupOldMetrics(30);

      expect(client.del).toHaveBeenCalled();
    });
  });
});