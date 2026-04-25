/**
 * AI Integration Service
 * Connects with RespiCare AI Services for medical processing
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import { AppError } from '../utils/AppError';

export interface AIAnalysisRequest {
  patient_id: string;
  text: string;
  language?: string;
  metadata?: Record<string, any>;
}

export interface SymptomAnalysisRequest {
  patient_id: string;
  symptoms: Array<{
    symptom: string;
    severity: string;
    duration: string;
  }>;
  context?: string;
  metadata?: Record<string, any>;
}

export interface AIAnalysisResponse {
  patient_id: string;
  processed_at: string;
  entities: Array<{
    text: string;
    label: string;
    start: number;
    end: number;
    confidence: number;
  }>;
  symptoms: Array<{
    symptom: string;
    category: string;
    confidence: number;
    context?: Record<string, any>;
  }>;
  diagnosis_suggestions: string[];
  risk_factors: string[];
  recommendations: string[];
  confidence_score: number;
  processing_time_ms: number;
}

export interface SymptomAnalysisResponse {
  patient_id: string;
  analyzed_at: string;
  urgency_level: string;
  severity_score: number;
  classification: {
    urgency: string;
    severity_score: number;
    recommendation: string;
    categories: string[];
    confidence: number;
  };
  recommendations: string[];
  warning_signs: string[];
  follow_up_required: boolean;
  confidence_score: number;
  processing_time_ms: number;
}

export interface MLPredictionResponse {
  disease: string;
  confidence: number;
  urgency_level: string;
  explanation?: {
    method: string;
    models_used?: string[];
    description?: string;
    positive_factors?: Array<{
      feature_index: number;
      shap_value: number;
      feature_importance: number;
    }>;
    negative_factors?: Array<{
      feature_index: number;
      shap_value: number;
      feature_importance: number;
    }>;
    decision_factors?: Array<{
      feature_index: number;
      shap_value: number;
      feature_importance: number;
    }>;
    explainability_score: number;
  };
  top_3_predictions: Array<{
    disease: string;
    confidence: string;
  }>;
  needs_medical_attention: boolean;
  age_group?: string;
  risk_level?: string;
  personalized_recommendations?: string[];
  timestamp: string;
}

class AIIntegrationService {
  private aiClient: AxiosInstance;
  private isConnected: boolean = false;

  constructor() {
    this.aiClient = axios.create({
      baseURL: config.ai.serviceUrl,
      timeout: 30000, // 30 seconds timeout
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'RespiCare-Backend/1.0.0'
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.aiClient.interceptors.request.use(
      (config) => {
        logger.debug('AI Service Request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          data: config.data ? 'Present' : 'None'
        });
        return config;
      },
      (error) => {
        logger.error('AI Service Request Error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.aiClient.interceptors.response.use(
      (response: AxiosResponse) => {
        logger.debug('AI Service Response', {
          status: response.status,
          url: response.config.url,
          processingTime: response.headers['x-processing-time']
        });
        return response;
      },
      (error) => {
        logger.error('AI Service Response Error', {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Check if AI service is available
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.aiClient.get('/api/v1/health');
      this.isConnected = response.status === 200;
      return this.isConnected;
    } catch (error) {
      logger.error('AI Service Health Check Failed', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Process medical history text with AI
   */
  async processMedicalHistory(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      if (!this.isConnected) {
        await this.checkHealth();
        if (!this.isConnected) {
          throw new AppError('AI Service no disponible', 503);
        }
      }

      const response = await this.aiClient.post<AIAnalysisResponse>(
        '/api/v1/medical-history/process',
        request
      );

      logger.info('Medical history processed by AI', {
        patientId: request.patient_id,
        processingTime: response.data.processing_time_ms,
        confidence: response.data.confidence_score
      });

      return response.data;
    } catch (error: any) {
      logger.error('AI Medical History Processing Failed', {
        patientId: request.patient_id,
        error: error.message
      });

      if (error.response?.status === 503) {
        throw new AppError('Servicio de IA temporalmente no disponible', 503);
      } else if (error.response?.status === 400) {
        throw new AppError('Datos de entrada inválidos para procesamiento de IA', 400);
      } else {
        throw new AppError('Error interno del servicio de IA', 500);
      }
    }
  }

  /**
   * Analyze symptoms with AI (Legacy endpoint)
   */
  async analyzeSymptoms(request: SymptomAnalysisRequest): Promise<SymptomAnalysisResponse> {
    try {
      if (!this.isConnected) {
        await this.checkHealth();
        if (!this.isConnected) {
          throw new AppError('AI Service no disponible', 503);
        }
      }

      const response = await this.aiClient.post<SymptomAnalysisResponse>(
        '/api/v1/symptom-analyzer/analyze',
        request
      );

      logger.info('Symptoms analyzed by AI', {
        patientId: request.patient_id,
        urgencyLevel: response.data.urgency_level,
        processingTime: response.data.processing_time_ms
      });

      return response.data;
    } catch (error: any) {
      logger.error('AI Symptom Analysis Failed', {
        patientId: request.patient_id,
        error: error.message
      });

      if (error.response?.status === 503) {
        throw new AppError('Servicio de IA temporalmente no disponible', 503);
      } else if (error.response?.status === 400) {
        throw new AppError('Datos de síntomas inválidos para análisis de IA', 400);
      } else {
        throw new AppError('Error interno del servicio de IA', 500);
      }
    }
  }

  /**
   * Analyze symptoms with ML models (Ensemble + SHAP) - NEW
   * Uses the complete ML system with ensemble, SHAP explanations, and personalization
   */
  async analyzeSymptomsML(request: {
    symptoms: string[];
    patient_age?: number;
    risk_factors?: string[];
    include_explanation?: boolean;
    apply_personalization?: boolean;
    patient_id?: string;
  }): Promise<MLPredictionResponse> {
    try {
      if (!this.isConnected) {
        await this.checkHealth();
        if (!this.isConnected) {
          throw new AppError('AI Service no disponible', 503);
        }
      }

      const response = await this.aiClient.post<MLPredictionResponse>(
        '/api/v1/ml-analyze',
        {
          symptoms: request.symptoms,
          patient_age: request.patient_age || 35,
          risk_factors: request.risk_factors || [],
          include_explanation: request.include_explanation !== false, // default true
          apply_personalization: request.apply_personalization !== false, // default true
        },
        {
          params: {
            use_ensemble: 'true' // Use ensemble by default
          }
        }
      );

      logger.info('Symptoms analyzed by ML (Ensemble + SHAP)', {
        patientId: request.patient_id,
        disease: response.data.disease,
        confidence: response.data.confidence,
        urgencyLevel: response.data.urgency_level,
        hasExplanation: !!response.data.explanation
      });

      return response.data;
    } catch (error: any) {
      logger.error('ML Symptom Analysis Failed', {
        patientId: request.patient_id,
        error: error.message
      });

      if (error.response?.status === 503) {
        throw new AppError('Servicio de IA temporalmente no disponible', 503);
      } else if (error.response?.status === 400) {
        throw new AppError('Datos de síntomas inválidos para análisis ML', 400);
      } else {
        throw new AppError('Error interno del servicio de IA', 500);
      }
    }
  }

  /**
   * Get symptom trends for a patient
   */
  async getSymptomTrends(patientId: string, period: string = '30d'): Promise<any> {
    try {
      if (!this.isConnected) {
        await this.checkHealth();
        if (!this.isConnected) {
          throw new AppError('AI Service no disponible', 503);
        }
      }

      const response = await this.aiClient.get(
        `/api/v1/symptom-analyzer/trends/${patientId}?period=${period}`
      );

      logger.info('Symptom trends retrieved', {
        patientId,
        period,
        dataPoints: response.data.trend_data?.length || 0
      });

      return response.data;
    } catch (error: any) {
      logger.error('AI Symptom Trends Failed', {
        patientId,
        error: error.message
      });

      if (error.response?.status === 404) {
        throw new AppError('No se encontraron tendencias para el paciente', 404);
      } else {
        throw new AppError('Error al obtener tendencias de síntomas', 500);
      }
    }
  }

  /**
   * Get general symptom recommendations
   */
  async getGeneralRecommendations(): Promise<Record<string, string[]>> {
    try {
      if (!this.isConnected) {
        await this.checkHealth();
        if (!this.isConnected) {
          throw new AppError('AI Service no disponible', 503);
        }
      }

      const response = await this.aiClient.get('/api/v1/symptom-analyzer/recommendations');
      return response.data;
    } catch (error: any) {
      logger.error('AI General Recommendations Failed', error);
      throw new AppError('Error al obtener recomendaciones generales', 500);
    }
  }

  /**
   * Search medical histories with AI
   */
  async searchMedicalHistories(searchParams: {
    patient_id?: string;
    date_from?: string;
    date_to?: string;
    diagnosis?: string;
    symptoms?: string[];
    limit?: number;
  }): Promise<AIAnalysisResponse[]> {
    try {
      if (!this.isConnected) {
        await this.checkHealth();
        if (!this.isConnected) {
          throw new AppError('AI Service no disponible', 503);
        }
      }

      const response = await this.aiClient.post('/api/v1/medical-history/search', searchParams);
      return response.data;
    } catch (error: any) {
      logger.error('AI Medical History Search Failed', {
        searchParams,
        error: error.message
      });
      throw new AppError('Error en búsqueda de historias médicas', 500);
    }
  }

  async getMlMonitoringMetrics(params?: { days?: number }) {
    try {
      const response = await this.aiClient.get('/api/v1/ml/monitoring/metrics', {
        params,
      });
      // AI service returns {success: true, data: {...}}, extract only data
      const result = response.data;
      logger.debug('AI Service Response', { 
        hasData: !!result, 
        hasNestedData: !!(result?.data),
        resultKeys: result ? Object.keys(result) : []
      });
      
      // Extract data from {success: true, data: {...}} structure
      if (result && typeof result === 'object') {
        // If it has the expected structure, extract data
        if ('data' in result && result.success === true) {
          return result.data;
        }
        // If result itself is the data (no wrapper), return it
        if (!('success' in result) && !('data' in result)) {
          return result;
        }
      }
      // Fallback: return empty object
      return result || {};
    } catch (error: any) {
      logger.error('AI ML Monitoring Metrics Failed', { error: error.message });
      throw new AppError('Error al obtener métricas de monitoreo ML', 500);
    }
  }

  async getMlFeatureInfluence(params?: { top_n?: number }) {
    try {
      const response = await this.aiClient.get('/api/v1/ml/monitoring/features', {
        params,
      });
      // AI service returns {success: true, data: {...}}, extract only data
      const result = response.data;
      if (result && typeof result === 'object' && 'data' in result && result.success) {
        return result.data;
      }
      // Fallback: if structure is different, return as is
      return result || {};
    } catch (error: any) {
      logger.error('AI Feature Influence Fetch Failed', { error: error.message });
      throw new AppError('Error al obtener contribuciones SHAP', 500);
    }
  }

  async getMlFairnessMetrics(params?: { group_field?: string; high_confidence_threshold?: number }) {
    try {
      const response = await this.aiClient.get('/api/v1/ml/monitoring/fairness', {
        params,
      });
      // AI service returns {success: true, data: {...}}, extract only data
      const result = response.data;
      if (result && typeof result === 'object' && 'data' in result && result.success) {
        return result.data;
      }
      // Fallback: if structure is different, return as is
      return result || {};
    } catch (error: any) {
      logger.error('AI Fairness Metrics Fetch Failed', { error: error.message });
      throw new AppError('Error al obtener métricas de equidad ML', 500);
    }
  }

  /**
   * Get AI service status
   */
  async getServiceStatus(): Promise<{
    connected: boolean;
    lastCheck: Date;
    responseTime?: number;
  }> {
    const startTime = Date.now();
    const connected = await this.checkHealth();
    const responseTime = Date.now() - startTime;

    return {
      connected,
      lastCheck: new Date(),
      responseTime: connected ? responseTime : undefined
    };
  }
}

// Export singleton instance
export const aiIntegrationService = new AIIntegrationService();
export default aiIntegrationService;
