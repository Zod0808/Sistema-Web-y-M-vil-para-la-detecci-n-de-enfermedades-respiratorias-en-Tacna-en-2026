"use client"

/**
 * useVitalsSource — Hook orquestador A + B + C
 *
 * Cadena de prioridad para obtener signos vitales en tiempo real:
 *
 *   A) BLE Wearable  →  conexión GATT directa, notificaciones ~1-3 s
 *   B) Health Connect →  polling Android health platform cada 5 s
 *   C) Emulador       →  datos sintéticos con escenarios clínicos (fallback)
 *
 * Reglas:
 *   - Si BLE se conecta, sus lecturas reemplazan a HC y al emulador.
 *   - Si BLE se desconecta, regresa automáticamente a HC (si disponible) o emulador.
 *   - HC puede estar activo en paralelo con BLE; si BLE entrega datos, HC se ignora.
 *   - El emulador siempre genera ticks (usado como fallback visual cuando A y B fallan).
 *
 * Expone:
 *   - metrics          lecturas actuales
 *   - source           fuente activa: 'ble' | 'healthconnect' | 'emulator'
 *   - bleStatus        estado BLE detallado
 *   - isLive           si el modo en vivo está activo
 *   - hcAvailable      si Health Connect está disponible en el dispositivo
 *   - startLive()      inicia todos los listeners
 *   - stopLive()       detiene todos los listeners
 *   - connectBle()     inicia escaneo BLE manualmente
 *   - disconnectBle()  desconecta BLE y vuelve al nivel inferior
 *   - applyScenario()  aplica un escenario al emulador (y lo activa)
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { emulatorSensors, type SensorReading, type Scenario } from './emulatorSensors'
import { healthConnect } from './healthConnectService'
import { bleWearable, type BleStatus } from './bleWearableService'
import { wearableWs } from './wearableWebSocket'

export type VitalsSource = 'ble' | 'healthconnect' | 'emulator'

export interface VitalsMetrics {
  heartRate: number | null
  spO2:      number | null
  steps:     number | null
  lastSync:  string | null
  provider:  string | null
}

const EMULATOR_TICK_MS = 3_000
const HC_POLL_MS       = 5_000

export function useVitalsSource() {
  const [metrics, setMetrics]       = useState<VitalsMetrics>({ heartRate: null, spO2: null, steps: null, lastSync: null, provider: null })
  const [source, setSource]         = useState<VitalsSource>('emulator')
  const [bleStatus, setBleStatus]   = useState<BleStatus>('idle')
  const [isLive, setIsLive]         = useState(false)
  const [hcAvailable, setHcAvailable] = useState(false)

  const tickRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const hcRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const bleActive = useRef(false)   // true cuando BLE está entregando datos

  // ── Detectar Health Connect al montar ──────────────────────────────────────
  useEffect(() => {
    healthConnect.isAvailable().then(setHcAvailable)
  }, [])

  // ── Listener de estado BLE ────────────────────────────────────────────────
  useEffect(() => {
    const unsub = bleWearable.onStatus((s) => {
      setBleStatus(s)
      if (s === 'connected') {
        bleActive.current = true
        setSource('ble')
      } else if (s === 'error' || s === 'idle') {
        bleActive.current = false
        // Regresar a la fuente inferior disponible
        setSource(hcAvailable ? 'healthconnect' : 'emulator')
      }
    })
    return unsub
  }, [hcAvailable])

  // ── Listener de lecturas BLE ──────────────────────────────────────────────
  useEffect(() => {
    const unsub = bleWearable.onReading((partial) => {
      if (!bleActive.current) return
      setMetrics(prev => ({
        heartRate: partial.heartRate ?? prev.heartRate,
        spO2:      partial.spO2      ?? prev.spO2,
        steps:     prev.steps,                         // BLE no reporta pasos
        lastSync:  partial.lastSync  ?? prev.lastSync,
        provider:  partial.provider  ?? prev.provider,
      }))
      // Enviar por WebSocket al backend → broadcast al doctor
      const reading: SensorReading = {
        heartRate: partial.heartRate ?? metrics.heartRate ?? 0,
        spO2:      partial.spO2      ?? metrics.spO2      ?? 0,
        steps:     metrics.steps     ?? 0,
        lastSync:  partial.lastSync  ?? new Date().toISOString(),
        provider:  'BLE Wearable',
      }
      wearableWs.sendReading(reading)
    })
    return unsub
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Iniciar modo en vivo ──────────────────────────────────────────────────
  const startLive = useCallback(() => {
    setIsLive(true)

    // Emulador tick (siempre corre como base; se ignora si BLE o HC aportan datos)
    if (tickRef.current) clearInterval(tickRef.current)
    tickRef.current = setInterval(() => {
      if (bleActive.current) return    // BLE tiene prioridad
      const r = emulatorSensors.tick()
      if (source === 'emulator' || !hcAvailable) {
        setSource('emulator')
        setMetrics({ heartRate: r.heartRate, spO2: r.spO2, steps: r.steps, lastSync: r.lastSync, provider: r.provider })
        wearableWs.sendReading(r)
      }
    }, EMULATOR_TICK_MS)

    // Health Connect polling (si disponible)
    if (hcAvailable) {
      if (hcRef.current) clearInterval(hcRef.current)
      hcRef.current = setInterval(async () => {
        if (bleActive.current) return   // BLE tiene prioridad
        const hcReading = await healthConnect.getLatestReading(1)
        if (hcReading) {
          setSource('healthconnect')
          setMetrics({ heartRate: hcReading.heartRate, spO2: hcReading.spO2, steps: hcReading.steps, lastSync: hcReading.lastSync, provider: hcReading.provider })
          wearableWs.sendReading(hcReading)
        }
      }, HC_POLL_MS)
    }
  }, [hcAvailable, source])

  // ── Detener modo en vivo ──────────────────────────────────────────────────
  const stopLive = useCallback(() => {
    setIsLive(false)
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
    if (hcRef.current)   { clearInterval(hcRef.current);   hcRef.current   = null }
  }, [])

  useEffect(() => () => { stopLive() }, [stopLive])

  // ── BLE: escanear y conectar ──────────────────────────────────────────────
  const connectBle = useCallback(async (): Promise<boolean> => {
    return bleWearable.scanAndConnect()
    // El listener de estado actualizará `source` y `bleStatus` automáticamente
  }, [])

  const disconnectBle = useCallback(async () => {
    await bleWearable.disconnect()
    bleActive.current = false
    setSource(hcAvailable ? 'healthconnect' : 'emulator')
  }, [hcAvailable])

  // ── Escenario emulador ────────────────────────────────────────────────────
  const applyScenario = useCallback((id: Scenario) => {
    const r = emulatorSensors.applyScenario(id)
    setMetrics({ heartRate: r.heartRate, spO2: r.spO2, steps: r.steps, lastSync: r.lastSync, provider: r.provider })
    wearableWs.sendReading(r)
    if (!isLive) startLive()
  }, [isLive, startLive])

  return {
    metrics,
    source,
    bleStatus,
    isLive,
    hcAvailable,
    startLive,
    stopLive,
    connectBle,
    disconnectBle,
    applyScenario,
  }
}
