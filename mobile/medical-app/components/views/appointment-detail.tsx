"use client"

import { useState, useEffect } from "react"
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Video,
  User,
  FileText,
  X,
  Edit,
  Trash2,
  Bell,
  AlertCircle,
  CheckCircle2,
  Loader2
} from "lucide-react"
import { ModernButton } from "@/components/ui/ModernButton"
import type { Translation, ViewState } from "@/lib/translations"
import { appointmentService } from "@/lib/api/services/appointmentService"
import { cancelAppointmentOffline, rescheduleAppointmentOffline } from "@/lib/services/offlineOperations"
import { useAppStore } from "@/store/useAppStore"
import { toast } from "sonner"
import type { Appointment } from "@/lib/types"
import { useNetworkStatus } from "@/hooks/useNetworkStatus"
import { AppointmentForm } from "@/components/forms/appointment-form"

interface AppointmentDetailProps {
  t: Translation
  appointmentId: string
  onBack?: () => void
  setCurrentView?: (view: ViewState) => void
}

export function AppointmentDetail({ 
  t, 
  appointmentId, 
  onBack,
  setCurrentView 
}: AppointmentDetailProps) {
  const user = useAppStore((state) => state.user)
  const { isOnline } = useNetworkStatus()
  const updateAppointment = useAppStore((state) => state.updateAppointment)
  
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showReschedule, setShowReschedule] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    loadAppointment()
  }, [appointmentId])

  const loadAppointment = async () => {
    setIsLoading(true)
    try {
      const data = await appointmentService.get(appointmentId)
      setAppointment(data)
    } catch (error: any) {
      console.error("Error al cargar cita:", error)
      toast.error("Error al cargar los detalles de la cita")
    } finally {
      setIsLoading(false)
    }
  }

  const handleReschedule = async (newDate: string, durationMinutes?: number) => {
    if (!appointment) return

    setIsProcessing(true)
    try {
      const result = await rescheduleAppointmentOffline(
        appointment._id,
        newDate,
        durationMinutes,
        isOnline
      )
      
      if (result.isOffline) {
        // Actualizar localmente
        const updated = {
          ...appointment,
          scheduledAt: newDate,
          durationMinutes: durationMinutes || appointment.durationMinutes,
          status: 'rescheduled' as const,
          updatedAt: new Date().toISOString()
        }
        setAppointment(updated)
        updateAppointment(appointment._id, updated)
        setShowReschedule(false)
        toast.success("Cita reprogramada (se sincronizará cuando vuelva la conexión)")
      } else {
        // Sincronización exitosa
        const updated = await appointmentService.get(appointment._id)
        setAppointment(updated)
        updateAppointment(appointment._id, updated)
        setShowReschedule(false)
        toast.success("Cita reprogramada exitosamente")
      }
    } catch (error: any) {
      console.error("Error al reprogramar:", error)
      toast.error(error?.message || "Error al reprogramar la cita")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancel = async (reason: string) => {
    if (!appointment) return

    setIsProcessing(true)
    try {
      const result = await cancelAppointmentOffline(appointment._id, reason, isOnline)
      
      if (result.isOffline) {
        // Actualizar localmente
        const updated = {
          ...appointment,
          status: 'cancelled' as const,
          cancellationReason: reason,
          updatedAt: new Date().toISOString()
        }
        setAppointment(updated)
        updateAppointment(appointment._id, updated)
        setShowCancel(false)
        toast.success("Cita cancelada (se sincronizará cuando vuelva la conexión)")
      } else {
        // Sincronización exitosa
        const updated = await appointmentService.get(appointment._id)
        setAppointment(updated)
        updateAppointment(appointment._id, updated)
        setShowCancel(false)
        toast.success("Cita cancelada exitosamente")
      }
    } catch (error: any) {
      console.error("Error al cancelar:", error)
      toast.error(error?.message || "Error al cancelar la cita")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleStartTelemedicine = async () => {
    if (!appointment) return

    try {
      // Importar servicio de telemedicina
      const { telemedicineService } = await import('@/lib/services/telemedicineService')
      const { useAppStore } = await import('@/store/useAppStore')
      const store = useAppStore.getState()
      const currentUser = store.user

      if (!currentUser) {
        toast.error("No se pudo identificar al usuario")
        return
      }

      // Si ya hay un enlace de reunión, usarlo directamente
      if (appointment.location?.meetingLink) {
        window.open(appointment.location.meetingLink, '_blank', 'noopener,noreferrer')
        toast.info("Abriendo sala de videollamada...")
        return
      }

      // Crear nueva llamada de telemedicina
      toast.loading("Iniciando consulta virtual...")
      
      const call = await telemedicineService.createCall({
        appointmentId: appointment._id,
        doctorId: appointment.doctorId || '',
        patientId: currentUser._id || '',
        provider: 'jitsi',
        waitingRoomEnabled: true,
        screenSharingEnabled: true,
        recordingEnabled: false, // Se puede habilitar desde la UI
      })

      if (!call) {
        toast.error("No se pudo crear la llamada de telemedicina")
        return
      }

      // Si la sala de espera está habilitada, entrar primero ahí
      if (call.waitingRoomEnabled) {
        const userRole = currentUser.role === 'doctor' ? 'doctor' : 'patient'
        const joined = await telemedicineService.joinWaitingRoom(call.id, {
          id: currentUser._id || '',
          name: currentUser.name || 'Usuario',
          role: userRole,
          isReady: false,
        })

        if (joined) {
          toast.success("Entraste a la sala de espera")
          // Mostrar modal de sala de espera (se implementará en el componente)
          // Por ahora, abrir directamente la videollamada
          await telemedicineService.joinCall(call, userRole)
        } else {
          toast.error("No se pudo entrar a la sala de espera")
        }
      } else {
        // Ir directamente a la videollamada
        const userRole = currentUser.role === 'doctor' ? 'doctor' : 'patient'
        await telemedicineService.joinCall(call, userRole)
        toast.success("Abriendo videollamada...")
      }
    } catch (error: any) {
      console.error('Error starting telemedicine:', error)
      toast.error(error?.message || "Error al iniciar la consulta virtual")
    }
  }

  if (showEdit && appointment) {
    return (
      <AppointmentForm
        t={t}
        appointmentToEdit={appointment}
        onSave={() => {
          setShowEdit(false)
          loadAppointment()
        }}
        onCancel={() => setShowEdit(false)}
        setCurrentView={setCurrentView}
      />
    )
  }

  if (showReschedule && appointment) {
    return (
      <RescheduleForm
        appointment={appointment}
        onReschedule={handleReschedule}
        onCancel={() => setShowReschedule(false)}
        isProcessing={isProcessing}
      />
    )
  }

  if (showCancel && appointment) {
    return (
      <CancelForm
        appointment={appointment}
        onCancel={handleCancel}
        onBack={() => setShowCancel(false)}
        isProcessing={isProcessing}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Cargando detalles de la cita...</p>
        </div>
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Cita no encontrada</p>
          {onBack && (
            <ModernButton onClick={onBack} variant="outline">
              Volver
            </ModernButton>
          )}
        </div>
      </div>
    )
  }

  const scheduledDate = new Date(appointment.scheduledAt)
  const isPast = scheduledDate < new Date()
  const isVirtual = appointment.location?.type === 'virtual'
  const canEdit = appointment.status === 'scheduled' && !isPast
  const canCancel = appointment.status === 'scheduled' && !isPast
  const canReschedule = appointment.status === 'scheduled' && !isPast

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
            <h2 className="text-xl font-bold dark:text-white">Detalle de Cita</h2>
            <p className="text-xs text-muted-foreground">
              {scheduledDate.toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            appointment.status === 'scheduled' 
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : appointment.status === 'completed'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : appointment.status === 'cancelled'
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
          }`}>
            {appointment.status === 'scheduled' ? 'Programada' :
             appointment.status === 'completed' ? 'Completada' :
             appointment.status === 'cancelled' ? 'Cancelada' :
             appointment.status === 'rescheduled' ? 'Reprogramada' : appointment.status}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Información Principal */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-border/50 dark:border-slate-700 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg dark:text-white">
                {appointment.reason || 'Consulta médica'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {scheduledDate.toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Hora</p>
                <p className="text-sm font-medium dark:text-white">
                  {scheduledDate.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Duración</p>
                <p className="text-sm font-medium dark:text-white">
                  {appointment.durationMinutes || 30} min
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Ubicación */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-border/50 dark:border-slate-700 space-y-3">
          <div className="flex items-center gap-2">
            {isVirtual ? (
              <Video className="w-5 h-5 text-primary" />
            ) : (
              <MapPin className="w-5 h-5 text-primary" />
            )}
            <h3 className="font-semibold dark:text-white">
              {isVirtual ? 'Consulta Virtual' : 'Consulta Presencial'}
            </h3>
          </div>
          {isVirtual && appointment.location?.meetingLink ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Enlace de videollamada:
              </p>
              <a
                href={appointment.location.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline break-all"
              >
                {appointment.location.meetingLink}
              </a>
            </div>
          ) : appointment.location?.address ? (
            <p className="text-sm dark:text-white">
              {appointment.location.address}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No especificada</p>
          )}
        </div>

        {/* Notas */}
        {appointment.notes && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-border/50 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-primary" />
              <h3 className="font-semibold dark:text-white">Notas</h3>
            </div>
            <p className="text-sm dark:text-white whitespace-pre-wrap">
              {appointment.notes}
            </p>
          </div>
        )}

        {/* Recordatorio */}
        {appointment.reminderMinutesBefore && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-border/50 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <h3 className="font-semibold dark:text-white">Recordatorio</h3>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Notificación {appointment.reminderMinutesBefore} minutos antes
            </p>
            {appointment.reminderSentAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Enviado: {new Date(appointment.reminderSentAt).toLocaleString('es-ES')}
              </p>
            )}
          </div>
        )}

        {/* Razón de Cancelación */}
        {appointment.cancellationReason && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
              <h3 className="font-semibold text-red-700 dark:text-red-400">
                Razón de Cancelación
              </h3>
            </div>
            <p className="text-sm text-red-600 dark:text-red-400">
              {appointment.cancellationReason}
            </p>
          </div>
        )}
      </div>

      {/* Acciones */}
      {canEdit && (
        <div className="p-4 bg-white dark:bg-[#1e293b] border-t border-border/50 dark:border-slate-700 space-y-2">
          {isVirtual && (
            <ModernButton
              onClick={handleStartTelemedicine}
              className="w-full bg-gradient-to-r from-primary to-blue-600"
            >
              <Video className="w-5 h-5 mr-2" />
              {appointment.location?.meetingLink 
                ? 'Iniciar Consulta Virtual' 
                : 'Crear y Iniciar Consulta Virtual'}
            </ModernButton>
          )}
          <div className="grid grid-cols-2 gap-2">
            {canReschedule && (
              <ModernButton
                onClick={() => setShowReschedule(true)}
                variant="outline"
                className="w-full"
              >
                <Edit className="w-4 h-4 mr-2" />
                Reprogramar
              </ModernButton>
            )}
            {canCancel && (
              <ModernButton
                onClick={() => setShowCancel(true)}
                variant="outline"
                className="w-full text-red-600 dark:text-red-400 border-red-200 dark:border-red-800"
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </ModernButton>
            )}
          </div>
          <ModernButton
            onClick={() => setShowEdit(true)}
            variant="outline"
            className="w-full"
          >
            <Edit className="w-4 h-4 mr-2" />
            Editar Detalles
          </ModernButton>
        </div>
      )}
    </div>
  )
}

// Componente de Reprogramación
interface RescheduleFormProps {
  appointment: Appointment
  onReschedule: (newDate: string, durationMinutes?: number) => Promise<void>
  onCancel: () => void
  isProcessing: boolean
}

function RescheduleForm({ appointment, onReschedule, onCancel, isProcessing }: RescheduleFormProps) {
  const [newDate, setNewDate] = useState(() => {
    const date = new Date(appointment.scheduledAt)
    date.setDate(date.getDate() + 1) // Mañana por defecto
    return date.toISOString().slice(0, 16)
  })
  const [durationMinutes, setDurationMinutes] = useState(appointment.durationMinutes || 30)
  const [error, setError] = useState("")

  const DURATION_OPTIONS = [
    { value: 15, label: '15 min' },
    { value: 30, label: '30 min' },
    { value: 45, label: '45 min' },
    { value: 60, label: '1 hora' }
  ]

  const handleSubmit = async () => {
    const selectedDate = new Date(newDate)
    const now = new Date()
    
    if (selectedDate <= now) {
      setError("La fecha debe ser futura")
      return
    }

    setError("")
    await onReschedule(newDate, durationMinutes)
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-[#0f172a]">
      <div className="sticky top-0 z-20 p-4 pb-2 bg-slate-50/50 dark:bg-[#0f172a] border-b border-border/50 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold dark:text-white">Reprogramar Cita</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-border/50 dark:border-slate-700 space-y-4">
          <div>
            <label className="text-sm font-medium dark:text-white mb-1 block">
              Nueva Fecha y Hora *
            </label>
            <input
              type="datetime-local"
              value={newDate}
              onChange={(e) => {
                setNewDate(e.target.value)
                setError("")
              }}
              min={new Date().toISOString().slice(0, 16)}
              className={`w-full px-3 py-2 rounded-lg border ${
                error ? 'border-red-500' : 'border-border/50 dark:border-slate-700'
              } bg-background dark:bg-slate-900 text-foreground focus:outline-none focus:ring-2 focus:ring-primary`}
            />
            {error && (
              <p className="text-xs text-red-500 mt-1">{error}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium dark:text-white mb-1 block">
              Duración
            </label>
            <select
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-border/50 dark:border-slate-700 bg-background dark:bg-slate-900 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {DURATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="p-4 bg-white dark:bg-[#1e293b] border-t border-border/50 dark:border-slate-700 space-y-2">
        <ModernButton
          onClick={handleSubmit}
          isLoading={isProcessing}
          disabled={isProcessing}
          className="w-full"
        >
          Reprogramar Cita
        </ModernButton>
        <ModernButton
          onClick={onCancel}
          variant="outline"
          className="w-full"
          disabled={isProcessing}
        >
          Cancelar
        </ModernButton>
      </div>
    </div>
  )
}

// Componente de Cancelación
interface CancelFormProps {
  appointment: Appointment
  onCancel: (reason: string) => Promise<void>
  onBack: () => void
  isProcessing: boolean
}

function CancelForm({ appointment, onCancel, onBack, isProcessing }: CancelFormProps) {
  const [reason, setReason] = useState("")
  const [error, setError] = useState("")

  const CANCEL_REASONS = [
    "Ya no puedo asistir",
    "Enfermedad",
    "Emergencia familiar",
    "Conflicto de horario",
    "Otro motivo"
  ]

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError("Por favor proporciona una razón")
      return
    }

    setError("")
    await onCancel(reason)
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-[#0f172a]">
      <div className="sticky top-0 z-20 p-4 pb-2 bg-slate-50/50 dark:bg-[#0f172a] border-b border-border/50 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold dark:text-white">Cancelar Cita</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <h3 className="font-semibold text-red-700 dark:text-red-400">
              Confirmar Cancelación
            </h3>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400">
            Esta acción no se puede deshacer. La cita será cancelada permanentemente.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-border/50 dark:border-slate-700 space-y-4">
          <div>
            <label className="text-sm font-medium dark:text-white mb-2 block">
              Razón de Cancelación *
            </label>
            <div className="space-y-2 mb-3">
              {CANCEL_REASONS.map((cancelReason) => (
                <button
                  key={cancelReason}
                  onClick={() => {
                    setReason(cancelReason)
                    setError("")
                  }}
                  className={`w-full px-4 py-2 rounded-lg border text-left transition-colors ${
                    reason === cancelReason
                      ? 'border-primary bg-primary/10'
                      : 'border-border/50 dark:border-slate-700 hover:bg-muted'
                  }`}
                >
                  <span className="text-sm dark:text-white">{cancelReason}</span>
                </button>
              ))}
            </div>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                setError("")
              }}
              placeholder="Describe la razón de la cancelación..."
              rows={3}
              maxLength={500}
              className={`w-full px-3 py-2 rounded-lg border ${
                error ? 'border-red-500' : 'border-border/50 dark:border-slate-700'
              } bg-background dark:bg-slate-900 text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none`}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {reason.length}/500 caracteres
            </p>
            {error && (
              <p className="text-xs text-red-500 mt-1">{error}</p>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 bg-white dark:bg-[#1e293b] border-t border-border/50 dark:border-slate-700 space-y-2">
        <ModernButton
          onClick={handleSubmit}
          isLoading={isProcessing}
          disabled={isProcessing}
          className="w-full bg-red-600 hover:bg-red-700"
        >
          <X className="w-5 h-5 mr-2" />
          Confirmar Cancelación
        </ModernButton>
        <ModernButton
          onClick={onBack}
          variant="outline"
          className="w-full"
          disabled={isProcessing}
        >
          Volver
        </ModernButton>
      </div>
    </div>
  )
}

