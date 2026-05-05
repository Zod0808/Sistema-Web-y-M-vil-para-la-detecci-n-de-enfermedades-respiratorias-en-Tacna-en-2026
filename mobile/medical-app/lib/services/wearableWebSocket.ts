"use client"

/**
 * WearableWebSocketService
 *
 * Conexión WebSocket persistente con el backend para envío de datos de
 * wearables en tiempo real y recepción de alertas clínicas.
 *
 * Protocolo:
 *   authenticate → send readings → receive acks/alerts
 *
 * Reconexión automática con backoff exponencial (max 30s).
 * Usa native WebSocket API — disponible en todos los navegadores y Capacitor.
 */

import { API_CONFIG, getAuthToken } from '@/lib/api/config'
import type { SensorReading } from './emulatorSensors'

export interface WsAlert {
  level: 'critical' | 'high'
  metric: 'heartRate' | 'spO2'
  value: number
  threshold: number
  title: string
  message: string
}

type AlertCallback = (alert: WsAlert) => void
type StatusCallback = (status: 'connected' | 'disconnected' | 'error') => void

function buildWsUrl(): string {
  const base = API_CONFIG.baseURL
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
  // En desarrollo usamos ws:// ; en producción el proxy debería manejar wss://
  const protocol = API_CONFIG.baseURL.startsWith('https') ? 'wss' : 'ws'
  return `${protocol}://${base}/ws/wearables`
}

const RECONNECT_BASE_MS = 1_000
const RECONNECT_MAX_MS = 30_000
const PING_INTERVAL_MS = 25_000

export class WearableWebSocketService {
  private ws: WebSocket | null = null
  private authenticated = false
  private reconnectAttempts = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private intentionalClose = false

  private alertListeners: Set<AlertCallback> = new Set()
  private statusListeners: Set<StatusCallback> = new Set()

  // Enqueue readings mientras no está autenticado
  private queue: SensorReading[] = []

  connect(): void {
    this.intentionalClose = false
    this._connect()
  }

  private _connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    const url = buildWsUrl()
    try {
      this.ws = new WebSocket(url)
    } catch (err) {
      this._scheduleReconnect()
      return
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0
      this._startPing()
      // Autenticar con JWT
      const token = getAuthToken()
      if (token) {
        this._send({ type: 'auth', payload: { token } })
      }
    }

    this.ws.onmessage = (event) => {
      let msg: { type: string; payload?: any }
      try {
        msg = JSON.parse(event.data)
      } catch {
        return
      }

      switch (msg.type) {
        case 'auth:ok':
          this.authenticated = true
          this._notifyStatus('connected')
          this._flushQueue()
          break

        case 'auth:error':
          this.authenticated = false
          this._notifyStatus('error')
          this.ws?.close()
          break

        case 'wearable:alert':
          this.alertListeners.forEach(cb => cb(msg.payload as WsAlert))
          break

        case 'pong':
          // keep-alive OK
          break

        default:
          break
      }
    }

    this.ws.onclose = () => {
      this.authenticated = false
      this._stopPing()
      this._notifyStatus('disconnected')
      if (!this.intentionalClose) {
        this._scheduleReconnect()
      }
    }

    this.ws.onerror = () => {
      this._notifyStatus('error')
    }
  }

  /** Envía una lectura de sensores. Se encola si aún no está autenticado. */
  sendReading(reading: SensorReading): void {
    if (this.authenticated && this.ws?.readyState === WebSocket.OPEN) {
      this._send({
        type: 'wearable:data',
        payload: {
          heartRate: reading.heartRate,
          oxygenSaturation: reading.spO2,
          spO2: reading.spO2,
          steps: reading.steps,
          timestamp: reading.lastSync || new Date().toISOString(),
          source: reading.provider === 'Health Connect' ? 'google_fit' : 'android_sensor',
        },
      })
    } else {
      // Guardar en cola, máx 10 lecturas (descartar las más viejas)
      this.queue.push(reading)
      if (this.queue.length > 10) this.queue.shift()
    }
  }

  disconnect(): void {
    this.intentionalClose = true
    this._stopPing()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.ws?.close()
    this.ws = null
    this.authenticated = false
  }

  get isConnected(): boolean {
    return this.authenticated && this.ws?.readyState === WebSocket.OPEN
  }

  onAlert(cb: AlertCallback): () => void {
    this.alertListeners.add(cb)
    return () => this.alertListeners.delete(cb)
  }

  onStatus(cb: StatusCallback): () => void {
    this.statusListeners.add(cb)
    return () => this.statusListeners.delete(cb)
  }

  private _send(msg: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    }
  }

  private _flushQueue(): void {
    while (this.queue.length > 0) {
      const reading = this.queue.shift()!
      this.sendReading(reading)
    }
  }

  private _startPing(): void {
    this._stopPing()
    this.pingTimer = setInterval(() => {
      this._send({ type: 'ping' })
    }, PING_INTERVAL_MS)
  }

  private _stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  private _scheduleReconnect(): void {
    if (this.intentionalClose) return
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** this.reconnectAttempts, RECONNECT_MAX_MS)
    this.reconnectAttempts++
    this.reconnectTimer = setTimeout(() => this._connect(), delay)
  }

  private _notifyStatus(status: 'connected' | 'disconnected' | 'error'): void {
    this.statusListeners.forEach(cb => cb(status))
  }
}

export const wearableWs = new WearableWebSocketService()
