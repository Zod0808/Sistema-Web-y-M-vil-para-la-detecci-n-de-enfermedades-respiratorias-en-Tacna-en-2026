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

jest.mock('../../../src/config/redisClient', () => {
  const client = {
    zAdd: jest.fn(),
    zRangeByScore: jest.fn().mockResolvedValue([]),
    zRem: jest.fn(),
  };
  return {
    getRedisClient: jest.fn(() => client),
    __client: client,
  };
});

jest.mock('../../../src/models/Alert', () => ({
  __esModule: true,
  default: {
    findDueAlerts: jest.fn(),
    find: jest.fn(),
  },
}));

jest.mock('../../../src/models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

jest.mock('../../../src/config/config', () => ({
  config: {
    email: {
      host: 'smtp.test',
      port: 587,
      user: 'user@test',
      pass: 'pass',
      from: 'noreply@test',
    },
  },
}));

const sendMailMock = jest.fn().mockResolvedValue({});
jest.mock('nodemailer', () => ({
  __esModule: true,
  createTransport: jest.fn(() => ({ sendMail: sendMailMock })),
}));

jest.mock('../../../src/services/smsService', () => ({
  smsService: {
    sendSMS: jest.fn().mockResolvedValue({ success: true, messageId: 'm-1' }),
    sendEmergencySMS: jest.fn().mockResolvedValue({ success: true, messageId: 'e-1' }),
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

    it('retorna zeros cuando no hay alertas pendientes', async () => {
      (alertModelMock as any).findDueAlerts.mockResolvedValueOnce([]);
      const result = await notificationService.processPendingAlerts();
      expect(result).toEqual({ processed: 0, delivered: 0, failed: 0 });
    });
  });

  describe('canales individuales', () => {
    it('sendInAppNotification loguea sin lanzar', async () => {
      await expect(
        notificationService.sendInAppNotification(buildAlertMock() as any),
      ).resolves.toBeUndefined();
    });

    it('sendPushNotification loguea sin lanzar', async () => {
      await expect(
        notificationService.sendPushNotification(buildAlertMock() as any, {
          to: 'u1',
          title: 'T',
          body: 'B',
          alertId: 'a1',
        } as any),
      ).resolves.toBeUndefined();
    });
  });

  describe('dispatchAlert - canales adicionales', () => {
    it('procesa canal email', async () => {
      const alert = buildAlertMock({ channels: ['email'] });
      const emailSpy = jest
        .spyOn(notificationService as any, 'sendEmailNotification')
        .mockResolvedValue(undefined);

      const result = await notificationService.dispatchAlert(alert as any);
      expect(emailSpy).toHaveBeenCalledWith(alert);
      expect(result.status).toBe('delivered');
    });

    it('procesa canal sms', async () => {
      const alert = buildAlertMock({ channels: ['sms'] });
      const smsSpy = jest
        .spyOn(notificationService as any, 'sendSMSNotification')
        .mockResolvedValue(undefined);

      await notificationService.dispatchAlert(alert as any);
      expect(smsSpy).toHaveBeenCalledWith(alert);
    });

    it('advierte y continúa con canal desconocido', async () => {
      const alert = buildAlertMock({ channels: ['whatsapp'] as any });
      const result = await notificationService.dispatchAlert(alert as any);
      expect(result.status).toBe('delivered');
    });
  });

  describe('sendEmailNotification (privada)', () => {
    const svc: any = notificationService;

    it('envía email cuando la config y el usuario tienen email', async () => {
      const UserModel = require('../../../src/models/User').default;
      UserModel.findById.mockResolvedValueOnce({ email: 'u@test.com' });
      sendMailMock.mockClear();

      await svc.sendEmailNotification(buildAlertMock());

      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'u@test.com' }),
      );
    });

    it('omite cuando falta email del usuario', async () => {
      const UserModel = require('../../../src/models/User').default;
      UserModel.findById.mockResolvedValueOnce({ email: null });
      sendMailMock.mockClear();

      await svc.sendEmailNotification(buildAlertMock());
      expect(sendMailMock).not.toHaveBeenCalled();
    });

    it('atrapa error del transporte silenciosamente', async () => {
      const UserModel = require('../../../src/models/User').default;
      UserModel.findById.mockResolvedValueOnce({ email: 'u@test.com' });
      sendMailMock.mockRejectedValueOnce(new Error('smtp down'));

      await expect(svc.sendEmailNotification(buildAlertMock())).resolves.toBeUndefined();
    });
  });

  describe('sendSMSNotification', () => {
    const svc: any = notificationService;

    it('envía SMS estándar cuando el usuario tiene teléfono válido', async () => {
      const UserModel = require('../../../src/models/User').default;
      const { smsService } = require('../../../src/services/smsService');
      UserModel.findById.mockResolvedValueOnce({ phone: '+51987654321' });

      await svc.sendSMSNotification(buildAlertMock({ category: 'appointment' }));

      expect(smsService.sendSMS).toHaveBeenCalledWith(
        expect.objectContaining({ to: '+51987654321' }),
      );
    });

    it('envía SMS de emergencia cuando la categoría es "emergency"', async () => {
      const UserModel = require('../../../src/models/User').default;
      const { smsService } = require('../../../src/services/smsService');
      UserModel.findById.mockResolvedValueOnce({ phone: '+51987654321' });

      await svc.sendSMSNotification(
        buildAlertMock({
          category: 'emergency',
          metadata: {
            location: { address: 'Av. X 123' },
            emergencyType: 'Crisis',
            contactInfo: { name: 'Juan' },
          },
        }),
      );

      expect(smsService.sendEmergencySMS).toHaveBeenCalledWith(
        '+51987654321',
        expect.objectContaining({ type: 'Crisis', location: 'Av. X 123' }),
      );
    });

    it('emergencia sin location usa fallback "Ubicación no disponible"', async () => {
      const UserModel = require('../../../src/models/User').default;
      const { smsService } = require('../../../src/services/smsService');
      UserModel.findById.mockResolvedValueOnce({ phone: '+51987654321' });

      await svc.sendSMSNotification(
        buildAlertMock({ category: 'emergency', metadata: {} }),
      );

      expect(smsService.sendEmergencySMS).toHaveBeenCalledWith(
        '+51987654321',
        expect.objectContaining({ location: 'Ubicación no disponible' }),
      );
    });

    it('omite cuando el usuario no tiene teléfono', async () => {
      const UserModel = require('../../../src/models/User').default;
      const { smsService } = require('../../../src/services/smsService');
      UserModel.findById.mockResolvedValueOnce({ phone: null });
      smsService.sendSMS.mockClear();

      await svc.sendSMSNotification(buildAlertMock());
      expect(smsService.sendSMS).not.toHaveBeenCalled();
    });

    it('omite cuando el número tiene formato inválido', async () => {
      const UserModel = require('../../../src/models/User').default;
      const { smsService } = require('../../../src/services/smsService');
      UserModel.findById.mockResolvedValueOnce({ phone: 'abc' });
      smsService.sendSMS.mockClear();

      await svc.sendSMSNotification(buildAlertMock());
      expect(smsService.sendSMS).not.toHaveBeenCalled();
    });

    it('atrapa error de smsService silenciosamente', async () => {
      const UserModel = require('../../../src/models/User').default;
      const { smsService } = require('../../../src/services/smsService');
      UserModel.findById.mockResolvedValueOnce({ phone: '+51987654321' });
      smsService.sendSMS.mockRejectedValueOnce(new Error('sms down'));

      await expect(svc.sendSMSNotification(buildAlertMock())).resolves.toBeUndefined();
    });
  });

  describe('queueAlert / processScheduledQueue - branches sin cliente', () => {
    it('queueAlert retorna cuando no hay cliente Redis', async () => {
      (getRedisClient as jest.Mock).mockReturnValueOnce(null);
      await expect(
        notificationService.queueAlert(buildAlertMock() as any, new Date()),
      ).resolves.toBeUndefined();
    });

    it('queueAlert atrapa error de zAdd sin lanzar', async () => {
      (redisClientMock as any).zAdd.mockRejectedValueOnce(new Error('redis down'));
      await expect(
        notificationService.queueAlert(buildAlertMock() as any, new Date()),
      ).resolves.toBeUndefined();
    });

    it('processScheduledQueue retorna 0 cuando no hay cliente', async () => {
      (getRedisClient as jest.Mock).mockReturnValueOnce(null);
      await expect(notificationService.processScheduledQueue()).resolves.toBe(0);
    });

    it('processScheduledQueue retorna 0 cuando no hay dueIds', async () => {
      (redisClientMock as any).zRangeByScore.mockResolvedValueOnce([]);
      await expect(notificationService.processScheduledQueue()).resolves.toBe(0);
    });
  });
});
