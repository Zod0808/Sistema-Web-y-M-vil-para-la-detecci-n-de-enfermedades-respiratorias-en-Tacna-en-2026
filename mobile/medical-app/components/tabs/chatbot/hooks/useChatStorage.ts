"use client"

import type { ChatMessage } from "@/lib/api/services/chatService"

export function useChatStorage(userId: string | undefined) {
  const uid = userId || 'anonymous'

  const getStorageKey = () => `chatbot_messages_${uid}`
  const getSessionStorageKey = () => `chatbot_session_${uid}`

  const loadPersistedData = (): { messages: ChatMessage[]; sessionId: string | null } => {
    if (typeof window === 'undefined') return { messages: [], sessionId: null }
    try {
      const storedMessages = localStorage.getItem(getStorageKey())
      const storedSession = localStorage.getItem(getSessionStorageKey())
      return {
        messages: storedMessages ? JSON.parse(storedMessages) : [],
        sessionId: storedSession || null,
      }
    } catch {
      return { messages: [], sessionId: null }
    }
  }

  const saveMessages = (newMessages: ChatMessage[]) => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(newMessages))
    } catch {
      // storage full — silently ignore
    }
  }

  const saveSessionId = (id: string | null) => {
    if (typeof window === 'undefined') return
    try {
      if (id) {
        localStorage.setItem(getSessionStorageKey(), id)
      } else {
        localStorage.removeItem(getSessionStorageKey())
      }
    } catch {
      // silently ignore
    }
  }

  return { loadPersistedData, saveMessages, saveSessionId }
}
