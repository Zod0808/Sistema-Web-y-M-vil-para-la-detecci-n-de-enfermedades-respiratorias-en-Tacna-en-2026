/**
 * Servicio de historias médicas
 */

import { apiClient } from '../client'
import { API_ENDPOINTS } from '../config'
import type { MedicalHistory, PaginatedResponse, Symptom } from '../../types'

export interface CreateMedicalHistoryRequest {
  patientId: string
  doctorId?: string // Opcional, puede ser el mismo patientId si el usuario es paciente
  patientName: string
  age: number
  diagnosis: string
  symptoms: Symptom[]
  description?: string
  date?: string
  location?: {
    latitude: number
    longitude: number
    address: string
  }
  images?: string[]
  audioNotes?: string
  isOffline?: boolean
  syncStatus?: 'pending' | 'synced' | 'error'
}

export interface UpdateMedicalHistoryRequest extends Partial<CreateMedicalHistoryRequest> {}

export interface MedicalHistoryFilters {
  page?: number
  limit?: number
  startDate?: string
  endDate?: string
  patientId?: string
  doctorId?: string
  diagnosis?: string
}

export class MedicalHistoryService {
  async list(filters?: MedicalHistoryFilters): Promise<PaginatedResponse<MedicalHistory>> {
    const params = new URLSearchParams()
    
    if (filters?.page) params.append('page', filters.page.toString())
    if (filters?.limit) params.append('limit', filters.limit.toString())
    if (filters?.startDate) params.append('startDate', filters.startDate)
    if (filters?.endDate) params.append('endDate', filters.endDate)
    if (filters?.patientId) params.append('patientId', filters.patientId)
    if (filters?.doctorId) params.append('doctorId', filters.doctorId)
    if (filters?.diagnosis) params.append('diagnosis', filters.diagnosis)

    const query = params.toString()
    const endpoint = query ? `${API_ENDPOINTS.medicalHistories.list}?${query}` : API_ENDPOINTS.medicalHistories.list

    const response = await apiClient.get<PaginatedResponse<MedicalHistory> | MedicalHistory[]>(endpoint)
    
    // Manejar diferentes formatos de respuesta
    if (Array.isArray(response)) {
      return { data: response, total: response.length, page: 1, limit: response.length, totalPages: 1 }
    }
    return response as PaginatedResponse<MedicalHistory>
  }

  async get(id: string): Promise<MedicalHistory> {
    return apiClient.get<MedicalHistory>(API_ENDPOINTS.medicalHistories.get(id))
  }

  async create(data: CreateMedicalHistoryRequest): Promise<MedicalHistory> {
    const response = await apiClient.post<{ success: boolean; data: MedicalHistory } | MedicalHistory>(
      API_ENDPOINTS.medicalHistories.create,
      data
    )
    // Manejar diferentes formatos de respuesta
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as { success: boolean; data: MedicalHistory }).data
    }
    return response as MedicalHistory
  }

  async update(id: string, data: UpdateMedicalHistoryRequest): Promise<MedicalHistory> {
    const response = await apiClient.put<{ success: boolean; data: MedicalHistory } | MedicalHistory>(
      API_ENDPOINTS.medicalHistories.update(id),
      data
    )
    // Manejar diferentes formatos de respuesta
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as { success: boolean; data: MedicalHistory }).data
    }
    return response as MedicalHistory
  }

  async delete(id: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.medicalHistories.delete(id))
  }

  async sync(histories: MedicalHistory[]): Promise<{ synced: number; errors: number }> {
    const response = await apiClient.post<{ success: boolean; data: { synced: number; errors: number } } | { synced: number; errors: number }>(
      API_ENDPOINTS.medicalHistories.sync,
      { histories }
    )
    // Manejar diferentes formatos de respuesta
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as { success: boolean; data: { synced: number; errors: number } }).data
    }
    return response as { synced: number; errors: number }
  }

  async getStats(): Promise<any> {
    return apiClient.get(API_ENDPOINTS.medicalHistories.stats)
  }
}

export const medicalHistoryService = new MedicalHistoryService()

