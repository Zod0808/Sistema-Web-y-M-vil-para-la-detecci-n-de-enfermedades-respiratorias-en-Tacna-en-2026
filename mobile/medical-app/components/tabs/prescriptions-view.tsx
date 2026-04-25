"use client"

import { useState, useEffect } from "react"
import { FileText, Clock, CheckCircle2, XCircle, Pill, ChevronRight, RefreshCw, ArrowLeft } from "lucide-react"
import { ModernButton } from "@/components/ui/ModernButton"
import { ModernCard } from "@/components/ui/ModernCard"
import type { Translation } from "@/lib/translations"
import { useAppStore } from "@/store/useAppStore"
import { prescriptionService, type Prescription } from "@/lib/api/services/prescriptionService"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import type { ViewState } from "@/lib/translations"

interface PrescriptionsViewProps {
  t: Translation
  setCurrentView?: (view: ViewState) => void
}

const STATUS_CONFIG: Record<Prescription['status'], { label: string; color: string; icon: React.ReactNode }> = {
  draft:              { label: 'Borrador',          color: 'bg-gray-100 text-gray-600',   icon: <FileText className="w-3 h-3" /> },
  pending_validation: { label: 'Pendiente',          color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-3 h-3" /> },
  active:             { label: 'Activa',             color: 'bg-green-100 text-green-700',  icon: <CheckCircle2 className="w-3 h-3" /> },
  completed:          { label: 'Completada',         color: 'bg-blue-100 text-blue-700',   icon: <CheckCircle2 className="w-3 h-3" /> },
  cancelled:          { label: 'Cancelada',          color: 'bg-red-100 text-red-600',     icon: <XCircle className="w-3 h-3" /> },
  rejected:           { label: 'Rechazada',          color: 'bg-red-100 text-red-600',     icon: <XCircle className="w-3 h-3" /> },
}

export function PrescriptionsView({ setCurrentView }: PrescriptionsViewProps) {
  const user = useAppStore(s => s.user)
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selected, setSelected] = useState<Prescription | null>(null)

  useEffect(() => { loadPrescriptions() }, [user])

  const loadPrescriptions = async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const data = await prescriptionService.getMyPrescriptions()
      setPrescriptions(data)
    } catch (err: any) {
      if (err?.status !== 401) toast.error("Error al cargar prescripciones")
    } finally {
      setIsLoading(false)
    }
  }

  if (selected) {
    return <PrescriptionDetail prescription={selected} onBack={() => setSelected(null)} />
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {setCurrentView && (
            <button onClick={() => setCurrentView('dashboard')} className="p-1 rounded-full hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
          <div>
            <h2 className="text-xl font-bold dark:text-white">Mis Prescripciones</h2>
            <p className="text-sm text-muted-foreground">{prescriptions.length} prescripciones encontradas</p>
          </div>
        </div>
        <ModernButton size="sm" variant="ghost" onClick={loadPrescriptions} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </ModernButton>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : prescriptions.length === 0 ? (
        <ModernCard className="p-8 text-center">
          <Pill className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold dark:text-white">Sin prescripciones</p>
          <p className="text-sm text-muted-foreground mt-1">No tienes prescripciones médicas registradas.</p>
        </ModernCard>
      ) : (
        <div className="space-y-3">
          {prescriptions.map(rx => {
            const cfg = STATUS_CONFIG[rx.status]
            return (
              <ModernCard
                key={rx._id}
                className="p-4 cursor-pointer hover:bg-accent/5 transition-colors"
                onClick={() => setSelected(rx)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                        {cfg.icon}{cfg.label}
                      </span>
                    </div>
                    {rx.diagnosis && (
                      <p className="font-semibold text-sm dark:text-white truncate">{rx.diagnosis}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {rx.medications.length} medicamento{rx.medications.length !== 1 ? 's' : ''} · {format(new Date(rx.createdAt), "d MMM yyyy", { locale: es })}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {rx.medications.slice(0, 3).map((m, i) => (
                        <span key={i} className="inline-block px-2 py-0.5 bg-secondary rounded text-xs dark:text-white">{m.name}</span>
                      ))}
                      {rx.medications.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{rx.medications.length - 3} más</span>
                      )}
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

function PrescriptionDetail({ prescription: rx, onBack }: { prescription: Prescription; onBack: () => void }) {
  const cfg = STATUS_CONFIG[rx.status]
  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center gap-3">
        <ModernButton size="sm" variant="ghost" onClick={onBack}>← Volver</ModernButton>
        <h2 className="text-lg font-bold dark:text-white">Detalle de Prescripción</h2>
      </div>

      <ModernCard className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
            {cfg.icon}{cfg.label}
          </span>
          <span className="text-xs text-muted-foreground">{format(new Date(rx.createdAt), "PPP", { locale: es })}</span>
        </div>
        {rx.diagnosis && <p className="font-semibold dark:text-white">{rx.diagnosis}</p>}
        {rx.observations && <p className="text-sm text-muted-foreground">{rx.observations}</p>}
      </ModernCard>

      <div className="space-y-3">
        <h3 className="font-semibold dark:text-white flex items-center gap-2">
          <Pill className="w-4 h-4" />Medicamentos ({rx.medications.length})
        </h3>
        {rx.medications.map((m, i) => (
          <ModernCard key={i} className="p-4 space-y-2">
            <div className="flex items-start justify-between">
              <p className="font-semibold dark:text-white">{m.name}</p>
              <span className="text-sm text-muted-foreground">{m.dosage}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <span>Frecuencia: {m.frequencyPerDay}x/día</span>
              <span>Duración: {m.durationDays} días</span>
            </div>
            {m.instructions && <p className="text-xs text-muted-foreground border-t pt-2">{m.instructions}</p>}
            {m.reminderTimes && m.reminderTimes.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                <Clock className="w-3 h-3 text-muted-foreground" />
                {m.reminderTimes.map((t, j) => (
                  <span key={j} className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-xs">{t}</span>
                ))}
              </div>
            )}
          </ModernCard>
        ))}
      </div>
    </div>
  )
}