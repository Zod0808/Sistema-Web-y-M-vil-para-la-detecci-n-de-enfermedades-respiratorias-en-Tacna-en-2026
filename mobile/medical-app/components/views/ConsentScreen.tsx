"use client"

import { useState, useEffect, useRef } from "react"
import {
  ArrowLeft,
  FileText,
  Calendar,
  User,
  Stethoscope,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  PenTool,
  Download,
  X,
  Plus,
  Loader2,
  Filter,
  Trash2
} from "lucide-react"
import { ModernButton } from "@/components/ui/ModernButton"
import { ModernCard } from "@/components/ui/ModernCard"
import { Badge } from "@/components/ui/badge"
import { apiClient } from "@/lib/api/client"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface ElectronicSignature {
  signerId: string
  signerName: string
  signerRole: 'patient' | 'doctor' | 'witness' | 'guardian'
  signatureData: string
  signatureMethod: string
  signedAt: string
}

interface InformedConsent {
  _id: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  consentType: string
  title: string
  description: string
  procedureDetails?: string
  risks?: string[]
  benefits?: string[]
  alternatives?: string[]
  status: string
  version: string
  language: string
  signatures: ElectronicSignature[]
  patientSignature?: ElectronicSignature
  doctorSignature?: ElectronicSignature
  presentedAt?: string
  signedAt?: string
  expiresAt?: string
  revokedAt?: string
  revokedReason?: string
  createdAt: string
  updatedAt: string
}

interface ConsentScreenProps {
  onBack?: () => void
}

export function ConsentScreen({ onBack }: ConsentScreenProps) {
  const [consents, setConsents] = useState<InformedConsent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedConsent, setSelectedConsent] = useState<InformedConsent | null>(null)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    status: '',
    consentType: ''
  })

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const lastPosRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    loadConsents()
  }, [filters])

  useEffect(() => {
    if (showSignatureModal && canvasRef.current) {
      initSignatureCanvas()
    }
  }, [showSignatureModal])

  const loadConsents = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.consentType) params.append('consentType', filters.consentType)

      const response = await apiClient.get<any>(`/api/v1/informed-consents?${params.toString()}`)
      setConsents(response.data.data || [])
    } catch (error: any) {
      toast.error("Error al cargar consentimientos", {
        description: error.response?.data?.message || "No se pudieron cargar los consentimientos"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSignConsent = async (consentId: string) => {
    if (!canvasRef.current) {
      toast.error("Por favor, dibuje su firma")
      return
    }

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      const signatureData = canvasRef.current.toDataURL('image/png')

      await apiClient.post<any>(`/api/v1/informed-consents/${consentId}/sign`, {
        signerId: user._id || user.id,
        signerName: user.name,
        signerRole: 'patient',
        signatureData: signatureData,
        signatureMethod: 'click_to_sign'
      })

      toast.success("Consentimiento firmado exitosamente")
      setShowSignatureModal(false)
      clearSignature()
      loadConsents()
    } catch (error: any) {
      toast.error("Error al firmar consentimiento", {
        description: error.response?.data?.message || "No se pudo firmar el consentimiento"
      })
    }
  }

  const handleRevokeConsent = async (consentId: string) => {
    const raw = prompt('Razón de revocación (máx. 500 caracteres):')
    if (!raw || !raw.trim()) return
    const reason = raw.trim().slice(0, 500)

    try {
      await apiClient.post<any>(`/api/v1/informed-consents/${consentId}/revoke`, { reason })
      toast.success("Consentimiento revocado")
      loadConsents()
    } catch (error: any) {
      toast.error("Error al revocar consentimiento", {
        description: error.response?.data?.message || "No se pudo revocar el consentimiento"
      })
    }
  }

  const handleDownloadPDF = async (consentId: string) => {
    try {
      toast.loading("Generando PDF...")
      const response = await apiClient.get<any>(`/api/v1/informed-consents/${consentId}/pdf`)

      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `consentimiento-${consentId}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success("PDF descargado correctamente")
    } catch (error: any) {
      toast.error("Error al descargar PDF", {
        description: error.response?.data?.message || "No se pudo descargar el PDF"
      })
    }
  }

  const initSignatureCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect()
      if ('touches' in e) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top
        }
      } else {
        return {
          x: (e as MouseEvent).clientX - rect.left,
          y: (e as MouseEvent).clientY - rect.top
        }
      }
    }

    const startDrawing = (e: MouseEvent | TouchEvent) => {
      isDrawingRef.current = true
      const pos = getPos(e)
      lastPosRef.current = pos
    }

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawingRef.current) return
      const pos = getPos(e)

      ctx.beginPath()
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()

      lastPosRef.current = pos
    }

    const stopDrawing = () => {
      isDrawingRef.current = false
    }

    // Mouse events
    canvas.addEventListener('mousedown', startDrawing)
    canvas.addEventListener('mousemove', draw)
    canvas.addEventListener('mouseup', stopDrawing)
    canvas.addEventListener('mouseout', stopDrawing)

    // Touch events
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault()
      startDrawing(e)
    })
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault()
      draw(e)
    })
    canvas.addEventListener('touchend', (e) => {
      e.preventDefault()
      stopDrawing()
    })
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <FileText className="h-4 w-4" />
      case 'pending_signature':
        return <Clock className="h-4 w-4" />
      case 'signed':
        return <CheckCircle className="h-4 w-4" />
      case 'revoked':
        return <XCircle className="h-4 w-4" />
      case 'expired':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
      case 'pending_signature':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'signed':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'revoked':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      case 'expired':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      procedure: 'Procedimiento',
      treatment: 'Tratamiento',
      surgery: 'Cirugía',
      research: 'Investigación',
      data_sharing: 'Compartir Datos',
      photography: 'Fotografía',
      video_recording: 'Grabación de Video',
      other: 'Otro'
    }
    return labels[type] || type
  }

  if (loading && consents.length === 0) {
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
            <h1 className="text-2xl font-bold mb-2">Consentimientos Informados</h1>
            <p className="text-muted-foreground">
              Gestión de consentimientos médicos con firma electrónica
            </p>
          </div>
          
          <ModernButton
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </ModernButton>
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <ModernCard className="mb-6">
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Estado</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="">Todos</option>
                  <option value="draft">Borrador</option>
                  <option value="pending_signature">Pendiente Firma</option>
                  <option value="signed">Firmado</option>
                  <option value="revoked">Revocado</option>
                  <option value="expired">Expirado</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tipo</label>
                <select
                  value={filters.consentType}
                  onChange={(e) => setFilters({ ...filters, consentType: e.target.value })}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="">Todos</option>
                  <option value="procedure">Procedimiento</option>
                  <option value="treatment">Tratamiento</option>
                  <option value="surgery">Cirugía</option>
                  <option value="research">Investigación</option>
                  <option value="data_sharing">Compartir Datos</option>
                  <option value="photography">Fotografía</option>
                  <option value="video_recording">Grabación de Video</option>
                  <option value="other">Otro</option>
                </select>
              </div>
            </div>
          </div>
        </ModernCard>
      )}

      {/* Lista de Consentimientos */}
      {consents.length === 0 ? (
        <ModernCard>
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No hay consentimientos</h3>
            <p className="text-muted-foreground">
              No se encontraron consentimientos con los filtros seleccionados
            </p>
          </div>
        </ModernCard>
      ) : (
        <div className="space-y-4">
          {consents.map((consent) => (
            <ModernCard
              key={consent._id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedConsent(consent)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-lg">{consent.title}</h3>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <User className="h-4 w-4" />
                      <span>{consent.patientName}</span>
                      <span>•</span>
                      <Stethoscope className="h-4 w-4" />
                      <span>{consent.doctorName}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      Tipo: {getTypeLabel(consent.consentType)}
                    </div>
                  </div>
                  <Badge className={getStatusColor(consent.status)}>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(consent.status)}
                      {consent.status === 'pending_signature' ? 'Pendiente' : consent.status}
                    </span>
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {consent.description}
                </p>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {format(new Date(consent.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {consent.status === 'pending_signature' && (
                      <ModernButton
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedConsent(consent)
                          setShowSignatureModal(true)
                        }}
                        size="sm"
                        className="text-green-600 border-green-600"
                      >
                        <PenTool className="h-4 w-4 mr-1" />
                        Firmar
                      </ModernButton>
                    )}
                    {consent.status === 'signed' && (
                      <ModernButton
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownloadPDF(consent._id)
                        }}
                        size="sm"
                        variant="outline"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        PDF
                      </ModernButton>
                    )}
                    {(consent.status === 'signed' || consent.status === 'pending_signature') && (
                      <ModernButton
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRevokeConsent(consent._id)
                        }}
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-600"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Revocar
                      </ModernButton>
                    )}
                  </div>
                </div>
              </div>
            </ModernCard>
          ))}
        </div>
      )}

      {/* Modal de Firma */}
      {showSignatureModal && selectedConsent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <ModernCard className="max-w-2xl w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Firmar Consentimiento</h2>
                <ModernButton
                  onClick={() => {
                    setShowSignatureModal(false)
                    clearSignature()
                  }}
                  variant="ghost"
                  size="sm"
                >
                  <X className="h-5 w-5" />
                </ModernButton>
              </div>

              <div className="mb-4">
                <h3 className="font-semibold mb-2">{selectedConsent.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Dibuje su firma en el área de abajo
                </p>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={200}
                    className="w-full h-48 border rounded cursor-crosshair touch-none"
                    style={{ touchAction: 'none' }}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <ModernButton
                  onClick={clearSignature}
                  variant="outline"
                  className="flex-1"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpiar
                </ModernButton>
                <ModernButton
                  onClick={() => {
                    setShowSignatureModal(false)
                    clearSignature()
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </ModernButton>
                <ModernButton
                  onClick={() => handleSignConsent(selectedConsent._id)}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Firmar
                </ModernButton>
              </div>
            </div>
          </ModernCard>
        </div>
      )}

      {/* Modal de Detalle */}
      {selectedConsent && !showSignatureModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <ModernCard className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Detalle del Consentimiento</h2>
                <ModernButton
                  onClick={() => setSelectedConsent(null)}
                  variant="ghost"
                  size="sm"
                >
                  <X className="h-5 w-5" />
                </ModernButton>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Paciente</div>
                  <div className="text-base">{selectedConsent.patientName}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Doctor</div>
                  <div className="text-base">{selectedConsent.doctorName}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Tipo</div>
                    <Badge>{getTypeLabel(selectedConsent.consentType)}</Badge>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Estado</div>
                    <Badge className={getStatusColor(selectedConsent.status)}>
                      {selectedConsent.status}
                    </Badge>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Descripción</div>
                  <div className="text-base whitespace-pre-wrap">{selectedConsent.description}</div>
                </div>

                {selectedConsent.procedureDetails && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Detalles del Procedimiento</div>
                    <div className="text-base whitespace-pre-wrap">{selectedConsent.procedureDetails}</div>
                  </div>
                )}

                {selectedConsent.risks && selectedConsent.risks.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Riesgos</div>
                    <ul className="list-disc list-inside space-y-1">
                      {selectedConsent.risks.map((risk, index) => (
                        <li key={index} className="text-base">{risk}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedConsent.benefits && selectedConsent.benefits.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Beneficios</div>
                    <ul className="list-disc list-inside space-y-1">
                      {selectedConsent.benefits.map((benefit, index) => (
                        <li key={index} className="text-base">{benefit}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedConsent.alternatives && selectedConsent.alternatives.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Alternativas</div>
                    <ul className="list-disc list-inside space-y-1">
                      {selectedConsent.alternatives.map((alternative, index) => (
                        <li key={index} className="text-base">{alternative}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedConsent.patientSignature && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Firma del Paciente</div>
                    <div className="text-base">
                      {selectedConsent.patientSignature.signerName} -{' '}
                      {format(new Date(selectedConsent.patientSignature.signedAt), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                    </div>
                  </div>
                )}

                {selectedConsent.doctorSignature && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Firma del Doctor</div>
                    <div className="text-base">
                      {selectedConsent.doctorSignature.signerName} -{' '}
                      {format(new Date(selectedConsent.doctorSignature.signedAt), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                    </div>
                  </div>
                )}

                <div className="text-sm text-muted-foreground">
                  <div>Creado: {format(new Date(selectedConsent.createdAt), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}</div>
                  {selectedConsent.expiresAt && (
                    <div>
                      Expira: {format(new Date(selectedConsent.expiresAt), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex gap-2 pt-4 border-t">
                  {selectedConsent.status === 'pending_signature' && (
                    <ModernButton
                      onClick={() => {
                        setShowSignatureModal(true)
                      }}
                      className="flex-1"
                    >
                      <PenTool className="h-4 w-4 mr-2" />
                      Firmar
                    </ModernButton>
                  )}
                  {selectedConsent.status === 'signed' && (
                    <ModernButton
                      onClick={() => handleDownloadPDF(selectedConsent._id)}
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Descargar PDF
                    </ModernButton>
                  )}
                  {(selectedConsent.status === 'signed' || selectedConsent.status === 'pending_signature') && (
                    <ModernButton
                      onClick={() => {
                        handleRevokeConsent(selectedConsent._id)
                        setSelectedConsent(null)
                      }}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Revocar
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

