"use client"

import { useState, useEffect } from "react"
import { FlaskConical, ChevronRight, RefreshCw, AlertTriangle, CheckCircle, ArrowLeft } from "lucide-react"
import { ModernButton } from "@/components/ui/ModernButton"
import { ModernCard } from "@/components/ui/ModernCard"
import type { ViewState } from "@/lib/translations"
import { useAppStore } from "@/store/useAppStore"
import { labService, type LabResult } from "@/lib/api/services/labService"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface LabResultsViewProps { setCurrentView?: (view: ViewState) => void }

const STATUS_CONFIG: Record<LabResult['status'], { label: string; color: string; icon: React.ReactNode }> = {
  normal:   { label: 'Normal',   color: 'bg-green-100 text-green-700',  icon: <CheckCircle className="w-3 h-3" /> },
  abnormal: { label: 'Anormal',  color: 'bg-red-100 text-red-600',      icon: <AlertTriangle className="w-3 h-3" /> },
}

export function LabResultsView({ setCurrentView }: LabResultsViewProps) {
  const user = useAppStore(s => s.user)
  const [results, setResults] = useState<LabResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selected, setSelected] = useState<LabResult | null>(null)
  const [filterStatus, setFilterStatus] = useState<LabResult['status'] | 'all'>('all')

  useEffect(() => { loadResults() }, [user])

  const loadResults = async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const data = await labService.getPatientResults(user._id)
      setResults(data)
    } catch (err: any) {
      if (err?.status !== 401) toast.error("Error al cargar resultados de laboratorio")
    } finally {
      setIsLoading(false)
    }
  }

  const filtered = filterStatus === 'all' ? results : results.filter(r => r.status === filterStatus)

  if (selected) {
    return <LabResultDetail result={selected} onBack={() => setSelected(null)} />
  }

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {setCurrentView && (
            <button onClick={() => setCurrentView('dashboard')} className="p-1 rounded-full hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
          <div>
            <h2 className="text-xl font-bold dark:text-white">Resultados de Laboratorio</h2>
            <p className="text-sm text-muted-foreground">{results.length} resultado{results.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <ModernButton size="sm" variant="ghost" onClick={loadResults} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </ModernButton>
      </div>

      {/* Filtro por estado */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['all', 'normal', 'abnormal'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filterStatus === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
            }`}
          >
            {s === 'all' ? 'Todos' : STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <ModernCard className="p-8 text-center">
          <FlaskConical className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold dark:text-white">Sin resultados</p>
          <p className="text-sm text-muted-foreground mt-1">No hay resultados de laboratorio disponibles.</p>
        </ModernCard>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const sc = STATUS_CONFIG[r.status]
            return (
              <ModernCard
                key={r._id}
                className={`p-4 cursor-pointer hover:bg-accent/5 transition-colors ${r.flagged ? 'border-l-4 border-l-red-400' : ''}`}
                onClick={() => setSelected(r)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>
                        {sc.icon}{sc.label}
                      </span>
                      {r.laboratoryName && (
                        <span className="text-xs text-muted-foreground truncate">{r.laboratoryName}</span>
                      )}
                    </div>
                    <p className="font-semibold text-sm dark:text-white">{r.testName}</p>
                    <p className="text-sm font-medium mt-0.5 dark:text-white">
                      {r.value} {r.unit}
                      {r.referenceRange?.text && (
                        <span className="text-xs text-muted-foreground ml-2">Ref: {r.referenceRange.text}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(r.date), "d MMM yyyy", { locale: es })}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                </div>
              </ModernCard>
            )
          })}
        </div>
      )}
    </div>
  )
}

function LabResultDetail({ result: r, onBack }: { result: LabResult; onBack: () => void }) {
  const sc = STATUS_CONFIG[r.status]
  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center gap-3">
        <ModernButton size="sm" variant="ghost" onClick={onBack}>← Volver</ModernButton>
        <h2 className="text-lg font-bold dark:text-white truncate">{r.testName}</h2>
      </div>

      <ModernCard className="p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${sc.color}`}>
            {sc.icon}{sc.label}
          </span>
          {r.flagged && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
              <AlertTriangle className="w-3 h-3" /> Requiere seguimiento
            </span>
          )}
        </div>

        {/* Valor principal */}
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">Resultado</p>
          <p className={`text-2xl font-bold ${r.status === 'abnormal' ? 'text-red-600' : 'text-green-600'}`}>
            {r.value} <span className="text-base font-normal text-muted-foreground">{r.unit}</span>
          </p>
          {r.referenceRange?.text && (
            <p className="text-xs text-muted-foreground mt-1">Rango normal: {r.referenceRange.text}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Fecha</p>
            <p className="dark:text-white">{format(new Date(r.date), "d MMM yyyy", { locale: es })}</p>
          </div>
          {r.laboratoryName && (
            <div>
              <p className="text-xs text-muted-foreground">Laboratorio</p>
              <p className="dark:text-white">{r.laboratoryName}</p>
            </div>
          )}
          {r.orderId && (
            <div>
              <p className="text-xs text-muted-foreground">Orden</p>
              <p className="dark:text-white">{r.orderId}</p>
            </div>
          )}
          {r.testCode && (
            <div>
              <p className="text-xs text-muted-foreground">Código</p>
              <p className="dark:text-white">{r.testCode}</p>
            </div>
          )}
        </div>

        {r.notes && (
          <div className="border-t pt-2">
            <p className="text-xs text-muted-foreground mb-1">Notas</p>
            <p className="text-sm dark:text-white">{r.notes}</p>
          </div>
        )}
      </ModernCard>
    </div>
  )
}
