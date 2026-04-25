/**
 * Alert Service
 * Orquesta la generación de alertas y notificaciones avanzadas
 */

import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import AlertModel, { AlertDocument } from '../models/Alert';
import { notificationService } from './notificationService';
import {
  Alert,
  AlertCategory,
  AlertChannel,
  AlertPriority,
  AlertStatus,
  AlertTriggerSource,
} from '../types';
import {
  invalidateCacheByPattern,
  CACHE_NAMESPACES,
  TEN_MINUTES,
  setCachedValue,
  getCachedValue,
} from './cacheService';

type CriticalAlertPayload = {
  userId: string;
  patientId?: string;
  doctorId?: string;
  patientName?: string;
  symptomName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  analysisId?: string;
  metadata?: Record<string, any>;
};

type MedicationReminderPayload = {
  userId: string;
  patientId?: string;
  doctorId?: string;
  medicationName: string;
  dosage: string;
  scheduleTime: Date;
  repeatIntervalMinutes?: number;
  instructions?: string;
};

type FollowUpAlertPayload = {
  userId: string;
  patientId?: string;
  doctorId?: string;
  followUpDate: Date;
  reason: string;
  preferredChannel?: AlertChannel[];
};

type DoctorNotificationPayload = {
  doctorId: string;
  patientId: string;
  summary: string;
  urgency: AlertPriority;
  triggeredBy: AlertTriggerSource;
  metadata?: Record<string, any>;
};

type DashboardFilters = {
  status?: AlertStatus[];
  category?: AlertCategory[];
  priority?: AlertPriority[];
  doctorId?: string;
  userId?: string;
  patientId?: string;
  from?: Date;
  to?: Date;
};

const PRIORITY_BY_SEVERITY: Record<CriticalAlertPayload['severity'], AlertPriority> = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  critical: 'critical',
};

const DEFAULT_CHANNELS: AlertChannel[] = ['push', 'in_app'];

class AlertService {
  private buildAlertMessage(payload: CriticalAlertPayload): { title: string; message: string } {
    const patientName = payload.patientName ? `Paciente ${payload.patientName}` : 'Paciente';
    const severityLabel = payload.severity.toUpperCase();
    return {
      title: `⚠️ Alerta de síntoma crítico (${severityLabel})`,
      message: `${patientName} presenta síntoma crítico: ${payload.symptomName}. Se requiere revisión médica inmediata.`,
    };
  }

  private async persistAlert(
    data: Partial<Alert>,
    autoDispatch: boolean = false
  ): Promise<AlertDocument> {
    const alert = await AlertModel.create({
      ...data,
      channels: data.channels && data.channels.length > 0 ? data.channels : DEFAULT_CHANNELS,
    });

    await invalidateCacheByPattern(`${CACHE_NAMESPACES.ALERTS}:*`);
    await invalidateCacheByPattern(`${CACHE_NAMESPACES.ALERT_SUMMARY}:*`);

    if (autoDispatch) {
      await notificationService.dispatchAlert(alert);
    }

    return alert;
  }

  async createAlert(data: Partial<Alert>, autoDispatch: boolean = true): Promise<AlertDocument> {
    return this.persistAlert(data, autoDispatch);
  }

  async createCriticalSymptomAlert(payload: CriticalAlertPayload): Promise<AlertDocument> {
    if (!payload.userId) {
      throw new AppError('El usuario destino es obligatorio para crear la alerta', 400);
    }

    const { title, message } = this.buildAlertMessage(payload);
    const priority = PRIORITY_BY_SEVERITY[payload.severity];

    const alert = await this.persistAlert(
      {
        userId: payload.userId,
        patientId: payload.patientId,
        doctorId: payload.doctorId,
        title,
        message,
        category: 'critical_symptom',
        priority,
        status: 'pending',
        trigger: {
          source: 'symptom_analysis',
          referenceId: payload.analysisId,
          metadata: {
            symptomName: payload.symptomName,
            severity: payload.severity,
          },
        },
        metadata: {
          ...payload.metadata,
        },
      },
      true
    );

    logger.warn('Critical symptom alert generated', {
      alertId: alert.id,
      userId: alert.userId,
      symptom: payload.symptomName,
      severity: payload.severity,
    });

    return alert;
  }

  async scheduleMedicationReminder(payload: MedicationReminderPayload): Promise<AlertDocument> {
    if (!payload.scheduleTime) {
      throw new AppError('La hora de programación es obligatoria', 400);
    }

    const alert = await this.persistAlert({
      userId: payload.userId,
      patientId: payload.patientId,
      doctorId: payload.doctorId,
      title: `💊 Recordatorio de medicamento: ${payload.medicationName}`,
      message: `Es momento de tomar ${payload.medicationName}. Dosis: ${payload.dosage}.`,
      category: 'medication_reminder',
      priority: 'medium',
      status: 'scheduled',
      scheduledAt: payload.scheduleTime,
      trigger: {
        source: 'medication_schedule',
      },
      metadata: {
        medicationName: payload.medicationName,
        dosage: payload.dosage,
        repeatIntervalMinutes: payload.repeatIntervalMinutes,
        instructions: payload.instructions,
      },
    });

    await notificationService.queueAlert(alert, payload.scheduleTime);

    return alert;
  }

  async scheduleFollowUpAlert(payload: FollowUpAlertPayload): Promise<AlertDocument> {
    const alert = await this.persistAlert({
      userId: payload.userId,
      patientId: payload.patientId,
      doctorId: payload.doctorId,
      title: '🩺 Seguimiento médico programado',
      message: `Se ha programado un seguimiento médico para el ${payload.followUpDate.toLocaleString()}. Motivo: ${payload.reason}.`,
      category: 'follow_up',
      priority: 'medium',
      status: 'scheduled',
      scheduledAt: payload.followUpDate,
      channels: payload.preferredChannel ?? DEFAULT_CHANNELS,
      trigger: {
        source: 'follow_up_rule',
      },
      metadata: {
        reason: payload.reason,
      },
    });

    await notificationService.queueAlert(alert, payload.followUpDate);

    return alert;
  }

  async notifyDoctorForCriticalCase(payload: DoctorNotificationPayload): Promise<AlertDocument> {
    if (!payload.doctorId) {
      throw new AppError('El doctor es obligatorio para la notificación', 400);
    }

    const alert = await this.persistAlert(
      {
        userId: payload.doctorId,
        patientId: payload.patientId,
        doctorId: payload.doctorId,
        title: '🚨 Caso urgente requiere atención médica',
        message: payload.summary,
        category: 'doctor_notification',
        priority: payload.urgency,
        status: 'pending',
        trigger: {
          source: payload.triggeredBy,
          metadata: payload.metadata,
        },
        metadata: payload.metadata,
      },
      payload.urgency === 'critical'
    );

    if (payload.urgency !== 'critical') {
      await notificationService.dispatchAlert(alert);
    }

    return alert;
  }

  async acknowledgeAlert(alertId: string, userId: string): Promise<AlertDocument> {
    const alert = await AlertModel.findById(alertId);
    if (!alert) {
      throw new AppError('La alerta no existe', 404);
    }

    if (alert.userId !== userId) {
      throw new AppError('No tiene permisos para reconocer esta alerta', 403);
    }

    await alert.markAsAcknowledged();
    await invalidateCacheByPattern(`${CACHE_NAMESPACES.ALERTS}:${userId}*`);
    await invalidateCacheByPattern(`${CACHE_NAMESPACES.ALERT_SUMMARY}:*`);

    logger.info('Alert acknowledged', {
      alertId,
      userId,
    });

    return alert;
  }

  async getAlertsForUser(userId: string, filters: Partial<DashboardFilters> = {}): Promise<AlertDocument[]> {
    const query: Record<string, unknown> = { userId };

    if (filters.status?.length) {
      query.status = { $in: filters.status };
    }

    if (filters.category?.length) {
      query.category = { $in: filters.category };
    }

    if (filters.priority?.length) {
      query.priority = { $in: filters.priority };
    }

    if (filters.from || filters.to) {
      query.createdAt = {};
      if (filters.from) {
        (query.createdAt as Record<string, unknown>).$gte = filters.from;
      }
      if (filters.to) {
        (query.createdAt as Record<string, unknown>).$lte = filters.to;
      }
    }

    return AlertModel.find(query).sort({ createdAt: -1 }).limit(200).exec();
  }

  async getDashboardSummary(forceRefresh: boolean = false) {
    const cacheKey = `${CACHE_NAMESPACES.ALERT_SUMMARY}:global`;

    if (!forceRefresh) {
      const cached = await getCachedValue(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const summary = await AlertModel.getDashboardMetrics();
    await setCachedValue(cacheKey, summary, TEN_MINUTES);
    return summary;
  }

  async processPendingAlerts(limit?: number) {
    return notificationService.processPendingAlerts(limit);
  }
}

export const alertService = new AlertService();

export default alertService;

