/**
 * Servicio de Resultados de Laboratorio
 */

import { apiClient } from '../client'
import { API_ENDPOINTS } from '../config'

export interface LabResult {
  _id: string
  patientId: string
  testName: string
  testCode?: string
  value: number | string
  unit?: string
  status: 'normal' | 'abnormal'
  date: string
  referenceRange?: {
    low?: number
    high?: number
    text?: string
  }
  laboratoryId?: string
  laboratoryName?: string
  orderId?: string
  flagged?: boolean
  reviewedBy?: string
  reviewedAt?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface LabFilters {
  page?: number
  limit?: number
  status?: LabResult['status']
  patientId?: string
}

class LabService {
  private unwrap<T>(response: any): T {
    if (response && typeof response === 'object' && 'data' in response && 'success' in response) {
      return response.data as T
    }
    return response as T
  }

  async getResults(filters?: LabFilters): Promise<{ data: LabResult[]; total: number }> {
    const params = new URLSearchParams()
    if (filters?.page) params.append('page', String(filters.page))
    if (filters?.limit) params.append('limit', String(filters.limit))
    if (filters?.status) params.append('status', filters.status)
    if (filters?.category) params.append('category', filters.category)
    if (filters?.patientId) params.append('patientId', filters.patientId)

    const query = params.toString()
    const url = query ? `${API_ENDPOINTS.lab.results}?${query}` : API_ENDPOINTS.lab.results
    const response = await apiClient.get<any>(url)
    const data = this.unwrap<any>(response)
    if (Array.isArray(data)) return { data, total: data.length }
    return data
  }

  async getResult(id: string): Promise<LabResult> {
    const response = await apiClient.get<any>(API_ENDPOINTS.lab.result(id))
    return this.unwrap<LabResult>(response)
  }

  async getPatientResults(patientId: string): Promise<LabResult[]> {
    const response = await apiClient.get<any>(API_ENDPOINTS.lab.patientResults(patientId))
    const data = this.unwrap<any>(response)
    return Array.isArray(data) ? data : data?.data ?? []
  }

  async createOrder(data: {
    patientId: string
    testName: string
    testCode?: string
    category: LabResult['category']
    notes?: string
    metadata?: Record<string, unknown>
  }): Promise<LabResult> {
    const response = await apiClient.post<any>(API_ENDPOINTS.lab.createOrder, data)
    return this.unwrap<LabResult>(response)
  }
}

export const labService = new LabService()