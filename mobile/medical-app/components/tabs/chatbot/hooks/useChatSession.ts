"use client"

import { useState, useEffect, useRef } from "react"
import { chatService } from "@/lib/api/services/chatService"
import { toast } from "sonner"
import type { ChatMessage } from "@/lib/api/services/chatService"
import type { Translation } from "@/lib/translations"
import type { useChatStorage } from "./useChatStorage"

interface UseChatSessionProps {
  userId: string | undefined
  isEmergencyMode: boolean
  t: Translation
  storage: ReturnType<typeof useChatStorage>
}

export function useChatSession({ userId, isEmergencyMode, t, storage }: UseChatSessionProps) {
  const { loadPersistedData, saveMessages, saveSessionId } = storage

  const persisted = loadPersistedData()
  const [messages, setMessages] = useState<ChatMessage[]>(persisted.messages)
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(persisted.sessionId)
  const [isInitializing, setIsInitializing] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Persist messages whenever they change
  useEffect(() => {
    if (messages.length > 0 && typeof window !== 'undefined') {
      saveMessages(messages)
    }
  }, [messages, userId])

  // Persist sessionId whenever it changes
  useEffect(() => {
    if (sessionId) saveSessionId(sessionId)
  }, [sessionId, userId])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Initialize chat session on mount / user change
  useEffect(() => {
    const initializeChat = async () => {
      const uid = userId || `emergency_${Date.now()}`
      try {
        setIsInitializing(true)
        const persisted = loadPersistedData()

        if (persisted.messages.length > 0) {
          setMessages(persisted.messages)
          if (persisted.sessionId) setSessionId(persisted.sessionId)
        }

        let newSessionId = persisted.sessionId

        if (!newSessionId) {
          const result = await chatService.createConversation({
            userId: uid,
            userInfo: {
              name: (userId && 'Usuario') || 'Usuario de Emergencia',
              email: 'chat@respicare.local',
              role: 'patient',
              isEmergency: isEmergencyMode,
            },
            location: { city: 'Tacna', country: 'Perú' },
            metadata: { isEmergencyMode },
          })
          newSessionId = result.sessionId
          setSessionId(newSessionId)
          saveSessionId(newSessionId)
        }

        try {
          const conversation = await chatService.getConversation(newSessionId!)
          if (conversation.messages?.length > 0) {
            setMessages(conversation.messages)
            saveMessages(conversation.messages)
          } else if (persisted.messages.length > 0) {
            setMessages(persisted.messages)
          } else {
            const welcome: ChatMessage = {
              role: 'assistant',
              content: isEmergencyMode
                ? "Hola, estás en modo de emergencia. ¿Cómo puedo ayudarte con tu situación médica urgente?"
                : t.chat.welcome,
              timestamp: new Date().toISOString(),
            }
            setMessages([welcome])
            saveMessages([welcome])
          }
        } catch {
          if (persisted.messages.length > 0) setMessages(persisted.messages)
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Error al conectar con el asistente médico"
        toast.error(msg)
      } finally {
        setIsInitializing(false)
      }
    }

    initializeChat()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isEmergencyMode])

  const handleSendMessage = async (content?: string) => {
    // Guard: si se invoca como onClick, React pasa el evento como argumento.
    // Solo aceptar strings; cualquier otra cosa usa el valor del input.
    const text = (typeof content === 'string' ? content : '') || inputValue.trim()
    if (!text || isLoading || !sessionId) return

    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: new Date().toISOString() }
    setMessages((prev) => [...prev, userMsg])
    setInputValue("")
    setIsLoading(true)

    try {
      const result = await chatService.sendMessage(sessionId, text)
      if (result.assistantMessage) {
        setMessages((prev) => [...prev, result.assistantMessage!])
      } else {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: 'Lo siento, no pude procesar tu mensaje. Por favor intenta de nuevo.',
          timestamp: new Date().toISOString(),
        }])
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error al enviar mensaje")
      setMessages((prev) => prev.filter((_, idx) => idx !== prev.length - 1))
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: 'Lo siento, hubo un error. Por favor intenta de nuevo.',
        timestamp: new Date().toISOString(),
      }])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleSuggestionClick = (suggestion: string) => handleSendMessage(suggestion)

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return {
    messages,
    setMessages,
    inputValue,
    setInputValue,
    isLoading,
    setIsLoading,
    sessionId,
    isInitializing,
    messagesEndRef,
    inputRef,
    handleSendMessage,
    handleSuggestionClick,
    handleKeyPress,
  }
}
