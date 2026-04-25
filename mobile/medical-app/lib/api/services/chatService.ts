/**
 * Servicio de chat/conversaciones
 */

import { apiClient } from '../client'
import { API_ENDPOINTS } from '../config'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
  metadata?: any
}

export interface ChatConversation {
  _id: string
  sessionId: string
  userId: string
  messages: ChatMessage[]
  location?: {
    city: string
    country: string
  }
  metadata?: any
  createdAt: string
  updatedAt: string
}

export interface CreateConversationRequest {
  userId: string
  userInfo?: any
  location?: {
    district?: string
    city: string
    country: string
  }
  metadata?: any
}

export class ChatService {
  async createConversation(data: CreateConversationRequest): Promise<{ sessionId: string; _id: string }> {
    return apiClient.post<{ sessionId: string; _id: string }>(
      API_ENDPOINTS.chat.conversations,
      data
    )
  }

  async getConversation(sessionId: string): Promise<ChatConversation> {
    const response = await apiClient.get<{ data: ChatConversation }>(
      API_ENDPOINTS.chat.getConversation(sessionId)
    )
    const conversation = (response.data || response) as ChatConversation
    
    // Map 'bot' role to 'assistant' for frontend compatibility
    if (conversation.messages) {
      conversation.messages = conversation.messages.map(msg => ({
        ...msg,
        role: (msg.role as string) === 'bot' ? 'assistant' : msg.role
      }))
    }
    
    return conversation
  }

  async getConversations(filters?: {
    userId?: string
    limit?: number
  }): Promise<ChatConversation[]> {
    const params = new URLSearchParams()
    if (filters?.userId) params.append('userId', filters.userId)
    if (filters?.limit) params.append('limit', filters.limit.toString())

    const query = params.toString()
    const endpoint = query ? `${API_ENDPOINTS.chat.conversations}?${query}` : API_ENDPOINTS.chat.conversations

    const response = await apiClient.get<{ data: ChatConversation[]; count: number }>(endpoint)
    return Array.isArray(response.data) ? response.data : response.data || []
  }

  async sendMessage(
    sessionId: string,
    content: string,
    metadata?: any
  ): Promise<{ userMessage: ChatMessage; assistantMessage?: ChatMessage }> {
    // Enviar mensaje del usuario - el backend ahora devuelve la respuesta del asistente directamente
    const response = await apiClient.post<{
      success: boolean
      message: string
      data: {
        userMessage: ChatMessage
        assistantMessage?: ChatMessage
        messageCount: number
      }
    }>(
      API_ENDPOINTS.chat.messages(sessionId),
      {
        role: 'user',
        content,
        metadata,
      }
    )
    
    // El backend ahora devuelve ambos mensajes en la respuesta
    if (response.data?.userMessage && response.data?.assistantMessage) {
      return {
        userMessage: response.data.userMessage,
        assistantMessage: {
          ...response.data.assistantMessage,
          role: 'assistant' // Asegurar que el role sea 'assistant' para el frontend
        }
      }
    }
    
    // Fallback: si el backend no devuelve los mensajes, obtener la conversación
    const conversation = await this.getConversation(sessionId)
    const messages = conversation.messages || []
    const userMessage = messages[messages.length - 2] // Último mensaje del usuario
    const assistantMessage = messages[messages.length - 1] // Respuesta del asistente
    
    return {
      userMessage: userMessage || { role: 'user', content, timestamp: new Date().toISOString() },
      assistantMessage: assistantMessage ? {
        ...assistantMessage,
        role: (assistantMessage.role as string) === 'bot' ? 'assistant' : assistantMessage.role
      } : undefined
    }
  }

  async completeConversation(sessionId: string): Promise<void> {
    await apiClient.put(API_ENDPOINTS.chat.completeConversation(sessionId))
  }
}

export const chatService = new ChatService()

