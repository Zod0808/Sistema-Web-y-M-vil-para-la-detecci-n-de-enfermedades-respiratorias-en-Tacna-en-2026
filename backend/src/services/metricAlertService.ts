/**
 * Metric Alert Service
 * Detecta métricas anormales basándose en datos históricos
 */

import AutomaticReport, { AutomaticReportDocument } from '../models/AutomaticReport';
import MedicalHistory from '../models/MedicalHistory';
import Alert from '../models/Alert';
import Appointment from '../models/Appointment';
import User from '../models/User';
import AIAnalysis from '../models/AIAnalysis';
import { logger } from '../utils/logger';

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface MetricAnomaly {
  metric: string;
  value: number;
  expectedRange: { min: number; max: number };
  severity: AnomalySeverity;
  description: string;
  detectedAt: Date;
}

export interface AnomalyDetectionConfig {
  lookbackDays?: number;
  zScoreThreshold?: number;
  percentChangeThreshold?: number;
}

class MetricAlertService {
  private readonly DEFAULT_LOOKBACK_DAYS = 30;
  private readonly DEFAULT_Z_SCORE_THRESHOLD = 2.5;
  private readonly DEFAULT_PERCENT_CHANGE_THRESHOLD = 20;

  /**
   * Detecta anomalías en métricas comparando con datos históricos
   */
  async detectAnomalies(
    currentMetrics: {
      totalPatients: number;
      totalMedicalHistories: number;
      totalAlerts: number;
      criticalAlerts: number;
      totalAppointments: number;
      completedAppointments: number;
      aiAnalyses: number;
      averageAIConfidence: number;
    },
    config: AnomalyDetectionConfig = {}
  ): Promise<MetricAnomaly[]> {
    const lookbackDays = config.lookbackDays || this.DEFAULT_LOOKBACK_DAYS;
    const zScoreThreshold = config.zScoreThreshold || this.DEFAULT_Z_SCORE_THRESHOLD;
    const percentChangeThreshold = config.percentChangeThreshold || this.DEFAULT_PERCENT_CHANGE_THRESHOLD;

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

    try {
      // Obtener reportes históricos del mismo tipo (diario)
      const historicalReports = await AutomaticReport.find({
        reportType: 'daily',
        'period.startDate': { $gte: startDate, $lte: endDate },
        status: 'completed',
      })
        .sort({ 'period.startDate': -1 })
        .limit(30)
        .exec();

      if (historicalReports.length < 7) {
        // No hay suficientes datos históricos
        logger.warn('No hay suficientes reportes históricos para detectar anomalías');
        return [];
      }

      const anomalies: MetricAnomaly[] = [];

      // Detectar anomalías en cada métrica
      anomalies.push(
        ...this.detectMetricAnomaly(
          'totalMedicalHistories',
          currentMetrics.totalMedicalHistories,
          historicalReports.map((r) => r.metrics.totalMedicalHistories),
          zScoreThreshold,
          percentChangeThreshold
        ),
        ...this.detectMetricAnomaly(
          'totalAlerts',
          currentMetrics.totalAlerts,
          historicalReports.map((r) => r.metrics.totalAlerts),
          zScoreThreshold,
          percentChangeThreshold
        ),
        ...this.detectMetricAnomaly(
          'criticalAlerts',
          currentMetrics.criticalAlerts,
          historicalReports.map((r) => r.metrics.criticalAlerts),
          zScoreThreshold,
          percentChangeThreshold
        ),
        ...this.detectMetricAnomaly(
          'averageAIConfidence',
          currentMetrics.averageAIConfidence,
          historicalReports.map((r) => r.metrics.averageAIConfidence),
          zScoreThreshold,
          percentChangeThreshold
        ),
        ...this.detectMetricAnomaly(
          'completedAppointments',
          currentMetrics.completedAppointments,
          historicalReports.map((r) => r.metrics.completedAppointments),
          zScoreThreshold,
          percentChangeThreshold
        )
      );

      return anomalies;
    } catch (error) {
      logger.error('Error detectando anomalías en métricas', { error });
      return [];
    }
  }

  /**
   * Detecta anomalías en una métrica específica usando z-score y cambio porcentual
   */
  private detectMetricAnomaly(
    metricName: string,
    currentValue: number,
    historicalValues: number[],
    zScoreThreshold: number,
    percentChangeThreshold: number
  ): MetricAnomaly[] {
    if (historicalValues.length < 7) {
      return [];
    }

    // Calcular estadísticas históricas
    const mean = historicalValues.reduce((sum, val) => sum + val, 0) / historicalValues.length;
    const variance =
      historicalValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / historicalValues.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) {
      // Sin variación histórica, no se puede detectar anomalías
      return [];
    }

    // Calcular z-score
    const zScore = Math.abs((currentValue - mean) / stdDev);

    // Calcular cambio porcentual
    const percentChange = mean > 0 ? ((currentValue - mean) / mean) * 100 : 0;

    // Determinar si es una anomalía
    const isAnomaly = zScore > zScoreThreshold || Math.abs(percentChange) > percentChangeThreshold;

    if (!isAnomaly) {
      return [];
    }

    // Determinar severidad
    let severity: AnomalySeverity = 'low';
    if (zScore > 4 || Math.abs(percentChange) > 50) {
      severity = 'critical';
    } else if (zScore > 3 || Math.abs(percentChange) > 35) {
      severity = 'high';
    } else if (zScore > 2.5 || Math.abs(percentChange) > 25) {
      severity = 'medium';
    }

    // Calcular rango esperado (media ± 2 desviaciones estándar)
    const expectedMin = Math.max(0, mean - 2 * stdDev);
    const expectedMax = mean + 2 * stdDev;

    // Generar descripción
    const direction = currentValue > mean ? 'aumento' : 'disminución';
    const description = `${metricName} muestra un ${direction} anormal del ${Math.abs(percentChange).toFixed(1)}% (z-score: ${zScore.toFixed(2)}). Valor actual: ${currentValue.toFixed(2)}, promedio histórico: ${mean.toFixed(2)}.`;

    return [{
      metric: metricName,
      value: currentValue,
      expectedRange: { min: expectedMin, max: expectedMax },
      severity,
      description,
      detectedAt: new Date(),
    }];
  }

  /**
   * Obtiene métricas actuales del sistema
   */
  async getCurrentMetrics(period: { startDate: Date; endDate: Date }) {
    const [
      totalPatients,
      totalDoctors,
      totalAdmins,
      totalMedicalHistories,
      totalAlerts,
      criticalAlerts,
      totalAppointments,
      completedAppointments,
      aiAnalyses,
      aiConfidenceStats,
    ] = await Promise.all([
      User.countDocuments({ role: 'patient' }),
      User.countDocuments({ role: 'doctor' }),
      User.countDocuments({ role: 'admin' }),
      MedicalHistory.countDocuments({
        createdAt: { $gte: period.startDate, $lte: period.endDate },
      }),
      Alert.countDocuments({
        createdAt: { $gte: period.startDate, $lte: period.endDate },
      }),
      Alert.countDocuments({
        createdAt: { $gte: period.startDate, $lte: period.endDate },
        priority: 'critical',
      }),
      Appointment.countDocuments({
        scheduledAt: { $gte: period.startDate, $lte: period.endDate },
      }),
      Appointment.countDocuments({
        scheduledAt: { $gte: period.startDate, $lte: period.endDate },
        status: 'completed',
      }),
      AIAnalysis.countDocuments({
        timestamp: { $gte: period.startDate, $lte: period.endDate },
      }),
      AIAnalysis.aggregate([
        {
          $match: {
            timestamp: { $gte: period.startDate, $lte: period.endDate },
          },
        },
        {
          $group: {
            _id: null,
            avgConfidence: { $avg: '$confidence' },
          },
        },
      ]),
    ]);

    const averageAIConfidence =
      aiConfidenceStats.length > 0 && aiConfidenceStats[0].avgConfidence
        ? Number(aiConfidenceStats[0].avgConfidence.toFixed(4))
        : 0;

    return {
      totalPatients,
      totalDoctors,
      totalAdmins,
      totalMedicalHistories,
      totalAlerts,
      criticalAlerts,
      totalAppointments,
      completedAppointments,
      aiAnalyses,
      averageAIConfidence,
    };
  }
}

export const metricAlertService = new MetricAlertService();
export default metricAlertService;

