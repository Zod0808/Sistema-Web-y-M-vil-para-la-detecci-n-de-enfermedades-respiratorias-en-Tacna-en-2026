/**
 * ML Metrics Jobs
 * Jobs recurrentes para cálculo y agregado de métricas ML históricas
 * 
 * Estos jobs ejecutan cálculos periódicos de métricas ML (tendencias, anomalías, demanda)
 * y las almacenan para consulta rápida en dashboards y reportes.
 */

import cron from 'node-cron';
import { aiIntegrationService } from '../services/aiIntegration';
import { logger } from '../utils/logger';
import { getRedisClient } from '../config/redisClient';

let hourlyMetricsJob: cron.ScheduledTask | null = null;
let dailyMetricsJob: cron.ScheduledTask | null = null;
let weeklyMetricsJob: cron.ScheduledTask | null = null;

const safelyRun = async (taskName: string, task: () => Promise<void>) => {
  try {
    await task();
    logger.info(`✅ Job de métricas ML ejecutado exitosamente: ${taskName}`);
  } catch (error) {
    logger.error(`❌ Error ejecutando job de métricas ML (${taskName})`, { error });
  }
};

/**
 * Calcula y almacena métricas ML para el período especificado
 */
const calculateAndStoreMetrics = async (period: '1h' | '24h' | '7d', days: number) => {
  try {
    logger.info(`🔄 Calculando métricas ML para período: ${period} (últimos ${days} días)`);
    
    // Obtener métricas de monitoreo ML desde AI Services
    const metrics = await aiIntegrationService.getMlMonitoringMetrics({ days });
    
    // Obtener contribuciones de features (SHAP)
    const features = await aiIntegrationService.getMlFeatureInfluence({ top_n: 20 });
    
    // Obtener métricas de fairness
    const fairness = await aiIntegrationService.getMlFairnessMetrics({ 
      group_field: 'gender',
      high_confidence_threshold: 0.7 
    });
    
    // Preparar datos agregados para almacenamiento
    const aggregatedData = {
      period,
      timestamp: new Date().toISOString(),
      metrics: {
        summary: metrics.summary || {},
        distributions: metrics.distributions || {},
        quality: metrics.quality_metrics || {},
      },
      features: {
        top_features: features.top_features || [],
        friendly_factors: features.friendly_factors || [],
      },
      fairness: fairness || {},
    };
    
    // Almacenar en Redis con TTL según período
    const redis = getRedisClient();
    if (redis) {
      const key = `ml:metrics:${period}:${new Date().toISOString().split('T')[0]}`;
      const ttl = period === '1h' ? 3600 * 24 : period === '24h' ? 3600 * 24 * 7 : 3600 * 24 * 30; // 1 día, 7 días, 30 días
      
      await redis.setEx(key, ttl, JSON.stringify(aggregatedData));
      
      // También mantener un registro histórico (últimos N registros)
      const historyKey = `ml:metrics:history:${period}`;
      await redis.lPush(historyKey, JSON.stringify(aggregatedData));
      await redis.lTrim(historyKey, 0, 99); // Mantener últimos 100 registros
      
      logger.info(`✅ Métricas ML almacenadas en Redis: ${key}`);
    } else {
      logger.warn('⚠️ Redis no disponible, métricas ML no se almacenarán en caché');
    }
    
    // Log de resumen
    logger.info(`📊 Métricas ML calculadas:`, {
      period,
      totalPredictions: metrics.summary?.total_predictions || 0,
      avgConfidence: metrics.summary?.avg_confidence || 0,
      topFeatures: features.top_features?.length || 0,
      fairnessGroups: Object.keys(fairness || {}).length,
    });
    
  } catch (error: any) {
    logger.error(`❌ Error calculando métricas ML para ${period}`, { 
      error: error.message,
      stack: error.stack 
    });
    throw error;
  }
};

/**
 * Inicia los jobs de métricas ML
 */
export const startMlMetricsJobs = (): void => {
  // Métricas horarias: cada hora (minuto 0)
  if (!hourlyMetricsJob) {
    hourlyMetricsJob = cron.schedule('0 * * * *', () => {
      void safelyRun('hourlyMetrics', async () => {
        await calculateAndStoreMetrics('1h', 1);
      });
    }, {
      scheduled: true,
      timezone: 'America/Lima',
    });
    logger.info('⏱️ Job de métricas ML horarias iniciado (cada hora)');
  }

  // Métricas diarias: todos los días a las 02:00
  if (!dailyMetricsJob) {
    dailyMetricsJob = cron.schedule('0 2 * * *', () => {
      void safelyRun('dailyMetrics', async () => {
        await calculateAndStoreMetrics('24h', 1);
      });
    }, {
      scheduled: true,
      timezone: 'America/Lima',
    });
    logger.info('⏱️ Job de métricas ML diarias iniciado (02:00 diario)');
  }

  // Métricas semanales: todos los lunes a las 03:00
  if (!weeklyMetricsJob) {
    weeklyMetricsJob = cron.schedule('0 3 * * 1', () => {
      void safelyRun('weeklyMetrics', async () => {
        await calculateAndStoreMetrics('7d', 7);
      });
    }, {
      scheduled: true,
      timezone: 'America/Lima',
    });
    logger.info('⏱️ Job de métricas ML semanales iniciado (lunes 03:00)');
  }

  logger.info('✅ Todos los jobs de métricas ML iniciados');
};

/**
 * Detiene los jobs de métricas ML
 */
export const stopMlMetricsJobs = (): void => {
  if (hourlyMetricsJob) {
    hourlyMetricsJob.stop();
    hourlyMetricsJob = null;
  }

  if (dailyMetricsJob) {
    dailyMetricsJob.stop();
    dailyMetricsJob = null;
  }

  if (weeklyMetricsJob) {
    weeklyMetricsJob.stop();
    weeklyMetricsJob = null;
  }

  logger.info('🛑 Jobs de métricas ML detenidos');
};

/**
 * Ejecuta cálculo de métricas manualmente (para testing o ejecución inmediata)
 */
export const calculateMetricsManually = async (
  period: '1h' | '24h' | '7d',
  days: number
): Promise<void> => {
  try {
    await calculateAndStoreMetrics(period, days);
    logger.info(`✅ Métricas ML calculadas manualmente para período: ${period}`);
  } catch (error) {
    logger.error(`❌ Error calculando métricas ML manualmente para ${period}`, { error });
    throw error;
  }
};

