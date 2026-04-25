/**
 * Servicio de Emergencias / SOS
 */

import { apiClient } from '../client'
import { API_ENDPOINTS } from '../config'

export interface Emergency {
  _id: string
  patientId: string
  reportedBy: string
  type: 'respiratory_distress' | 'chest_pain' | 'unconscious' | 'severe_allergic' | 'other'
  severity: 'critical' | 'high' | 'medium'
  description: string
  location?: {
    latitude: number
    longitude: number
    address?: string
  }
  status: 'active' | 'responding' | 'resolved' | 'cancelled'
  assignedTo?: string
  responseTime?: number // minutos
  resolvedAt?: string
  notes?: string
  contactPhone?: string
  createdAt: string
  updatedAt: string
}

export interface CreateEmergencyRequest {
  patientId?: string
  type: Emergency['type']
  severity?: Emergency['severity']
  description: string
  location?: Emergency['location']
  contactPhone?: string
}

class EmergencyService {
  private unwrap<T>(response: any): T {
    if (response && typeof response === 'object' && 'data' in response && 'success' in response) {
      return response.data as T
    }
    return response as T
  }

  async create(data: CreateEmergencyRequest): Promise<Emergency> {
    const response = await apiClient.post<any>(API_ENDPOINTS.emergencies.create, data)
    return this.unwrap<Emergency>(response)
  }

  async list(): Promise<Emergency[]> {
    const response = await apiClient.get<any>(API_ENDPOINTS.emergencies.list)
    const data = this.unwrap<any>(response)
    return Array.isArray(data) ? data : data?.data ?? []
  }

  async getActive(): Promise<Emergency[]> {
    const response = await apiClient.get<any>(API_ENDPOINTS.emergencies.active)
    const data = this.unwrap<any>(response)
    return Array.isArray(data) ? data : data?.data ?? []
  }

  async get(id: string): Promise<Emergency> {
    const response = await apiClient.get<any>(API_ENDPOINTS.emergencies.get(id))
    return this.unwrap<Emergency>(response)
  }

  async resolve(id: string, notes?: string): Promise<Emergency> {
    const response = await apiClient.post<any>(API_ENDPOINTS.emergencies.resolve(id), { notes })
    return this.unwrap<Emergency>(response)
  }
}

export const emergencyService = new EmergencyService()