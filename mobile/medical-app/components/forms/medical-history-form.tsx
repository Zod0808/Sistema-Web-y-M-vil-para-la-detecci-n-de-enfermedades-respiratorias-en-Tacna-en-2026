"use client"

import { useState, useEffect, useRef } from "react"
import {
  Save,
  X,
  Plus,
  ImageIcon,
  Mic,
  MapPin,
  Calendar,
  User,
  Stethoscope,
  FileText,
  Loader2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Upload,
  Play,
  Pause,
  Square
} from "lucide-react"
import { ModernButton } from "@/components/ui/ModernButton"
import { ModernInput } from "@/components/ui/ModernInput"
import type { Translation, ViewState } from "@/lib/translations"
import { medicalHistoryService, type CreateMedicalHistoryRequest } from "@/lib/api/services/medicalHistoryService"
import { fileUploadService } from "@/lib/api/services/fileUploadService"
import { createMedicalHistoryOffline, updateMedicalHistoryOffline } from "@/lib/services/offlineOperations"
import { useAppStore } from "@/store/useAppStore"
import { toast } from "sonner"
import type { MedicalHistory, Symptom } from "@/lib/types"
import { mapSeverityToBackend, BACKEND_TO_UI_SEVERITY } from "@/lib/types"
import { useNetworkStatus } from "@/hooks/useNetworkStatus"
import { ImageCapture } from "@/components/ui/image-capture"

interface MedicalHistoryFormProps {
  t: Translation
  historyToEdit?: MedicalHistory | null
  onSave?: () => void
  onCancel?: () => void
  setCurrentView?: (view: ViewState) => void
}

// Síntomas comunes (reutilizado del analizador)
const COMMON_SYMPTOMS = [
  "Tos seca",
  "Tos con flema",
  "Falta de aire",
  "Dificultad para respirar",
  "Dolor en el pecho",
  "Fiebre",
  "Escalofríos",
  "Dolor de garganta",
  "Congestión nasal",
  "Secreción nasal",
  "Estornudos",
  "Fatiga",
  "Dolor de cabeza",
  "Pérdida del olfato",
  "Pérdida del gusto",
  "Dolor muscular",
  "Náuseas",
  "Vómitos",
  "Diarrea"
]

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Leve', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'moderate', label: 'Moderado', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  { value: 'high', label: 'Alto', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  { value: 'severe', label: 'Severo', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
]

interface SymptomForm {
  name: string
  severity: 'low' | 'moderate' | 'high' | 'severe'
  duration: number
  description?: string
}

export function MedicalHistoryForm({ 
  t, 
  historyToEdit, 
  onSave, 
  onCancel,
  setCurrentView 
}: MedicalHistoryFormProps) {
  const user = useAppStore((state) => state.user)
  const { isOnline } = useNetworkStatus()
  const addMedicalHistory = useAppStore((state) => state.addMedicalHistory)
  const updateMedicalHistory = useAppStore((state) => state.updateMedicalHistory)

  const isEditMode = !!historyToEdit

  // Estados del formulario
  const [patientName, setPatientName] = useState(historyToEdit?.patientName || user?.name || "")
  const [age, setAge] = useState(historyToEdit?.age?.toString() || "")
  const [diagnosis, setDiagnosis] = useState(historyToEdit?.diagnosis || "")
  const [description, setDescription] = useState(historyToEdit?.description || "")
  const [symptoms, setSymptoms] = useState<SymptomForm[]>(
    historyToEdit?.symptoms?.map(s => ({
      name: s.name,
      severity: (BACKEND_TO_UI_SEVERITY[s.severity] ?? s.severity) as SymptomForm['severity'],
      duration: typeof s.duration === 'string' ? parseInt(s.duration) || 1 : (s.duration as unknown as number),
      description: s.description
    })) || []
  )
  const [images, setImages] = useState<string[]>(historyToEdit?.images || [])
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(historyToEdit?.audioNotes || null)
  const [isRecording, setIsRecording] = useState(false)
  const [location, setLocation] = useState<{ latitude: number; longitude: number; address: string } | null>(
    historyToEdit?.location || null
  )

  // Estados de UI
  const [isSaving, setIsSaving] = useState(false)
  const [showSymptomForm, setShowSymptomForm] = useState(false)
  const [editingSymptomIndex, setEditingSymptomIndex] = useState<number | null>(null)
  const [currentSymptom, setCurrentSymptom] = useState<SymptomForm>({
    name: '',
    severity: 'moderate',
    duration: 1,
    description: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // Validación del formulario
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!patientName.trim()) {
      newErrors.patientName = "El nombre del paciente es requerido"
    }

    const ageNum = parseInt(age)
    if (!age || isNaN(ageNum) || ageNum < 0 || ageNum > 150) {
      newErrors.age = "La edad debe ser un número entre 0 y 150"
    }

    if (!diagnosis.trim()) {
      newErrors.diagnosis = "El diagnóstico es requerido"
    } else if (diagnosis.length > 200) {
      newErrors.diagnosis = "El diagnóstico no puede exceder 200 caracteres"
    }

    if (description && description.length > 1000) {
      newErrors.description = "La descripción no puede exceder 1000 caracteres"
    }

    if (symptoms.length === 0) {
      newErrors.symptoms = "Debe agregar al menos un síntoma"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Agregar síntoma
  const addSymptom = () => {
    if (!currentSymptom.name.trim()) {
      toast.error("El nombre del síntoma es requerido")
      return
    }

    if (editingSymptomIndex !== null) {
      const updated = [...symptoms]
      updated[editingSymptomIndex] = currentSymptom
      setSymptoms(updated)
      setEditingSymptomIndex(null)
      toast.success("Síntoma actualizado")
    } else {
      setSymptoms([...symptoms, currentSymptom])
      toast.success("Síntoma agregado")
    }

    setCurrentSymptom({ name: '', severity: 'moderate', duration: 1, description: '' })
    setShowSymptomForm(false)
    setErrors(prev => ({ ...prev, symptoms: '' }))
  }

  // Eliminar síntoma
  const removeSymptom = (index: number) => {
    setSymptoms(symptoms.filter((_, i) => i !== index))
  }

  // Editar síntoma
  const editSymptom = (index: number) => {
    setCurrentSymptom(symptoms[index])
    setEditingSymptomIndex(index)
    setShowSymptomForm(true)
  }

  // Seleccionar síntoma predefinido
  const selectPredefinedSymptom = (name: string) => {
    setCurrentSymptom({ ...currentSymptom, name })
    setShowSymptomForm(true)
  }

  // Manejar cambio de imágenes
  const handleImagesChange = (newImages: string[], newFiles: File[]) => {
    setImages(newImages)
    setImageFiles(newFiles)
  }

  // Obtener ubicación
  const getLocation = () => {
    if (!navigator.geolocation) {
      toast.error("La geolocalización no está disponible")
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        
        // Intentar obtener dirección (usando un servicio de geocodificación inversa simple)
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          )
          const data = await response.json()
          const address = data.display_name || `${latitude}, ${longitude}`
          
          setLocation({ latitude, longitude, address })
          toast.success("Ubicación obtenida")
        } catch (error) {
          setLocation({ latitude, longitude, address: `${latitude}, ${longitude}` })
          toast.success("Ubicación obtenida (sin dirección)")
        }
      },
      (error) => {
        toast.error("No se pudo obtener la ubicación")
        console.error(error)
      }
    )
  }

  // Grabación de audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(audioBlob)
        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)
        
        // Detener todos los tracks
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      toast.info("Grabación iniciada")
    } catch (error) {
      toast.error("No se pudo acceder al micrófono")
      console.error(error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      toast.success("Grabación detenida")
    }
  }

  const deleteAudio = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioUrl(null)
    setAudioBlob(null)
  }

  // Guardar historia médica
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
      // Subir imágenes al servidor si hay archivos
      let uploadedImages: string[] = []
      
      if (imageFiles.length > 0) {
        try {
          const uploadedUrls = await fileUploadService.uploadImages(imageFiles)
          uploadedImages = uploadedUrls
          toast.success(`${uploadedImages.length} imagen(es) subida(s) exitosamente`)
        } catch (uploadError: any) {
          console.error("Error al subir imágenes:", uploadError)
          // Si falla la subida, usar las imágenes base64 como fallback
          uploadedImages = images
          toast.warning("No se pudieron subir las imágenes al servidor. Se guardarán localmente.")
        }
      } else if (images.length > 0) {
        // Si hay imágenes base64 pero no archivos (editando), usar las URLs existentes
        uploadedImages = images
      }

      // Subir audio si existe
      let audioUrlFinal: string | undefined = audioUrl || undefined
      
      if (audioBlob) {
        try {
          // Convertir blob a File
          const audioFile = new File([audioBlob], 'audio.webm', { type: 'audio/webm' })
          const uploadedAudioUrl = await fileUploadService.uploadAudio(audioFile)
          audioUrlFinal = uploadedAudioUrl
          toast.success("Audio subido exitosamente")
        } catch (uploadError: any) {
          console.error("Error al subir audio:", uploadError)
          toast.warning("No se pudo subir el audio al servidor")
        }
      }

      // Para el doctorId, si el usuario es paciente, usar su propio ID
      // Si es doctor, usar su ID. Si no hay doctor asignado, usar el patientId
      const doctorId = user.role === 'doctor' ? user._id : (historyToEdit?.doctorId || user._id)

      const historyData: CreateMedicalHistoryRequest = {
        patientId: user._id,
        doctorId: doctorId,
        patientName: patientName.trim(),
        age: parseInt(age),
        diagnosis: diagnosis.trim(),
        symptoms: symptoms.map(s => ({
          name: s.name,
          severity: mapSeverityToBackend(s.severity),
          duration: String(s.duration),
          description: s.description
        })),
        description: description.trim() || undefined,
        date: historyToEdit?.date || new Date().toISOString(),
        location: location || undefined,
        images: uploadedImages.length > 0 ? uploadedImages : undefined,
        audioNotes: audioUrlFinal,
        isOffline: !isOnline,
        syncStatus: !isOnline ? 'pending' : 'synced'
      }

      let savedHistory: MedicalHistory

      if (isEditMode && historyToEdit) {
        // Actualizar con soporte offline
        const result = await updateMedicalHistoryOffline(historyToEdit._id, historyData, isOnline)
        
        if (result.isOffline) {
          // Crear historia temporal para mostrar en UI
          savedHistory = {
            ...historyToEdit,
            ...historyData,
            syncStatus: 'pending',
            isOffline: true,
            _id: historyToEdit._id,
            createdAt: historyToEdit.createdAt,
            updatedAt: new Date().toISOString()
          } as MedicalHistory
          updateMedicalHistory(historyToEdit._id, savedHistory)
          toast.success("Historia médica guardada (se sincronizará cuando vuelva la conexión)")
        } else {
          // Actualización exitosa online
          savedHistory = await medicalHistoryService.get(historyToEdit._id)
          updateMedicalHistory(historyToEdit._id, savedHistory)
          toast.success("Historia médica actualizada exitosamente")
        }
      } else {
        // Crear con soporte offline
        const result = await createMedicalHistoryOffline(historyData, isOnline)
        
        if (result.isOffline) {
          // Crear historia temporal para mostrar en UI
          savedHistory = {
            ...historyData,
            _id: result.id,
            syncStatus: 'pending',
            isOffline: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          } as MedicalHistory
          addMedicalHistory(savedHistory)
          toast.success("Historia médica guardada (se sincronizará cuando vuelva la conexión)")
        } else {
          // Creación exitosa online
          savedHistory = await medicalHistoryService.get(result.id)
          addMedicalHistory(savedHistory)
          toast.success("Historia médica guardada exitosamente")
        }
      }

      if (onSave) {
        onSave()
      } else if (setCurrentView) {
        setCurrentView('history')
      }
    } catch (error: any) {
      console.error("Error al guardar historia médica:", error)
      toast.error(error?.message || "Error al guardar la historia médica")
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
                {isEditMode ? "Editar Historia Médica" : "Nueva Historia Médica"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isOnline ? "Conectado" : "Modo offline"}
              </p>
            </div>
          </div>
          {!isOnline && (
            <div className="px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-medium">
              Offline
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Información Básica */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-border/50 dark:border-slate-700 space-y-4">
          <h3 className="font-semibold dark:text-white flex items-center gap-2">
            <User className="w-4 h-4" />
            Información Básica
          </h3>

          <div>
            <label className="text-sm font-medium dark:text-white mb-1 block">
              Nombre del Paciente *
            </label>
            <input
              type="text"
              value={patientName}
              onChange={(e) => {
                setPatientName(e.target.value)
                setErrors(prev => ({ ...prev, patientName: '' }))
              }}
              className={`w-full px-3 py-2 rounded-lg border ${
                errors.patientName ? 'border-red-500' : 'border-border/50 dark:border-slate-700'
              } bg-background dark:bg-slate-900 text-foreground focus:outline-none focus:ring-2 focus:ring-primary`}
              placeholder="Nombre completo"
            />
            {errors.patientName && (
              <p className="text-xs text-red-500 mt-1">{errors.patientName}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium dark:text-white mb-1 block">
              Edad *
            </label>
            <input
              type="number"
              value={age}
              onChange={(e) => {
                setAge(e.target.value)
                setErrors(prev => ({ ...prev, age: '' }))
              }}
              min="0"
              max="150"
              className={`w-full px-3 py-2 rounded-lg border ${
                errors.age ? 'border-red-500' : 'border-border/50 dark:border-slate-700'
              } bg-background dark:bg-slate-900 text-foreground focus:outline-none focus:ring-2 focus:ring-primary`}
              placeholder="Edad"
            />
            {errors.age && (
              <p className="text-xs text-red-500 mt-1">{errors.age}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium dark:text-white mb-1 block">
              Diagnóstico *
            </label>
            <input
              type="text"
              value={diagnosis}
              onChange={(e) => {
                setDiagnosis(e.target.value)
                setErrors(prev => ({ ...prev, diagnosis: '' }))
              }}
              maxLength={200}
              className={`w-full px-3 py-2 rounded-lg border ${
                errors.diagnosis ? 'border-red-500' : 'border-border/50 dark:border-slate-700'
              } bg-background dark:bg-slate-900 text-foreground focus:outline-none focus:ring-2 focus:ring-primary`}
              placeholder="Ej: Resfriado común, Asma, etc."
            />
            <p className="text-xs text-muted-foreground mt-1">
              {diagnosis.length}/200 caracteres
            </p>
            {errors.diagnosis && (
              <p className="text-xs text-red-500 mt-1">{errors.diagnosis}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium dark:text-white mb-1 block">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                setErrors(prev => ({ ...prev, description: '' }))
              }}
              maxLength={1000}
              rows={4}
              className={`w-full px-3 py-2 rounded-lg border ${
                errors.description ? 'border-red-500' : 'border-border/50 dark:border-slate-700'
              } bg-background dark:bg-slate-900 text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none`}
              placeholder="Descripción adicional de la consulta..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              {description.length}/1000 caracteres
            </p>
            {errors.description && (
              <p className="text-xs text-red-500 mt-1">{errors.description}</p>
            )}
          </div>
        </div>

        {/* Síntomas */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-border/50 dark:border-slate-700 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold dark:text-white flex items-center gap-2">
              <Stethoscope className="w-4 h-4" />
              Síntomas {symptoms.length > 0 && `(${symptoms.length})`} *
            </h3>
            {errors.symptoms && (
              <p className="text-xs text-red-500">{errors.symptoms}</p>
            )}
          </div>

          {/* Lista de síntomas */}
          {symptoms.length > 0 && (
            <div className="space-y-2">
              {symptoms.map((symptom, index) => {
                const severityOption = SEVERITY_OPTIONS.find(s => s.value === symptom.severity)
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-secondary/50 dark:bg-slate-700/50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium dark:text-white">{symptom.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${severityOption?.color || ''}`}>
                          {severityOption?.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Duración: {symptom.duration} día(s)
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => editSymptom(index)}
                        className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                      >
                        <FileText className="w-4 h-4 text-primary" />
                      </button>
                      <button
                        onClick={() => removeSymptom(index)}
                        className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Formulario de síntoma */}
          {showSymptomForm ? (
            <div className="p-4 bg-secondary/30 dark:bg-slate-700/30 rounded-lg space-y-3">
              <div>
                <label className="text-sm font-medium dark:text-white mb-1 block">Síntoma *</label>
                <input
                  type="text"
                  value={currentSymptom.name}
                  onChange={(e) => setCurrentSymptom({ ...currentSymptom, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border/50 dark:border-slate-700 bg-background dark:bg-slate-900 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: Tos seca, fiebre..."
                />
              </div>
              <div>
                <label className="text-sm font-medium dark:text-white mb-1 block">Severidad</label>
                <div className="grid grid-cols-2 gap-2">
                  {SEVERITY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setCurrentSymptom({ ...currentSymptom, severity: option.value as any })}
                      className={`px-3 py-2 rounded-lg border transition-colors ${
                        currentSymptom.severity === option.value
                          ? `${option.color} border-current`
                          : 'border-border/50 dark:border-slate-700 hover:bg-muted'
                      }`}
                    >
                      <span className="text-sm font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium dark:text-white mb-1 block">Duración (días)</label>
                <input
                  type="number"
                  value={currentSymptom.duration}
                  onChange={(e) => setCurrentSymptom({ ...currentSymptom, duration: parseInt(e.target.value) || 0 })}
                  min="0"
                  className="w-full px-3 py-2 rounded-lg border border-border/50 dark:border-slate-700 bg-background dark:bg-slate-900 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex gap-2">
                <ModernButton onClick={addSymptom} className="flex-1">
                  {editingSymptomIndex !== null ? "Actualizar" : "Agregar"}
                </ModernButton>
                <ModernButton
                  variant="outline"
                  onClick={() => {
                    setShowSymptomForm(false)
                    setEditingSymptomIndex(null)
                    setCurrentSymptom({ name: '', severity: 'moderate', duration: 1, description: '' })
                  }}
                >
                  Cancelar
                </ModernButton>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <ModernButton
                variant="outline"
                onClick={() => setShowSymptomForm(true)}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Síntoma
              </ModernButton>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {COMMON_SYMPTOMS.slice(0, 8).map((symptom) => (
                  <button
                    key={symptom}
                    onClick={() => selectPredefinedSymptom(symptom)}
                    className="px-3 py-2 rounded-lg border border-border/50 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-muted text-sm text-left transition-colors"
                  >
                    {symptom}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Imágenes */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-border/50 dark:border-slate-700 space-y-4">
          <h3 className="font-semibold dark:text-white flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Imágenes de Síntomas
          </h3>
          <ImageCapture
            images={images}
            imageFiles={imageFiles}
            onImagesChange={handleImagesChange}
            maxImages={5}
            maxSizeMB={5}
            disabled={isSaving}
          />
        </div>

        {/* Audio */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-border/50 dark:border-slate-700 space-y-4">
          <h3 className="font-semibold dark:text-white flex items-center gap-2">
            <Mic className="w-4 h-4" />
            Notas de Audio
          </h3>
          {audioUrl ? (
            <div className="space-y-2">
              <audio src={audioUrl} controls className="w-full" />
              <ModernButton
                variant="outline"
                onClick={deleteAudio}
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar Audio
              </ModernButton>
            </div>
          ) : (
            <div className="flex gap-2">
              {!isRecording ? (
                <ModernButton
                  onClick={startRecording}
                  variant="outline"
                  className="flex-1"
                >
                  <Mic className="w-4 h-4 mr-2" />
                  Grabar Audio
                </ModernButton>
              ) : (
                <ModernButton
                  onClick={stopRecording}
                  variant="outline"
                  className="flex-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Detener Grabación
                </ModernButton>
              )}
            </div>
          )}
        </div>

        {/* Ubicación */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-border/50 dark:border-slate-700 space-y-4">
          <h3 className="font-semibold dark:text-white flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Ubicación
          </h3>
          {location ? (
            <div className="p-3 bg-secondary/50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-sm dark:text-white">{location.address}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </p>
            </div>
          ) : (
            <ModernButton
              onClick={getLocation}
              variant="outline"
              className="w-full"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Obtener Ubicación Actual
            </ModernButton>
          )}
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
              {isEditMode ? "Actualizar Historia" : "Guardar Historia"}
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

