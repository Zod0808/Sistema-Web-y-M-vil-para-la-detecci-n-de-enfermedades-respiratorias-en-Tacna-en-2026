/**
 * Servicio de reportes médicos
 */

import { apiClient } from '../client'
import { API_ENDPOINTS } from '../config'
import { getAuthToken } from '../config'

export interface MedicalReport {
  id: string
  patientId: string
  patientName: string
  reportType: 'medical_history' | 'appointment' | 'prescription' | 'automatic'
  title: string
  content: string
  pdfUrl?: string
  signedAt?: string
  signedBy?: string
  createdAt: string
  updatedAt: string
}

export interface ShareReportRequest {
  reportId: string
  method: 'whatsapp' | 'email' | 'link'
  recipient?: string // Email o número de teléfono
}

export class ReportService {
  /**
   * Obtener lista de reportes del paciente
   */
  async getReports(patientId: string): Promise<MedicalReport[]> {
    return apiClient.get(`/api/v1/reports/patient/${patientId}`)
  }

  /**
   * Obtener un reporte específico
   */
  async getReport(reportId: string): Promise<MedicalReport> {
    return apiClient.get(`/api/v1/reports/${reportId}`)
  }

  /**
   * Generar PDF de un reporte
   */
  async generatePDF(reportId: string): Promise<{ pdfUrl: string }> {
    return apiClient.post(`/api/v1/reports/${reportId}/generate-pdf`)
  }

  /**
   * Obtener URL firmada para compartir reporte
   */
  async getShareableLink(reportId: string): Promise<{ shareUrl: string; expiresAt: string }> {
    return apiClient.post(`/api/v1/reports/${reportId}/share-link`)
  }

  /**
   * Compartir reporte vía WhatsApp/Email
   */
  async shareReport(request: ShareReportRequest): Promise<{ success: boolean; message?: string }> {
    return apiClient.post(`/api/v1/reports/${request.reportId}/share`, {
      method: request.method,
      recipient: request.recipient
    })
  }

  /**
   * Descargar PDF del reporte
   */
  async downloadPDF(reportId: string): Promise<Blob> {
    const token = getAuthToken()
    const response = await fetch(`${API_ENDPOINTS.medicalHistories.get(reportId)}/pdf`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/pdf'
      }
    })

    if (!response.ok) {
      throw new Error('Error al descargar el PDF')
    }

    return response.blob()
  }
}

export const reportService = new ReportService()

