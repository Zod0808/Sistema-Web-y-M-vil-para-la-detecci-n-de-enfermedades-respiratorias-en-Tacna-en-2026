/**
 * Wearable Alert Service
 * Verifica umbrales clínicos en cada lectura y crea alertas en MongoDB.
 * Cooldown de 5 min por paciente+métrica para evitar spam.
 */

import AlertModel from '../models/Alert';
import { logger } from '../utils/logger';

export interface WearableReading {
  heartRate?: number;
  oxygenSaturation?: number;
  respiratoryRate?: number;
  steps?: number;
  timestamp: string;
}

export interface WearableAlert {
  level: 'critical' | 'high';
  metric: 'heartRate' | 'spO2' | 'respiratoryRate';
  value: number;
  threshold: number;
  title: string;
  message: string;
}

// Umbrales clínicos
const THRESHOLDS = {
  heartRate: {
    criticalHigh: 130, // ≥ 130 BPM → taquicardia crítica
    high: 100,         // > 100 BPM → elevada
    criticalLow: 40,   // ≤ 40 BPM → bradicardia crítica
    highLow: 50,       // < 50 BPM → baja
  },
  spO2: {
    critical: 90,      // < 90% → hipoxemia crítica
    high: 94,          // < 94% → por debajo de lo normal
  },
  respiratoryRate: {
    criticalHigh: 30,  // ≥ 30 rpm → taquipnea crítica
    high: 25,          // ≥ 25 rpm → elevada
    criticalLow: 10,   // ≤ 10 rpm → bradipnea crítica
    highLow: 12,       // < 12 rpm → baja
  },
} as const;

// Cooldown en memoria: evita crear alertas duplicadas en ventana de 5 min.
// NOTA: se resetea si el proceso reinicia — alertas duplicadas son posibles tras reinicios.
// Para producción de HA migrar cooldowns a Redis.
const cooldowns = new Map<string, number>();
const COOLDOWN_MS = 5 * 60 * 1000;

function isCoolingDown(patientId: string, metric: string, level: string): boolean {
  const key = `${patientId}:${metric}:${level}`;
  const last = cooldowns.get(key);
  if (last && Date.now() - last < COOLDOWN_MS) return true;
  cooldowns.set(key, Date.now());
  return false;
}

export async function checkThresholdsAndAlert(
  patientId: string,
  reading: WearableReading
): Promise<WearableAlert[]> {
  const triggered: WearableAlert[] = [];

  // ── Frecuencia cardíaca ────────────────────────────────────────────────────
  if (reading.heartRate !== undefined) {
    const hr = reading.heartRate;

    if (hr >= THRESHOLDS.heartRate.criticalHigh && !isCoolingDown(patientId, 'heartRate', 'criticalHigh')) {
      triggered.push({
        level: 'critical',
        metric: 'heartRate',
        value: hr,
        threshold: THRESHOLDS.heartRate.criticalHigh,
        title: '🆘 Taquicardia crítica',
        message: `Frecuencia cardíaca ${hr} BPM supera el umbral crítico de ${THRESHOLDS.heartRate.criticalHigh} BPM.`,
      });
    } else if (
      hr > THRESHOLDS.heartRate.high &&
      hr < THRESHOLDS.heartRate.criticalHigh &&
      !isCoolingDown(patientId, 'heartRate', 'high')
    ) {
      triggered.push({
        level: 'high',
        metric: 'heartRate',
        value: hr,
        threshold: THRESHOLDS.heartRate.high,
        title: '⚠️ Frecuencia cardíaca elevada',
        message: `Frecuencia cardíaca ${hr} BPM supera los ${THRESHOLDS.heartRate.high} BPM recomendados en reposo.`,
      });
    } else if (hr <= THRESHOLDS.heartRate.criticalLow && !isCoolingDown(patientId, 'heartRate', 'criticalLow')) {
      triggered.push({
        level: 'critical',
        metric: 'heartRate',
        value: hr,
        threshold: THRESHOLDS.heartRate.criticalLow,
        title: '🆘 Bradicardia crítica',
        message: `Frecuencia cardíaca ${hr} BPM está por debajo del umbral crítico de ${THRESHOLDS.heartRate.criticalLow} BPM.`,
      });
    } else if (
      hr < THRESHOLDS.heartRate.highLow &&
      hr > THRESHOLDS.heartRate.criticalLow &&
      !isCoolingDown(patientId, 'heartRate', 'lowHigh')
    ) {
      triggered.push({
        level: 'high',
        metric: 'heartRate',
        value: hr,
        threshold: THRESHOLDS.heartRate.highLow,
        title: '⚠️ Frecuencia cardíaca baja',
        message: `Frecuencia cardíaca ${hr} BPM está por debajo de los ${THRESHOLDS.heartRate.highLow} BPM recomendados.`,
      });
    }
  }

  // ── Saturación de oxígeno (SpO2) ───────────────────────────────────────────
  if (reading.oxygenSaturation !== undefined) {
    const spo2 = reading.oxygenSaturation;

    if (spo2 < THRESHOLDS.spO2.critical && !isCoolingDown(patientId, 'spO2', 'critical')) {
      triggered.push({
        level: 'critical',
        metric: 'spO2',
        value: spo2,
        threshold: THRESHOLDS.spO2.critical,
        title: '🆘 Hipoxemia crítica',
        message: `Saturación de oxígeno ${spo2}% está por debajo del umbral crítico del ${THRESHOLDS.spO2.critical}%. Requiere atención inmediata.`,
      });
    } else if (
      spo2 >= THRESHOLDS.spO2.critical &&
      spo2 < THRESHOLDS.spO2.high &&
      !isCoolingDown(patientId, 'spO2', 'high')
    ) {
      triggered.push({
        level: 'high',
        metric: 'spO2',
        value: spo2,
        threshold: THRESHOLDS.spO2.high,
        title: '⚠️ SpO₂ por debajo de lo normal',
        message: `Saturación de oxígeno ${spo2}% está por debajo del nivel recomendado de ${THRESHOLDS.spO2.high}%.`,
      });
    }
  }

  // ── Frecuencia respiratoria ────────────────────────────────────────────────
  if (reading.respiratoryRate !== undefined) {
    const rr = reading.respiratoryRate;

    if (rr >= THRESHOLDS.respiratoryRate.criticalHigh && !isCoolingDown(patientId, 'respiratoryRate', 'criticalHigh')) {
      triggered.push({
        level: 'critical',
        metric: 'respiratoryRate',
        value: rr,
        threshold: THRESHOLDS.respiratoryRate.criticalHigh,
        title: '🆘 Taquipnea crítica',
        message: `Frecuencia respiratoria ${rr} rpm supera el umbral crítico de ${THRESHOLDS.respiratoryRate.criticalHigh} rpm.`,
      });
    } else if (
      rr >= THRESHOLDS.respiratoryRate.high &&
      rr < THRESHOLDS.respiratoryRate.criticalHigh &&
      !isCoolingDown(patientId, 'respiratoryRate', 'high')
    ) {
      triggered.push({
        level: 'high',
        metric: 'respiratoryRate',
        value: rr,
        threshold: THRESHOLDS.respiratoryRate.high,
        title: '⚠️ Frecuencia respiratoria elevada',
        message: `Frecuencia respiratoria ${rr} rpm supera los ${THRESHOLDS.respiratoryRate.high} rpm.`,
      });
    } else if (rr <= THRESHOLDS.respiratoryRate.criticalLow && !isCoolingDown(patientId, 'respiratoryRate', 'criticalLow')) {
      triggered.push({
        level: 'critical',
        metric: 'respiratoryRate',
        value: rr,
        threshold: THRESHOLDS.respiratoryRate.criticalLow,
        title: '🆘 Bradipnea crítica',
        message: `Frecuencia respiratoria ${rr} rpm está por debajo del umbral crítico de ${THRESHOLDS.respiratoryRate.criticalLow} rpm.`,
      });
    } else if (
      rr <= THRESHOLDS.respiratoryRate.highLow &&
      rr > THRESHOLDS.respiratoryRate.criticalLow &&
      !isCoolingDown(patientId, 'respiratoryRate', 'lowHigh')
    ) {
      triggered.push({
        level: 'high',
        metric: 'respiratoryRate',
        value: rr,
        threshold: THRESHOLDS.respiratoryRate.highLow,
        title: '⚠️ Frecuencia respiratoria baja',
        message: `Frecuencia respiratoria ${rr} rpm está por debajo de los ${THRESHOLDS.respiratoryRate.highLow} rpm normales.`,
      });
    }
  }

  // Persistir en MongoDB
  for (const alert of triggered) {
    try {
      await AlertModel.create({
        userId: patientId,
        patientId,
        title: alert.title,
        message: alert.message,
        category: 'critical_symptom',
        priority: alert.level,
        channels: ['in_app', 'push'],
        status: 'pending',
        scheduledAt: new Date(),
        trigger: {
          source: 'symptom_analysis',
          metadata: { metric: alert.metric, value: alert.value, threshold: alert.threshold },
        },
        tags: ['wearable', alert.metric, alert.level],
      });
    } catch (err) {
      logger.error('Error creando alerta de wearable en BD', { err, patientId, alert });
    }
  }

  return triggered;
}
