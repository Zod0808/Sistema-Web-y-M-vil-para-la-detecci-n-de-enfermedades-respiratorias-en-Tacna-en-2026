"use client"

import { useState, useEffect } from "react"
import { Share2, CheckCircle2, XCircle, ChevronRight, RefreshCw, ArrowLeft } from "lucide-react"
import { ModernButton } from "@/components/ui/ModernButton"
import { ModernCard } from "@/components/ui/ModernCard"
import type { ViewState } from "@/lib/translations"
import { useAppStore } from "@/store/useAppStore"
import { referralService, type Referral } from "@/lib/api/services/referralService"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface ReferralsViewProps { setCurrentView?: (view: ViewState) => void }

const STATUS_CONFIG: Record<Referral['status'], { label: string; color: string }> = {
  pending:   { label: 'Pendiente',   color: 'bg-yellow-100 text-yellow-700' },
  accepted:  { label: 'Aceptado',    color: 'bg-green-100 text-green-700' },
  rejected:  { label: 'Rechazado',   color: 'bg-red-100 text-red-600' },
  completed: { label: 'Completado',  color: 'bg-blue-100 text-blue-700' },
  cancelled: { label: 'Cancelado',   color: 'bg-gray-100 text-gray-600' },
}

const URGENCY_CONFIG: Record<Referral['urgency'], { label: string; color: string }> = {
  routine:   { label: 'Rutinario',   color: 'bg-blue-50 text-blue-600' },
  urgent:    { label: 'Urgente',     color: 'bg-orange-100 text-orange-700' },
  emergency: { label: 'Emergencia',  color: 'bg-red-100 text-red-700' },
}

export function ReferralsView({ setCurrentView }: ReferralsViewProps) {
  const user = useAppStore(s => s.user)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selected, setSelected] = useState<Referral | null>(null)

  useEffect(() => { loadReferrals() }, [user])

  const loadReferrals = async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const data = await referralService.getMyReferrals()
      setReferrals(data)
    } catch (err: any) {
      if (err?.status !== 401) toast.error("Error al cargar referidos")
    } finally {
      setIsLoading(false)
    }
  }

  if (selected) {
    return <ReferralDetail referral={selected} onBack={() => setSelected(null)} onUpdate={loadReferrals} />
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
            <h2 className="text-xl font-bold dark:text-white">Referidos Médicos</h2>
            <p className="text-sm text-muted-foreground">{referrals.length} referidos</p>
          </div>
        </div>
        <ModernButton size="sm" variant="ghost" onClick={loadReferrals} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </ModernButton>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 animate-spin text-primary" /></div>
      ) : referrals.length === 0 ? (
        <ModernCard className="p-8 text-center">
          <Share2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold dark:text-white">Sin referidos</p>
          <p className="text-sm text-muted-foreground mt-1">No tienes referidos médicos registrados.</p>
        </ModernCard>
      ) : (
        <div className="space-y-3">
          {referrals.map(ref => {
            const sc = STATUS_CONFIG[ref.status]
            const uc = URGENCY_CONFIG[ref.urgency]
            return (
              <ModernCard key={ref._id} className="p-4 cursor-pointer hover:bg-accent/5 transition-colors" onClick={() => setSelected(ref)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${uc.color}`}>{uc.label}</span>
                    </div>
                    <p className="font-semibold text-sm dark:text-white">{ref.referredSpecialty}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ref.reason}</p>
                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(ref.createdAt), "d MMM yyyy", { locale: es })}</p>
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

function ReferralDetail({ referral: ref, onBack, onUpdate }: { referral: Referral; onBack: () => void; onUpdate: () => void }) {
  const user = useAppStore(s => s.user)
  const sc = STATUS_CONFIG[ref.status]
  const uc = URGENCY_CONFIG[ref.urgency]
  const isDoctor = user?.role === 'doctor'

  const handleAccept = async () => {
    try {
      await referralService.accept(ref._id)
      toast.success("Referido aceptado")
      onUpdate(); onBack()
    } catch { toast.error("Error al aceptar referido") }
  }

  const handleReject = async () => {
    try {
      await referralService.reject(ref._id, "Rechazado por el médico")
      toast.success("Referido rechazado")
      onUpdate(); onBack()
    } catch { toast.error("Error al rechazar referido") }
  }

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center gap-3">
        <ModernButton size="sm" variant="ghost" onClick={onBack}>← Volver</ModernButton>
        <h2 className="text-lg font-bold dark:text-white">Detalle de Referido</h2>
      </div>

      <ModernCard className="p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${uc.color}`}>{uc.label}</span>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Especialidad referida</p>
          <p className="font-semibold dark:text-white">{ref.referredSpecialty}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Motivo</p>
          <p className="text-sm dark:text-white">{ref.reason}</p>
        </div>
        {ref.diagnosis && (
          <div>
            <p className="text-xs text-muted-foreground">Diagnóstico</p>
            <p className="text-sm dark:text-white">{ref.diagnosis}</p>
          </div>
        )}
        {ref.notes && (
          <div>
            <p className="text-xs text-muted-foreground">Notas</p>
            <p className="text-sm dark:text-white">{ref.notes}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground border-t pt-2">
          <span>Creado: {format(new Date(ref.createdAt), "d MMM yyyy", { locale: es })}</span>
          {ref.scheduledAt && <span>Cita: {format(new Date(ref.scheduledAt), "d MMM yyyy", { locale: es })}</span>}
        </div>
      </ModernCard>

      {isDoctor && ref.status === 'pending' && (
        <div className="flex gap-3">
          <ModernButton variant="primary" className="flex-1" onClick={handleAccept}>
            <CheckCircle2 className="w-4 h-4 mr-2" /> Aceptar
          </ModernButton>
          <ModernButton variant="ghost" className="flex-1 text-red-600" onClick={handleReject}>
            <XCircle className="w-4 h-4 mr-2" /> Rechazar
          </ModernButton>
        </div>
      )}
    </div>
  )
}