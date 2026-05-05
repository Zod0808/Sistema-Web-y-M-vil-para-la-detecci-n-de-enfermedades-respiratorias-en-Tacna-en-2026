"use client"

import { useState, useRef } from "react"
import { toast } from "sonner"
import { API_CONFIG, getAuthToken } from "@/lib/api/config"

interface UseImageAnalyzerProps {
  sessionId: string | null
  setIsLoading: (v: boolean) => void
  onAnalyzed: (userMsg: object, assistantMsg: object) => void
}

export function useImageAnalyzer({ sessionId, setIsLoading, onAnalyzed }: UseImageAnalyzerProps) {
  const [showImageModal, setShowImageModal] = useState(false)
  const [imageType, setImageType] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const IMAGE_TYPE_LABELS: Record<string, string> = {
    chest_xray: 'radiografía de tórax',
    chest_ct: 'tomografía computarizada',
    spirometry: 'espirometría',
    oximetry: 'oximetría',
    sputum: 'expectoración',
    skin_rash: 'erupción cutánea',
    cyanosis: 'cianosis',
    other: 'imagen médica',
  }

  const getImageTypeLabel = (type: string | null): string =>
    IMAGE_TYPE_LABELS[type || 'other'] || 'imagen médica'

  const openImageModal = () => setShowImageModal(true)

  const closeImageModal = () => {
    setShowImageModal(false)
    setImageType(null)
    setSelectedImage(null)
    setImagePreview(null)
  }

  const handleImageTypeSelect = (type: string) => setImageType(type)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Por favor selecciona una imagen válida'); return }
    if (file.size > 10 * 1024 * 1024) { toast.error('La imagen es muy grande. Máximo 10MB'); return }

    setSelectedImage(file)
    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const openImageSource = (source: 'gallery' | 'camera') => {
    const input = source === 'camera' ? cameraInputRef.current : imageInputRef.current
    input?.click()
  }

  const analyzeImage = async () => {
    if (!selectedImage || !imageType || !sessionId) {
      toast.error('Por favor selecciona una imagen y un tipo')
      return
    }

    setIsAnalyzingImage(true)
    setIsLoading(true)
    closeImageModal()

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(selectedImage)
      })

      const token = getAuthToken() || (typeof window !== 'undefined' ? localStorage.getItem('token') : '') || ''
      if (!token) throw new Error('No hay token de autenticación.')

      const res = await fetch(`${API_CONFIG.baseURL}/api/v1/chat/analyze-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, image_type: imageType, sessionId }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || `Error ${res.status}`)
      }

      const data = await res.json()
      const label = getImageTypeLabel(imageType)

      let content = ''
      if (data.fullAnalysis) {
        const full = data.fullAnalysis
        content = `📊 **Análisis de ${label}**\n\n`
        if (data.topPrediction) content += `🔍 **Predicción Principal:** ${data.topPrediction}\n📈 **Confianza:** ${((data.confidence || 0) * 100).toFixed(1)}%\n\n`
        if (full.analysis) content += `**Análisis Detallado:**\n${full.analysis}\n\n`
        if (full.recommendations?.length) content += `**Recomendaciones:**\n${full.recommendations.map((r: string) => `• ${r}`).join('\n')}\n`
      } else {
        const simple = data.analysis || data.result || 'Imagen procesada exitosamente.'
        content = `📊 **Análisis de ${label}**\n\n${simple}`
        if (data.confidence !== undefined) content += `\n\n📈 **Confianza:** ${(data.confidence * 100).toFixed(1)}%`
      }
      content += `\n\n⚠️ **Importante:** Este análisis es una herramienta de apoyo. Siempre consulta con un profesional médico.`

      onAnalyzed(
        { role: 'user', content: `He enviado una imagen de ${label} para análisis`, timestamp: new Date().toISOString(), metadata: { type: 'image_analysis', imageType } },
        { role: 'assistant', content, timestamp: new Date().toISOString(), metadata: { type: 'image_analysis', data, fullAnalysis: data.fullAnalysis, confidence: data.confidence, topPrediction: data.topPrediction, imageType } }
      )
      toast.success('Análisis de imagen completado')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al analizar la imagen')
    } finally {
      setIsAnalyzingImage(false)
      setIsLoading(false)
      setSelectedImage(null)
      setImagePreview(null)
      setImageType(null)
    }
  }

  const clearImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
  }

  const backToTypes = () => {
    setImageType(null)
    setSelectedImage(null)
    setImagePreview(null)
  }

  return {
    showImageModal,
    imageType,
    selectedImage,
    imagePreview,
    isAnalyzingImage,
    imageInputRef,
    cameraInputRef,
    getImageTypeLabel,
    openImageModal,
    closeImageModal,
    handleImageTypeSelect,
    handleImageSelect,
    openImageSource,
    analyzeImage,
    clearImage,
    backToTypes,
  }
}
