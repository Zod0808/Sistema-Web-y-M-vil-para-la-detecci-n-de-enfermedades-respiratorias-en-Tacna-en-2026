/**
 * Cliente HTTP para comunicarse con el backend RespiCare
 */

import { API_CONFIG } from './config'
import { getAuthToken, getRefreshToken, clearAuthTokens, setAuthTokens } from './config'

export interface ApiError {
  message: string
  status?: number
  errors?: any
}

export class ApiClient {
  private baseURL: string
  private timeout: number

  constructor() {
    this.baseURL = API_CONFIG.baseURL
    this.timeout = API_CONFIG.timeout
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = getAuthToken()
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      // Detectar si es una ruta de chat y usar la baseURL correcta
      const isChatEndpoint = endpoint.includes('/chat-conversations')
      const baseURL = isChatEndpoint ? API_CONFIG.chatBaseURL : this.baseURL
      const fullURL = `${baseURL}${endpoint}`
      console.log(`[API] ${options.method || 'GET'} ${fullURL}`)
      
      const response = await fetch(fullURL, {
        ...options,
        headers,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      
      console.log(`[API] Response status: ${response.status} ${response.statusText}`)

      // Detectar errores de red
      if (!response.ok && response.status === 0) {
        // Error de red (offline)
        throw new Error('Sin conexión a internet')
      }

      // Si el token expiró, intentar refrescar
      if (response.status === 401 && token) {
        const refreshed = await this.refreshAccessToken()
        if (refreshed) {
          // Reintentar la petición original con el nuevo token
          const newToken = getAuthToken()
          if (newToken) {
            headers['Authorization'] = `Bearer ${newToken}`
            const retryResponse = await fetch(`${this.baseURL}${endpoint}`, {
              ...options,
              headers,
              signal: controller.signal,
            })
            return this.handleResponse<T>(retryResponse)
          }
        }
        // Si no se pudo refrescar, limpiar tokens y lanzar error
        clearAuthTokens()
        throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.')
      }

      return this.handleResponse<T>(response)
    } catch (error: unknown) {
      clearTimeout(timeoutId)
      
      console.error(`[API] Error en ${options.method || 'GET'} ${this.baseURL}${endpoint}:`, error)
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('La solicitud tardó demasiado. Intenta nuevamente.')
        }
        
        // Si es un error de red (fetch failed)
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          throw new Error(`No se pudo conectar al servidor. Verifica que el backend esté corriendo en ${this.baseURL}`)
        }
        
        throw error
      }
      
      throw new Error('Error de conexión. Verifica tu conexión a internet.')
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type')
    const isJson = contentType?.includes('application/json')

    if (!response.ok) {
      const errorData = isJson ? await response.json().catch(() => ({})) : {}
      const error: ApiError = {
        message: errorData.message || `Error ${response.status}: ${response.statusText}`,
        status: response.status,
        errors: errorData.errors,
      }
      throw error
    }

    if (response.status === 204 || !isJson) {
      return {} as T
    }

    const data = await response.json()
    return data.data || data
  }

  private async refreshAccessToken(): Promise<boolean> {
    const refreshToken = getRefreshToken()
    if (!refreshToken) return false

    try {
      const response = await fetch(`${this.baseURL}/api/v1/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      })

      if (!response.ok) {
        return false
      }

      const data = await response.json()
      if (data.data?.token && data.data?.refreshToken) {
        setAuthTokens(data.data.token, data.data.refreshToken)
        return true
      }

      return false
    } catch {
      return false
    }
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  async post<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async patch<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }
}

export const apiClient = new ApiClient()

