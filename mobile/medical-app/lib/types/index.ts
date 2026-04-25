/**
 * Tipos TypeScript para la aplicación RespiCare
 */

export type UserRole = 'patient' | 'doctor' | 'admin'

export interface User {
  _id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  isActive: boolean
  lastLogin?: string
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  token: string
  refreshToken: string
  user: User
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
  role?: UserRole
}

export interface Symptom {
  _id?: string
  name: string
  /** Matches backend enum: mild | moderate | severe */
  severity: 'mild' | 'moderate' | 'severe'
  /** Duration as descriptive string, e.g. "2-3 días", "1 semana" */
  duration: string
  description?: string
}

export interface MedicalHistory {
  _id: string
  patientId: string
  /** Optional on mobile – patients can create histories without an assigned doctor */
  doctorId?: string
  patientName: string
  age: number
  diagnosis: string
  symptoms: Symptom[]
  description?: string
  date: string
  location?: {
    latitude: number
    longitude: number
    address: string
  }
  images?: string[]
  audioNotes?: string
  isOffline?: boolean
  syncStatus: 'pending' | 'synced' | 'error'
  createdAt: string
  updatedAt: string
}

export interface SymptomAnalysisRequest {
  symptoms: Array<{
    symptom: string
    /** UI severity levels sent to AI service (not stored in backend) */
    severity: 'low' | 'moderate' | 'high' | 'severe'
    duration: string // e.g. "2-3 días", "1 semana"
  }>
  context?: string
  metadata?: Record<string, any>
  patientId?: string
  location?: {
    district: string
    city: string
    country: string
  }
}

// Severity mapping helpers
export const UI_TO_BACKEND_SEVERITY: Record<string, Symptom['severity']> = {
  low: 'mild',
  moderate: 'moderate',
  high: 'severe',
  severe: 'severe',
}

export const BACKEND_TO_UI_SEVERITY: Record<Symptom['severity'], string> = {
  mild: 'low',
  moderate: 'moderate',
  severe: 'high',
}

export function mapSeverityToBackend(uiSeverity: string): Symptom['severity'] {
  return UI_TO_BACKEND_SEVERITY[uiSeverity] ?? 'moderate'
}

export interface SymptomAnalysisResult {
  patient_id: string
  analyzed_at: string
  urgency_level: 'critical' | 'high' | 'medium' | 'low'
  severity_score: number
  classification: {
    urgency: string
    severity_score: number
    recommendation: string
    categories: string[]
    confidence: number
  }
  recommendations: string[]
  warning_signs: string[]
  follow_up_required: boolean
  confidence_score: number
  processing_time_ms: number
}

// También para compatibilidad con el formato anterior
export interface SymptomAnalysisResultLegacy {
  disease?: string
  confidence?: number
  urgencyLevel?: 'critical' | 'high' | 'medium' | 'low'
  symptoms?: string[]
  recommendations?: string[]
  riskScore?: number
  modelVersion?: string
}

export interface Appointment {
  _id: string
  patientId: string
  doctorId: string
  createdBy: string
  scheduledAt: string | Date // ISO 8601 date string
  durationMinutes?: number
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show'
  reason?: string
  notes?: string
  location?: {
    type?: 'virtual' | 'in_person'
    description?: string
    meetingLink?: string
    address?: string
  }
  reminderMinutesBefore?: number
  reminderSentAt?: string | Date
  tags?: string[]
  rescheduledFrom?: string
  cancellationReason?: string
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}

export type AlertCategory =
  | 'critical_symptom'
  | 'medication_reminder'
  | 'follow_up'
  | 'doctor_notification'
  | 'system'
  | 'emergency'

export type AlertChannel = 'in_app' | 'push' | 'email' | 'sms'

export type AlertPriority = 'low' | 'medium' | 'high' | 'critical'

export type AlertStatus =
  | 'pending'
  | 'scheduled'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'acknowledged'
  | 'expired'

export interface Alert {
  _id: string
  userId: string
  patientId?: string
  doctorId?: string
  title: string
  message: string
  category: AlertCategory
  channels: AlertChannel[]
  priority: AlertPriority
  status: AlertStatus
  trigger?: {
    source?: string
    referenceId?: string
    metadata?: Record<string, any>
  }
  metadata?: Record<string, any>
  tags?: string[]
  retries: number
  lastError?: string
  scheduledAt?: string
  dispatchedAt?: string
  acknowledgedAt?: string
  expiresAt?: string
  createdAt: string
  updatedAt: string
}

export interface WearableMetrics {
  heartRate?: number // BPM
  steps?: number
  spO2?: number // Porcentaje
  lastSync?: string
  provider?: string
}

export interface DashboardStats {
  totalPatients?: number
  totalMedicalHistories?: number
  totalAlerts?: number
  criticalAlerts?: number
  totalAppointments?: number
  upcomingAppointments?: number
  recentActivity?: any[]
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

