/**
 * Servicio de análisis de síntomas con IA
 */

import { apiClient } from '../client'
import { API_ENDPOINTS } from '../config'
import type { SymptomAnalysisRequest, SymptomAnalysisResult } from '../../types'

interface AnalyzeResponse {
  success: boolean
  message: string
  data: SymptomAnalysisResult
}

interface HistoryResponse {
  success: boolean
  message: string
  data: Array<{
    id: string
    date: string
    diagnosis: string
    symptoms: Array<{
      name: string
      severity: string
      duration: number
    }>
    symptomCount: number
  }>
  pagination?: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

interface StatisticsResponse {
  success: boolean
  message: string
  data: {
    period: string
    totalVisits: number
    totalSymptoms: number
    avgSymptomsPerVisit: number
    severityDistribution: {
      mild: number
      moderate: number
      severe: number
    }
    mostCommonSymptoms: Array<{
      symptom: string
      count: number
    }>
    dateRange: {
      start: string
      end: string
    }
  }
}

export class SymptomAnalyzerService {
  async analyze(request: SymptomAnalysisRequest): Promise<SymptomAnalysisResult> {
    const response = await apiClient.post<AnalyzeResponse | SymptomAnalysisResult>(
      API_ENDPOINTS.symptomAnalyzer.analyze,
      {
        symptoms: request.symptoms,
        context: request.context,
        metadata: request.metadata,
        patientId: request.patientId,
        location: request.location,
      }
    )
    // handleResponse ya extrae data.data, pero manejamos ambos casos por compatibilidad
    if (response && 'data' in response && (response as AnalyzeResponse).data) {
      return (response as AnalyzeResponse).data
    }
    return response as SymptomAnalysisResult
  }

  async getTrends(patientId: string, period: string = '30d'): Promise<any> {
    return apiClient.get(
      `${API_ENDPOINTS.symptomAnalyzer.trends(patientId)}?period=${period}`
    )
  }

  async getRecommendations(): Promise<string[]> {
    const response = await apiClient.get<string[]>(
      API_ENDPOINTS.symptomAnalyzer.recommendations
    )
    return Array.isArray(response) ? response : []
  }

  async getHistory(patientId: string, page: number = 1, limit: number = 10): Promise<HistoryResponse['data']> {
    const response = await apiClient.get<HistoryResponse['data']>(
      `${API_ENDPOINTS.symptomAnalyzer.history(patientId)}?page=${page}&limit=${limit}`
    )
    return Array.isArray(response) ? response : []
  }

  async getStatistics(patientId: string, period: string = '30d'): Promise<StatisticsResponse['data']> {
    return apiClient.get<StatisticsResponse['data']>(
      `${API_ENDPOINTS.symptomAnalyzer.statistics(patientId)}?period=${period}`
    )
  }
}

export const symptomAnalyzerService = new SymptomAnalyzerService()

