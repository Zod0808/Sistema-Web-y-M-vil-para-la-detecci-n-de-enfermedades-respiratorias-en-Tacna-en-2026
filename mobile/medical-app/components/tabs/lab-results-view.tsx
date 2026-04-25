"use client"

import { useState, useEffect } from "react"
import { FlaskConical, ChevronRight, RefreshCw, TrendingUp, TrendingDown, Minus, Clock, ArrowLeft } from "lucide-react"
import { ModernButton } from "@/components/ui/ModernButton"
import { ModernCard } from "@/components/ui/ModernCard"
import type { ViewState } from "@/lib/translations"
import { useAppStore } from "@/store/useAppStore"
import { labService, type LabResult } from "@/lib/api/services/labService"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface LabResultsViewProps { setCurrentView?: (view: ViewState) => void }

const STATUS_CONFIG: Record<LabResult['status'], { label: string; color: string }> = {
  ordered:    { label: 'Solicitado',    color: 'bg-gray-100 text-gray-600' },
  collected:  { label: 'Recolectado',  color: 'bg-blue-100 text-blue-600' },
  processing: { label: 'Procesando',   color: 'bg-yellow-100 text-yellow-700' },
  completed:  { label: 'Completado',   color: 'bg-green-100 text-green-700' },
  cancelled:  { label: 'Cancelado',    color: 'bg-red-100 text-red-600' },
}

const INTERP_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  normal: { color: 'text-green-600',  icon: <Minus className="w-3 h-3" /> },
  low:    { color: 'text-blue-600',   icon: <TrendingDown className="w-3 h-3" /> },
  high:   { color: 'text-orange-600', icon: <TrendingUp className="w-3 h-3" /> },
  critical:{ color: 'text-red-600',   icon: <TrendingUp className="w-3 h-3" /> },
}

const CATEGORY_LABELS: Record<LabResult['category'], string> = {
  hematology:   'Hematología',
  biochemistry: 'Bioquímica',
  microbiology: 'Microbiología',
  imaging:      'Imágenes',
  pulmonary:    'Función Pulmonar',
  other:        'Otros',
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

      {/* Status filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['all', 'ordered', 'processing', 'completed'] as const).map(s => (
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
            const hasAbnormal = r.results?.some(v => v.interpretation && v.interpretation !== 'normal')
            return (
              <ModernCard
                key={r._id}
                className={`p-4 cursor-pointer hover:bg-accent/5 transition-colors ${hasAbnormal ? 'border-l-4 border-l-orange-400' : ''}`}
                onClick={() => setSelected(r)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span>
                      <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[r.category]}</span>
                    </div>
                    <p className="font-semibold text-sm dark:text-white">{r.testName}</p>
                    {r.testCode && <p className="text-xs text-muted-foreground">Código: {r.testCode}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">{format(new Date(r.orderedAt), "d MMM yyyy", { locale: es })}</p>
                      {hasAbnormal && <span className="text-xs text-orange-600 font-medium">⚠ Valores anormales</span>}
                    </div>
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
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span>
          <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[r.category]}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Solicitado</p>
            <p className="dark:text-white">{format(new Date(r.orderedAt), "d MMM yyyy", { locale: es })}</p>
          </div>
          {r.completedAt && (
            <div>
              <p className="text-xs text-muted-foreground">Completado</p>
              <p className="dark:text-white">{format(new Date(r.completedAt), "d MMM yyyy", { locale: es })}</p>
            </div>
          )}
        </div>
        {r.notes && <p className="text-sm text-muted-foreground border-t pt-2">{r.notes}</p>}
      </ModernCard>

      {r.results && r.results.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold dark:text-white flex items-center gap-2">
            <FlaskConical className="w-4 h-4" /> Valores ({r.results.length})
          </h3>
          {r.results.map((v, i) => {
            const interp = v.interpretation ? INTERP_CONFIG[v.interpretation] : null
            return (
              <ModernCard key={i} className={`p-3 ${v.interpretation && v.interpretation !== 'normal' ? 'border-orange-200 dark:border-orange-800' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{v.referenceRange && `Ref: ${v.referenceRange}`}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className={`font-bold ${interp?.color ?? 'dark:text-white'}`}>
                        {v.value} {v.unit}
                      </p>
                      {interp && <span className={`flex items-center gap-1 text-xs ${interp.color}`}>{interp.icon}</span>}
                    </div>
                  </div>
                  {v.interpretation && (
                    <span className={`text-xs font-medium capitalize ${interp?.color}`}>{v.interpretation}</span>
                  )}
                </div>
                {v.notes && <p className="text-xs text-muted-foreground mt-1">{v.notes}</p>}
              </ModernCard>
            )
          })}
        </div>
      )}

      {r.reportUrl && (
        <ModernButton variant="primary" className="w-full" onClick={() => window.open(r.reportUrl)}>
          Ver reporte completo en PDF
        </ModernButton>
      )}
    </div>
  )
}