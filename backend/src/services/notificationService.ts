/**
 * Notification Service
 * Gestiona el envío y programación de notificaciones multicanal
 */

import { getRedisClient } from '../config/redisClient';
import AlertModel, { AlertDocument } from '../models/Alert';
import { NotificationRequest, PushNotificationPayload } from '../types';
import { invalidateCacheByPattern, CACHE_NAMESPACES } from './cacheService';
import { logger } from '../utils/logger';

export const NOTIFICATION_QUEUE_KEY = 'notifications:scheduled';

type DispatchResult = {
  alertId: string;
  status: 'delivered' | 'failed';
  error?: string;
};

class NotificationService {
  async sendInAppNotification(alert: AlertDocument, request?: NotificationRequest): Promise<void> {
    logger.info('In-app notification dispatched', {
      alertId: alert.id,
      userId: alert.userId,
      category: alert.category,
      title: request?.title ?? alert.title,
    });
  }

  async sendPushNotification(alert: AlertDocument, payload: PushNotificationPayload): Promise<void> {
    logger.info('Push notification dispatched', {
      alertId: alert.id,
      userId: alert.userId,
      title: payload.title,
      body: payload.body,
      channel: 'push',
    });
  }

  async dispatchAlert(alert: AlertDocument): Promise<DispatchResult> {
    try {
      for (const channel of alert.channels) {
        switch (channel) {
          case 'in_app':
            await this.sendInAppNotification(alert);
            break;
          case 'push':
            await this.sendPushNotification(alert, {
              to: alert.userId,
              title: alert.title,
              body: alert.message,
              data: alert.metadata,
              alertId: alert.id,
            });
            break;
          case 'email':
            logger.info('Email channel not yet implemented, skipping', {
              channel,
              alertId: alert.id,
            });
            break;
          case 'sms':
            await this.sendSMSNotification(alert);
            break;
          default:
            logger.warn('Unknown notification channel', { channel });
        }
      }

      await alert.markAsDispatched();
      await invalidateCacheByPattern(`${CACHE_NAMESPACES.ALERTS}:*`);
      await invalidateCacheByPattern(`${CACHE_NAMESPACES.ALERT_SUMMARY}:*`);

      return {
        alertId: alert.id,
        status: 'delivered',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown notification error';
      await alert.markAsFailed(message);

      logger.error('Alert dispatch failed', {
        alertId: alert.id,
        userId: alert.userId,
        category: alert.category,
        error: message,
      });

      return {
        alertId: alert.id,
        status: 'failed',
        error: message,
      };
    }
  }

  async queueAlert(alert: AlertDocument, executeAt: Date): Promise<void> {
    const client = getRedisClient();
    if (!client) {
      return;
    }

    try {
      await client.zAdd(NOTIFICATION_QUEUE_KEY, {
        score: executeAt.getTime(),
        value: alert.id,
      });
      logger.debug('Alert queued for scheduled processing', {
        alertId: alert.id,
        executeAt,
      });
    } catch (error) {
      logger.warn('Failed to queue alert in Redis, falling back to DB scheduling', {
        alertId: alert.id,
        error,
      });
    }
  }

  async processScheduledQueue(limit: number = 25): Promise<number> {
    const client = getRedisClient();
    if (!client) {
      return 0;
    }

    const now = Date.now();
    const dueIds = await client.zRangeByScore(NOTIFICATION_QUEUE_KEY, 0, now, {
      LIMIT: { offset: 0, count: limit },
    });

    if (!dueIds.length) {
      return 0;
    }

    await client.zRem(NOTIFICATION_QUEUE_KEY, dueIds);
    const alerts = await AlertModel.find({ _id: { $in: dueIds } });

    for (const alert of alerts) {
      await this.dispatchAlert(alert);
    }

    return alerts.length;
  }

  async processPendingAlerts(limit: number = 50): Promise<{
    processed: number;
    delivered: number;
    failed: number;
  }> {
    const alerts = await AlertModel.findDueAlerts(limit);

    if (!alerts.length) {
      return { processed: 0, delivered: 0, failed: 0 };
    }

    let delivered = 0;
    let failed = 0;

    for (const alert of alerts) {
      const { status } = await this.dispatchAlert(alert);
      if (status === 'delivered') {
        delivered += 1;
      } else {
        failed += 1;
      }
    }

    return {
      processed: alerts.length,
      delivered,
      failed,
    };
  }

  /**
   * Enviar notificación SMS
   */
  async sendSMSNotification(alert: AlertDocument): Promise<void> {
    try {
      const { smsService } = await import('./smsService');
      const UserModel = (await import('../models/User')).default;

      // Obtener número de teléfono del usuario
      const user = await UserModel.findById(alert.userId);
      if (!user || !(user as any).phone) {
        logger.warn('Usuario no encontrado o sin número de teléfono para SMS', {
          alertId: alert.id,
          userId: alert.userId,
        });
        return;
      }

      const phoneNumber = (user as any).phone;

      // Para emergencias, usar formato especial
      if (alert.category === 'emergency') {
        const emergencyInfo = alert.metadata?.location
          ? {
              type: alert.metadata.emergencyType || 'Emergencia Médica',
              location: alert.metadata.location.address ||
                `Coordenadas: ${alert.metadata.location.latitude}, ${alert.metadata.location.longitude}`,
              patientName: alert.metadata.contactInfo?.name,
              description: alert.message,
            }
          : {
              type: 'Emergencia Médica',
              location: 'Ubicación no disponible',
              description: alert.message,
            };

        await smsService.sendEmergencySMS(phoneNumber, emergencyInfo);
      } else {
        // SMS estándar para otras alertas
        await smsService.sendSMS({
          to: phoneNumber,
          message: `${alert.title}\n\n${alert.message}`,
        });
      }

      logger.info('SMS notification dispatched', {
        alertId: alert.id,
        userId: alert.userId,
        phone: phoneNumber.substring(0, 4) + '****', // Ocultar número completo en logs
        category: alert.category,
      });
    } catch (error: any) {
      logger.error(`Error al enviar SMS: ${error.message}`, {
        alertId: alert.id,
        userId: alert.userId,
        error: error.message,
      });
      // No lanzar error para no bloquear otros canales
    }
  }
}

export const notificationService = new NotificationService();

export default notificationService;

