"use client"

import { useState, useEffect } from "react"
import { 
  Activity, 
  Search, 
  Plus, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  Loader2,
  FileText,
  ChevronRight,
  Calendar,
  ArrowLeft
} from "lucide-react"
import { ModernButton } from "@/components/ui/ModernButton"
import { ModernInput } from "@/components/ui/ModernInput"
import type { Translation, ViewState } from "@/lib/translations"
import { symptomAnalyzerService } from "@/lib/api/services/symptomAnalyzerService"
import { useAppStore } from "@/store/useAppStore"
import { toast } from "sonner"
import type { SymptomAnalysisRequest, SymptomAnalysisResult } from "@/lib/types"
import { mapSeverityToBackend } from "@/lib/types"
import { medicalHistoryService } from "@/lib/api/services/medicalHistoryService"

interface SymptomAnalyzerProps {
  t: Translation
  setCurrentView?: (view: ViewState) => void
}

// Síntomas comunes predefinidos
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

const DURATION_OPTIONS = [
  { value: '1', label: 'Menos de 1 día' },
  { value: '2-3', label: '2-3 días' },
  { value: '4-7', label: '4-7 días' },
  { value: '1-2 semanas', label: '1-2 semanas' },
  { value: '2-4 semanas', label: '2-4 semanas' },
  { value: 'Más de 1 mes', label: 'Más de 1 mes' }
]

interface SelectedSymptom {
  symptom: string
  severity: 'low' | 'moderate' | 'high' | 'severe'
  duration: string
}

export function SymptomAnalyzer({ t, setCurrentView }: SymptomAnalyzerProps) {
  const user = useAppStore((state) => state.user)
  const isEmergencyMode = useAppStore((state) => state.isEmergencyMode)
  
  const [step, setStep] = useState<'capture' | 'results' | 'history'>('capture')
  const [selectedSymptoms, setSelectedSymptoms] = useState<SelectedSymptom[]>([])
  const [customSymptom, setCustomSymptom] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<SymptomAnalysisResult | null>(null)
  const [history, setHistory] = useState<any[]>([])
  const [showSymptomForm, setShowSymptomForm] = useState(false)
  const [editingSymptomIndex, setEditingSymptomIndex] = useState<number | null>(null)
  const [tempSymptom, setTempSymptom] = useState<SelectedSymptom>({
    symptom: '',
    severity: 'moderate',
    duration: '2-3'
  })

  // Filtrar síntomas según búsqueda
  const filteredSymptoms = COMMON_SYMPTOMS.filter(symptom =>
    symptom.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Agregar síntoma a la lista
  const addSymptom = () => {
    if (!tempSymptom.symptom.trim()) {
      toast.error("Por favor ingresa un síntoma")
      return
    }

    if (editingSymptomIndex !== null) {
      // Editar síntoma existente
      const updated = [...selectedSymptoms]
      updated[editingSymptomIndex] = tempSymptom
      setSelectedSymptoms(updated)
      setEditingSymptomIndex(null)
    } else {
      // Agregar nuevo síntoma
      setSelectedSymptoms([...selectedSymptoms, tempSymptom])
    }

    // Resetear formulario
    setTempSymptom({
      symptom: '',
      severity: 'moderate',
      duration: '2-3'
    })
    setCustomSymptom("")
    setShowSymptomForm(false)
    toast.success(editingSymptomIndex !== null ? "Síntoma actualizado" : "Síntoma agregado")
  }

  // Seleccionar síntoma predefinido
  const selectPredefinedSymptom = (symptom: string) => {
    setTempSymptom({
      symptom,
      severity: 'moderate',
      duration: '2-3'
    })
    setShowSymptomForm(true)
  }

  // Editar síntoma
  const editSymptom = (index: number) => {
    setTempSymptom(selectedSymptoms[index])
    setEditingSymptomIndex(index)
    setShowSymptomForm(true)
  }

  // Eliminar síntoma
  const removeSymptom = (index: number) => {
    setSelectedSymptoms(selectedSymptoms.filter((_, i) => i !== index))
    toast.success("Síntoma eliminado")
  }

  // Analizar síntomas
  const analyzeSymptoms = async () => {
    if (selectedSymptoms.length === 0) {
      toast.error("Debes agregar al menos un síntoma para analizar")
      return
    }

    if (!user && !isEmergencyMode) {
      toast.error("Debes estar autenticado para analizar síntomas")
      return
    }

    setIsAnalyzing(true)
    try {
      const request: SymptomAnalysisRequest = {
        symptoms: selectedSymptoms.map(s => ({
          symptom: s.symptom,
          severity: s.severity,
          duration: s.duration
        })),
        context: `Análisis de síntomas para ${user?.name || 'Usuario de emergencia'}`,
        metadata: {
          source: 'mobile_app',
          emergency_mode: isEmergencyMode
        },
        patientId: user?._id
      }

      const result = await symptomAnalyzerService.analyze(request)
      // Asegurarse de que el resultado tenga la estructura correcta
      if (result && typeof result === 'object') {
        setAnalysisResult(result as SymptomAnalysisResult)
        setStep('results')
        toast.success("Análisis completado exitosamente")
      } else {
        throw new Error("Respuesta inválida del servidor")
      }
    } catch (error: any) {
      console.error("Error al analizar síntomas:", error)
      toast.error(error?.message || "Error al analizar síntomas. Intenta de nuevo.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Guardar en historial médico
  const saveToHistory = async () => {
    if (!analysisResult || !user) {
      toast.error("No se puede guardar sin estar autenticado")
      return
    }

    try {
      await medicalHistoryService.create({
        patientId: user._id,
        patientName: user.name,
        age: 0, // Se puede obtener del perfil si está disponible
        symptoms: selectedSymptoms.map(s => ({
          name: s.symptom,
          severity: mapSeverityToBackend(s.severity),
          duration: s.duration,
          description: `Duración: ${s.duration}`
        })),
        diagnosis: analysisResult.classification.recommendation || "Análisis de síntomas con IA",
        description: `Análisis automático completado el ${new Date().toLocaleDateString('es-ES')}. ` +
          `Categorías identificadas: ${analysisResult.classification.categories.join(', ')}. ` +
          `Nivel de urgencia: ${analysisResult.urgency_level}. ` +
          `Recomendaciones: ${analysisResult.recommendations.join('; ')}`
      })

      toast.success("Análisis guardado en historial médico")
      if (setCurrentView) {
        setCurrentView('history')
      }
    } catch (error: any) {
      console.error("Error al guardar en historial:", error)
      toast.error(error?.message || "Error al guardar en historial")
    }
  }

  // Cargar historial
  const loadHistory = async () => {
    if (!user) return

    try {
      const historyData = await symptomAnalyzerService.getHistory(user._id)
      setHistory(historyData)
      setStep('history')
    } catch (error: any) {
      console.error("Error al cargar historial:", error)
      toast.error("Error al cargar historial de análisis")
    }
  }

  // Obtener color según urgencia
  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  // Vista de captura de síntomas
  if (step === 'capture') {
    return (
      <div className="flex flex-col h-full animate-in fade-in duration-300 bg-slate-50/50 dark:bg-[#0f172a]">
        {/* Header */}
        <div className="sticky top-0 z-20 p-4 pb-2 bg-slate-50/50 dark:bg-[#0f172a] border-b border-border/50 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/30">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold dark:text-white">Analizador de Síntomas</h2>
              <p className="text-xs text-muted-foreground">Describe tus síntomas para obtener un análisis</p>
            </div>
            {user && (
              <ModernButton
                variant="outline"
                size="sm"
                onClick={loadHistory}
                className="text-xs"
              >
                <FileText className="w-4 h-4 mr-1" />
                Historial
              </ModernButton>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Síntomas seleccionados */}
          {selectedSymptoms.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold dark:text-white">Síntomas Seleccionados ({selectedSymptoms.length})</h3>
              <div className="space-y-2">
                {selectedSymptoms.map((symptom, index) => {
                  const severityOption = SEVERITY_OPTIONS.find(s => s.value === symptom.severity)
                  return (
                    <div
                      key={index}
                      className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-border/50 dark:border-slate-700 flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium dark:text-white">{symptom.symptom}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${severityOption?.color || ''}`}>
                            {severityOption?.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">Duración: {symptom.duration}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => editSymptom(index)}
                          className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                        >
                          <Search className="w-4 h-4 text-primary" />
                        </button>
                        <button
                          onClick={() => removeSymptom(index)}
                          className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Formulario de agregar síntoma */}
          {showSymptomForm ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-border/50 dark:border-slate-700 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold dark:text-white">
                  {editingSymptomIndex !== null ? "Editar Síntoma" : "Agregar Síntoma"}
                </h3>
                <button
                  onClick={() => {
                    setShowSymptomForm(false)
                    setEditingSymptomIndex(null)
                    setTempSymptom({ symptom: '', severity: 'moderate', duration: '2-3' })
                  }}
                  className="p-1 hover:bg-muted rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium dark:text-white mb-1 block">Síntoma</label>
                  <input
                    type="text"
                    value={tempSymptom.symptom}
                    onChange={(e) => setTempSymptom({ ...tempSymptom, symptom: e.target.value })}
                    placeholder="Ej: Tos seca, fiebre, etc."
                    className="w-full px-3 py-2 rounded-lg border border-border/50 dark:border-slate-700 bg-background dark:bg-slate-900 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium dark:text-white mb-1 block">Severidad</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SEVERITY_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setTempSymptom({ ...tempSymptom, severity: option.value as any })}
                        className={`px-3 py-2 rounded-lg border transition-colors ${
                          tempSymptom.severity === option.value
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
                  <label className="text-sm font-medium dark:text-white mb-1 block">Duración</label>
                  <select
                    value={tempSymptom.duration}
                    onChange={(e) => setTempSymptom({ ...tempSymptom, duration: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border/50 dark:border-slate-700 bg-background dark:bg-slate-900 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {DURATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <ModernButton
                  onClick={addSymptom}
                  className="w-full"
                >
                  {editingSymptomIndex !== null ? "Actualizar Síntoma" : "Agregar Síntoma"}
                </ModernButton>
              </div>
            </div>
          ) : (
            <ModernButton
              onClick={() => setShowSymptomForm(true)}
              variant="outline"
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar Síntoma Personalizado
            </ModernButton>
          )}

          {/* Síntomas comunes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold dark:text-white">Síntomas Comunes</h3>
              <div className="relative flex-1 max-w-xs ml-auto">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar síntoma..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border/50 dark:border-slate-700 bg-background dark:bg-slate-900 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {filteredSymptoms.map((symptom) => (
                <button
                  key={symptom}
                  onClick={() => selectPredefinedSymptom(symptom)}
                  disabled={selectedSymptoms.some(s => s.symptom === symptom)}
                  className="px-3 py-2 rounded-lg border border-border/50 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-muted dark:hover:bg-slate-700 transition-colors text-sm text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {symptom}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer con botón de análisis */}
        {selectedSymptoms.length > 0 && (
          <div className="p-4 bg-white dark:bg-[#1e293b] border-t border-border/50 dark:border-slate-700">
            <ModernButton
              onClick={analyzeSymptoms}
              isLoading={isAnalyzing}
              disabled={isAnalyzing || selectedSymptoms.length === 0}
              className="w-full text-lg h-14"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Analizando...
                </>
              ) : (
                <>
                  <Activity className="w-5 h-5 mr-2" />
                  Analizar Síntomas ({selectedSymptoms.length})
                </>
              )}
            </ModernButton>
          </div>
        )}
      </div>
    )
  }

  // Vista de resultados
  if (step === 'results' && analysisResult) {
    const urgencyColor = getUrgencyColor(analysisResult.urgency_level)
    
    return (
      <div className="flex flex-col h-full animate-in fade-in duration-300 bg-slate-50/50 dark:bg-[#0f172a]">
        {/* Header */}
        <div className="sticky top-0 z-20 p-4 pb-2 bg-slate-50/50 dark:bg-[#0f172a] border-b border-border/50 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep('capture')}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h2 className="text-xl font-bold dark:text-white">Resultados del Análisis</h2>
              <p className="text-xs text-muted-foreground">Análisis completado con IA</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Nivel de urgencia */}
          <div className={`rounded-xl p-4 border-2 ${urgencyColor}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span className="font-bold text-lg">Nivel de Urgencia</span>
              </div>
              <span className="text-2xl font-bold">
                {analysisResult.urgency_level.toUpperCase()}
              </span>
            </div>
            <p className="text-sm opacity-90">
              {analysisResult.classification.recommendation}
            </p>
          </div>

          {/* Confianza y severidad */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-border/50 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Confianza</span>
              </div>
              <p className="text-2xl font-bold dark:text-white">
                {Math.round(analysisResult.confidence_score * 100)}%
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-border/50 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Severidad</span>
              </div>
              <p className="text-2xl font-bold dark:text-white">
                {analysisResult.severity_score}/10
              </p>
            </div>
          </div>

          {/* Categorías */}
          {analysisResult.classification.categories.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-border/50 dark:border-slate-700">
              <h3 className="font-semibold dark:text-white mb-3">Categorías Identificadas</h3>
              <div className="flex flex-wrap gap-2">
                {analysisResult.classification.categories.map((category, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium"
                  >
                    {category}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Señales de advertencia */}
          {analysisResult.warning_signs && analysisResult.warning_signs.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <h3 className="font-semibold text-red-700 dark:text-red-400">Señales de Advertencia</h3>
              </div>
              <ul className="space-y-1">
                {analysisResult.warning_signs.map((sign, index) => (
                  <li key={index} className="text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                    <span className="mt-1">•</span>
                    <span>{sign}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recomendaciones */}
          {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-border/50 dark:border-slate-700">
              <h3 className="font-semibold dark:text-white mb-3">Recomendaciones</h3>
              <ul className="space-y-2">
                {analysisResult.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-foreground flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Seguimiento requerido */}
          {analysisResult.follow_up_required && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                <span className="font-semibold text-yellow-700 dark:text-yellow-400">
                  Se requiere seguimiento médico
                </span>
              </div>
            </div>
          )}

          {/* Información de procesamiento */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-border/50 dark:border-slate-700">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Procesado en {analysisResult.processing_time_ms}ms</span>
              <span>{new Date(analysisResult.analyzed_at).toLocaleString('es-ES')}</span>
            </div>
          </div>
        </div>

        {/* Footer con acciones */}
        {user && (
          <div className="p-4 bg-white dark:bg-[#1e293b] border-t border-border/50 dark:border-slate-700 space-y-2">
            <ModernButton
              onClick={saveToHistory}
              variant="outline"
              className="w-full"
            >
              <FileText className="w-4 h-4 mr-2" />
              Guardar en Historial Médico
            </ModernButton>
            <ModernButton
              onClick={() => {
                setStep('capture')
                setAnalysisResult(null)
                setSelectedSymptoms([])
              }}
              className="w-full"
            >
              Nuevo Análisis
            </ModernButton>
          </div>
        )}
      </div>
    )
  }

  // Vista de historial
  if (step === 'history') {
    return (
      <div className="flex flex-col h-full animate-in fade-in duration-300 bg-slate-50/50 dark:bg-[#0f172a]">
        <div className="sticky top-0 z-20 p-4 pb-2 bg-slate-50/50 dark:bg-[#0f172a] border-b border-border/50 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep('capture')}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h2 className="text-xl font-bold dark:text-white">Historial de Análisis</h2>
              <p className="text-xs text-muted-foreground">Análisis previos de síntomas</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No hay análisis previos</p>
            </div>
          ) : (
            history.map((item, index) => (
              <div
                key={index}
                className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-border/50 dark:border-slate-700"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium dark:text-white">
                        {new Date(item.date).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    {item.diagnosis && (
                      <p className="text-sm text-foreground mb-2">{item.diagnosis}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {item.symptoms?.slice(0, 3).map((symptom: any, i: number) => (
                        <span
                          key={i}
                          className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs"
                        >
                          {symptom.name || symptom.symptom}
                        </span>
                      ))}
                      {item.symptomCount > 3 && (
                        <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs">
                          +{item.symptomCount - 3} más
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  return null
}

