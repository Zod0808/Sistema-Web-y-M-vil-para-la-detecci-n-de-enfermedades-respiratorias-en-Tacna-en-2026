"use client"

import { useState, useEffect } from "react"
import {
  ArrowLeft,
  User,
  Stethoscope,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Plus,
  Loader2,
  Filter
} from "lucide-react"
import { ModernButton } from "@/components/ui/ModernButton"
import { ModernCard } from "@/components/ui/ModernCard"
import { Badge } from "@/components/ui/badge"
import { apiClient } from "@/lib/api/client"
import { API_ENDPOINTS } from "@/lib/api/config"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Referral {
  _id: string
  patientId: string
  patientName: string
  referringDoctorId: string
  referringDoctorName: string
  referredToDoctorId?: string
  referredToDoctorName?: string
  referredToSpecialty?: string
  referralType: string
  priority: string
  status: string
  reason: string
  clinicalNotes?: string
  requestedDate?: string
  acceptedDate?: string
  completedDate?: string
  createdAt: string
  updatedAt: string
}

interface ReferralScreenProps {
  onBack?: () => void
}

export function ReferralScreen({ onBack }: ReferralScreenProps) {
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    status: '',
    referralType: '',
    priority: ''
  })

  useEffect(() => {
    loadReferrals()
  }, [filters])

  const loadReferrals = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.referralType) params.append('referralType', filters.referralType)
      if (filters.priority) params.append('priority', filters.priority)

      const response = await apiClient.get<any>(`/api/v1/referrals?${params.toString()}`)
      setReferrals(response.data.data || [])
    } catch (error: any) {
      toast.error("Error al cargar referidos", {
        description: error.response?.data?.message || "No se pudieron cargar los referidos"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptReferral = async (referralId: string) => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      await apiClient.post<any>(`/api/v1/referrals/${referralId}/accept`, {
        referredToDoctorId: user._id || user.id
      })
      toast.success("Referido aceptado")
      loadReferrals()
    } catch (error: any) {
      toast.error("Error al aceptar referido", {
        description: error.response?.data?.message || "No se pudo aceptar el referido"
      })
    }
  }

  const handleRejectReferral = async (referralId: string) => {
    const reason = prompt('Razón del rechazo:')
    if (!reason) return

    try {
      await apiClient.post<any>(`/api/v1/referrals/${referralId}/reject`, { reason })
      toast.success("Referido rechazado")
      loadReferrals()
    } catch (error: any) {
      toast.error("Error al rechazar referido", {
        description: error.response?.data?.message || "No se pudo rechazar el referido"
      })
    }
  }

  const handleCompleteReferral = async (referralId: string) => {
    try {
      await apiClient.post<any>(`/api/v1/referrals/${referralId}/complete`)
      toast.success("Referido completado")
      loadReferrals()
    } catch (error: any) {
      toast.error("Error al completar referido", {
        description: error.response?.data?.message || "No se pudo completar el referido"
      })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'accepted':
        return <CheckCircle className="h-4 w-4" />
      case 'in_progress':
        return <AlertCircle className="h-4 w-4" />
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'rejected':
        return <XCircle className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'accepted':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'in_progress':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
      case 'completed':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'rejected':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      case 'cancelled':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
      case 'medium':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'high':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
      case 'urgent':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      consultation: 'Consulta',
      specialist: 'Especialista',
      diagnostic: 'Diagnóstico',
      treatment: 'Tratamiento',
      follow_up: 'Seguimiento',
      emergency: 'Emergencia'
    }
    return labels[type] || type
  }

  if (loading && referrals.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        {onBack && (
          <ModernButton onClick={onBack} variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </ModernButton>
        )}
        
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">Referidos</h1>
            <p className="text-muted-foreground">
              Gestión de referidos entre especialistas
            </p>
          </div>
          
          <div className="flex gap-2">
            <ModernButton
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </ModernButton>
          </div>
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <ModernCard className="mb-6">
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Estado</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="">Todos</option>
                  <option value="pending">Pendiente</option>
                  <option value="accepted">Aceptado</option>
                  <option value="in_progress">En Progreso</option>
                  <option value="completed">Completado</option>
                  <option value="rejected">Rechazado</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tipo</label>
                <select
                  value={filters.referralType}
                  onChange={(e) => setFilters({ ...filters, referralType: e.target.value })}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="">Todos</option>
                  <option value="consultation">Consulta</option>
                  <option value="specialist">Especialista</option>
                  <option value="diagnostic">Diagnóstico</option>
                  <option value="treatment">Tratamiento</option>
                  <option value="follow_up">Seguimiento</option>
                  <option value="emergency">Emergencia</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Prioridad</label>
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="">Todas</option>
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
            </div>
          </div>
        </ModernCard>
      )}

      {/* Lista de Referidos */}
      {referrals.length === 0 ? (
        <ModernCard>
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No hay referidos</h3>
            <p className="text-muted-foreground">
              No se encontraron referidos con los filtros seleccionados
            </p>
          </div>
        </ModernCard>
      ) : (
        <div className="space-y-4">
          {referrals.map((referral) => (
            <ModernCard
              key={referral._id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedReferral(referral)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-lg">{referral.patientName}</h3>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Stethoscope className="h-4 w-4" />
                      <span>{referral.referringDoctorName}</span>
                      {referral.referredToDoctorName && (
                        <>
                          <span>→</span>
                          <span>{referral.referredToDoctorName}</span>
                        </>
                      )}
                    </div>
                    {referral.referredToSpecialty && (
                      <div className="text-sm text-muted-foreground mb-2">
                        Especialidad: {referral.referredToSpecialty}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={getStatusColor(referral.status)}>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(referral.status)}
                        {referral.status}
                      </span>
                    </Badge>
                    <Badge className={getPriorityColor(referral.priority)}>
                      {referral.priority}
                    </Badge>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="text-sm font-medium mb-1">Tipo: {getTypeLabel(referral.referralType)}</div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{referral.reason}</p>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {format(new Date(referral.requestedDate || referral.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                    </span>
                  </div>
                  {referral.status === 'pending' && (
                    <div className="flex gap-2">
                      <ModernButton
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAcceptReferral(referral._id)
                        }}
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-600"
                      >
                        Aceptar
                      </ModernButton>
                      <ModernButton
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRejectReferral(referral._id)
                        }}
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-600"
                      >
                        Rechazar
                      </ModernButton>
                    </div>
                  )}
                  {(referral.status === 'accepted' || referral.status === 'in_progress') && (
                    <ModernButton
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCompleteReferral(referral._id)
                      }}
                      size="sm"
                      variant="outline"
                    >
                      Completar
                    </ModernButton>
                  )}
                </div>
              </div>
            </ModernCard>
          ))}
        </div>
      )}

      {/* Modal de Detalle */}
      {selectedReferral && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <ModernCard className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Detalle del Referido</h2>
                <ModernButton
                  onClick={() => setSelectedReferral(null)}
                  variant="ghost"
                  size="sm"
                >
                  <XCircle className="h-5 w-5" />
                </ModernButton>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Paciente</div>
                  <div className="text-base">{selectedReferral.patientName}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Doctor que Refiere</div>
                  <div className="text-base">{selectedReferral.referringDoctorName}</div>
                </div>

                {selectedReferral.referredToDoctorName && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Doctor Destino</div>
                    <div className="text-base">{selectedReferral.referredToDoctorName}</div>
                  </div>
                )}

                {selectedReferral.referredToSpecialty && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Especialidad</div>
                    <div className="text-base">{selectedReferral.referredToSpecialty}</div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Tipo</div>
                    <Badge>{getTypeLabel(selectedReferral.referralType)}</Badge>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Prioridad</div>
                    <Badge className={getPriorityColor(selectedReferral.priority)}>
                      {selectedReferral.priority}
                    </Badge>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Estado</div>
                  <Badge className={getStatusColor(selectedReferral.status)}>
                    {selectedReferral.status}
                  </Badge>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Razón del Referido</div>
                  <div className="text-base whitespace-pre-wrap">{selectedReferral.reason}</div>
                </div>

                {selectedReferral.clinicalNotes && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Notas Clínicas</div>
                    <div className="text-base whitespace-pre-wrap">{selectedReferral.clinicalNotes}</div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground mb-1">Fecha de Solicitud</div>
                    <div>
                      {format(new Date(selectedReferral.requestedDate || selectedReferral.createdAt), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                    </div>
                  </div>
                  {selectedReferral.acceptedDate && (
                    <div>
                      <div className="text-muted-foreground mb-1">Fecha de Aceptación</div>
                      <div>
                        {format(new Date(selectedReferral.acceptedDate), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                      </div>
                    </div>
                  )}
                  {selectedReferral.completedDate && (
                    <div>
                      <div className="text-muted-foreground mb-1">Fecha de Finalización</div>
                      <div>
                        {format(new Date(selectedReferral.completedDate), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex gap-2 pt-4 border-t">
                  {selectedReferral.status === 'pending' && (
                    <>
                      <ModernButton
                        onClick={() => {
                          handleAcceptReferral(selectedReferral._id)
                          setSelectedReferral(null)
                        }}
                        className="flex-1"
                      >
                        Aceptar
                      </ModernButton>
                      <ModernButton
                        onClick={() => {
                          handleRejectReferral(selectedReferral._id)
                          setSelectedReferral(null)
                        }}
                        variant="destructive"
                        className="flex-1"
                      >
                        Rechazar
                      </ModernButton>
                    </>
                  )}
                  {(selectedReferral.status === 'accepted' || selectedReferral.status === 'in_progress') && (
                    <ModernButton
                      onClick={() => {
                        handleCompleteReferral(selectedReferral._id)
                        setSelectedReferral(null)
                      }}
                      className="flex-1"
                    >
                      Completar
                    </ModernButton>
                  )}
                </div>
              </div>
            </div>
          </ModernCard>
        </div>
      )}
    </div>
  )
}

