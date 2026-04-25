"use client"

import { useState, useEffect } from "react"
import { Plus, Search, ChevronRight, Calendar, Clock, MapPin, Video, Eye, Edit, X } from "lucide-react"
import { ModernButton } from "@/components/ui/ModernButton"
import { ModernCard } from "@/components/ui/ModernCard"
import type { Translation, ViewState } from "@/lib/translations"
import { appointmentService } from "@/lib/api/services"
import { useAppStore } from "@/store/useAppStore"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { AppointmentForm } from "@/components/forms/appointment-form"
import { AppointmentDetail } from "@/components/views/appointment-detail"
import type { Appointment } from "@/lib/types"

interface AppointmentsViewProps {
  t: Translation
  setCurrentView?: (view: ViewState) => void
}

export function AppointmentsView({ t, setCurrentView }: AppointmentsViewProps) {
  const user = useAppStore((state) => state.user)
  const appointments = useAppStore((state) => state.appointments)
  const setAppointments = useAppStore((state) => state.setAppointments)
  
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'scheduled' | 'completed' | 'cancelled'>('all')

  useEffect(() => {
    loadAppointments()
  }, [user])

  const loadAppointments = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const appointmentsData = await appointmentService.list({
        patientId: user.role === 'patient' ? user._id : undefined,
        doctorId: user.role === 'doctor' ? user._id : undefined,
        limit: 50
      })
      const appts = Array.isArray(appointmentsData)
        ? appointmentsData
        : ((appointmentsData as any).data ?? [])
      setAppointments(appts)
    } catch (error: any) {
      console.error("Error al cargar citas:", error)
      if (error.status !== 401) {
        toast.error("Error al cargar citas médicas")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveAppointment = () => {
    setShowForm(false)
    setEditingAppointment(null)
    loadAppointments()
  }

  const handleEditAppointment = (appointment: Appointment) => {
    setEditingAppointment(appointment)
    setShowForm(true)
  }

  const handleViewAppointment = (appointment: Appointment) => {
    setSelectedAppointmentId(appointment._id)
  }

  const filteredAppointments = appointments.filter((apt) => {
    const matchesSearch = searchQuery === "" ||
      apt.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.location?.address?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || apt.status === filterStatus
    
    return matchesSearch && matchesStatus
  })

  // Mostrar formulario
  if (showForm) {
    return (
      <AppointmentForm
        t={t}
        appointmentToEdit={editingAppointment}
        onSave={handleSaveAppointment}
        onCancel={() => {
          setShowForm(false)
          setEditingAppointment(null)
        }}
        setCurrentView={setCurrentView}
      />
    )
  }

  // Mostrar detalle
  if (selectedAppointmentId) {
    return (
      <AppointmentDetail
        t={t}
        appointmentId={selectedAppointmentId}
        onBack={() => setSelectedAppointmentId(null)}
        setCurrentView={setCurrentView}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Cargando citas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6 pb-24 animate-in slide-in-from-right duration-300">
      <div className="flex items-center justify-between pt-2">
        <h2 className="text-2xl font-bold tracking-tight">Citas Médicas</h2>
        {user && (
          <ModernButton
            size="sm"
            onClick={() => {
              setEditingAppointment(null)
              setShowForm(true)
            }}
            className="rounded-full"
          >
            <Plus className="w-4 h-4 mr-1" />
            Nueva
          </ModernButton>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['all', 'scheduled', 'completed', 'cancelled'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filterStatus === status
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {status === 'all' ? 'Todas' :
             status === 'scheduled' ? 'Programadas' :
             status === 'completed' ? 'Completadas' :
             'Canceladas'}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-secondary/50 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 ring-primary/20"
          placeholder="Buscar citas..."
        />
      </div>

      <div className="space-y-3">
        {filteredAppointments.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchQuery || filterStatus !== 'all' 
                ? "No se encontraron citas" 
                : "No hay citas programadas"}
            </p>
          </div>
        ) : (
          filteredAppointments.map((appointment) => {
            const appointmentDate = new Date(appointment.scheduledAt)
            const isPast = appointmentDate < new Date()
            const isVirtual = appointment.location?.type === 'virtual'
            
            return (
              <ModernCard
                key={appointment._id}
                className="p-4 hover:bg-accent/5 transition-colors flex gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center text-primary shrink-0">
                  <Calendar className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-bold text-base truncate">
                      {appointment.reason || 'Consulta médica'}
                    </h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
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
                  <div className="flex items-center gap-2 mt-1">
                    {isVirtual ? (
                      <Video className="w-3 h-3 text-primary" />
                    ) : (
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                    )}
                    <p className="text-xs text-muted-foreground">
                      {isVirtual ? 'Virtual' : appointment.location?.address || 'No especificada'}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(appointmentDate, "PPP 'a las' HH:mm", { locale: es })}
                    {appointment.durationMinutes && ` • ${appointment.durationMinutes} min`}
                  </p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={() => handleViewAppointment(appointment)}
                    className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                    title="Ver detalle"
                  >
                    <Eye className="w-4 h-4 text-primary" />
                  </button>
                  {appointment.status === 'scheduled' && !isPast && user && (
                    <button
                      onClick={() => handleEditAppointment(appointment)}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </ModernCard>
            )
          })
        )}
      </div>
    </div>
  )
}

