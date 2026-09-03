"use client"

import { useState } from "react"
import { AlertTriangle, Phone, MapPin, Loader2, CheckCircle2, Clock, RefreshCw, Navigation, Hospital } from "lucide-react"
import { ModernButton } from "@/components/ui/ModernButton"
import { ModernCard } from "@/components/ui/ModernCard"
import type { Translation } from "@/lib/translations"
import { useAppStore } from "@/store/useAppStore"
import { emergencyService, type Emergency, type CreateEmergencyRequest } from "@/lib/api/services/emergencyService"
import { healthCenterService, type HealthCenter } from "@/lib/api/services/healthCenterService"
import { useGeolocation } from "@/hooks/useGeolocation"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface EmergencyViewProps { t: Translation }

const EMERGENCY_TYPES: { value: Emergency['type']; label: string; icon: string }[] = [
  { value: 'respiratory_distress', label: 'Dificultad Respiratoria', icon: '🫁' },
  { value: 'chest_pain',           label: 'Dolor en el Pecho',       icon: '💔' },
  { value: 'unconscious',          label: 'Pérdida de Consciencia',  icon: '🧠' },
  { value: 'severe_allergic',      label: 'Reacción Alérgica Grave', icon: '⚠️' },
  { value: 'other',                label: 'Otra Emergencia',         icon: '🚨' },
]

const STATUS_CONFIG: Record<Emergency['status'], { label: string; color: string }> = {
  active:     { label: 'Activa',     color: 'bg-red-100 text-red-700' },
  responding: { label: 'Respondiendo', color: 'bg-orange-100 text-orange-700' },
  resolved:   { label: 'Resuelta',   color: 'bg-green-100 text-green-700' },
  cancelled:  { label: 'Cancelada',  color: 'bg-gray-100 text-gray-600' },
}

const HEALTH_CENTER_TYPE_LABELS: Record<HealthCenter['type'], string> = {
  hospital: 'Hospital',
  centro_salud: 'Centro de Salud',
  posta_medica: 'Posta Médica',
  clinica: 'Clínica',
}

export function EmergencyView({ t: _t }: EmergencyViewProps) {
  const user = useAppStore(s => s.user)
  const geolocation = useGeolocation()
  const [step, setStep] = useState<'main' | 'form' | 'history' | 'centers'>('main')
  const [selectedType, setSelectedType] = useState<Emergency['type'] | null>(null)
  const [description, setDescription] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState<{ latitude: number; longitude: number; address?: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [submitted, setSubmitted] = useState<Emergency | null>(null)
  const [history, setHistory] = useState<Emergency[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [nearbyCenters, setNearbyCenters] = useState<HealthCenter[]>([])
  const [isLoadingCenters, setIsLoadingCenters] = useState(false)

  const getLocation = async () => {
    setIsGettingLocation(true)
    const coords = await geolocation.getCurrentLocation()
    if (coords) {
      setLocation({ latitude: coords.latitude, longitude: coords.longitude })
      toast.success("Ubicación obtenida")
    } else {
      toast.error(geolocation.error || "No se pudo obtener la ubicación")
    }
    setIsGettingLocation(false)
  }

  const loadNearbyCenters = async () => {
    setIsLoadingCenters(true)
    try {
      const coords = await geolocation.getCurrentLocation()
      if (!coords) {
        toast.error(geolocation.error || "No se pudo obtener la ubicación")
        return
      }
      const centers = await healthCenterService.findNearby({
        latitude: coords.latitude,
        longitude: coords.longitude,
        maxDistanceKm: 15,
      })
      setNearbyCenters(centers)
      if (centers.length === 0) {
        toast.error("No se encontraron centros de salud cercanos")
      }
    } catch (err: any) {
      toast.error(err?.message || "Error al buscar centros de salud")
    } finally {
      setIsLoadingCenters(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedType) { toast.error("Selecciona el tipo de emergencia"); return }
    const descTrimmed = description.trim()
    if (!descTrimmed) { toast.error("Describe la situación"); return }
    if (descTrimmed.length < 10) { toast.error("La descripción debe tener al menos 10 caracteres"); return }
    if (descTrimmed.length > 1000) { toast.error("La descripción no puede exceder 1000 caracteres"); return }
    if (phone.trim() && !/^[\d\s+\-().]{7,20}$/.test(phone.trim())) {
      toast.error("Ingresa un número de teléfono válido"); return
    }

    setIsSubmitting(true)
    try {
      const payload: CreateEmergencyRequest = {
        patientId: user?._id,
        emergencyType: selectedType,
        severity: 'critical',
        description: description.trim(),
        contactPhone: phone.trim() || undefined,
        location: location ?? undefined,
      }
      const result = await emergencyService.create(payload)
      setSubmitted(result)
      toast.success("¡Emergencia reportada! El equipo médico fue notificado.")
    } catch (err: any) {
      toast.error(err?.message || "Error al reportar emergencia")
    } finally {
      setIsSubmitting(false)
    }
  }

  const loadHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const data = await emergencyService.list()
      setHistory(data)
    } catch { toast.error("Error al cargar historial") }
    finally { setIsLoadingHistory(false) }
  }

  // Step: submitted successfully
  if (submitted) {
    return (
      <div className="space-y-4 pb-6">
        <ModernCard className="p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold dark:text-white">Emergencia Reportada</h2>
            <p className="text-muted-foreground text-sm mt-1">ID: {submitted._id.slice(-8).toUpperCase()}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-sm text-red-700 dark:text-red-400">
            <p className="font-semibold mb-1">⚠️ Mientras esperas ayuda:</p>
            <ul className="text-left space-y-1 list-disc list-inside">
              <li>Mantén la calma y permanece en un lugar seguro</li>
              <li>No te muevas si hay riesgo de lesión</li>
              <li>Llama al 106 (SAMU) si necesitas ambulancia inmediata</li>
            </ul>
          </div>
          <div className="flex gap-3">
            <ModernButton variant="primary" className="flex-1" onClick={() => window.open('tel:106')}>
              <Phone className="w-4 h-4 mr-2" /> Llamar SAMU (106)
            </ModernButton>
            <ModernButton variant="ghost" className="flex-1" onClick={() => { setSubmitted(null); setStep('main'); setSelectedType(null); setDescription(''); }}>
              Nueva Emergencia
            </ModernButton>
          </div>
        </ModernCard>
      </div>
    )
  }

  // Step: form
  if (step === 'form') {
    return (
      <div className="space-y-4 pb-6">
        <div className="flex items-center gap-3">
          <ModernButton size="sm" variant="ghost" onClick={() => setStep('main')}>← Volver</ModernButton>
          <h2 className="text-lg font-bold dark:text-white">Reportar Emergencia</h2>
        </div>

        {/* Type selection */}
        <div>
          <p className="text-sm font-semibold dark:text-white mb-2">Tipo de emergencia *</p>
          <div className="grid grid-cols-1 gap-2">
            {EMERGENCY_TYPES.map(et => (
              <button
                key={et.value}
                onClick={() => setSelectedType(et.value)}
                className={`p-3 rounded-lg border-2 text-left flex items-center gap-3 transition-colors ${
                  selectedType === et.value
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'border-border hover:border-red-300'
                }`}
              >
                <span className="text-2xl">{et.icon}</span>
                <span className="font-medium dark:text-white">{et.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-semibold dark:text-white block mb-1">Describe la situación *</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="¿Qué está pasando? ¿Desde cuándo? ¿Hay más personas involucradas?"
            rows={4}
            className="w-full p-3 rounded-lg border border-border bg-background dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="text-sm font-semibold dark:text-white block mb-1">Teléfono de contacto</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+51 999 999 999"
            className="w-full p-3 rounded-lg border border-border bg-background dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* Location */}
        <div className="flex items-center gap-3">
          <ModernButton variant="ghost" size="sm" onClick={getLocation} disabled={isGettingLocation}>
            {isGettingLocation ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <MapPin className="w-4 h-4 mr-1" />}
            {location ? 'Ubicación obtenida ✓' : 'Compartir ubicación'}
          </ModernButton>
          {location && <span className="text-xs text-green-600">📍 {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</span>}
        </div>

        <ModernButton
          variant="primary"
          className="w-full bg-red-600 hover:bg-red-700 text-white"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
          {isSubmitting ? 'Reportando...' : 'Reportar Emergencia'}
        </ModernButton>
      </div>
    )
  }

  // Step: nearby health centers
  if (step === 'centers') {
    return (
      <div className="space-y-4 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ModernButton size="sm" variant="ghost" onClick={() => setStep('main')}>← Volver</ModernButton>
            <h2 className="text-lg font-bold dark:text-white">Centros de Salud Cercanos</h2>
          </div>
          <ModernButton size="sm" variant="ghost" onClick={loadNearbyCenters} disabled={isLoadingCenters}>
            <RefreshCw className={`w-4 h-4 ${isLoadingCenters ? 'animate-spin' : ''}`} />
          </ModernButton>
        </div>
        {isLoadingCenters ? (
          <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-primary" /></div>
        ) : nearbyCenters.length === 0 ? (
          <ModernCard className="p-8 text-center">
            <Hospital className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Sin resultados. Presiona el ícono de recarga para buscar cerca de tu ubicación actual.</p>
          </ModernCard>
        ) : (
          <div className="space-y-3">
            {nearbyCenters.map(center => (
              <ModernCard key={center.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold dark:text-white">{HEALTH_CENTER_TYPE_LABELS[center.type]}</span>
                  <span className="text-xs font-medium text-primary">{center.distanceKm} km</span>
                </div>
                <p className="text-sm font-medium dark:text-white">{center.name}</p>
                <p className="text-sm text-muted-foreground">{center.address}, {center.district}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {center.hasEmergencyServices && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Emergencias</span>
                  )}
                  {center.hasRespiratoryCare && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Atención respiratoria</span>
                  )}
                </div>
                <div className="flex gap-2 pt-1">
                  <ModernButton
                    size="sm"
                    variant="ghost"
                    className="flex-1"
                    onClick={() => window.open(`https://maps.google.com/?q=${center.location.latitude},${center.location.longitude}`, '_blank')}
                  >
                    <Navigation className="w-4 h-4 mr-1" /> Cómo llegar
                  </ModernButton>
                  {center.phone && (
                    <ModernButton size="sm" variant="ghost" className="flex-1" onClick={() => window.open(`tel:${center.phone}`)}>
                      <Phone className="w-4 h-4 mr-1" /> Llamar
                    </ModernButton>
                  )}
                </div>
              </ModernCard>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Step: history
  if (step === 'history') {
    return (
      <div className="space-y-4 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ModernButton size="sm" variant="ghost" onClick={() => setStep('main')}>← Volver</ModernButton>
            <h2 className="text-lg font-bold dark:text-white">Historial de Emergencias</h2>
          </div>
          <ModernButton size="sm" variant="ghost" onClick={loadHistory} disabled={isLoadingHistory}>
            <RefreshCw className={`w-4 h-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
          </ModernButton>
        </div>
        {isLoadingHistory ? (
          <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-primary" /></div>
        ) : history.length === 0 ? (
          <ModernCard className="p-8 text-center">
            <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Sin emergencias registradas</p>
          </ModernCard>
        ) : (
          <div className="space-y-3">
            {history.map(em => {
              const sc = STATUS_CONFIG[em.status]
              const et = EMERGENCY_TYPES.find(t => t.value === em.type)
              return (
                <ModernCard key={em._id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold dark:text-white">{et?.icon} {et?.label}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{em.description}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(em.createdAt), "PPP 'a las' HH:mm", { locale: es })}</p>
                </ModernCard>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Main SOS screen
  return (
    <div className="space-y-4 pb-6">
      <div className="text-center">
        <h2 className="text-xl font-bold dark:text-white">Emergencia / SOS</h2>
        <p className="text-sm text-muted-foreground">Reporta una emergencia médica de inmediato</p>
      </div>

      {/* SOS Button */}
      <ModernCard className="p-6 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
        <div className="text-center space-y-4">
          <button
            onClick={() => setStep('form')}
            className="w-32 h-32 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-2xl shadow-lg shadow-red-500/40 transition-all mx-auto flex flex-col items-center justify-center"
          >
            <AlertTriangle className="w-10 h-10 mb-1" />
            SOS
          </button>
          <p className="text-sm text-red-700 dark:text-red-400 font-medium">Presiona para reportar una emergencia</p>
        </div>
      </ModernCard>

      {/* Quick numbers */}
      <div className="grid grid-cols-2 gap-3">
        <ModernButton variant="ghost" className="py-4" onClick={() => window.open('tel:106')}>
          <div className="text-center">
            <Phone className="w-5 h-5 mx-auto mb-1 text-red-500" />
            <p className="font-bold text-red-500">106</p>
            <p className="text-xs text-muted-foreground">SAMU</p>
          </div>
        </ModernButton>
        <ModernButton variant="ghost" className="py-4" onClick={() => window.open('tel:105')}>
          <div className="text-center">
            <Phone className="w-5 h-5 mx-auto mb-1 text-red-500" />
            <p className="font-bold text-red-500">105</p>
            <p className="text-xs text-muted-foreground">Bomberos</p>
          </div>
        </ModernButton>
      </div>

      {/* Tips */}
      <ModernCard className="p-4">
        <h3 className="font-semibold dark:text-white mb-2 text-sm">Signos de alerta respiratoria</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Dificultad severa para respirar</li>
          <li>• Labios o dedos azulados (cianosis)</li>
          <li>• Respiración muy rápida o muy lenta</li>
          <li>• Dolor intenso en el pecho</li>
          <li>• Pérdida de consciencia</li>
        </ul>
      </ModernCard>

      {/* Nearby health centers link */}
      <ModernButton variant="ghost" className="w-full" onClick={() => { loadNearbyCenters(); setStep('centers') }}>
        <MapPin className="w-4 h-4 mr-2" /> Centros de salud cercanos
      </ModernButton>

      {/* History link */}
      <ModernButton variant="ghost" className="w-full" onClick={() => { loadHistory(); setStep('history') }}>
        <Clock className="w-4 h-4 mr-2" /> Ver historial de emergencias
      </ModernButton>
    </div>
  )
}