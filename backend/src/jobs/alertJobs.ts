/**
 * Alert Jobs
 * Procesa alertas programadas y pendientes en intervalos regulares
 */

import { notificationService } from '../services/notificationService';
import { alertService } from '../services/alertService';
import { logger } from '../utils/logger';

import { config } from '../config/config';

const DEFAULT_SCHEDULED_INTERVAL_MS = config.jobs.alerts.scheduledIntervalMs;
const DEFAULT_PENDING_INTERVAL_MS = config.jobs.alerts.pendingIntervalMs;

let scheduledQueueInterval: NodeJS.Timeout | null = null;
let pendingAlertInterval: NodeJS.Timeout | null = null;

const safelyRun = async (taskName: string, task: () => Promise<void>) => {
  try {
    await task();
  } catch (error) {
    logger.error(`❌ Error ejecutando job de alertas (${taskName})`, { error });
  }
};

export const startAlertJobs = ({
  scheduledIntervalMs = DEFAULT_SCHEDULED_INTERVAL_MS,
  pendingIntervalMs = DEFAULT_PENDING_INTERVAL_MS,
}: {
  scheduledIntervalMs?: number;
  pendingIntervalMs?: number;
} = {}): void => {
  if (!scheduledQueueInterval) {
    scheduledQueueInterval = setInterval(() => {
      void safelyRun('scheduledQueue', async () => {
        const processed = await notificationService.processScheduledQueue();
        if (processed > 0) {
          logger.debug(`✅ Cola programada procesó ${processed} alerta(s)`);
        }
      });
    }, scheduledIntervalMs);
  }

  if (!pendingAlertInterval) {
    pendingAlertInterval = setInterval(() => {
      void safelyRun('pendingAlerts', async () => {
        const result = await alertService.processPendingAlerts();
        if (result.processed > 0) {
          logger.debug(
            `✅ Alertas pendientes procesadas: total=${result.processed}, entregadas=${result.delivered}, fallidas=${result.failed}`
          );
        }
      });
    }, pendingIntervalMs);
  }

  logger.info('⏱️ Jobs de alertas iniciados');
};

export const stopAlertJobs = (): void => {
  if (scheduledQueueInterval) {
    clearInterval(scheduledQueueInterval);
    scheduledQueueInterval = null;
  }

  if (pendingAlertInterval) {
    clearInterval(pendingAlertInterval);
    pendingAlertInterval = null;
  }

  logger.info('🛑 Jobs de alertas detenidos');
};

