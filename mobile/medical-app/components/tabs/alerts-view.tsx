"use client"

import { useState, useEffect } from "react"
import { 
  Plus, 
  Search, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  Filter,
  Eye,
  X
} from "lucide-react"
import { ModernButton } from "@/components/ui/ModernButton"
import { ModernCard } from "@/components/ui/ModernCard"
import type { Translation, ViewState } from "@/lib/translations"
import { alertService } from "@/lib/api/services"
import { acknowledgeAlertOffline } from "@/lib/services/offlineOperations"
import { useAppStore } from "@/store/useAppStore"
import { toast } from "sonner"
import { useNetworkStatus } from "@/hooks/useNetworkStatus"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { AlertDetail } from "@/components/views/alert-detail"
import type { Alert, AlertPriority, AlertCategory } from "@/lib/types"

interface AlertsViewProps {
  t: Translation
  setCurrentView?: (view: ViewState) => void
}

const SEVERITY_FILTERS = [
  { value: 'all', label: 'Todas', color: '' },
  { value: 'critical', label: 'Críticas', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  { value: 'high', label: 'Altas', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  { value: 'medium', label: 'Medias', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  { value: 'low', label: 'Bajas', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' }
]

const TYPE_FILTERS: { value: 'all' | AlertCategory; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'critical_symptom', label: 'Síntoma Crítico' },
  { value: 'medication_reminder', label: 'Medicación' },
  { value: 'follow_up', label: 'Seguimiento' },
  { value: 'doctor_notification', label: 'Notificación Médica' },
  { value: 'system', label: 'Sistema' }
]

export function AlertsView({ t, setCurrentView }: AlertsViewProps) {
  const user = useAppStore((state) => state.user)
  const { isOnline } = useNetworkStatus()
  const alerts = useAppStore((state) => state.alerts)
  const setAlerts = useAppStore((state) => state.setAlerts)
  const acknowledgeAlert = useAppStore((state) => state.acknowledgeAlert)
  
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null)
  const [severityFilter, setSeverityFilter] = useState<'all' | AlertPriority>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | AlertCategory>('all')
  const [showAcknowledged, setShowAcknowledged] = useState(false)

  useEffect(() => {
    loadAlerts()
  }, [user, severityFilter, typeFilter, showAcknowledged])

  const loadAlerts = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const alertsData = await alertService.list({
        priority: severityFilter !== 'all' ? severityFilter : undefined,
        category: typeFilter !== 'all' ? typeFilter : undefined,
        status: showAcknowledged ? undefined : 'pending',
        limit: 100
      })
      const items = Array.isArray(alertsData) ? alertsData : alertsData.data
      setAlerts(items)
    } catch (error: any) {
      console.error("Error al cargar alertas:", error)
      if (error.status !== 401) {
        toast.error("Error al cargar alertas")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleAcknowledge = async (alert: Alert) => {
    try {
      const result = await acknowledgeAlertOffline(alert._id, isOnline)
      
      if (result.isOffline) {
        // Actualizar localmente
        acknowledgeAlert(alert._id)
        setAlerts(alerts.map(a => 
          a._id === alert._id 
            ? { ...a, acknowledged: true, acknowledgedAt: new Date().toISOString() }
            : a
        ))
        toast.success("Alerta reconocida (se sincronizará cuando vuelva la conexión)")
      } else {
        // Sincronización exitosa
        const updated = await alertService.acknowledge(alert._id)
        setAlerts(alerts.map(a => a._id === alert._id ? updated : a))
        acknowledgeAlert(alert._id)
        toast.success("Alerta reconocida exitosamente")
      }
    } catch (error: any) {
      console.error("Error al reconocer alerta:", error)
      toast.error(error?.message || "Error al reconocer la alerta")
    }
  }

  const handleViewAlert = (alert: Alert) => {
    setSelectedAlertId(alert._id)
  }

  // Filtrar alertas según búsqueda
  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch = searchQuery === "" ||
      alert.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.message?.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesSearch
  })

  // Mostrar detalle
  if (selectedAlertId) {
    return (
      <AlertDetail
        t={t}
        alertId={selectedAlertId}
        onBack={() => setSelectedAlertId(null)}
        setCurrentView={setCurrentView}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Cargando alertas...</p>
        </div>
      </div>
    )
  }

  const unreadAlerts = filteredAlerts.filter(a => a.status !== 'acknowledged')
  const acknowledgedAlerts = filteredAlerts.filter(a => a.status === 'acknowledged')

  const getSeverityColor = (severity?: string) => {
    const sev = severity || 'medium'
    switch (sev) {
      case 'critical':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      case 'high':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'low':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  const getCategoryLabel = (category?: string) => {
    switch (category) {
      case 'critical_symptom':
        return 'Síntoma Crítico'
      case 'medication_reminder':
        return 'Medicación'
      case 'follow_up':
        return 'Seguimiento'
      case 'doctor_notification':
        return 'Notificación Médica'
      case 'system':
        return 'Sistema'
      default:
        return category || 'General'
    }
  }

  return (
    <div className="p-4 space-y-6 pb-24 animate-in slide-in-from-right duration-300">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Alertas</h2>
          {unreadAlerts.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {unreadAlerts.length} {unreadAlerts.length === 1 ? 'alerta pendiente' : 'alertas pendientes'}
            </p>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-muted-foreground shrink-0">Severidad:</span>
          {SEVERITY_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setSeverityFilter(filter.value as any)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                severityFilter === filter.value
                  ? filter.color || 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <span className="text-sm font-medium text-muted-foreground shrink-0">Tipo:</span>
          {TYPE_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setTypeFilter(filter.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                typeFilter === filter.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAcknowledged(!showAcknowledged)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              showAcknowledged
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {showAcknowledged ? 'Mostrar todas' : 'Solo pendientes'}
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-secondary/50 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 ring-primary/20"
          placeholder="Buscar alertas..."
        />
      </div>

      {/* Alertas no reconocidas */}
      {unreadAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Pendientes ({unreadAlerts.length})
          </h3>
          {unreadAlerts.map((alert) => {
            const severity = alert.priority ?? 'medium'
            const category = alert.category ?? 'system'
            const createdAt = new Date(alert.createdAt)
            
            return (
              <ModernCard
                key={alert._id}
                className="p-4 hover:bg-accent/5 transition-colors border-l-4 border-l-primary"
              >
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-bold text-base truncate dark:text-white">
                        {alert.title}
                      </h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${getSeverityColor(severity)}`}>
                        {severity === 'critical' ? 'Crítica' :
                         severity === 'high' ? 'Alta' :
                         severity === 'medium' ? 'Media' : 'Baja'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {alert.message}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="px-2 py-0.5 rounded bg-secondary">
                        {getCategoryLabel(category)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(createdAt, "PPP", { locale: es })}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={() => handleViewAlert(alert)}
                      className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                      title="Ver detalle"
                    >
                      <Eye className="w-4 h-4 text-primary" />
                    </button>
                    <button
                      onClick={() => handleAcknowledge(alert)}
                      className="p-2 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                      title="Reconocer"
                    >
                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </button>
                  </div>
                </div>
              </ModernCard>
            )
          })}
        </div>
      )}

      {/* Alertas reconocidas */}
      {showAcknowledged && acknowledgedAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Reconocidas ({acknowledgedAlerts.length})
          </h3>
          {acknowledgedAlerts.map((alert) => {
            const severity = alert.priority ?? 'medium'
            const category = alert.category ?? 'system'
            const createdAt = new Date(alert.createdAt)
            const acknowledgedAt = alert.acknowledgedAt ? new Date(alert.acknowledgedAt) : null
            
            return (
              <ModernCard
                key={alert._id}
                className="p-4 hover:bg-accent/5 transition-colors opacity-75"
              >
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-bold text-base truncate dark:text-white">
                        {alert.title}
                      </h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${getSeverityColor(severity)}`}>
                        {severity === 'critical' ? 'Crítica' :
                         severity === 'high' ? 'Alta' :
                         severity === 'medium' ? 'Media' : 'Baja'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {alert.message}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="px-2 py-0.5 rounded bg-secondary">
                        {getCategoryLabel(category)}
                      </span>
                      {acknowledgedAt && (
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="w-3 h-3" />
                          Reconocida {format(acknowledgedAt, "PPP", { locale: es })}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleViewAlert(alert)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors shrink-0"
                    title="Ver detalle"
                  >
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </ModernCard>
            )
          })}
        </div>
      )}

      {/* Sin alertas */}
      {filteredAlerts.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {searchQuery || severityFilter !== 'all' || typeFilter !== 'all'
              ? "No se encontraron alertas" 
              : "No hay alertas"}
          </p>
        </div>
      )}
    </div>
  )
}

