/**
 * Servicio de dashboard y analytics
 */

import { apiClient } from '../client'
import { API_ENDPOINTS } from '../config'
import type { DashboardStats } from '../../types'

export class DashboardService {
  async getAdminDashboard(): Promise<DashboardStats> {
    return apiClient.get<DashboardStats>(API_ENDPOINTS.dashboard.admin)
  }

  async getDoctorDashboard(): Promise<DashboardStats> {
    return apiClient.get<DashboardStats>(API_ENDPOINTS.dashboard.doctor)
  }

  async getPatientDashboard(): Promise<DashboardStats> {
    return apiClient.get<DashboardStats>(API_ENDPOINTS.dashboard.patient)
  }

  async getExecutiveDashboard(): Promise<any> {
    return apiClient.get(API_ENDPOINTS.analytics.executiveDashboard)
  }

  async getTemporalTrends(filters?: { startDate?: string; endDate?: string }): Promise<any> {
    const params = new URLSearchParams()
    if (filters?.startDate) params.append('startDate', filters.startDate)
    if (filters?.endDate) params.append('endDate', filters.endDate)

    const query = params.toString()
    const endpoint = query
      ? `${API_ENDPOINTS.analytics.temporalTrends}?${query}`
      : API_ENDPOINTS.analytics.temporalTrends

    return apiClient.get(endpoint)
  }

  async getDiseaseReports(): Promise<any> {
    return apiClient.get(API_ENDPOINTS.analytics.diseaseReports)
  }

  async getSymptomSummary(): Promise<any> {
    return apiClient.get(API_ENDPOINTS.analytics.symptomSummary)
  }
}

export const dashboardService = new DashboardService()

