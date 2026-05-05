"use client"

import { useState, useRef } from "react"
import { toast } from "sonner"
import { API_CONFIG, getAuthToken } from "@/lib/api/config"

interface UseVoiceRecorderProps {
  sessionId: string | null
  setIsLoading: (v: boolean) => void
  onTranscribed: (text: string) => Promise<void>
  onCoughAnalyzed: (userMsg: object, assistantMsg: object) => void
}

export function useVoiceRecorder({ sessionId, setIsLoading, onTranscribed, onCoughAnalyzed }: UseVoiceRecorderProps) {
  const [showVoiceModal, setShowVoiceModal] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingType, setRecordingType] = useState<'transcribe' | 'cough' | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

  const openVoiceModal = () => setShowVoiceModal(true)

  const closeVoiceModal = () => {
    setShowVoiceModal(false)
    if (isRecording) stopRecording()
    setRecordingType(null)
    setRecordingTime(0)
  }

  const startRecording = async (type: 'transcribe' | 'cough') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      audioChunksRef.current = []
      setRecordingType(type)

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        try {
          if (type === 'transcribe') await handleTranscribeAudio(blob)
          else await handleAnalyzeCough(blob)
        } catch {
          toast.error('Error al procesar el audio')
        }
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        setRecordingType(null)
        setRecordingTime(0)
        setShowVoiceModal(false)
      }

      recorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      recordingTimerRef.current = setInterval(() => setRecordingTime((p) => p + 1), 1000)
      toast.info(type === 'transcribe' ? 'Grabando mensaje de voz...' : 'Grabando tos para análisis...')
    } catch {
      toast.error('No se pudo acceder al micrófono. Verifica los permisos.')
      setRecordingType(null)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
      toast.success('Grabación completada. Procesando...')
    }
  }

  const handleTranscribeAudio = async (audioBlob: Blob) => {
    if (!sessionId) { toast.error('No hay sesión activa'); return }
    try {
      setIsLoading(true)
      const token = getAuthToken() || (typeof window !== 'undefined' ? localStorage.getItem('token') : '') || ''
      if (!token) throw new Error('No hay token de autenticación.')

      const form = new FormData()
      form.append('audio', audioBlob, 'voice-message.webm')
      form.append('type', 'transcribe')

      const res = await fetch(`${API_CONFIG.baseURL}/api/v1/chat/transcribe`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || `Error ${res.status}`)
      }

      const data = await res.json()
      const text = data.text || data.transcription || data.data?.text || ''
      if (!text.trim()) throw new Error('No se pudo obtener el texto transcrito.')

      await onTranscribed(text)
      toast.success('Mensaje transcrito y enviado')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al transcribir el audio')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnalyzeCough = async (audioBlob: Blob) => {
    if (!sessionId) { toast.error('No hay sesión activa'); return }
    try {
      setIsLoading(true)
      const token = getAuthToken() || (typeof window !== 'undefined' ? localStorage.getItem('token') : '') || ''
      if (!token) throw new Error('No hay token de autenticación.')

      const form = new FormData()
      form.append('audio', audioBlob, 'cough-audio.webm')
      form.append('type', 'cough_analysis')
      form.append('sessionId', sessionId)

      const res = await fetch(`${API_CONFIG.baseURL}/api/v1/chat/analyze-cough`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || `Error ${res.status}`)
      }

      const data = await res.json()
      const analysis = data.analysis || data.result || data.data?.analysis || 'Análisis completado'

      onCoughAnalyzed(
        { role: 'user', content: 'He grabado mi tos para análisis', timestamp: new Date().toISOString(), metadata: { type: 'cough_analysis' } },
        {
          role: 'assistant',
          content: typeof analysis === 'string' ? analysis : `Análisis de tos:\n${JSON.stringify(analysis, null, 2)}`,
          timestamp: new Date().toISOString(),
          metadata: { type: 'cough_analysis', data },
        }
      )
      toast.success('Análisis de tos completado')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al analizar la tos')
    } finally {
      setIsLoading(false)
    }
  }

  const cleanup = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
  }

  return {
    showVoiceModal,
    isRecording,
    recordingType,
    recordingTime,
    openVoiceModal,
    closeVoiceModal,
    startRecording,
    stopRecording,
    cleanup,
  }
}
