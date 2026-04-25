/**
 * Servicio de Prescripciones Médicas
 */

import { apiClient } from '../client'
import { API_ENDPOINTS } from '../config'

export interface PrescriptionMedication {
  name: string
  dosage: string
  form?: string
  frequencyPerDay: number
  durationDays: number
  startDate?: string
  instructions?: string
  notes?: string
  reminderTimes?: string[] // HH:MM format
}

export interface Prescription {
  _id: string
  patientId: string
  doctorId: string
  createdBy: string
  diagnosis?: string
  observations?: string
  medications: PrescriptionMedication[]
  status: 'draft' | 'pending_validation' | 'active' | 'completed' | 'cancelled' | 'rejected'
  validatedBy?: string
  validatedAt?: string
  validationNotes?: string
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface CreatePrescriptionRequest {
  patientId: string
  doctorId: string
  diagnosis?: string
  observations?: string
  medications: PrescriptionMedication[]
}

export interface PrescriptionFilters {
  page?: number
  limit?: number
  status?: Prescription['status']
  patientId?: string
  doctorId?: string
}

class PrescriptionService {
  private unwrap<T>(response: any): T {
    if (response && typeof response === 'object' && 'data' in response && 'success' in response) {
      return response.data as T
    }
    return response as T
  }

  async list(filters?: PrescriptionFilters): Promise<{ data: Prescription[]; total: number; page: number }> {
    const params = new URLSearchParams()
    if (filters?.page) params.append('page', String(filters.page))
    if (filters?.limit) params.append('limit', String(filters.limit))
    if (filters?.status) params.append('status', filters.status)
    if (filters?.patientId) params.append('patientId', filters.patientId)
    if (filters?.doctorId) params.append('doctorId', filters.doctorId)

    const query = params.toString()
    const url = query ? `${API_ENDPOINTS.prescriptions.list}?${query}` : API_ENDPOINTS.prescriptions.list
    const response = await apiClient.get<any>(url)
    const data = this.unwrap<any>(response)
    if (Array.isArray(data)) return { data, total: data.length, page: 1 }
    return data
  }

  async get(id: string): Promise<Prescription> {
    const response = await apiClient.get<any>(API_ENDPOINTS.prescriptions.get(id))
    return this.unwrap<Prescription>(response)
  }

  async getMyPrescriptions(): Promise<Prescription[]> {
    const response = await apiClient.get<any>(API_ENDPOINTS.prescriptions.myPrescriptions)
    const data = this.unwrap<any>(response)
    return Array.isArray(data) ? data : data?.data ?? []
  }

  async create(data: CreatePrescriptionRequest): Promise<Prescription> {
    const response = await apiClient.post<any>(API_ENDPOINTS.prescriptions.create, data)
    return this.unwrap<Prescription>(response)
  }

  async update(id: string, data: Partial<CreatePrescriptionRequest>): Promise<Prescription> {
    const response = await apiClient.put<any>(API_ENDPOINTS.prescriptions.update(id), data)
    return this.unwrap<Prescription>(response)
  }

  async cancel(id: string, reason?: string): Promise<Prescription> {
    const response = await apiClient.post<any>(API_ENDPOINTS.prescriptions.cancel(id), { reason })
    return this.unwrap<Prescription>(response)
  }
}

export const prescriptionService = new PrescriptionService()