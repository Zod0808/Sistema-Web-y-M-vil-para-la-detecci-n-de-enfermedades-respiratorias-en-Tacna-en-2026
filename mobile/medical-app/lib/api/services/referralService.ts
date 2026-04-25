/**
 * Servicio de Referidos Médicos
 */

import { apiClient } from '../client'
import { API_ENDPOINTS } from '../config'

export interface Referral {
  _id: string
  patientId: string
  referringDoctorId: string
  referredDoctorId?: string
  referredSpecialty: string
  reason: string
  urgency: 'routine' | 'urgent' | 'emergency'
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled'
  notes?: string
  diagnosis?: string
  attachments?: string[]
  scheduledAt?: string
  completedAt?: string
  rejectionReason?: string
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface CreateReferralRequest {
  patientId: string
  referredSpecialty: string
  reason: string
  urgency?: Referral['urgency']
  notes?: string
  diagnosis?: string
  referredDoctorId?: string
}

export interface ReferralFilters {
  page?: number
  limit?: number
  status?: Referral['status']
  patientId?: string
  urgency?: Referral['urgency']
}

class ReferralService {
  private unwrap<T>(response: any): T {
    if (response && typeof response === 'object' && 'data' in response && 'success' in response) {
      return response.data as T
    }
    return response as T
  }

  async list(filters?: ReferralFilters): Promise<{ data: Referral[]; total: number }> {
    const params = new URLSearchParams()
    if (filters?.page) params.append('page', String(filters.page))
    if (filters?.limit) params.append('limit', String(filters.limit))
    if (filters?.status) params.append('status', filters.status)
    if (filters?.patientId) params.append('patientId', filters.patientId)
    if (filters?.urgency) params.append('urgency', filters.urgency)

    const query = params.toString()
    const url = query ? `${API_ENDPOINTS.referrals.list}?${query}` : API_ENDPOINTS.referrals.list
    const response = await apiClient.get<any>(url)
    const data = this.unwrap<any>(response)
    if (Array.isArray(data)) return { data, total: data.length }
    return data
  }

  async get(id: string): Promise<Referral> {
    const response = await apiClient.get<any>(API_ENDPOINTS.referrals.get(id))
    return this.unwrap<Referral>(response)
  }

  async getMyReferrals(): Promise<Referral[]> {
    const response = await apiClient.get<any>(API_ENDPOINTS.referrals.myReferrals)
    const data = this.unwrap<any>(response)
    return Array.isArray(data) ? data : data?.data ?? []
  }

  async create(data: CreateReferralRequest): Promise<Referral> {
    const response = await apiClient.post<any>(API_ENDPOINTS.referrals.create, data)
    return this.unwrap<Referral>(response)
  }

  async accept(id: string, notes?: string): Promise<Referral> {
    const response = await apiClient.post<any>(API_ENDPOINTS.referrals.accept(id), { notes })
    return this.unwrap<Referral>(response)
  }

  async reject(id: string, reason: string): Promise<Referral> {
    const response = await apiClient.post<any>(API_ENDPOINTS.referrals.reject(id), { reason })
    return this.unwrap<Referral>(response)
  }

  async complete(id: string, notes?: string): Promise<Referral> {
    const response = await apiClient.post<any>(API_ENDPOINTS.referrals.complete(id), { notes })
    return this.unwrap<Referral>(response)
  }
}

export const referralService = new ReferralService()