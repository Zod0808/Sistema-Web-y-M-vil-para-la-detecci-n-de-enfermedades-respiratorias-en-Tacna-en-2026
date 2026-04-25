"use client"

import { useState, useEffect } from "react"
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Clock,
  Bell,
  X,
  Loader2,
  Calendar,
  User,
  FileText,
  Tag
} from "lucide-react"
import { ModernButton } from "@/components/ui/ModernButton"
import type { Translation, ViewState } from "@/lib/translations"
import { alertService } from "@/lib/api/services/alertService"
import { acknowledgeAlertOffline } from "@/lib/services/offlineOperations"
import { useAppStore } from "@/store/useAppStore"
import { toast } from "sonner"
import type { Alert } from "@/lib/types"
import { useNetworkStatus } from "@/hooks/useNetworkStatus"

interface AlertDetailProps {
  t: Translation
  alertId: string
  onBack?: () => void
  setCurrentView?: (view: ViewState) => void
}

export function AlertDetail({ 
  t, 
  alertId, 
  onBack,
  setCurrentView 
}: AlertDetailProps) {
  const user = useAppStore((state) => state.user)
  const { isOnline } = useNetworkStatus()
  const acknowledgeAlert = useAppStore((state) => state.acknowledgeAlert)
  
  const [alert, setAlert] = useState<Alert | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAcknowledging, setIsAcknowledging] = useState(false)

  useEffect(() => {
    loadAlert()
  }, [alertId])

  const loadAlert = async () => {
    setIsLoading(true)
    try {
      // Obtener la alerta desde la lista o hacer una búsqueda
      const alerts = await alertService.list({ limit: 100 })
      const foundAlert = Array.isArray(alerts.data) 
        ? alerts.data.find(a => a._id === alertId)
        : null
      
      if (foundAlert) {
        setAlert(foundAlert)
      } else {
        toast.error("Alerta no encontrada")
      }
    } catch (error: any) {
      console.error("Error al cargar alerta:", error)
      toast.error("Error al cargar los detalles de la alerta")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAcknowledge = async () => {
    if (!alert) return

    setIsAcknowledging(true)
    try {
      const result = await acknowledgeAlertOffline(alert._id, isOnline)
      
      if (result.isOffline) {
        // Actualizar localmente
        const updated = {
          ...alert,
          acknowledged: true,
          acknowledgedAt: new Date().toISOString(),
          status: 'acknowledged' as const
        }
        setAlert(updated)
        acknowledgeAlert(alert._id)
        toast.success("Alerta reconocida (se sincronizará cuando vuelva la conexión)")
      } else {
        // Sincronización exitosa
        const updated = await alertService.acknowledge(alert._id)
        setAlert(updated)
        acknowledgeAlert(alert._id)
        toast.success("Alerta reconocida exitosamente")
      }
    } catch (error: any) {
      console.error("Error al reconocer alerta:", error)
      toast.error(error?.message || "Error al reconocer la alerta")
    } finally {
      setIsAcknowledging(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Cargando detalles de la alerta...</p>
        </div>
      </div>
    )
  }

  if (!alert) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Alerta no encontrada</p>
          {onBack && (
            <ModernButton onClick={onBack} variant="outline">
              Volver
            </ModernButton>
          )}
        </div>
      </div>
    )
  }

  const severity = alert.priority ?? 'medium'
  const category = alert.category ?? 'system'
  const isAcknowledged = alert.status === 'acknowledged'
  const createdAt = new Date(alert.createdAt)
  const acknowledgedAt = alert.acknowledgedAt ? new Date(alert.acknowledgedAt) : null
  const scheduledAt = alert.scheduledAt ? new Date(alert.scheduledAt) : null

  // Colores según severidad
  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'critical':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
      case 'low':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  // Etiquetas de categoría
  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'critical_symptom':
        return 'Síntoma Crítico'
      case 'medication_reminder':
        return 'Recordatorio de Medicación'
      case 'follow_up':
        return 'Seguimiento'
      case 'doctor_notification':
        return 'Notificación Médica'
      case 'system':
        return 'Sistema'
      default:
        return cat
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-[#0f172a]">
      {/* Header */}
      <div className="sticky top-0 z-20 p-4 pb-2 bg-slate-50/50 dark:bg-[#0f172a] border-b border-border/50 dark:border-slate-700">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex-1">
            <h2 className="text-xl font-bold dark:text-white">Detalle de Alerta</h2>
            <p className="text-xs text-muted-foreground">
              {createdAt.toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(severity)}`}>
            {severity === 'critical' ? 'Crítica' :
             severity === 'high' ? 'Alta' :
             severity === 'medium' ? 'Media' :
             'Baja'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Estado de reconocimiento */}
        {isAcknowledged ? (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              <div className="flex-1">
                <h3 className="font-semibold text-green-700 dark:text-green-400">
                  Alerta Reconocida
                </h3>
                {acknowledgedAt && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Reconocida el {acknowledgedAt.toLocaleString('es-ES')}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className={`rounded-xl p-4 border-2 ${getSeverityColor(severity)}`}>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span className="font-bold">Alerta Pendiente</span>
            </div>
            <p className="text-sm mt-2 opacity-90">
              Esta alerta requiere tu atención
            </p>
          </div>
        )}

        {/* Información Principal */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-border/50 dark:border-slate-700 space-y-4">
          <div>
            <h3 className="font-bold text-lg dark:text-white mb-2">{alert.title}</h3>
            <p className="text-sm dark:text-white whitespace-pre-wrap leading-relaxed">
              {alert.message}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50 dark:border-slate-700">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Categoría</p>
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium dark:text-white">
                  {getCategoryLabel(category)}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Severidad</p>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(severity)}`}>
                {severity === 'critical' ? 'Crítica' :
                 severity === 'high' ? 'Alta' :
                 severity === 'medium' ? 'Media' : 'Baja'}
              </span>
            </div>
          </div>
        </div>

        {/* Información Temporal */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-border/50 dark:border-slate-700 space-y-3">
          <h3 className="font-semibold dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Información Temporal
          </h3>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Creada</span>
              <span className="text-sm font-medium dark:text-white">
                {createdAt.toLocaleString('es-ES')}
              </span>
            </div>
            
            {scheduledAt && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Programada para</span>
                <span className="text-sm font-medium dark:text-white">
                  {scheduledAt.toLocaleString('es-ES')}
                </span>
              </div>
            )}
            
            {alert.dispatchedAt && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Enviada</span>
                <span className="text-sm font-medium dark:text-white">
                  {new Date(alert.dispatchedAt).toLocaleString('es-ES')}
                </span>
              </div>
            )}
            
            {alert.expiresAt && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Expira</span>
                <span className="text-sm font-medium dark:text-white">
                  {new Date(alert.expiresAt).toLocaleString('es-ES')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Canales */}
        {alert.channels && alert.channels.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-border/50 dark:border-slate-700">
            <h3 className="font-semibold dark:text-white flex items-center gap-2 mb-3">
              <Bell className="w-4 h-4" />
              Canales de Notificación
            </h3>
            <div className="flex flex-wrap gap-2">
              {alert.channels.map((channel, index) => (
                <span
                  key={index}
                  className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                >
                  {channel}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {alert.tags && alert.tags.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-border/50 dark:border-slate-700">
            <h3 className="font-semibold dark:text-white flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4" />
              Etiquetas
            </h3>
            <div className="flex flex-wrap gap-2">
              {alert.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Metadata adicional */}
        {alert.metadata && Object.keys(alert.metadata).length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-border/50 dark:border-slate-700">
            <h3 className="font-semibold dark:text-white flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4" />
              Información Adicional
            </h3>
            <div className="space-y-2">
              {Object.entries(alert.metadata).map(([key, value]) => (
                <div key={key} className="flex items-start justify-between">
                  <span className="text-sm text-muted-foreground capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}:
                  </span>
                  <span className="text-sm font-medium dark:text-white text-right max-w-[60%]">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trigger info */}
        {alert.trigger && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-border/50 dark:border-slate-700">
            <h3 className="font-semibold dark:text-white flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4" />
              Origen
            </h3>
            <div className="space-y-2">
              {alert.trigger.source && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tipo</span>
                  <span className="text-sm font-medium dark:text-white">
                    {alert.trigger.source}
                  </span>
                </div>
              )}
              {alert.trigger.referenceId && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Referencia</span>
                  <span className="text-sm font-medium dark:text-white">
                    {alert.trigger.referenceId}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Acciones */}
      {!isAcknowledged && (
        <div className="p-4 bg-white dark:bg-[#1e293b] border-t border-border/50 dark:border-slate-700">
          <ModernButton
            onClick={handleAcknowledge}
            isLoading={isAcknowledging}
            disabled={isAcknowledging}
            className="w-full text-lg h-14"
          >
            {isAcknowledging ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Reconociendo...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Reconocer Alerta
              </>
            )}
          </ModernButton>
        </div>
      )}
    </div>
  )
}

