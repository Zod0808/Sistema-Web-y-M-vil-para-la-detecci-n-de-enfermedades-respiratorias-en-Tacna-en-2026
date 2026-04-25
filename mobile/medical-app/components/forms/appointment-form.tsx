"use client"

import { useState, useEffect } from "react"
import {
  Save,
  X,
  Calendar,
  Loader2,
  MapPin,
  Video,
  Bell
} from "lucide-react"
import { ModernButton } from "@/components/ui/ModernButton"
import type { Translation, ViewState } from "@/lib/translations"
import { appointmentService, type CreateAppointmentRequest } from "@/lib/api/services/appointmentService"
import { authService } from "@/lib/api/services/authService"
import { createAppointmentOffline, updateAppointmentOffline } from "@/lib/services/offlineOperations"
import { useAppStore } from "@/store/useAppStore"
import { toast } from "sonner"
import type { Appointment } from "@/lib/types"
import { useNetworkStatus } from "@/hooks/useNetworkStatus"

interface AppointmentFormProps {
  t: Translation
  appointmentToEdit?: Appointment | null
  onSave?: () => void
  onCancel?: () => void
  setCurrentView?: (view: ViewState) => void
}

const DURATION_OPTIONS = [
  { value: 15, label: '15 minutos' },
  { value: 30, label: '30 minutos' },
  { value: 45, label: '45 minutos' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1.5 horas' },
  { value: 120, label: '2 horas' }
]

const REMINDER_OPTIONS = [
  { value: 5, label: '5 minutos antes' },
  { value: 15, label: '15 minutos antes' },
  { value: 30, label: '30 minutos antes' },
  { value: 60, label: '1 hora antes' },
  { value: 120, label: '2 horas antes' },
  { value: 1440, label: '1 día antes' }
]

export function AppointmentForm({
  t: _t,
  appointmentToEdit,
  onSave,
  onCancel,
  setCurrentView
}: AppointmentFormProps) {
  const user = useAppStore((state) => state.user)
  const { isOnline } = useNetworkStatus()
  const addAppointment = useAppStore((state) => state.addAppointment)
  const updateAppointment = useAppStore((state) => state.updateAppointment)

  const isEditMode = !!appointmentToEdit

  // Estados del formulario
  const [doctorId, setDoctorId] = useState(appointmentToEdit?.doctorId || "")
  const [reason, setReason] = useState(appointmentToEdit?.reason || "")
  const [notes, setNotes] = useState(appointmentToEdit?.notes || "")
  const [scheduledDate, setScheduledDate] = useState(() => {
    if (appointmentToEdit?.scheduledAt) {
      const date = new Date(appointmentToEdit.scheduledAt)
      return date.toISOString().slice(0, 16) // YYYY-MM-DDTHH:mm
    }
    // Por defecto, mañana a las 9 AM
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0)
    return tomorrow.toISOString().slice(0, 16)
  })
  const [durationMinutes, setDurationMinutes] = useState(
    appointmentToEdit?.durationMinutes || 30
  )
  const [locationType, setLocationType] = useState<'virtual' | 'in_person'>(
    appointmentToEdit?.location?.type || 'in_person'
  )
  const [address, setAddress] = useState(appointmentToEdit?.location?.address || "")
  const [meetingLink, setMeetingLink] = useState(appointmentToEdit?.location?.meetingLink || "")
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState(
    appointmentToEdit?.reminderMinutesBefore || 60
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [doctors, setDoctors] = useState<Array<{ _id: string; name: string; email: string }>>([])
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false)

  useEffect(() => {
    if (user?.role === 'doctor') {
      setDoctors([{ _id: user._id, name: user.name, email: user.email }])
      setDoctorId(user._id)
    } else {
      setIsLoadingDoctors(true)
      authService.listByRole('doctor')
        .then((list) => {
          setDoctors(list.map(d => ({ _id: d._id, name: d.name, email: d.email })))
          if (!doctorId && list.length > 0) setDoctorId(list[0]._id)
        })
        .catch(() => setDoctors([]))
        .finally(() => setIsLoadingDoctors(false))
    }
  }, [user?._id])

  // Validación del formulario
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!doctorId.trim()) {
      newErrors.doctorId = "El doctor es requerido"
    }

    const selectedDate = new Date(scheduledDate)
    const now = new Date()
    if (selectedDate <= now) {
      newErrors.scheduledDate = "La fecha debe ser futura"
    }

    if (reason && reason.length > 240) {
      newErrors.reason = "La razón no puede exceder 240 caracteres"
    }

    if (notes && notes.length > 2000) {
      newErrors.notes = "Las notas no pueden exceder 2000 caracteres"
    }


    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Guardar cita
  const handleSave = async () => {
    if (!validateForm()) {
      toast.error("Por favor corrige los errores del formulario")
      return
    }

    if (!user) {
      toast.error("Debes estar autenticado para guardar")
      return
    }

    setIsSaving(true)

    try {
      const appointmentData: CreateAppointmentRequest = {
        patientId: user._id,
        doctorId: doctorId.trim(),
        scheduledAt: new Date(scheduledDate).toISOString(),
        durationMinutes,
        reason: reason.trim() || undefined,
        notes: notes.trim() || undefined,
        location: {
          type: locationType,
          address: locationType === 'in_person' ? address.trim() : undefined,
          meetingLink: locationType === 'virtual' ? meetingLink.trim() : undefined
        },
        reminderMinutesBefore
      }

      let savedAppointment: Appointment

      if (isEditMode && appointmentToEdit) {
        // Actualizar con soporte offline
        const result = await updateAppointmentOffline(appointmentToEdit._id, appointmentData, isOnline)
        
        if (result.isOffline) {
          // Crear cita temporal para mostrar en UI
          savedAppointment = {
            ...appointmentToEdit,
            ...appointmentData,
            _id: appointmentToEdit._id,
            createdAt: appointmentToEdit.createdAt,
            updatedAt: new Date().toISOString()
          } as Appointment
          updateAppointment(appointmentToEdit._id, savedAppointment)
          toast.success("Cita actualizada (se sincronizará cuando vuelva la conexión)")
        } else {
          // Actualización exitosa online
          savedAppointment = await appointmentService.get(appointmentToEdit._id)
          updateAppointment(appointmentToEdit._id, savedAppointment)
          toast.success("Cita actualizada exitosamente")
        }
      } else {
        // Crear con soporte offline
        const result = await createAppointmentOffline(appointmentData, isOnline)
        
        if (result.isOffline) {
          // Crear cita temporal para mostrar en UI
          savedAppointment = {
            ...appointmentData,
            _id: result.id,
            status: 'scheduled',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          } as Appointment
          addAppointment(savedAppointment)
          toast.success("Cita creada (se sincronizará cuando vuelva la conexión)")
        } else {
          // Creación exitosa online
          savedAppointment = await appointmentService.get(result.id)
          addAppointment(savedAppointment)
          toast.success("Cita creada exitosamente")
        }
      }

      if (onSave) {
        onSave()
      } else if (setCurrentView) {
        setCurrentView('appointments')
      }
    } catch (error: any) {
      console.error("Error al guardar cita:", error)
      toast.error(error?.message || "Error al guardar la cita")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-[#0f172a]">
      {/* Header */}
      <div className="sticky top-0 z-20 p-4 pb-2 bg-slate-50/50 dark:bg-[#0f172a] border-b border-border/50 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onCancel && (
              <button
                onClick={onCancel}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="text-xl font-bold dark:text-white">
                {isEditMode ? "Editar Cita" : "Nueva Cita Médica"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isEditMode ? "Modificar detalles de la cita" : "Programar una nueva consulta"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Información Básica */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-border/50 dark:border-slate-700 space-y-4">
          <h3 className="font-semibold dark:text-white flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Información de la Cita
          </h3>

          <div>
            <label className="text-sm font-medium dark:text-white mb-1 block">
              Doctor *
            </label>
            {user?.role === 'doctor' ? (
              <div className="px-3 py-2 rounded-lg border border-border/50 dark:border-slate-700 bg-secondary/50 dark:bg-slate-700/50">
                <p className="text-sm dark:text-white">{user.name}</p>
                <p className="text-xs text-muted-foreground">Tu perfil médico</p>
              </div>
            ) : isLoadingDoctors ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 dark:border-slate-700 bg-secondary/20">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Cargando doctores...</span>
              </div>
            ) : (
              <select
                value={doctorId}
                onChange={(e) => {
                  setDoctorId(e.target.value)
                  setErrors(prev => ({ ...prev, doctorId: '' }))
                }}
                className={`w-full px-3 py-2 rounded-lg border ${
                  errors.doctorId ? 'border-red-500' : 'border-border/50 dark:border-slate-700'
                } bg-background dark:bg-slate-900 text-foreground focus:outline-none focus:ring-2 focus:ring-primary`}
              >
                <option value="">— Selecciona un doctor —</option>
                {doctors.map(d => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </select>
            )}
            {errors.doctorId && (
              <p className="text-xs text-red-500 mt-1">{errors.doctorId}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium dark:text-white mb-1 block">
              Fecha y Hora *
            </label>
            <input
              type="datetime-local"
              value={scheduledDate}
              onChange={(e) => {
                setScheduledDate(e.target.value)
                setErrors(prev => ({ ...prev, scheduledDate: '' }))
              }}
              min={new Date().toISOString().slice(0, 16)}
              className={`w-full px-3 py-2 rounded-lg border ${
                errors.scheduledDate ? 'border-red-500' : 'border-border/50 dark:border-slate-700'
              } bg-background dark:bg-slate-900 text-foreground focus:outline-none focus:ring-2 focus:ring-primary`}
            />
            {errors.scheduledDate && (
              <p className="text-xs text-red-500 mt-1">{errors.scheduledDate}</p>
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

          <div>
            <label className="text-sm font-medium dark:text-white mb-1 block">
              Motivo de la Consulta
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                setErrors(prev => ({ ...prev, reason: '' }))
              }}
              maxLength={240}
              className={`w-full px-3 py-2 rounded-lg border ${
                errors.reason ? 'border-red-500' : 'border-border/50 dark:border-slate-700'
              } bg-background dark:bg-slate-900 text-foreground focus:outline-none focus:ring-2 focus:ring-primary`}
              placeholder="Ej: Revisión de síntomas, Control rutinario..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              {reason.length}/240 caracteres
            </p>
            {errors.reason && (
              <p className="text-xs text-red-500 mt-1">{errors.reason}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium dark:text-white mb-1 block">
              Notas Adicionales
            </label>
            <textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value)
                setErrors(prev => ({ ...prev, notes: '' }))
              }}
              maxLength={2000}
              rows={4}
              className={`w-full px-3 py-2 rounded-lg border ${
                errors.notes ? 'border-red-500' : 'border-border/50 dark:border-slate-700'
              } bg-background dark:bg-slate-900 text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none`}
              placeholder="Información adicional sobre la consulta..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              {notes.length}/2000 caracteres
            </p>
            {errors.notes && (
              <p className="text-xs text-red-500 mt-1">{errors.notes}</p>
            )}
          </div>
        </div>

        {/* Ubicación */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-border/50 dark:border-slate-700 space-y-4">
          <h3 className="font-semibold dark:text-white flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Ubicación
          </h3>

          <div>
            <label className="text-sm font-medium dark:text-white mb-1 block">
              Tipo de Consulta
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setLocationType('in_person')
                  setErrors(prev => ({ ...prev, address: '', meetingLink: '' }))
                }}
                className={`px-4 py-3 rounded-lg border transition-colors ${
                  locationType === 'in_person'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border/50 dark:border-slate-700 hover:bg-muted'
                }`}
              >
                <MapPin className="w-4 h-4 mx-auto mb-1" />
                <span className="text-sm font-medium">Presencial</span>
              </button>
              <button
                onClick={() => {
                  setLocationType('virtual')
                  setErrors(prev => ({ ...prev, address: '', meetingLink: '' }))
                }}
                className={`px-4 py-3 rounded-lg border transition-colors ${
                  locationType === 'virtual'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border/50 dark:border-slate-700 hover:bg-muted'
                }`}
              >
                <Video className="w-4 h-4 mx-auto mb-1" />
                <span className="text-sm font-medium">Virtual</span>
              </button>
            </div>
          </div>

          {locationType === 'in_person' ? (
            <div>
              <label className="text-sm font-medium dark:text-white mb-1 block">
                Dirección *
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value)
                  setErrors(prev => ({ ...prev, address: '' }))
                }}
                className={`w-full px-3 py-2 rounded-lg border ${
                  errors.address ? 'border-red-500' : 'border-border/50 dark:border-slate-700'
                } bg-background dark:bg-slate-900 text-foreground focus:outline-none focus:ring-2 focus:ring-primary`}
                placeholder="Dirección del consultorio o clínica"
              />
              {errors.address && (
                <p className="text-xs text-red-500 mt-1">{errors.address}</p>
              )}
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium dark:text-white mb-1 block">
                Enlace de Reunión *
              </label>
              <input
                type="url"
                value={meetingLink}
                onChange={(e) => {
                  setMeetingLink(e.target.value)
                  setErrors(prev => ({ ...prev, meetingLink: '' }))
                }}
                className={`w-full px-3 py-2 rounded-lg border ${
                  errors.meetingLink ? 'border-red-500' : 'border-border/50 dark:border-slate-700'
                } bg-background dark:bg-slate-900 text-foreground focus:outline-none focus:ring-2 focus:ring-primary`}
                placeholder="https://meet.jit.si/..."
              />
              {errors.meetingLink && (
                <p className="text-xs text-red-500 mt-1">{errors.meetingLink}</p>
              )}
            </div>
          )}
        </div>

        {/* Recordatorio */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-border/50 dark:border-slate-700 space-y-4">
          <h3 className="font-semibold dark:text-white flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Recordatorio
          </h3>
          <div>
            <label className="text-sm font-medium dark:text-white mb-1 block">
              Notificar Antes
            </label>
            <select
              value={reminderMinutesBefore}
              onChange={(e) => setReminderMinutesBefore(parseInt(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-border/50 dark:border-slate-700 bg-background dark:bg-slate-900 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {REMINDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Recibirás una notificación antes de la cita
            </p>
          </div>
        </div>
      </div>

      {/* Footer con botones de acción */}
      <div className="p-4 bg-white dark:bg-[#1e293b] border-t border-border/50 dark:border-slate-700 space-y-2">
        <ModernButton
          onClick={handleSave}
          isLoading={isSaving}
          disabled={isSaving}
          className="w-full text-lg h-14"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              {isEditMode ? "Actualizar Cita" : "Crear Cita"}
            </>
          )}
        </ModernButton>
        {onCancel && (
          <ModernButton
            onClick={onCancel}
            variant="outline"
            className="w-full"
            disabled={isSaving}
          >
            Cancelar
          </ModernButton>
        )}
      </div>
    </div>
  )
}

