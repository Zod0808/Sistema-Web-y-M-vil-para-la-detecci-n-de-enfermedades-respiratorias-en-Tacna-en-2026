// jest.mock factories cannot reference outer const/let (TDZ from hoisting).
// Mocks are defined inline; references retrieved via require() after factory registration.

jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../../src/services/cacheService', () => ({
  invalidateCacheByPattern: jest.fn(),
  CACHE_NAMESPACES: {
    ALERTS: 'alerts',
    ALERT_SUMMARY: 'alertSummary',
  },
}));

jest.mock('../../../src/config/redisClient', () => ({
  getRedisClient: jest.fn(() => ({
    zAdd: jest.fn(),
    zRangeByScore: jest.fn(),
    zRem: jest.fn(),
  })),
}));

jest.mock('../../../src/models/Alert', () => ({
  __esModule: true,
  default: {
    findDueAlerts: jest.fn(),
    find: jest.fn(),
  },
}));

import notificationService from '../../../src/services/notificationService';
import { getRedisClient } from '../../../src/config/redisClient';
import { invalidateCacheByPattern, CACHE_NAMESPACES } from '../../../src/services/cacheService';
import AlertModel from '../../../src/models/Alert';

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
  let redisClientMock: ReturnType<typeof getRedisClient>;
  let alertModelMock: typeof AlertModel;
  let invalidateCacheByPatternMock: jest.Mock;
  let cacheNamespacesMock: typeof CACHE_NAMESPACES;

  beforeEach(() => {
    jest.clearAllMocks();
    redisClientMock = (getRedisClient as jest.Mock)() as any;
    alertModelMock = AlertModel;
    invalidateCacheByPatternMock = invalidateCacheByPattern as jest.Mock;
    cacheNamespacesMock = CACHE_NAMESPACES;
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

      expect((redisClientMock as any).zAdd).toHaveBeenCalledWith('notifications:scheduled', {
        score: executeAt.getTime(),
        value: alert.id,
      });
    });

    it('debería procesar alertas programadas desde Redis', async () => {
      const alert = buildAlertMock();
      (redisClientMock as any).zRangeByScore.mockResolvedValueOnce([alert.id]);
      (redisClientMock as any).zRem.mockResolvedValueOnce(1);
      (alertModelMock as any).find.mockResolvedValueOnce([alert]);

      jest.spyOn(notificationService, 'dispatchAlert').mockResolvedValueOnce({
        alertId: alert.id,
        status: 'delivered',
      });

      const processed = await notificationService.processScheduledQueue();

      expect((redisClientMock as any).zRangeByScore).toHaveBeenCalled();
      expect((redisClientMock as any).zRem).toHaveBeenCalledWith('notifications:scheduled', [alert.id]);
      expect(notificationService.dispatchAlert).toHaveBeenCalledWith(alert);
      expect(processed).toBe(1);
    });
  });

  describe('processPendingAlerts', () => {
    it('debería despachar alertas pendientes y retornar métricas de entrega', async () => {
      const alert1 = buildAlertMock({ id: 'alert-1' });
      const alert2 = buildAlertMock({ id: 'alert-2' });

      (alertModelMock as any).findDueAlerts.mockResolvedValueOnce([alert1, alert2]);

      jest
        .spyOn(notificationService, 'dispatchAlert')
        .mockResolvedValueOnce({ alertId: 'alert-1', status: 'delivered' })
        .mockResolvedValueOnce({ alertId: 'alert-2', status: 'failed' });

      const result = await notificationService.processPendingAlerts(10);

      expect((alertModelMock as any).findDueAlerts).toHaveBeenCalledWith(10);
      expect(notificationService.dispatchAlert).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        processed: 2,
        delivered: 1,
        failed: 1,
      });
    });
  });
});
