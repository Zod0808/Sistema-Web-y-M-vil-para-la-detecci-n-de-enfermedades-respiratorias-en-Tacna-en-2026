/**
 * Servicio de citas médicas
 */

import { apiClient } from '../client'
import { API_ENDPOINTS } from '../config'
import type { Appointment, PaginatedResponse } from '../../types'

export interface CreateAppointmentRequest {
  patientId: string
  doctorId: string
  scheduledAt: string // ISO 8601 date string
  durationMinutes?: number // Default 30, min 15, max 240
  reason?: string // Max 240 chars
  notes?: string // Max 2000 chars
  location?: {
    type?: 'virtual' | 'in_person'
    description?: string
    meetingLink?: string
    address?: string
  }
  reminderMinutesBefore?: number // Min 5, max 1440 (24 hours)
  tags?: string[]
  metadata?: Record<string, any>
}

export interface UpdateAppointmentRequest extends Partial<CreateAppointmentRequest> {}

export interface AppointmentFilters {
  page?: number
  limit?: number
  doctorId?: string
  patientId?: string
  status?: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
  startDate?: string
  endDate?: string
}

export interface AvailabilityRequest {
  doctorId: string
  startDate: string
  endDate: string
}

export class AppointmentService {
  async list(filters?: AppointmentFilters): Promise<PaginatedResponse<Appointment>> {
    const params = new URLSearchParams()
    
    if (filters?.page) params.append('page', filters.page.toString())
    if (filters?.limit) params.append('limit', filters.limit.toString())
    if (filters?.doctorId) params.append('doctorId', filters.doctorId)
    if (filters?.patientId) params.append('patientId', filters.patientId)
    if (filters?.status) params.append('status', filters.status)
    if (filters?.startDate) params.append('from', filters.startDate)
    if (filters?.endDate) params.append('to', filters.endDate)

    const query = params.toString()
    const endpoint = query ? `${API_ENDPOINTS.appointments.list}?${query}` : API_ENDPOINTS.appointments.list

    const response = await apiClient.get<PaginatedResponse<Appointment> | Appointment[]>(endpoint)
    
    // Manejar diferentes formatos de respuesta
    if (Array.isArray(response)) {
      return { data: response, total: response.length, page: 1, limit: response.length, totalPages: 1 }
    }
    return response as PaginatedResponse<Appointment>
  }

  async get(id: string): Promise<Appointment> {
    const response = await apiClient.get<{ success: boolean; data: Appointment } | Appointment>(
      API_ENDPOINTS.appointments.get(id)
    )
    // Manejar diferentes formatos de respuesta
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as { success: boolean; data: Appointment }).data
    }
    return response as Appointment
  }

  async getUpcoming(): Promise<Appointment[]> {
    const response = await apiClient.get<{ success: boolean; data: Appointment[] } | Appointment[]>(
      API_ENDPOINTS.appointments.upcoming
    )
    // Manejar diferentes formatos de respuesta
    if (Array.isArray(response)) {
      return response
    }
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as { success: boolean; data: Appointment[] }).data
    }
    return []
  }

  async create(data: CreateAppointmentRequest): Promise<Appointment> {
    const response = await apiClient.post<{ success: boolean; data: Appointment } | Appointment>(
      API_ENDPOINTS.appointments.create,
      data
    )
    // Manejar diferentes formatos de respuesta
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as { success: boolean; data: Appointment }).data
    }
    return response as Appointment
  }

  async update(id: string, data: UpdateAppointmentRequest): Promise<Appointment> {
    const response = await apiClient.put<{ success: boolean; data: Appointment } | Appointment>(
      API_ENDPOINTS.appointments.update(id),
      data
    )
    // Manejar diferentes formatos de respuesta
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as { success: boolean; data: Appointment }).data
    }
    return response as Appointment
  }

  async cancel(id: string, reason?: string): Promise<Appointment> {
    const response = await apiClient.patch<{ success: boolean; data: Appointment } | Appointment>(
      API_ENDPOINTS.appointments.cancel(id),
      { cancellationReason: reason }
    )
    // Manejar diferentes formatos de respuesta
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as { success: boolean; data: Appointment }).data
    }
    return response as Appointment
  }

  async reschedule(id: string, newDate: string, durationMinutes?: number): Promise<Appointment> {
    const response = await apiClient.patch<{ success: boolean; data: Appointment } | Appointment>(
      API_ENDPOINTS.appointments.reschedule(id),
      { scheduledAt: newDate, durationMinutes }
    )
    // Manejar diferentes formatos de respuesta
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as { success: boolean; data: Appointment }).data
    }
    return response as Appointment
  }

  async getAvailability(doctorId: string, startDate: string, endDate: string): Promise<any> {
    const params = new URLSearchParams({
      from: startDate,
      to: endDate,
    })

    const response = await apiClient.get(
      `${API_ENDPOINTS.appointments.availability(doctorId)}?${params.toString()}`
    )
    return response
  }
}

export const appointmentService = new AppointmentService()

