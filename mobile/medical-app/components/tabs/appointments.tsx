"use client"

import { useState, useEffect } from "react"
import { Plus, Search, ChevronRight, Calendar, Clock, MapPin, Activity, Edit, Eye } from "lucide-react"
import { ModernButton } from "@/components/ui/ModernButton"
import { ModernCard } from "@/components/ui/ModernCard"
import type { Translation, ViewState } from "@/lib/translations"
import { medicalHistoryService } from "@/lib/api/services"
import { appointmentService } from "@/lib/api/services"
import { useAppStore } from "@/store/useAppStore"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { MedicalHistoryForm } from "@/components/forms/medical-history-form"
import type { MedicalHistory } from "@/lib/types"

interface HistoryViewProps {
  t: Translation
  setCurrentView?: (view: ViewState) => void
}

export function HistoryView({ t, setCurrentView }: HistoryViewProps) {
  const user = useAppStore((state) => state.user)
  const medicalHistories = useAppStore((state) => state.medicalHistories)
  const appointments = useAppStore((state) => state.appointments)
  const setMedicalHistories = useAppStore((state) => state.setMedicalHistories)
  const setAppointments = useAppStore((state) => state.setAppointments)
  
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<'histories' | 'appointments'>('histories')
  const [showForm, setShowForm] = useState(false)
  const [editingHistory, setEditingHistory] = useState<MedicalHistory | null>(null)
  const [_selectedHistory, _setSelectedHistory] = useState<MedicalHistory | null>(null)

  useEffect(() => {
    loadData()
  }, [user])

  const loadData = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      // Cargar historias médicas
      const historiesResponse = await medicalHistoryService.list({
        patientId: user._id,
        limit: 50
      })
      const histories = Array.isArray(historiesResponse)
        ? historiesResponse
        : (historiesResponse as { data: MedicalHistory[] }).data ?? []
      setMedicalHistories(histories)

      // Cargar citas
      const appointmentsData = await appointmentService.getUpcoming()
      setAppointments(appointmentsData)

    } catch (error: any) {
      console.error("Error al cargar datos:", error)
      if (error.status !== 401) {
        toast.error("Error al cargar historial médico")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const filteredHistories = medicalHistories.filter((history) =>
    searchQuery === "" ||
    history.diagnosis?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    history.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    history.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredAppointments = appointments.filter((apt) =>
    searchQuery === "" ||
    apt.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    apt.location?.address?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSaveHistory = () => {
    setShowForm(false)
    setEditingHistory(null)
    loadData() // Recargar datos
  }

  const handleEditHistory = (history: MedicalHistory) => {
    setEditingHistory(history)
    setShowForm(true)
  }

  const handleViewHistory = (history: MedicalHistory) => {
    _setSelectedHistory(history)
    // Guardar el ID en localStorage para que la vista de detalle pueda acceder
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('selectedHistoryId', history._id)
    }
    if (setCurrentView) {
      setCurrentView("medical-history-detail")
    }
  }

  if (showForm) {
    return (
      <MedicalHistoryForm
        t={t}
        historyToEdit={editingHistory}
        onSave={handleSaveHistory}
        onCancel={() => {
          setShowForm(false)
          setEditingHistory(null)
        }}
        setCurrentView={setCurrentView}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Cargando historial...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6 pb-24 animate-in slide-in-from-right duration-300">
      <div className="flex items-center justify-between pt-2">
        <h2 className="text-2xl font-bold tracking-tight">{t.history.title}</h2>
        <div className="flex gap-2">
          {/* Solo los doctores pueden crear nuevas historias médicas */}
          {viewMode === 'histories' && user && user.role === 'doctor' && (
            <ModernButton
              size="sm"
              onClick={() => {
                setEditingHistory(null)
                setShowForm(true)
              }}
              className="rounded-full"
            >
              <Plus className="w-4 h-4 mr-1" />
              Nueva
            </ModernButton>
          )}
          <ModernButton
            size="sm"
            variant={viewMode === 'histories' ? 'primary' : 'outline'}
            onClick={() => setViewMode('histories')}
            className="rounded-full"
          >
            Historias
          </ModernButton>
          <ModernButton
            size="sm"
            variant={viewMode === 'appointments' ? 'primary' : 'outline'}
            onClick={() => setViewMode('appointments')}
            className="rounded-full"
          >
            Citas
          </ModernButton>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-secondary/50 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 ring-primary/20"
          placeholder={t.history.search}
        />
      </div>

      {viewMode === 'histories' ? (
        <div className="space-y-3">
          {filteredHistories.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay historias médicas registradas</p>
            </div>
          ) : (
            filteredHistories.map((history) => (
              <ModernCard
                key={history._id}
                className="p-4 hover:bg-accent/5 transition-colors flex gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex flex-col items-center justify-center text-blue-600 shrink-0">
                  <span className="text-xs font-bold uppercase">
                    {history.date ? format(new Date(history.date), 'MMM', { locale: es }) : 'N/A'}
                  </span>
                  <span className="text-lg font-bold leading-none">
                    {history.date ? format(new Date(history.date), 'd', { locale: es }) : '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-bold text-base truncate">{history.diagnosis || 'Sin diagnóstico'}</h4>
                    {history.syncStatus && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                        history.syncStatus === 'synced' 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : history.syncStatus === 'pending'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {history.syncStatus === 'synced' ? 'Sincronizado' : 
                         history.syncStatus === 'pending' ? 'Pendiente' : 'Error'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 truncate">
                    {history.description || 'Sin descripción'}
                  </p>
                  {history.location?.address && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {history.location.address}
                    </p>
                  )}
                  {history.date && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(history.date), "PPP", { locale: es })}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {user && (
                    <>
                      {/* Solo los doctores pueden editar historias médicas */}
                      {user.role === 'doctor' && (
                        <button
                          onClick={() => handleEditHistory(history)}
                          className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4 text-primary" />
                        </button>
                      )}
                      <button
                        onClick={() => handleViewHistory(history)}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                        title="Ver detalle"
                      >
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </>
                  )}
                </div>
              </ModernCard>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay citas programadas</p>
            </div>
          ) : (
            filteredAppointments.map((appointment) => (
              <ModernCard
                key={appointment._id}
                className="p-4 hover:bg-accent/5 transition-colors cursor-pointer flex gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center text-primary shrink-0">
                  <Calendar className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-bold text-base truncate">{appointment.reason || 'Consulta médica'}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                      appointment.status === 'scheduled' 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : appointment.status === 'completed'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                    }`}>
                      {appointment.status === 'scheduled' ? 'Programada' : 
                       appointment.status === 'completed' ? 'Completada' : 
                       appointment.status === 'cancelled' ? 'Cancelada' : appointment.status}
                    </span>
                  </div>
                  {appointment.scheduledAt && (
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(appointment.scheduledAt as string), "PPP 'a las' HH:mm", { locale: es })}
                    </p>
                  )}
                  {appointment.location?.address && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {appointment.location.address}
                    </p>
                  )}
                  {appointment.notes && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{appointment.notes}</p>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground self-center shrink-0" />
              </ModernCard>
            ))
          )}
        </div>
      )}
    </div>
  )
}
