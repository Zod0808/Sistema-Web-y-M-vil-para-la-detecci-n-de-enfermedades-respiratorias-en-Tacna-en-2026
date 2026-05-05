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
  steps?: number;
  timestamp: string;
}

export interface WearableAlert {
  level: 'critical' | 'high';
  metric: 'heartRate' | 'spO2';
  value: number;
  threshold: number;
  title: string;
  message: string;
}

// Umbrales clínicos
const THRESHOLDS = {
  heartRate: {
    critical: 130,  // ≥ 130 BPM → crítico
    high: 100,      // > 100 BPM → alto
  },
  spO2: {
    critical: 90,   // < 90% → crítico
    high: 94,       // < 94% → alto
  },
} as const;

// Cooldown en memoria: evita crear alertas duplicadas en ventana de 5 min
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

    if (hr >= THRESHOLDS.heartRate.critical && !isCoolingDown(patientId, 'heartRate', 'critical')) {
      triggered.push({
        level: 'critical',
        metric: 'heartRate',
        value: hr,
        threshold: THRESHOLDS.heartRate.critical,
        title: '⚠️ Taquicardia crítica',
        message: `Frecuencia cardíaca ${hr} BPM supera el umbral crítico de ${THRESHOLDS.heartRate.critical} BPM.`,
      });
    } else if (
      hr > THRESHOLDS.heartRate.high &&
      hr < THRESHOLDS.heartRate.critical &&
      !isCoolingDown(patientId, 'heartRate', 'high')
    ) {
      triggered.push({
        level: 'high',
        metric: 'heartRate',
        value: hr,
        threshold: THRESHOLDS.heartRate.high,
        title: 'Frecuencia cardíaca elevada',
        message: `Frecuencia cardíaca ${hr} BPM supera los ${THRESHOLDS.heartRate.high} BPM recomendados en reposo.`,
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
        title: 'SpO2 por debajo de lo normal',
        message: `Saturación de oxígeno ${spo2}% está por debajo del nivel recomendado de ${THRESHOLDS.spO2.high}%.`,
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
