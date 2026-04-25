import notificationService from '../../../src/services/notificationService';

const invalidateCacheByPatternMock = jest.fn();
const cacheNamespacesMock = {
  ALERTS: 'alerts',
  ALERT_SUMMARY: 'alertSummary',
};

const redisClientMock = {
  zAdd: jest.fn(),
  zRangeByScore: jest.fn(),
  zRem: jest.fn(),
};

const alertModelMock = {
  findDueAlerts: jest.fn(),
  find: jest.fn(),
};

jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../../src/services/cacheService', () => ({
  invalidateCacheByPattern: invalidateCacheByPatternMock,
  CACHE_NAMESPACES: cacheNamespacesMock,
}));

jest.mock('../../../src/config/redisClient', () => ({
  getRedisClient: jest.fn(() => redisClientMock),
}));

jest.mock('../../../src/models/Alert', () => ({
  __esModule: true,
  default: alertModelMock,
}));

const buildAlertMock = (overrides: Partial<any> = {}) => ({
  id: 'alert-123',
  userId: 'user-1',
  title: 'Test Alert',
  message: 'Important message',
  category: 'system',
  channels: ['in_app', 'push'],
  metadata: {},
  markAsDispatched: jest.fn().mockResolvedValue(undefined),
  markAsFailed: jest.fn().mockResolvedValue(undefined),
  isDue: jest.fn().mockReturnValue(true),
  ...overrides,
});

describe('notificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('dispatchAlert', () => {
    it('debería despachar una alerta por múltiples canales y marcarla como entregada', async () => {
      const alert = buildAlertMock();

      const inAppSpy = jest
        .spyOn(notificationService as any, 'sendInAppNotification')
        .mockResolvedValue(undefined);
      const pushSpy = jest
        .spyOn(notificationService as any, 'sendPushNotification')
        .mockResolvedValue(undefined);

      const result = await notificationService.dispatchAlert(alert as any);

      expect(inAppSpy).toHaveBeenCalledWith(alert);
      expect(pushSpy).toHaveBeenCalledWith(
        alert,
        expect.objectContaining({
          to: alert.userId,
          title: alert.title,
          body: alert.message,
          alertId: alert.id,
        })
      );
      expect(alert.markAsDispatched).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        alertId: alert.id,
        status: 'delivered',
      });
      expect(invalidateCacheByPatternMock).toHaveBeenCalledWith(`${cacheNamespacesMock.ALERTS}:*`);
      expect(invalidateCacheByPatternMock).toHaveBeenCalledWith(
        `${cacheNamespacesMock.ALERT_SUMMARY}:*`
      );
    });

    it('debería marcar la alerta como fallida cuando ocurre un error', async () => {
      const alert = buildAlertMock();

      jest
        .spyOn(notificationService as any, 'sendPushNotification')
        .mockRejectedValue(new Error('Push channel unavailable'));

      const result = await notificationService.dispatchAlert(alert as any);

      expect(alert.markAsFailed).toHaveBeenCalledWith('Push channel unavailable');
      expect(result.status).toBe('failed');
    });
  });

  describe('queueAlert y processScheduledQueue', () => {
    it('debería agregar una alerta a la cola programada en Redis', async () => {
      const alert = buildAlertMock();
      const executeAt = new Date();

      await notificationService.queueAlert(alert as any, executeAt);

      expect(redisClientMock.zAdd).toHaveBeenCalledWith('notifications:scheduled', {
        score: executeAt.getTime(),
        value: alert.id,
      });
    });

    it('debería procesar alertas programadas desde Redis', async () => {
      const alert = buildAlertMock();
      redisClientMock.zRangeByScore.mockResolvedValueOnce([alert.id]);
      redisClientMock.zRem.mockResolvedValueOnce(1);
      alertModelMock.find.mockResolvedValueOnce([alert]);

      jest.spyOn(notificationService, 'dispatchAlert').mockResolvedValueOnce({
        alertId: alert.id,
        status: 'delivered',
      });

      const processed = await notificationService.processScheduledQueue();

      expect(redisClientMock.zRangeByScore).toHaveBeenCalled();
      expect(redisClientMock.zRem).toHaveBeenCalledWith('notifications:scheduled', [alert.id]);
      expect(notificationService.dispatchAlert).toHaveBeenCalledWith(alert);
      expect(processed).toBe(1);
    });
  });

  describe('processPendingAlerts', () => {
    it('debería despachar alertas pendientes y retornar métricas de entrega', async () => {
      const alert1 = buildAlertMock({ id: 'alert-1' });
      const alert2 = buildAlertMock({ id: 'alert-2' });

      alertModelMock.findDueAlerts.mockResolvedValueOnce([alert1, alert2]);

      jest
        .spyOn(notificationService, 'dispatchAlert')
        .mockResolvedValueOnce({ alertId: 'alert-1', status: 'delivered' })
        .mockResolvedValueOnce({ alertId: 'alert-2', status: 'failed' });

      const result = await notificationService.processPendingAlerts(10);

      expect(alertModelMock.findDueAlerts).toHaveBeenCalledWith(10);
      expect(notificationService.dispatchAlert).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        processed: 2,
        delivered: 1,
        failed: 1,
      });
    });
  });
});

