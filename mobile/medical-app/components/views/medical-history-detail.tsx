"use client"

import { useState, useEffect } from "react"
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  Stethoscope,
  FileText,
  ImageIcon,
  Mic,
  X,
  Maximize2,
  Loader2
} from "lucide-react"
import { ModernButton } from "@/components/ui/ModernButton"
import type { Translation, ViewState } from "@/lib/translations"
import { medicalHistoryService } from "@/lib/api/services/medicalHistoryService"
import { fileUploadService } from "@/lib/api/services/fileUploadService"
import { LazyImage } from "@/lib/utils/lazyLoad"
import { useAppStore } from "@/store/useAppStore"
import { toast } from "sonner"
import type { MedicalHistory } from "@/lib/types"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface MedicalHistoryDetailProps {
  t: Translation
  historyId: string
  onBack?: () => void
  setCurrentView?: (view: ViewState) => void
}

const SEVERITY_COLORS: Record<string, string> = {
  mild: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  moderate: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  severe: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
}

const SEVERITY_LABELS: Record<string, string> = {
  mild: 'Leve',
  moderate: 'Moderado',
  severe: 'Severo'
}

export function MedicalHistoryDetail({ 
  t, 
  historyId, 
  onBack,
  setCurrentView 
}: MedicalHistoryDetailProps) {
  const user = useAppStore((state) => state.user)
  
  const [history, setHistory] = useState<MedicalHistory | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  const [imageUrls, setImageUrls] = useState<string[]>([])

  useEffect(() => {
    loadHistory()
  }, [historyId])

  useEffect(() => {
    if (history?.images && history.images.length > 0) {
      // Convertir paths a URLs completas
      const urls = history.images.map(img => {
        if (img.startsWith('http://') || img.startsWith('https://')) {
          return img
        }
        return fileUploadService.getImageUrl(img)
      })
      setImageUrls(urls)
    }
  }, [history])

  const loadHistory = async () => {
    setIsLoading(true)
    try {
      const data = await medicalHistoryService.get(historyId)
      setHistory(data)
    } catch (error: any) {
      console.error("Error al cargar historia:", error)
      toast.error("Error al cargar los detalles de la historia médica")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Cargando detalles...</p>
        </div>
      </div>
    )
  }

  if (!history) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Historia médica no encontrada</p>
          {onBack && (
            <ModernButton onClick={onBack} variant="outline">
              Volver
            </ModernButton>
          )}
        </div>
      </div>
    )
  }

  const historyDate = new Date(history.date)
  const hasImages = history.images && history.images.length > 0
  const hasAudio = history.audioNotes

  // Vista ampliada de imagen
  if (selectedImageIndex !== null && imageUrls[selectedImageIndex]) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
        <div className="relative w-full h-full flex items-center justify-center">
          <button
            onClick={() => setSelectedImageIndex(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>
          <LazyImage
            src={imageUrls[selectedImageIndex]}
            alt={`Síntoma ${selectedImageIndex + 1}`}
            className="max-w-full max-h-full object-contain"
            onError={(e) => {
              // Si falla la carga, intentar con la URL base64 original
              const target = e.target as HTMLImageElement
              if (history.images && history.images[selectedImageIndex]) {
                target.src = history.images[selectedImageIndex]
              }
            }}
          />
        </div>
      </div>
    )
  }

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
            <h2 className="text-xl font-bold dark:text-white">Historia Médica</h2>
            <p className="text-xs text-muted-foreground">
              {format(historyDate, "PPP", { locale: es })}
            </p>
          </div>
          {history.syncStatus && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
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
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Información Principal */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-border/50 dark:border-slate-700 space-y-4">
          <div>
            <h3 className="font-bold text-lg dark:text-white mb-2">{history.diagnosis}</h3>
            {history.description && (
              <p className="text-sm dark:text-white whitespace-pre-wrap leading-relaxed">
                {history.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50 dark:border-slate-700">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Paciente</p>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium dark:text-white">
                  {history.patientName}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Edad</p>
              <span className="text-sm font-medium dark:text-white">
                {history.age} años
              </span>
            </div>
          </div>
        </div>

        {/* Síntomas */}
        {history.symptoms && history.symptoms.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-border/50 dark:border-slate-700 space-y-3">
            <h3 className="font-semibold dark:text-white flex items-center gap-2">
              <Stethoscope className="w-4 h-4" />
              Síntomas ({history.symptoms.length})
            </h3>
            <div className="space-y-2">
              {history.symptoms.map((symptom, index) => {
                const severityColor = SEVERITY_COLORS[symptom.severity] || SEVERITY_COLORS.moderate
                const severityLabel = SEVERITY_LABELS[symptom.severity] || 'Moderado'
                
                return (
                  <div
                    key={index}
                    className="p-3 bg-secondary/50 dark:bg-slate-700/50 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium dark:text-white">{symptom.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${severityColor}`}>
                        {severityLabel}
                      </span>
                    </div>
                    {symptom.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {symptom.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Duración: {symptom.duration} día(s)
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Imágenes */}
        {hasImages && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-border/50 dark:border-slate-700 space-y-3">
            <h3 className="font-semibold dark:text-white flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Imágenes de Síntomas ({history.images!.length})
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {history.images!.map((img, index) => {
                const imageUrl = imageUrls[index] || img
                return (
                  <div
                    key={index}
                    className="relative group aspect-square rounded-lg overflow-hidden border border-border/50 dark:border-slate-700 bg-secondary cursor-pointer"
                    onClick={() => setSelectedImageIndex(index)}
                  >
                    <img
                      src={imageUrl}
                      alt={`Síntoma ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Si falla la carga, intentar con la URL base64 original
                        const target = e.target as HTMLImageElement
                        target.src = img
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Maximize2 className="w-5 h-5 text-white" />
                    </div>
                    <div className="absolute top-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                      {index + 1}
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Toca una imagen para ampliar
            </p>
          </div>
        )}

        {/* Audio */}
        {hasAudio && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-border/50 dark:border-slate-700 space-y-3">
            <h3 className="font-semibold dark:text-white flex items-center gap-2">
              <Mic className="w-4 h-4" />
              Nota de Audio
            </h3>
            <audio
              src={fileUploadService.getAudioUrl(history.audioNotes!)}
              controls
              className="w-full"
              onError={(e) => {
                // Si falla la carga, intentar con la URL original
                const target = e.target as HTMLAudioElement
                target.src = history.audioNotes!
              }}
            />
          </div>
        )}

        {/* Ubicación */}
        {history.location && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-border/50 dark:border-slate-700 space-y-3">
            <h3 className="font-semibold dark:text-white flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Ubicación
            </h3>
            <p className="text-sm dark:text-white">
              {history.location.address}
            </p>
            <p className="text-xs text-muted-foreground">
              {history.location.latitude.toFixed(6)}, {history.location.longitude.toFixed(6)}
            </p>
          </div>
        )}

        {/* Información Temporal */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-border/50 dark:border-slate-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Fecha
            </span>
            <span className="text-sm font-medium dark:text-white">
              {format(historyDate, "PPP 'a las' HH:mm", { locale: es })}
            </span>
          </div>
          {history.createdAt && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Creada
              </span>
              <span className="text-sm font-medium dark:text-white">
                {format(new Date(history.createdAt), "PPP 'a las' HH:mm", { locale: es })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

