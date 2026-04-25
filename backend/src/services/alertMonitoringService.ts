/**
 * Alert Monitoring Service
 * Proporciona métricas en tiempo real sobre la cola de notificaciones y el estado de las alertas
 */

import { getRedisClient } from '../config/redisClient';
import AlertModel from '../models/Alert';
import { NOTIFICATION_QUEUE_KEY } from './notificationService';
import { logger } from '../utils/logger';

type QueueMetrics = {
  scheduledSize: number;
  nextScheduledAt: Date | null;
  nextScheduledAlertId: string | null;
  scheduledWithinHour: number;
};

type AlertStatusMetrics = {
  pending: number;
  scheduled: number;
  failed: number;
  deliveredToday: number;
  failedLast24h: number;
  criticalOpen: number;
};

type RecentFailure = {
  id: string;
  title: string;
  userId: string;
  priority: string;
  lastError?: string;
  updatedAt: Date;
};

export type AlertMonitoringSnapshot = {
  queue: QueueMetrics;
  alerts: AlertStatusMetrics;
  recentFailures: RecentFailure[];
};

const ONE_HOUR_MS = 60 * 60 * 1000;
const TWENTYFOUR_HOURS_MS = 24 * ONE_HOUR_MS;

const parseQueueEntry = (entry?: { value: string; score: number }) => {
  if (!entry) {
    return {
      nextScheduledAt: null,
      nextScheduledAlertId: null,
    };
  }

  return {
    nextScheduledAt: new Date(entry.score),
    nextScheduledAlertId: entry.value,
  };
};

async function getQueueMetricsFromDatabase(): Promise<QueueMetrics> {
  const now = new Date();
  const scheduledSize = await AlertModel.countDocuments({
    status: 'scheduled',
    scheduledAt: { $gte: now },
  });

  const nextScheduled = await AlertModel.findOne({
    status: 'scheduled',
    scheduledAt: { $gte: now },
  })
    .sort({ scheduledAt: 1 })
    .select('_id scheduledAt')
    .lean();

  const withinHour = await AlertModel.countDocuments({
    status: 'scheduled',
    scheduledAt: { $gte: now, $lte: new Date(now.getTime() + ONE_HOUR_MS) },
  });

  return {
    scheduledSize,
    scheduledWithinHour: withinHour,
    nextScheduledAt: nextScheduled?.scheduledAt ?? null,
    nextScheduledAlertId: nextScheduled?._id?.toString() ?? null,
  };
}

async function getQueueMetrics(): Promise<QueueMetrics> {
  const client = getRedisClient();

  if (!client) {
    return getQueueMetricsFromDatabase();
  }

  try {
    const scheduledSize = await client.zCard(NOTIFICATION_QUEUE_KEY);
    let scheduledWithinHour = 0;
    let nextEntry: { value: string; score: number } | undefined;

    if (scheduledSize > 0) {
      const [first] = await client.zRangeWithScores(NOTIFICATION_QUEUE_KEY, 0, 0);
      nextEntry = first;

      const now = Date.now();
      const withinHourIds = await client.zRangeByScore(
        NOTIFICATION_QUEUE_KEY,
        now,
        now + ONE_HOUR_MS
      );
      scheduledWithinHour = withinHourIds.length;
    }

    const { nextScheduledAt, nextScheduledAlertId } = parseQueueEntry(nextEntry);

    return {
      scheduledSize,
      scheduledWithinHour,
      nextScheduledAt,
      nextScheduledAlertId,
    };
  } catch (error) {
    logger.warn('⚠️ No fue posible obtener métricas de Redis, usando fallback en MongoDB', {
      error,
    });
    return getQueueMetricsFromDatabase();
  }
}

async function getAlertStatusMetrics(): Promise<AlertStatusMetrics> {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const twentyFourHoursAgo = new Date(now.getTime() - TWENTYFOUR_HOURS_MS);

  const [pending, scheduled, failed, deliveredToday, failedLast24h, criticalOpen] = await Promise.all([
    AlertModel.countDocuments({ status: 'pending' }),
    AlertModel.countDocuments({ status: 'scheduled' }),
    AlertModel.countDocuments({ status: 'failed' }),
    AlertModel.countDocuments({
      status: 'delivered',
      dispatchedAt: { $gte: startOfDay },
    }),
    AlertModel.countDocuments({
      status: 'failed',
      updatedAt: { $gte: twentyFourHoursAgo },
    }),
    AlertModel.countDocuments({
      status: { $in: ['pending', 'scheduled'] },
      priority: 'critical',
    }),
  ]);

  return {
    pending,
    scheduled,
    failed,
    deliveredToday,
    failedLast24h,
    criticalOpen,
  };
}

async function getRecentFailures(): Promise<RecentFailure[]> {
  const failedAlerts = await AlertModel.find({ status: 'failed' })
    .sort({ updatedAt: -1 })
    .limit(5)
    .select('_id title userId priority lastError updatedAt')
    .lean();

  return failedAlerts.map((alert) => ({
    id: alert._id.toString(),
    title: alert.title,
    userId: alert.userId,
    priority: alert.priority,
    lastError: alert.lastError,
    updatedAt: alert.updatedAt,
  }));
}

class AlertMonitoringService {
  async getSnapshot(): Promise<AlertMonitoringSnapshot> {
    const [queue, alerts, recentFailures] = await Promise.all([
      getQueueMetrics(),
      getAlertStatusMetrics(),
      getRecentFailures(),
    ]);

    return {
      queue,
      alerts,
      recentFailures,
    };
  }
}

export const alertMonitoringService = new AlertMonitoringService();
export default alertMonitoringService;

