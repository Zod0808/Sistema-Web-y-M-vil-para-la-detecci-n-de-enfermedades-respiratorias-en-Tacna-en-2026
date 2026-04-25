/**
 * Servicio de alertas
 */

import { apiClient } from '../client'
import { API_ENDPOINTS } from '../config'
import type { Alert, AlertCategory, AlertPriority, AlertStatus, PaginatedResponse } from '../../types'

export interface AlertFilters {
  page?: number
  limit?: number
  category?: AlertCategory
  priority?: AlertPriority
  status?: AlertStatus
}

export class AlertService {
  async list(filters?: AlertFilters): Promise<PaginatedResponse<Alert>> {
    const params = new URLSearchParams()
    
    if (filters?.page) params.append('page', filters.page.toString())
    if (filters?.limit) params.append('limit', filters.limit.toString())
    if (filters?.category) params.append('category', filters.category)
    if (filters?.priority) params.append('priority', filters.priority)
    if (filters?.status) params.append('status', filters.status)

    const query = params.toString()
    const endpoint = query ? `${API_ENDPOINTS.alerts.list}?${query}` : API_ENDPOINTS.alerts.list

    const response = await apiClient.get<PaginatedResponse<Alert> | Alert[] | { success: boolean; data: Alert[] }>(endpoint)
    
    // Manejar diferentes formatos de respuesta
    if (Array.isArray(response)) {
      return { data: response, total: response.length, page: 1, limit: response.length, totalPages: 1 }
    }
    if (response && typeof response === 'object' && 'data' in response) {
      const data = (response as { success: boolean; data: Alert[] }).data
      return { data, total: data.length, page: 1, limit: data.length, totalPages: 1 }
    }
    return response as PaginatedResponse<Alert>
  }

  async acknowledge(alertId: string): Promise<Alert> {
    const response = await apiClient.post<{ success: boolean; data: Alert } | Alert>(
      API_ENDPOINTS.alerts.acknowledge(alertId)
    )
    // Manejar diferentes formatos de respuesta
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as { success: boolean; data: Alert }).data
    }
    return response as Alert
  }

  async getDashboardSummary(): Promise<any> {
    const response = await apiClient.get<{ success: boolean; data: any } | any>(
      API_ENDPOINTS.alerts.dashboard
    )
    // Manejar diferentes formatos de respuesta
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as { success: boolean; data: any }).data
    }
    return response
  }
}

export const alertService = new AlertService()

