/**
 * Servicio de Centros de Salud (búsqueda geolocalizada)
 */

import { apiClient } from '../client'
import { API_ENDPOINTS } from '../config'

export interface HealthCenter {
  id: string
  name: string
  type: 'hospital' | 'centro_salud' | 'posta_medica' | 'clinica'
  address: string
  district: string
  phone?: string
  hasEmergencyServices: boolean
  hasRespiratoryCare: boolean
  location: { latitude: number; longitude: number }
  distanceKm: number
}

export interface NearbyHealthCentersParams {
  latitude: number
  longitude: number
  maxDistanceKm?: number
  type?: HealthCenter['type']
  respiratoryOnly?: boolean
  limit?: number
}

class HealthCenterService {
  private unwrap<T>(response: any): T {
    if (response && typeof response === 'object' && 'data' in response && 'success' in response) {
      return response.data as T
    }
    return response as T
  }

  async findNearby(params: NearbyHealthCentersParams): Promise<HealthCenter[]> {
    const query = new URLSearchParams()
    query.append('latitude', params.latitude.toString())
    query.append('longitude', params.longitude.toString())
    if (params.maxDistanceKm) query.append('maxDistanceKm', params.maxDistanceKm.toString())
    if (params.type) query.append('type', params.type)
    if (params.respiratoryOnly) query.append('respiratoryOnly', 'true')
    if (params.limit) query.append('limit', params.limit.toString())

    const response = await apiClient.get<any>(`${API_ENDPOINTS.healthCenters.nearby}?${query.toString()}`)
    const data = this.unwrap<any>(response)
    return Array.isArray(data) ? data : data?.data ?? []
  }
}

export const healthCenterService = new HealthCenterService()
