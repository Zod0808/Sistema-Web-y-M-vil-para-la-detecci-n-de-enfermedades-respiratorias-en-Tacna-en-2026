/**
 * Servicio de autenticación
 */

import { apiClient } from '../client'
import { API_ENDPOINTS, setAuthTokens, clearAuthTokens, setUser } from '../config'
import type { User, AuthResponse, LoginRequest, RegisterRequest } from '../../types'

export class AuthService {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      API_ENDPOINTS.auth.login,
      credentials
    )
    
    // Guardar tokens y usuario
    setAuthTokens(response.token, response.refreshToken)
    setUser(response.user)
    
    return response
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      API_ENDPOINTS.auth.register,
      data
    )
    
    // Guardar tokens y usuario
    setAuthTokens(response.token, response.refreshToken)
    setUser(response.user)
    
    return response
  }

  async getProfile(): Promise<User> {
    return apiClient.get<User>(API_ENDPOINTS.auth.profile)
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await apiClient.put<User>(API_ENDPOINTS.auth.profile, data)
    setUser(response)
    return response
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await apiClient.put(API_ENDPOINTS.auth.changePassword, {
      oldPassword,
      newPassword,
    })
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.auth.logout)
    } catch (error) {
      // Continuar con el logout incluso si la petición falla
      console.error('Error al cerrar sesión en el servidor:', error)
    } finally {
      clearAuthTokens()
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      API_ENDPOINTS.auth.refreshToken,
      { refreshToken }
    )
    
    setAuthTokens(response.token, response.refreshToken)
    setUser(response.user)
    
    return response
  }
}

export const authService = new AuthService()

