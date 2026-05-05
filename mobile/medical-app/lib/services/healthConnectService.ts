"use client"

/**
 * Health Connect Service — Android 14+
 *
 * Lee datos reales de frecuencia cardíaca y SpO2 desde Health Connect API.
 * Compatible con: Samsung Galaxy Watch, Pixel Watch, Fitbit (Android 14+),
 *                Garmin (vía Health Connect), y cualquier wearable que
 *                sincronice con Health Connect.
 *
 * Requisito: El dispositivo debe tener instalado "Health Connect" de Google
 * y el usuario debe haber concedido permisos READ_HEART_RATE y READ_OXYGEN_SATURATION.
 *
 * En dispositivos sin Health Connect o con permisos denegados, los métodos
 * retornan null y el sistema usará el EmuladorSensorService como fallback.
 */

import type { SensorReading } from './emulatorSensors'

// Capacitor Health Connect plugin — disponible si está instalado
// Si no está instalado, todos los métodos retornan null (graceful degradation)
type HealthConnectPlugin = {
  checkAvailability(): Promise<{ availability: 'Available' | 'NotInstalled' | 'NotSupported' }>
  requestHealthPermissions(opts: { read: string[] }): Promise<{ granted: boolean }>
  readHeartRate(opts: { startTime: string; endTime: string }): Promise<{ records: Array<{ beatsPerMinute: number; time: string }> }>
  readOxygenSaturation(opts: { startTime: string; endTime: string }): Promise<{ records: Array<{ percentage: number; time: string }> }>
  readStepCount(opts: { startTime: string; endTime: string }): Promise<{ records: Array<{ count: number; startTime: string; endTime: string }> }>
}

let _plugin: HealthConnectPlugin | null = null

async function getPlugin(): Promise<HealthConnectPlugin | null> {
  if (_plugin !== null) return _plugin
  try {
    // Dynamic import — solo disponible en apps Capacitor con el plugin instalado
    const { Plugins } = await import('@capacitor/core')
    const p = (Plugins as any).HealthConnect as HealthConnectPlugin | undefined
    _plugin = p ?? null
  } catch {
    _plugin = null
  }
  return _plugin
}

export class HealthConnectService {
  private _available: boolean | null = null
  private _permissionsGranted = false

  /** Verifica si Health Connect está disponible en este dispositivo */
  async isAvailable(): Promise<boolean> {
    if (this._available !== null) return this._available
    const plugin = await getPlugin()
    if (!plugin) {
      this._available = false
      return false
    }
    try {
      const { availability } = await plugin.checkAvailability()
      this._available = availability === 'Available'
    } catch {
      this._available = false
    }
    return this._available
  }

  /** Solicita permisos de lectura de salud al usuario */
  async requestPermissions(): Promise<boolean> {
    if (!(await this.isAvailable())) return false
    const plugin = await getPlugin()
    if (!plugin) return false
    try {
      const { granted } = await plugin.requestHealthPermissions({
        read: ['HeartRate', 'OxygenSaturation', 'Steps'],
      })
      this._permissionsGranted = granted
      return granted
    } catch {
      return false
    }
  }

  /**
   * Lee la lectura más reciente de FC, SpO2 y pasos de los últimos `windowMinutes`.
   * Retorna null si Health Connect no está disponible o sin permisos.
   */
  async getLatestReading(windowMinutes = 5): Promise<SensorReading | null> {
    if (!(await this.isAvailable())) return null
    if (!this._permissionsGranted && !(await this.requestPermissions())) return null

    const plugin = await getPlugin()
    if (!plugin) return null

    const endTime = new Date().toISOString()
    const startTime = new Date(Date.now() - windowMinutes * 60_000).toISOString()

    try {
      const [hrResult, spo2Result, stepsResult] = await Promise.allSettled([
        plugin.readHeartRate({ startTime, endTime }),
        plugin.readOxygenSaturation({ startTime, endTime }),
        plugin.readStepCount({ startTime, endTime }),
      ])

      const heartRate =
        hrResult.status === 'fulfilled' && hrResult.value.records.length > 0
          ? hrResult.value.records[hrResult.value.records.length - 1].beatsPerMinute
          : null

      const spO2 =
        spo2Result.status === 'fulfilled' && spo2Result.value.records.length > 0
          ? spo2Result.value.records[spo2Result.value.records.length - 1].percentage
          : null

      const steps =
        stepsResult.status === 'fulfilled'
          ? stepsResult.value.records.reduce((acc, r) => acc + r.count, 0)
          : null

      if (heartRate === null && spO2 === null) return null

      return {
        heartRate: heartRate ?? 0,
        spO2: spO2 ?? 0,
        steps: steps ?? 0,
        lastSync: endTime,
        provider: 'Health Connect',
        scenario: undefined,
      }
    } catch {
      return null
    }
  }
}

export const healthConnect = new HealthConnectService()
