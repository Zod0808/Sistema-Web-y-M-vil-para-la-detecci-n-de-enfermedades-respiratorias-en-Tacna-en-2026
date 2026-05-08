"use client"

/**
 * BLE Wearable Service — Opción A
 *
 * Conexión directa vía Bluetooth Low Energy usando GATT estándar:
 *   Heart Rate Service   : 0x180D  →  Characteristic 0x2A37  (notify)
 *   Pulse Oximeter Svc   : 0x1822  →  Characteristic 0x2A5F  (notify)
 *
 * Compatible con: Apple Watch (indirect vía companion), Polar H10,
 *   Garmin (BLE mode), Fitbit Sense, Samsung Galaxy Watch,
 *   y cualquier wearable con perfil BLE Heart Rate estándar.
 *
 * Usa @capacitor-community/bluetooth-le con dynamic import.
 * Si el plugin no está instalado, todos los métodos retornan sin efecto.
 */

import type { SensorReading } from './emulatorSensors'

// ── UUIDs BLE estándar Bluetooth SIG ─────────────────────────────────────────
const HR_SERVICE    = '0000180d-0000-1000-8000-00805f9b34fb'
const HR_CHAR       = '00002a37-0000-1000-8000-00805f9b34fb'
const SPO2_SERVICE  = '00001822-0000-1000-8000-00805f9b34fb'
const SPO2_CHAR     = '00002a5f-0000-1000-8000-00805f9b34fb'

const SCAN_TIMEOUT_MS = 15_000

// ── Parsers GATT ──────────────────────────────────────────────────────────────

/**
 * Heart Rate Measurement (0x2A37)
 * Byte 0: flags  — bit 0: 0=uint8 HR, 1=uint16 HR
 * Byte 1[–2]: Heart Rate value
 */
function parseHeartRate(value: DataView): number | null {
  if (value.byteLength < 2) return null
  const flags = value.getUint8(0)
  const isUint16 = (flags & 0x01) !== 0
  try {
    return isUint16 ? value.getUint16(1, true) : value.getUint8(1)
  } catch {
    return null
  }
}

/**
 * PLX Continuous Measurement (0x2A5F)
 * Flags: 3 bytes (uint24 little-endian)
 * SpO2: SFLOAT at offset 3 (units: %, resolution 0.01)
 * PR:   SFLOAT at offset 5
 *
 * SFLOAT = uint16 where bits[15:12]=exponent, bits[11:0]=mantissa (signed)
 */
function parseSFLOAT(value: DataView, offset: number): number {
  const raw = value.getUint16(offset, true)
  const mantissa = raw & 0x0fff
  const exponent = raw >> 12
  const signedExp = exponent >= 8 ? exponent - 16 : exponent
  const signedMant = mantissa >= 0x0800 ? mantissa - 0x1000 : mantissa
  return signedMant * Math.pow(10, signedExp)
}

function parseSpO2(value: DataView): number | null {
  if (value.byteLength < 5) return null
  try {
    const spO2 = parseSFLOAT(value, 3)
    if (isNaN(spO2) || spO2 < 50 || spO2 > 100) return null
    return Math.round(spO2)
  } catch {
    return null
  }
}

// ── Plugin loader ─────────────────────────────────────────────────────────────

type BleClientType = typeof import('@capacitor-community/bluetooth-le').BleClient

let _client: BleClientType | null = null
let _initialized = false

async function getBleClient(): Promise<BleClientType | null> {
  if (_client) return _client
  try {
    const mod = await import('@capacitor-community/bluetooth-le')
    _client = mod.BleClient
    return _client
  } catch {
    return null
  }
}

// ── Service class ─────────────────────────────────────────────────────────────

type ReadingCallback = (reading: Partial<SensorReading>) => void
type StatusCallback  = (status: BleStatus) => void

export type BleStatus =
  | 'idle'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'unavailable'

export class BleWearableService {
  private deviceId: string | null = null
  private status: BleStatus = 'idle'
  private latestHr: number | null = null
  private latestSpO2: number | null = null
  private scanTimer: ReturnType<typeof setTimeout> | null = null

  private readingListeners: Set<ReadingCallback> = new Set()
  private statusListeners: Set<StatusCallback>  = new Set()

  // ── Public API ──────────────────────────────────────────────────────────────

  getStatus(): BleStatus { return this.status }

  onReading(cb: ReadingCallback): () => void {
    this.readingListeners.add(cb)
    return () => this.readingListeners.delete(cb)
  }

  onStatus(cb: StatusCallback): () => void {
    this.statusListeners.add(cb)
    return () => this.statusListeners.delete(cb)
  }

  /** Escanea y conecta al primer wearable BLE con Heart Rate Profile */
  async scanAndConnect(): Promise<boolean> {
    const client = await getBleClient()
    if (!client) {
      this._setStatus('unavailable')
      return false
    }

    try {
      if (!_initialized) {
        await client.initialize()
        _initialized = true
      }
    } catch {
      this._setStatus('unavailable')
      return false
    }

    this._setStatus('scanning')

    return new Promise<boolean>((resolve) => {
      // Timeout de escaneo
      this.scanTimer = setTimeout(async () => {
        try { await client.stopLEScan() } catch { /* ignore */ }
        if (this.status === 'scanning') {
          this._setStatus('error')
          resolve(false)
        }
      }, SCAN_TIMEOUT_MS)

      client.requestLEScan(
        { services: [HR_SERVICE, SPO2_SERVICE], allowDuplicates: false },
        async (result) => {
          // Primer dispositivo encontrado → conectar
          if (this.status !== 'scanning') return
          this._setStatus('connecting')

          // Detener escaneo
          if (this.scanTimer) { clearTimeout(this.scanTimer); this.scanTimer = null }
          try { await client.stopLEScan() } catch { /* ignore */ }

          const connected = await this._connectDevice(client, result.device.deviceId)
          resolve(connected)
        }
      ).catch(() => {
        if (this.scanTimer) { clearTimeout(this.scanTimer); this.scanTimer = null }
        this._setStatus('error')
        resolve(false)
      })
    })
  }

  /** Desconecta del wearable actual */
  async disconnect(): Promise<void> {
    if (this.scanTimer) { clearTimeout(this.scanTimer); this.scanTimer = null }
    const client = await getBleClient()
    if (!client || !this.deviceId) {
      this._setStatus('idle')
      return
    }
    try {
      await client.stopNotifications(this.deviceId, HR_SERVICE,   HR_CHAR)
    } catch { /* ignore */ }
    try {
      await client.stopNotifications(this.deviceId, SPO2_SERVICE, SPO2_CHAR)
    } catch { /* ignore */ }
    try {
      await client.disconnect(this.deviceId)
    } catch { /* ignore */ }
    this.deviceId = null
    this._setStatus('idle')
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private async _connectDevice(client: BleClientType, deviceId: string): Promise<boolean> {
    try {
      await client.connect(deviceId, () => {
        // onDisconnect: el dispositivo se desconectó inesperadamente
        this.deviceId = null
        this._setStatus('error')
      })

      this.deviceId = deviceId

      // Suscribir a Heart Rate notifications
      try {
        await client.startNotifications(deviceId, HR_SERVICE, HR_CHAR, (value) => {
          const hr = parseHeartRate(value)
          if (hr !== null) {
            this.latestHr = hr
            this._emitReading()
          }
        })
      } catch { /* dispositivo puede no tener HR */ }

      // Suscribir a SpO2 notifications
      try {
        await client.startNotifications(deviceId, SPO2_SERVICE, SPO2_CHAR, (value) => {
          const spO2 = parseSpO2(value)
          if (spO2 !== null) {
            this.latestSpO2 = spO2
            this._emitReading()
          }
        })
      } catch { /* dispositivo puede no tener SpO2 */ }

      this._setStatus('connected')
      return true
    } catch {
      this._setStatus('error')
      return false
    }
  }

  private _emitReading(): void {
    if (this.latestHr === null && this.latestSpO2 === null) return
    const reading: Partial<SensorReading> = {
      heartRate: this.latestHr ?? undefined,
      spO2: this.latestSpO2 ?? undefined,
      lastSync: new Date().toISOString(),
      provider: 'BLE Wearable',
    }
    this.readingListeners.forEach(cb => cb(reading))
  }

  private _setStatus(status: BleStatus): void {
    this.status = status
    this.statusListeners.forEach(cb => cb(status))
  }
}

export const bleWearable = new BleWearableService()
