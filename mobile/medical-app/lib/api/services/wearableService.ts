/**
 * Servicio de wearables — emulador Wear OS → teléfono → backend
 */

import { apiClient } from '../client'
import { API_ENDPOINTS } from '../config'

export interface WearableReading {
  heartRate: number | null
  spO2: number | null
  steps: number | null
  lastSync: string | null
  provider: string | null
  dataPoints?: number
}

export interface WearableHistoryEntry {
  heartRate: number
  oxygenSaturation: number
  steps: number
  timestamp: string
  source: string
}

export class WearableService {
  /**
   * Obtiene las métricas agregadas del último día desde el backend.
   * El backend devuelve { metrics: { heartRate: { current, avg, min, max }, oxygenSaturation: {...}, ... } }
   */
  async getMetrics(): Promise<WearableReading> {
    const response = await apiClient.get<any>(API_ENDPOINTS.wearables.metrics)
    const m = response?.metrics
    if (!m || m.period?.dataPoints === 0) {
      return { heartRate: null, spO2: null, steps: null, lastSync: null, provider: null, dataPoints: 0 }
    }
    return {
      heartRate: m.heartRate?.current || null,
      spO2: m.oxygenSaturation?.current || null,
      steps: m.activity?.steps || null,
      lastSync: m.period?.endDate ? new Date(m.period.endDate).toISOString() : new Date().toISOString(),
      provider: 'Wear OS Emulator',
      dataPoints: m.period?.dataPoints || 0,
    }
  }

  /**
   * Envía una lectura del emulador Wear OS al backend.
   * Mapea los campos del emulador al esquema de la BD:
   *   spO2 → oxygenSaturation, lastSync → timestamp, source → 'android_sensor'
   */
  async syncMetrics(reading: { heartRate: number; spO2: number; steps: number; lastSync: string }): Promise<any> {
    return apiClient.post<any>(API_ENDPOINTS.wearables.sync, {
      data: [{
        heartRate: reading.heartRate,
        oxygenSaturation: reading.spO2,
        steps: reading.steps,
        timestamp: reading.lastSync || new Date().toISOString(),
        source: 'android_sensor',
      }],
    })
  }

  /**
   * Obtiene el historial de lecturas guardadas en la BD para el usuario autenticado.
   * El backend responde `{data:[readings], pagination}` y apiClient ya desenvuelve
   * el primer nivel `data`, así que aquí sólo hay que sacar el array anidado.
   */
  async getHistory(limit = 5): Promise<WearableHistoryEntry[]> {
    try {
      const response = await apiClient.get<any>(`${API_ENDPOINTS.wearables.data}?limit=${limit}`)
      // response puede venir como {data:[...]} (envelope backend) o [...] (ya desenvuelto)
      const raw = Array.isArray(response) ? response : response?.data ?? []
      if (!Array.isArray(raw)) return []
      return raw
    } catch (err) {
      console.error('[wearables] getHistory failed:', err)
      return []
    }
  }
}

export const wearableService = new WearableService()