// Tipos TypeScript para el Backend API de RespiCare
import { Request } from 'express';

export interface User {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: 'patient' | 'doctor' | 'admin';
  permissions?: string[];
  avatar?: string;
  phone?: string; // Número de teléfono en formato E.164 (ej: +51987654321)
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MedicalHistory {
  _id: string;
  patientId: string;
  doctorId: string;
  patientName: string;
  age: number;
  diagnosis: string;
  symptoms: Symptom[];
  description?: string;
  date: Date;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  geoLocation?: {
    type: 'Point';
    coordinates: [number, number];
  };
  images?: string[];
  audioNotes?: string;
  isOffline?: boolean;
  syncStatus: 'pending' | 'synced' | 'error';
  createdAt: Date;
  updatedAt: Date;
}

export interface Symptom {
  _id?: string;
  name: string;
  severity: 'mild' | 'moderate' | 'severe';
  duration: string;
  description?: string;
}

export interface AIAnalysis {
  _id: string;
  patientId?: string;
  medicalHistoryId?: string;
  symptoms: Symptom[];
  possibleDiagnoses: {
    condition: string;
    probability: number;
    recommendations: string[];
  }[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  review?: {
    status: 'pending' | 'approved' | 'rejected' | 'adjusted';
    doctorId: string;
    doctorName: string;
    comments?: string;
    adjustedDiagnosis?: string;
    adjustedUrgency?: 'low' | 'medium' | 'high' | 'critical';
    signature: {
      signatureData: string;
      signatureMethod: 'digital' | 'typed' | 'click_to_sign';
      signedAt: Date;
    };
    reviewedAt: Date;
  };
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type EducationalContentCategory =
  | 'asma'
  | 'epoc'
  | 'covid19'
  | 'influenza'
  | 'neumonia'
  | 'prevencion'
  | 'general';

export interface EducationalContentAgeRange {
  min?: number;
  max?: number;
}

export interface EducationalContent {
  _id: string;
  title: string;
  summary: string;
  content: string;
  category: EducationalContentCategory;
  targetConditions: string[];
  targetAgeRange?: EducationalContentAgeRange;
  tags?: string[];
  imageUrl?: string;
  isActive: boolean;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type AlertCategory =
  | 'critical_symptom'
  | 'medication_reminder'
  | 'follow_up'
  | 'doctor_notification'
  | 'system'
  | 'emergency'
  | 'consent'
  | 'laboratory'
  | 'referral'
  | 'ai_analysis';

export type AlertChannel = 'in_app' | 'push' | 'email' | 'sms';

export type AlertPriority = 'low' | 'medium' | 'high' | 'critical';

export type AlertStatus =
  | 'pending'
  | 'scheduled'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'acknowledged'
  | 'expired';

export type AlertTriggerSource =
  | 'symptom_analysis'
  | 'medication_schedule'
  | 'follow_up_rule'
  | 'manual'
  | 'system'
  | 'doctor_portal'
  | 'emergency_service'
  | 'informed_consent'
  | 'laboratory'
  | 'referral'
  | 'ai_analysis_review';

export interface AlertTrigger {
  source: AlertTriggerSource;
  referenceId?: string;
  metadata?: Record<string, any>;
}

export interface Alert {
  _id: string;
  userId: string;
  patientId?: string;
  doctorId?: string;
  title: string;
  message: string;
  category: AlertCategory;
  channels: AlertChannel[];
  priority: AlertPriority;
  status: AlertStatus;
  trigger?: AlertTrigger;
  metadata?: Record<string, any>;
  tags?: string[];
  scheduledAt?: Date;
  dispatchedAt?: Date;
  acknowledgedAt?: Date;
  expiresAt?: Date;
  retries: number;
  lastError?: string;
  priorityWeight?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: 'reminder' | 'alert' | 'emergency' | 'sync' | 'system';
  data?: any;
  scheduledTime?: Date;
  isRead: boolean;
  isSent: boolean;
  alertId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HeatMapData {
  _id: string;
  latitude: number;
  longitude: number;
  intensity: number;
  zone: string;
  district: string;
  cases: number;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type AppointmentStatus =
  | 'scheduled'
  | 'completed'
  | 'cancelled'
  | 'rescheduled'
  | 'no_show';

export interface Appointment {
  _id: string;
  patientId: string;
  doctorId: string;
  createdBy: string;
  scheduledAt: Date;
  durationMinutes: number;
  status: AppointmentStatus;
  type?: 'consultation' | 'follow_up' | 'emergency' | 'diagnostic' | 'treatment' | 'telemedicine';
  reason?: string;
  notes?: string;
  location?: {
    type: 'virtual' | 'in_person';
    description?: string;
    meetingLink?: string;
    address?: string;
  };
  reminderMinutesBefore?: number;
  tags?: string[];
  rescheduledFrom?: string;
  cancellationReason?: string;
  metadata?: Record<string, any>;
  reminderSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type PrescriptionStatus =
  | 'draft'
  | 'pending_validation'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'rejected';

export interface PrescriptionMedication {
  name: string;
  dosage: string;
  form?: string;
  frequencyPerDay: number;
  durationDays: number;
  startDate?: Date;
  instructions?: string;
  notes?: string;
  reminderTimes?: string[];
  smartDosage?: {
    recommended: string;
    rationale: string;
  };
}

export interface DrugInteraction {
  medicationA: string;
  medicationB: string;
  severity: 'minor' | 'moderate' | 'major' | 'contraindicated';
  description?: string;
  source?: string;
}

export interface Prescription {
  _id: string;
  patientId: string;
  doctorId: string;
  createdBy: string;
  diagnosis?: string;
  observations?: string;
  medications: PrescriptionMedication[];
  status: PrescriptionStatus;
  interactions?: DrugInteraction[];
  validatedBy?: string;
  validatedAt?: Date;
  validationNotes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface FamilyTree {
  _id: string;
  familyId: string;
  personId: string;
  name: string;
  fatherId?: string;
  motherId?: string;
  spouseId?: string;
  children: string[];
  diseases: {
    name: string;
    isHereditary: boolean;
    diagnosedAt?: Date;
  }[];
  isAlive: boolean;
  birthDate?: Date;
  deathDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Report {
  _id: string;
  title: string;
  type: 'medical' | 'epidemiological' | 'genetic' | 'general';
  data: any;
  filters: any;
  generatedBy: string;
  generatedAt: Date;
  format: 'pdf' | 'excel' | 'csv';
  filePath?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Tipos para autenticación
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: 'patient' | 'doctor' | 'admin';
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  token: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// Tipos para respuestas de API
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface SearchQuery extends PaginationQuery {
  search?: string;
  filters?: Record<string, any>;
  patientId?: string;
  syncStatus?: 'pending' | 'synced' | 'error';
  isOffline?: boolean;
  startDate?: string | Date;
  endDate?: string | Date;
}

// Tipos para middleware
export interface AuthenticatedRequest extends Request {
  user?: User;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Tipos para servicios de IA
export interface AIAnalysisRequest {
  symptoms: Symptom[];
  patientAge?: number;
  patientGender?: string;
  medicalHistory?: string[];
}

export interface AIAnalysisResponse {
  analysis: AIAnalysis;
  recommendations: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
}

// Tipos para notificaciones
export interface NotificationRequest {
  userId: string;
  title: string;
  message: string;
  type: 'reminder' | 'alert' | 'emergency' | 'sync' | 'system';
  data?: any;
  scheduledTime?: Date;
  alertId?: string;
}

export interface PushNotificationPayload {
  to: string;
  title: string;
  body: string;
  data?: any;
  sound?: string;
  badge?: number;
  alertId?: string;
}

// Tipos para archivos
export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

export interface ProcessedImage {
  original: string;
  thumbnail: string;
  medium: string;
  large: string;
  metadata: {
    width: number;
    height: number;
    size: number;
    format: string;
  };
}

// Tipos para métricas y monitoreo
export interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  services: {
    database: boolean;
    redis: boolean;
    ai: boolean;
    storage: boolean;
  };
  metrics: {
    uptime: number;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
    };
  };
}

export interface SystemMetrics {
  timestamp: Date;
  requests: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
  };
  users: {
    active: number;
    total: number;
    newToday: number;
  };
  medicalHistories: {
    total: number;
    today: number;
    pendingSync: number;
  };
  ai: {
    analyses: number;
    averageConfidence: number;
    errorRate: number;
  };
}

// Tipos para configuración
export interface AppConfig {
  server: {
    port: number;
    host: string;
    env: string;
  };
  database: {
    mongodb: string;
    redis: string;
    maxPoolSize: number;
    minPoolSize: number;
    maxIdleTimeMS: number;
    serverSelectionTimeoutMS: number;
    socketTimeoutMS: number;
  };
  jwt: {
    secret: string;
    expire: string;
    refreshSecret: string;
    refreshExpire: string;
  };
  ai: {
    serviceUrl: string;
    apiKey: string;
  };
  email: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
  };
  push: {
    provider: 'expo' | 'firebase' | 'onesignal' | 'none';
    apiKey?: string;
    projectId?: string;
  };
  security: {
    bcryptRounds: number;
    rateLimitWindow: number;
    rateLimitMax: number;
    internalTokens?: string[];
    criticalAlertRoles?: Array<'doctor' | 'admin'>;
  };
  cors: {
    origins: string[];
  };
  logging: {
    level: string;
    file: string;
  };
  jobs: {
    alerts: {
      scheduledIntervalMs: number;
      pendingIntervalMs: number;
    };
  };
  integrations: {
    drugInteractions: {
      url: string | null;
      apiKey: string | null;
    };
  };
}
