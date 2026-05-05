"use client"

import { Mic, MessageSquare, Activity } from "lucide-react"
import { ModernButton } from "@/components/ui/ModernButton"
import { ModernCard } from "@/components/ui/ModernCard"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"

interface ChatVoiceModalProps {
  open: boolean
  isRecording: boolean
  recordingType: 'transcribe' | 'cough' | null
  recordingTime: number
  onClose: () => void
  onStartRecording: (type: 'transcribe' | 'cough') => void
  onStopRecording: () => void
}

export function ChatVoiceModal({
  open,
  isRecording,
  recordingType,
  recordingTime,
  onClose,
  onStartRecording,
  onStopRecording,
}: ChatVoiceModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !isRecording) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Opciones de Voz</DialogTitle>
          <DialogDescription>Selecciona qué deseas hacer con el micrófono</DialogDescription>
        </DialogHeader>

        {!isRecording ? (
          <div className="space-y-3 mt-4">
            <ModernCard
              className="p-4 cursor-pointer hover:bg-primary/5 transition-colors border-2 border-transparent hover:border-primary/20"
              onClick={() => onStartRecording('transcribe')}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-base">Transcribir mensaje de voz</h3>
                  <p className="text-sm text-muted-foreground">
                    Graba tu mensaje y lo convertiré en texto para enviarlo al chat
                  </p>
                </div>
              </div>
            </ModernCard>

            <ModernCard
              className="p-4 cursor-pointer hover:bg-primary/5 transition-colors border-2 border-transparent hover:border-primary/20"
              onClick={() => onStartRecording('cough')}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-base">Analizar mi tos</h3>
                  <p className="text-sm text-muted-foreground">
                    Graba tu tos para que pueda analizarla y darte recomendaciones
                  </p>
                </div>
              </div>
            </ModernCard>
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            <div className="text-center py-8">
              <div className="relative w-24 h-24 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                <div className="absolute inset-0 rounded-full bg-red-500/30 animate-pulse" />
                <div className="absolute inset-2 rounded-full bg-red-500 flex items-center justify-center">
                  <Mic className="w-8 h-8 text-white" />
                </div>
              </div>
              <h3 className="font-bold text-lg mb-2">
                {recordingType === 'transcribe' ? 'Grabando mensaje...' : 'Grabando tos...'}
              </h3>
              <p className="text-2xl font-mono text-primary mb-4">
                {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {recordingType === 'transcribe'
                  ? 'Habla tu mensaje claramente'
                  : 'Tose cerca del micrófono para un mejor análisis'}
              </p>
              <div className="flex gap-3 justify-center">
                <ModernButton
                  variant="outline"
                  onClick={() => { onClose(); toast.info('Grabación cancelada') }}
                >
                  Cancelar
                </ModernButton>
                <ModernButton
                  onClick={onStopRecording}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  Detener grabación
                </ModernButton>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
