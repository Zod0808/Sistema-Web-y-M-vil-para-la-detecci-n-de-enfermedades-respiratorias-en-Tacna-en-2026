/**
 * Report Jobs
 * Genera reportes automáticos periódicos (diarios, semanales, mensuales)
 */

import cron from 'node-cron';
import { automaticReportService } from '../services/automaticReportService';
import { logger } from '../utils/logger';

let dailyReportJob: cron.ScheduledTask | null = null;
let weeklyReportJob: cron.ScheduledTask | null = null;
let monthlyReportJob: cron.ScheduledTask | null = null;

const safelyRun = async (taskName: string, task: () => Promise<void>) => {
  try {
    await task();
    logger.info(`✅ Job de reportes ejecutado exitosamente: ${taskName}`);
  } catch (error) {
    logger.error(`❌ Error ejecutando job de reportes (${taskName})`, { error });
  }
};

/**
 * Inicia los jobs de reportes automáticos
 */
export const startReportJobs = (): void => {
  // Reporte diario: todos los días a las 23:59
  if (!dailyReportJob) {
    dailyReportJob = cron.schedule('59 23 * * *', () => {
      void safelyRun('dailyReport', async () => {
        logger.info('🔄 Iniciando generación de reporte diario automático');
        await automaticReportService.generateDailyReport();
      });
    }, {
      scheduled: true,
      timezone: 'America/Lima',
    });
    logger.info('⏱️ Job de reporte diario iniciado (23:59 diario)');
  }

  // Reporte semanal: todos los domingos a las 23:59
  if (!weeklyReportJob) {
    weeklyReportJob = cron.schedule('59 23 * * 0', () => {
      void safelyRun('weeklyReport', async () => {
        logger.info('🔄 Iniciando generación de reporte semanal automático');
        await automaticReportService.generateWeeklyReport();
      });
    }, {
      scheduled: true,
      timezone: 'America/Lima',
    });
    logger.info('⏱️ Job de reporte semanal iniciado (domingos 23:59)');
  }

  // Reporte mensual: el primer día de cada mes a las 00:00
  if (!monthlyReportJob) {
    monthlyReportJob = cron.schedule('0 0 1 * *', () => {
      void safelyRun('monthlyReport', async () => {
        logger.info('🔄 Iniciando generación de reporte mensual automático');
        await automaticReportService.generateMonthlyReport();
      });
    }, {
      scheduled: true,
      timezone: 'America/Lima',
    });
    logger.info('⏱️ Job de reporte mensual iniciado (día 1 de cada mes 00:00)');
  }

  logger.info('✅ Todos los jobs de reportes automáticos iniciados');
};

/**
 * Detiene los jobs de reportes automáticos
 */
export const stopReportJobs = (): void => {
  if (dailyReportJob) {
    dailyReportJob.stop();
    dailyReportJob = null;
  }

  if (weeklyReportJob) {
    weeklyReportJob.stop();
    weeklyReportJob = null;
  }

  if (monthlyReportJob) {
    monthlyReportJob.stop();
    monthlyReportJob = null;
  }

  logger.info('🛑 Jobs de reportes automáticos detenidos');
};

/**
 * Genera un reporte manualmente (para testing o ejecución inmediata)
 */
export const generateManualReport = async (
  reportType: 'daily' | 'weekly' | 'monthly'
): Promise<void> => {
  try {
    switch (reportType) {
      case 'daily':
        await automaticReportService.generateDailyReport();
        break;
      case 'weekly':
        await automaticReportService.generateWeeklyReport();
        break;
      case 'monthly':
        await automaticReportService.generateMonthlyReport();
        break;
      default:
        throw new Error(`Tipo de reporte no válido: ${reportType}`);
    }
    logger.info(`✅ Reporte ${reportType} generado manualmente`);
  } catch (error) {
    logger.error(`❌ Error generando reporte ${reportType} manualmente`, { error });
    throw error;
  }
};

