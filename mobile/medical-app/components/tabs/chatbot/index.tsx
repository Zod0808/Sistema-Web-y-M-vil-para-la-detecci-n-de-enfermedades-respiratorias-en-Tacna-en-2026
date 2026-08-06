"use client"

import { useEffect } from "react"
import { Bot, Loader2 } from "lucide-react"
import { useAppStore } from "@/store/useAppStore"
import type { Translation } from "@/lib/translations"
import type { ChatMessage } from "@/lib/api/services/chatService"

import { useChatStorage } from "./hooks/useChatStorage"
import { useChatSession } from "./hooks/useChatSession"
import { useVoiceRecorder } from "./hooks/useVoiceRecorder"
import { useImageAnalyzer } from "./hooks/useImageAnalyzer"
import { ChatMessageList } from "./ChatMessageList"
import { ChatInputBar } from "./ChatInputBar"
import { ChatVoiceModal } from "./ChatVoiceModal"
import { ChatImageModal } from "./ChatImageModal"

interface ChatViewProps {
  t: Translation
}

export function ChatView({ t }: ChatViewProps) {
  const user = useAppStore((state) => state.user)
  const isEmergencyMode = useAppStore((state) => state.isEmergencyMode)

  const storage = useChatStorage(user?._id)

  const session = useChatSession({ userId: user?._id, isEmergencyMode, t, storage })

  const voice = useVoiceRecorder({
    sessionId: session.sessionId,
    setIsLoading: session.setIsLoading,
    onTranscribed: session.handleSendMessage,
    onCoughAnalyzed: (userMsg, assistantMsg) => {
      session.setMessages((prev) => [...prev, userMsg as ChatMessage, assistantMsg as ChatMessage])
    },
  })

  const image = useImageAnalyzer({
    sessionId: session.sessionId,
    setIsLoading: session.setIsLoading,
    onAnalyzed: (userMsg, assistantMsg) => {
      session.setMessages((prev) => [...prev, userMsg as ChatMessage, assistantMsg as ChatMessage])
    },
  })

  // Cleanup voice resources on unmount
  useEffect(() => {
    return () => { voice.cleanup() }
     
  }, [])

  if (session.isInitializing) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Conectando con el asistente médico...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300 bg-slate-50/50 dark:bg-[#0f172a]">
      {/* Header */}
      <div className="sticky top-0 left-0 right-0 z-20 p-4 pb-2">
        <div className="bg-white/80 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl p-3 shadow-sm flex items-center gap-3 border border-white/20 dark:border-slate-700">
          <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm dark:text-white">
              {isEmergencyMode ? "Asistente de Emergencia" : "Asistente Médico"}
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-blue-300 font-medium">
              {session.sessionId ? (isEmergencyMode ? "Modo Emergencia - Conectado" : "Conectado") : "Conectando..."}
            </p>
          </div>
          <div className="ml-auto pr-2">
            <span className={`w-2 h-2 rounded-full block ${session.sessionId ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-yellow-500'}`} />
          </div>
        </div>
      </div>

      <ChatMessageList
        messages={session.messages}
        isLoading={session.isLoading}
        getImageTypeLabel={image.getImageTypeLabel}
        messagesEndRef={session.messagesEndRef}
      />

      <ChatInputBar
        inputValue={session.inputValue}
        setInputValue={session.setInputValue}
        isLoading={session.isLoading}
        sessionId={session.sessionId}
        isRecording={voice.isRecording}
        isAnalyzingImage={image.isAnalyzingImage}
        inputRef={session.inputRef}
        t={t}
        onSend={session.handleSendMessage}
        onKeyPress={session.handleKeyPress}
        onSuggestionClick={session.handleSuggestionClick}
        onOpenVoice={voice.openVoiceModal}
        onOpenImage={image.openImageModal}
        showSuggestions={session.messages.length === 1}
      />

      <ChatVoiceModal
        open={voice.showVoiceModal}
        isRecording={voice.isRecording}
        recordingType={voice.recordingType}
        recordingTime={voice.recordingTime}
        onClose={voice.closeVoiceModal}
        onStartRecording={voice.startRecording}
        onStopRecording={voice.stopRecording}
      />

      <ChatImageModal
        open={image.showImageModal}
        imageType={image.imageType}
        selectedImage={image.selectedImage}
        imagePreview={image.imagePreview}
        isAnalyzingImage={image.isAnalyzingImage}
        imageInputRef={image.imageInputRef}
        cameraInputRef={image.cameraInputRef}
        getImageTypeLabel={image.getImageTypeLabel}
        onClose={image.closeImageModal}
        onTypeSelect={image.handleImageTypeSelect}
        onImageSelect={image.handleImageSelect}
        onOpenSource={image.openImageSource}
        onAnalyze={image.analyzeImage}
        onClearImage={image.clearImage}
        onBackToTypes={image.backToTypes}
      />
    </div>
  )
}
