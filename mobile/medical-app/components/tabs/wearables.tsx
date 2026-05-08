"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  HeartPulse, Activity, Moon, RefreshCw, Zap, Bed, AlertTriangle,
  Play, Pause, Watch, Smartphone, Database, CheckCircle2, Wifi, WifiOff,
  Bluetooth, BluetoothConnected, BluetoothOff, BluetoothSearching,
} from "lucide-react"
import { ModernButton } from "@/components/ui/ModernButton"
import { ModernCard } from "@/components/ui/ModernCard"
import type { Translation } from "@/lib/translations"
import { wearableService, type WearableHistoryEntry } from "@/lib/api/services/wearableService"
import { useAppStore } from "@/store/useAppStore"
import { toast } from "sonner"
import { emulatorSensors, type Scenario } from "@/lib/services/emulatorSensors"
import { wearableWs, type WsAlert } from "@/lib/services/wearableWebSocket"
import { useVitalsSource } from "@/lib/services/useVitalsSource"

interface WearablesViewProps {
  t: Translation
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

const SCENARIOS: { id: Scenario; label: string; icon: React.ReactNode; color: string; desc: string }[] = [
  { id: 'rest',       label: 'Reposo',    icon: <Bed className="w-4 h-4" />,           color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',         desc: '62 BPM · SpO2 98%' },
  { id: 'active',     label: 'Activo',    icon: <Activity className="w-4 h-4" />,       color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',     desc: '88 BPM · SpO2 97%' },
  { id: 'exercise',   label: 'Ejercicio', icon: <Zap className="w-4 h-4" />,            color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', desc: '145 BPM · SpO2 96%' },
  { id: 'alert_spo2', label: 'Alerta',    icon: <AlertTriangle className="w-4 h-4" />,  color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',             desc: '105 BPM · SpO2 88%' },
]

export function WearablesView({ t, isLoading, setIsLoading }: WearablesViewProps) {
  const user = useAppStore((state) => state.user)

  // ── Fuente de vitales A+B+C ───────────────────────────────────────────────
  const {
    metrics,
    source,
    bleStatus,
    isLive,
    hcAvailable,
    startLive,
    stopLive,
    connectBle,
    disconnectBle,
    applyScenario: applyVitalsScenario,
  } = useVitalsSource()

  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true)
  const [activeScenario, setActiveScenario] = useState<Scenario>('active')
  const [wsStatus, setWsStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected')
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [history, setHistory] = useState<WearableHistoryEntry[]>([])
  const [dbCount, setDbCount] = useState<number>(0)
  const [activeAlerts, setActiveAlerts] = useState<WsAlert[]>([])

  // ── WebSocket setup ───────────────────────────────────────────────────────
  useEffect(() => {
    const unsubStatus = wearableWs.onStatus(setWsStatus)
    const unsubAlert = wearableWs.onAlert((alert) => {
      setActiveAlerts((prev) => [alert, ...prev].slice(0, 5))
      const toastFn = alert.level === 'critical' ? toast.error : toast.warning
      toastFn(`${alert.title}: ${alert.message}`, { duration: alert.level === 'critical' ? 8000 : 5000 })
    })

    wearableWs.connect()

    return () => {
      unsubStatus()
      unsubAlert()
      wearableWs.disconnect()
    }
  }, [])

  // ── Load initial data ─────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    const entries = await wearableService.getHistory(5)
    setHistory(entries)
  }, [])

  const loadMetrics = useCallback(async () => {
    if (!user) return
    setIsLoadingMetrics(true)
    try {
      const data = await wearableService.getMetrics()
      const base = data.heartRate
        ? { heartRate: data.heartRate, steps: data.steps ?? 4000, spO2: data.spO2 ?? 97 }
        : { heartRate: 78, steps: 4000, spO2: 97 }
      emulatorSensors.init(base)
      setDbCount(data.dataPoints ?? 0)
    } catch {
      emulatorSensors.init({ heartRate: 78, steps: 4000, spO2: 97 })
    } finally {
      setIsLoadingMetrics(false)
    }
    loadHistory()
  }, [user, loadHistory])

  useEffect(() => { loadMetrics() }, [loadMetrics])

  const handleScenario = (id: Scenario) => {
    setActiveScenario(id)
    applyVitalsScenario(id)
  }

  const toggleLive = () => isLive ? stopLive() : startLive()

  // ── BLE helpers ───────────────────────────────────────────────────────────
  const handleConnectBle = async () => {
    toast.info('Buscando wearable BLE...')
    const ok = await connectBle()
    if (ok === false) toast.error('No se encontró ningún wearable BLE')
    else if (bleStatus === 'connected') toast.success('Wearable BLE conectado')
  }

  const handleDisconnectBle = async () => {
    await disconnectBle()
    toast.info('Wearable BLE desconectado')
  }

  // ── Sincronización manual (fallback HTTP) ─────────────────────────────────
  const handleSync = async () => {
    setIsLoading(true)
    setSyncStatus('idle')
    try {
      const r = emulatorSensors.current ?? emulatorSensors.applyScenario(activeScenario)
      const payload = {
        heartRate: metrics.heartRate ?? r.heartRate,
        spO2:      metrics.spO2      ?? r.spO2,
        steps:     metrics.steps     ?? r.steps,
        lastSync:  new Date().toISOString(),
      }
      await wearableService.syncMetrics(payload)
      setSyncStatus('success')
      setDbCount(c => c + 1)
      loadHistory()
      toast.success("Guardado en BD · " + new Date().toLocaleTimeString('es-ES'))
      setTimeout(() => setSyncStatus('idle'), 3000)
    } catch {
      setSyncStatus('error')
      toast.error("Error al sincronizar con el backend")
      setTimeout(() => setSyncStatus('idle'), 3000)
    } finally {
      setIsLoading(false)
    }
  }

  // ── Colors ────────────────────────────────────────────────────────────────
  const hrColor =
    (metrics.heartRate ?? 0) > 130 ? 'text-red-500' :
    (metrics.heartRate ?? 0) > 100 ? 'text-orange-500' :
    'text-destructive'

  const spo2Color =
    (metrics.spO2 ?? 100) < 90 ? 'text-red-500' :
    (metrics.spO2 ?? 100) < 94 ? 'text-orange-500' :
    'text-blue-500'

  const watchHrColor =
    (metrics.heartRate ?? 0) > 130 ? 'text-red-400' :
    (metrics.heartRate ?? 0) > 100 ? 'text-orange-400' :
    'text-green-400'

  const watchSpo2Color =
    (metrics.spO2 ?? 100) < 90 ? 'text-red-400' :
    (metrics.spO2 ?? 100) < 94 ? 'text-orange-400' :
    'text-blue-300'

  const wsConnected = wsStatus === 'connected'

  return (
    <div className="p-6 space-y-5 pb-32 animate-in slide-in-from-bottom-8 duration-500">

      {/* ── Header ── */}
      <div className="flex items-center justify-between pt-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Watch className="w-6 h-6 text-primary" />
            {t.wearables?.title ?? 'Wearables'}
          </h2>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <p className="text-xs font-medium text-muted-foreground">
              {isLive
                ? source === 'ble'          ? 'En vivo · BLE Wearable'
                : source === 'healthconnect' ? 'En vivo · Health Connect'
                :                             'En vivo · Emulador'
                : 'Pausado'}
            </p>
            {/* Indicador fuente A+B+C */}
            <span className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
              source === 'ble'           ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : source === 'healthconnect' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
              :                             'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
            }`}>
              {source === 'ble' ? <BluetoothConnected className="w-2.5 h-2.5" /> : <Watch className="w-2.5 h-2.5" />}
              {source === 'ble' ? 'BLE' : source === 'healthconnect' ? 'HC' : 'EMU'}
            </span>
            {/* Indicador WebSocket */}
            <span className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
              wsConnected
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
            }`}>
              {wsConnected ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
              {wsConnected ? 'WS' : 'WS off'}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <ModernButton size="sm" variant="outline" className="rounded-full h-8 text-xs" onClick={loadMetrics} disabled={isLoadingMetrics}>
            {isLoadingMetrics ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Actualizar'}
          </ModernButton>
          <ModernButton size="sm" variant={isLive ? "destructive" : "primary"} className="rounded-full h-8 text-xs gap-1" onClick={toggleLive}>
            {isLive ? <><Pause className="w-3 h-3" /> Pausar</> : <><Play className="w-3 h-3" /> En vivo</>}
          </ModernButton>
        </div>
      </div>

      {/* ── Alertas activas ── */}
      {activeAlerts.length > 0 && (
        <div className="space-y-2">
          {activeAlerts.map((alert, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${
                alert.level === 'critical'
                  ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300'
                  : 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-950/30 dark:border-orange-800 dark:text-orange-300'
              }`}
            >
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold leading-tight">{alert.title}</p>
                <p className="text-[11px] mt-0.5 opacity-80">{alert.message}</p>
              </div>
              <button
                className="ml-auto text-xs opacity-60 hover:opacity-100"
                onClick={() => setActiveAlerts(prev => prev.filter((_, j) => j !== i))}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Emulador Wear OS — flujo de datos ── */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-blue-950 p-4 shadow-xl">
        <div className="flex items-center gap-4">

          {/* Watch face circular */}
          <div className="relative w-[76px] h-[76px] rounded-full border-[3px] border-blue-400/40 bg-slate-950 flex flex-col items-center justify-center shadow-inner flex-shrink-0">
            <HeartPulse className={`w-4 h-4 ${watchHrColor} ${isLive ? 'animate-pulse' : ''}`} />
            <span className={`text-xl font-bold leading-none mt-0.5 ${watchHrColor}`}>
              {isLoadingMetrics ? '--' : metrics.heartRate ?? '--'}
            </span>
            <span className={`text-[9px] font-medium mt-0.5 ${watchSpo2Color}`}>
              {isLoadingMetrics ? '--%' : `${metrics.spO2 ?? '--'}%`}
            </span>
            {isLive && (
              <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            )}
          </div>

          {/* Flujo: Watch → Phone → WS → DB */}
          <div className="flex-1 flex items-center justify-between">
            <div className="flex flex-col items-center gap-1">
              {source === 'ble'
                ? <BluetoothConnected className="w-5 h-5 text-blue-300" />
                : <Watch className="w-5 h-5 text-blue-300" />}
              <span className="text-[9px] text-blue-300 font-medium text-center leading-tight">
                {source === 'ble' ? 'BLE\nGATT' : source === 'healthconnect' ? 'Health\nConnect' : 'Wear OS\nEmu'}
              </span>
            </div>

            <div className="flex items-center gap-0.5 flex-1 justify-center px-1">
              {[0, 150, 300].map(delay => (
                <span
                  key={delay}
                  className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-blue-400 animate-bounce' : 'bg-slate-600'}`}
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>

            <div className="flex flex-col items-center gap-1">
              <Smartphone className="w-5 h-5 text-slate-300" />
              <span className="text-[9px] text-slate-300 font-medium">App</span>
            </div>

            <div className="flex items-center gap-0.5 flex-1 justify-center px-1">
              {[0, 150, 300].map(delay => (
                <span
                  key={delay}
                  className={`w-1.5 h-1.5 rounded-full ${
                    wsConnected ? 'bg-green-400 animate-bounce' :
                    wsStatus === 'error' ? 'bg-red-400' : 'bg-slate-600'
                  }`}
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>

            <div className="flex flex-col items-center gap-1">
              <Database className={`w-5 h-5 ${wsConnected ? 'text-green-400' : 'text-slate-400'}`} />
              <span className={`text-[9px] font-medium ${wsConnected ? 'text-green-400' : 'text-slate-400'}`}>
                {wsConnected ? 'WS' : 'HTTP'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2">
          <span className="text-[10px] text-slate-400">Lecturas guardadas · paciente actual</span>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-green-400" />
            <span className="text-[11px] font-bold text-green-400">{dbCount} lecturas</span>
          </div>
        </div>
      </div>

      {/* ── Panel BLE (Opción A) ── */}
      <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {bleStatus === 'connected'  ? <BluetoothConnected className="w-4 h-4 text-blue-600 dark:text-blue-400" /> :
             bleStatus === 'scanning' || bleStatus === 'connecting'
                                        ? <BluetoothSearching className="w-4 h-4 text-blue-500 animate-pulse" /> :
             bleStatus === 'error'      ? <BluetoothOff className="w-4 h-4 text-red-500" /> :
                                          <Bluetooth className="w-4 h-4 text-blue-400" />}
            <span className="text-sm font-bold text-blue-800 dark:text-blue-200">
              BLE Wearable (Opción A)
            </span>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            bleStatus === 'connected'  ? 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-100' :
            bleStatus === 'scanning'   ? 'bg-yellow-100 text-yellow-700' :
            bleStatus === 'connecting' ? 'bg-orange-100 text-orange-700' :
            bleStatus === 'error'      ? 'bg-red-100 text-red-700' :
            bleStatus === 'unavailable'? 'bg-gray-100 text-gray-500' :
                                         'bg-gray-100 text-gray-500'
          }`}>
            {bleStatus === 'connected'   ? 'Conectado'  :
             bleStatus === 'scanning'    ? 'Buscando…'  :
             bleStatus === 'connecting'  ? 'Conectando…':
             bleStatus === 'error'       ? 'Error'       :
             bleStatus === 'unavailable' ? 'No disponible' : 'Desconectado'}
          </span>
        </div>

        <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
          Conexión directa GATT — Heart Rate (0x2A37) + SpO₂ (0x2A5F).
          {hcAvailable
            ? ' Health Connect activo como respaldo (Opción B).'
            : ' Emulador activo como respaldo (Opción C).'}
        </p>

        <div className="flex gap-2">
          {bleStatus === 'connected' ? (
            <ModernButton
              variant="outline"
              size="sm"
              className="flex-1 text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
              onClick={handleDisconnectBle}
            >
              <BluetoothOff className="w-3.5 h-3.5 mr-1" /> Desconectar BLE
            </ModernButton>
          ) : (
            <ModernButton
              variant="outline"
              size="sm"
              className="flex-1 text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
              disabled={bleStatus === 'scanning' || bleStatus === 'connecting' || bleStatus === 'unavailable'}
              onClick={handleConnectBle}
            >
              {bleStatus === 'scanning' || bleStatus === 'connecting'
                ? <><BluetoothSearching className="w-3.5 h-3.5 mr-1 animate-pulse" /> Buscando...</>
                : <><Bluetooth className="w-3.5 h-3.5 mr-1" /> Conectar wearable BLE</>}
            </ModernButton>
          )}
        </div>

        {source === 'ble' && (
          <div className="flex items-center gap-1.5 text-[10px] text-green-700 dark:text-green-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Fuente activa — datos BLE en tiempo real (~1-3 s)
          </div>
        )}
      </div>

      {/* ── Escenarios ── */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Escenario del sensor</p>
        <div className="grid grid-cols-2 gap-2">
          {SCENARIOS.map(s => (
            <button
              key={s.id}
              onClick={() => handleScenario(s.id)}
              className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left ${
                activeScenario === s.id ? `${s.color} border-current` : 'bg-muted/30 border-transparent hover:border-muted'
              }`}
            >
              <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${activeScenario === s.id ? '' : 'bg-muted'}`}>
                {s.icon}
              </span>
              <div>
                <p className="text-sm font-bold leading-tight">{s.label}</p>
                <p className="text-[10px] opacity-70 leading-tight">{s.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Anillo — Frecuencia Cardíaca ── */}
      <div className="flex justify-center py-2">
        <div className="w-56 h-56 relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-[14px] border-muted" />
          <div className={`absolute inset-0 rounded-full border-[14px] border-r-transparent transition-all duration-700 ${
            (metrics.heartRate ?? 0) > 130 ? 'border-red-500 rotate-[200deg]' :
            (metrics.heartRate ?? 0) > 100 ? 'border-orange-500 rotate-[150deg]' :
            'border-primary rotate-[90deg]'
          }`} />
          <div className="text-center z-10 bg-background/90 backdrop-blur-sm p-4 rounded-full shadow-sm">
            <HeartPulse className={`w-7 h-7 mx-auto mb-1 transition-colors ${hrColor} ${isLive && metrics.heartRate ? 'animate-pulse' : ''}`} />
            <span className={`text-4xl font-bold block leading-none transition-all ${hrColor}`}>
              {isLoadingMetrics ? '--' : metrics.heartRate ?? '--'}
            </span>
            <span className="text-xs text-muted-foreground font-medium">BPM</span>
          </div>
        </div>
      </div>

      {/* ── Cards SpO2 + Pasos ── */}
      <div className="grid grid-cols-2 gap-4">
        <ModernCard variant="glass" className="p-4 space-y-2">
          <div className={`flex items-center gap-2 transition-colors ${spo2Color}`}>
            <Activity className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">SpO2</span>
          </div>
          <p className={`text-3xl font-bold transition-all ${spo2Color}`}>
            {isLoadingMetrics ? '--' : metrics.spO2 ?? '--'}
            {metrics.spO2 != null && <span className="text-sm font-normal text-muted-foreground">%</span>}
          </p>
          {(metrics.spO2 ?? 100) < 90 && (
            <p className="text-[10px] text-red-500 font-bold animate-pulse">⚠ Nivel crítico</p>
          )}
          {(metrics.spO2 ?? 100) >= 90 && (metrics.spO2 ?? 100) < 94 && (
            <p className="text-[10px] text-orange-500 font-bold">Nivel bajo</p>
          )}
        </ModernCard>
        <ModernCard variant="glass" className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-purple-500">
            <Moon className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Pasos</span>
          </div>
          <p className="text-3xl font-bold">
            {isLoadingMetrics ? '--' : metrics.steps != null ? metrics.steps.toLocaleString() : '--'}
          </p>
          <p className="text-[10px] text-muted-foreground">hoy</p>
        </ModernCard>
      </div>

      {/* ── Historial de registros en BD ── */}
      {history.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Historial guardado en BD</p>
          <div className="space-y-1.5">
            {history.map((entry, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/30 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                  <span className="font-medium">
                    {entry.heartRate} BPM · {entry.oxygenSaturation}% SpO2 · {entry.steps?.toLocaleString()} pasos
                  </span>
                </div>
                <span className="text-muted-foreground shrink-0 ml-2">
                  {new Date(entry.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Proveedor activo ── */}
      {metrics.lastSync && (
        <p className="text-xs text-center text-muted-foreground">
          {metrics.provider ?? 'Sensor'} · {new Date(metrics.lastSync).toLocaleString('es-ES', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
          })}
        </p>
      )}

      {/* ── Botón sincronizar manual (fallback HTTP) ── */}
      <ModernButton
        className="w-full h-14 text-lg shadow-xl shadow-primary/10 rounded-2xl"
        onClick={handleSync}
        disabled={isLoading}
        variant={syncStatus === 'success' ? 'glass' : 'primary'}
      >
        {isLoading ? (
          <><RefreshCw className="w-5 h-5 mr-2 animate-spin" />Guardando en BD...</>
        ) : syncStatus === 'success' ? (
          <><CheckCircle2 className="w-5 h-5 mr-2 text-green-500" />Guardado en BD</>
        ) : (
          <><Database className="w-5 h-5 mr-2" />Sincronizar (HTTP)</>
        )}
      </ModernButton>
    </div>
  )
}
