/**
 * Appointment Jobs
 * Ejecuta recordatorios periódicos para citas médicas
 */

import { appointmentService } from '../services/appointmentService';
import { logger } from '../utils/logger';

const DEFAULT_REMINDER_INTERVAL_MS = 60 * 1000;

let reminderInterval: NodeJS.Timeout | null = null;

const safelyRun = async (taskName: string, task: () => Promise<void>) => {
  try {
    await task();
  } catch (error) {
    logger.warn(`❌ Error ejecutando job de citas (${taskName})`, { error });
  }
};

export const startAppointmentJobs = ({
  reminderIntervalMs = DEFAULT_REMINDER_INTERVAL_MS,
}: {
  reminderIntervalMs?: number;
} = {}) => {
  if (reminderInterval) {
    return;
  }

  reminderInterval = setInterval(() => {
    void safelyRun('processUpcomingReminders', async () => {
      const processed = await appointmentService.processUpcomingReminders();
      if (processed > 0) {
        logger.debug(`✅ Recordatorios de citas reprogramados: ${processed}`);
      }
    });
  }, reminderIntervalMs);

  logger.info('⏱️ Jobs de citas médicas iniciados');
};

export const stopAppointmentJobs = () => {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
    logger.info('🛑 Jobs de citas médicas detenidos');
  }
};

