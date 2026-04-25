/**
 * Symptom Analyzer Controller
 * Handles symptom analysis and AI integration
 */

import { Response } from 'express';
import { ApiResponse, AuthenticatedRequest } from '../types';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import aiIntegrationService, { SymptomAnalysisRequest } from '../services/aiIntegration';
import MedicalHistory from '../models/MedicalHistory';

// Analyze symptoms with AI
export const analyzeSymptoms = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { symptoms, context, metadata } = req.body;
  const patientId = req.user?._id;

  if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
    throw new AppError('Se requiere al menos un síntoma para el análisis', 400);
  }

  // Validate symptoms structure
  for (const symptom of symptoms) {
    if (!symptom.symptom || !symptom.severity || !symptom.duration) {
      throw new AppError('Cada síntoma debe tener: symptom, severity y duration', 400);
    }
  }

  const analysisRequest: SymptomAnalysisRequest = {
    patient_id: patientId!,
    symptoms,
    context,
    metadata: {
      ...metadata,
      analyzed_by: req.user?.role,
      timestamp: new Date().toISOString()
    }
  };

  try {
    const analysisResult = await aiIntegrationService.analyzeSymptoms(analysisRequest);

    // Store analysis result in database
    const aiAnalysis = {
      patientId,
      type: 'symptom_analysis',
      data: analysisResult,
      createdAt: new Date()
    };

    // You could store this in a separate AIAnalysis collection
    // For now, we'll log it
    logger.info('Symptom analysis completed', {
      patientId,
      urgencyLevel: analysisResult.urgency_level,
      confidence: analysisResult.confidence_score
    });

    const response: ApiResponse = {
      success: true,
      message: 'Análisis de síntomas completado exitosamente',
      data: analysisResult
    };

    res.status(200).json(response);
  } catch (error: any) {
    logger.error('Symptom analysis failed', {
      patientId,
      error: error.message
    });
    throw error;
  }
});

// Analyze symptoms with ML models (Ensemble + SHAP) - NEW
export const analyzeSymptomsML = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { symptoms, patient_age, risk_factors, include_explanation, apply_personalization } = req.body;
  const patientId = req.user?._id;

  if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
    throw new AppError('Se requiere al menos un síntoma para el análisis', 400);
  }

  // Validate symptoms are strings
  for (const symptom of symptoms) {
    if (typeof symptom !== 'string' || symptom.trim().length === 0) {
      throw new AppError('Cada síntoma debe ser una cadena de texto válida', 400);
    }
  }

  try {
    const mlResult = await aiIntegrationService.analyzeSymptomsML({
      symptoms: symptoms.map(s => s.trim()),
      patient_age: patient_age || 35,
      risk_factors: risk_factors || [],
      include_explanation: include_explanation !== false, // default true
      apply_personalization: apply_personalization !== false, // default true
      patient_id: patientId
    });

    // Log the ML prediction for monitoring
    logger.info('ML symptom analysis completed', {
      patientId,
      disease: mlResult.disease,
      confidence: mlResult.confidence,
      urgencyLevel: mlResult.urgency_level,
      hasExplanation: !!mlResult.explanation
    });

    const response: ApiResponse = {
      success: true,
      message: 'Análisis ML de síntomas completado exitosamente',
      data: mlResult
    };

    res.status(200).json(response);
  } catch (error: any) {
    logger.error('ML symptom analysis failed', {
      patientId,
      error: error.message
    });
    throw error;
  }
});

// Get symptom trends for a patient
export const getSymptomTrends = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { patientId } = req.params;
  const { period = '30d' } = req.query;

  // Verify patient access (patients can only see their own data, doctors can see their patients)
  if (req.user?.role === 'patient' && patientId !== req.user._id) {
    throw new AppError('No tienes permisos para ver los datos de este paciente', 403);
  }

  try {
    const trends = await aiIntegrationService.getSymptomTrends(patientId, period as string);

    const response: ApiResponse = {
      success: true,
      message: 'Tendencias de síntomas obtenidas exitosamente',
      data: trends
    };

    res.status(200).json(response);
  } catch (error: any) {
    logger.error('Symptom trends retrieval failed', {
      patientId,
      error: error.message
    });
    throw error;
  }
});

// Get general symptom recommendations
export const getGeneralRecommendations = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const recommendations = await aiIntegrationService.getGeneralRecommendations();

    const response: ApiResponse = {
      success: true,
      message: 'Recomendaciones generales obtenidas exitosamente',
      data: recommendations
    };

    res.status(200).json(response);
  } catch (error: any) {
    logger.error('General recommendations retrieval failed', error);
    throw error;
  }
});

// Get AI service status
export const getAIServiceStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = await aiIntegrationService.getServiceStatus();

    const response: ApiResponse = {
      success: true,
      message: 'Estado del servicio de IA obtenido exitosamente',
      data: status
    };

    res.status(200).json(response);
  } catch (error: any) {
    logger.error('AI service status check failed', error);
    throw error;
  }
});

// Get symptom analysis history for a patient
export const getSymptomAnalysisHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { patientId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  // Verify patient access
  if (req.user?.role === 'patient' && patientId !== req.user._id) {
    throw new AppError('No tienes permisos para ver los datos de este paciente', 403);
  }

  try {
    // Get medical histories with symptoms for the patient
    const medicalHistories = await MedicalHistory.find({ patientId })
      .select('symptoms date diagnosis')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    const total = await MedicalHistory.countDocuments({ patientId });

    // Extract symptom analysis data
    const symptomAnalysisHistory = medicalHistories.map(history => ({
      id: history._id,
      date: history.date,
      diagnosis: history.diagnosis,
      symptoms: history.symptoms,
      symptomCount: history.symptoms.length
    }));

    const response: ApiResponse = {
      success: true,
      message: 'Historial de análisis de síntomas obtenido exitosamente',
      data: symptomAnalysisHistory,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };

    res.status(200).json(response);
  } catch (error: any) {
    logger.error('Symptom analysis history retrieval failed', {
      patientId,
      error: error.message
    });
    throw error;
  }
});

// Get symptom statistics
export const getSymptomStatistics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { patientId } = req.params;
  const { period = '30d' } = req.query;

  // Verify patient access
  if (req.user?.role === 'patient' && patientId !== req.user._id) {
    throw new AppError('No tienes permisos para ver los datos de este paciente', 403);
  }

  try {
    // Calculate date range based on period
    const endDate = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    // Get medical histories in the period
    const medicalHistories = await MedicalHistory.find({
      patientId,
      date: { $gte: startDate, $lte: endDate }
    }).select('symptoms date');

    // Calculate statistics
    const totalSymptoms = medicalHistories.reduce((sum, history) => sum + history.symptoms.length, 0);
    const avgSymptomsPerVisit = medicalHistories.length > 0 ? totalSymptoms / medicalHistories.length : 0;

    // Count symptoms by severity
    const severityCounts = { mild: 0, moderate: 0, severe: 0 };
    medicalHistories.forEach(history => {
      history.symptoms.forEach(symptom => {
        severityCounts[symptom.severity as keyof typeof severityCounts]++;
      });
    });

    // Get most common symptoms
    const symptomCounts: Record<string, number> = {};
    medicalHistories.forEach(history => {
      history.symptoms.forEach(symptom => {
        symptomCounts[symptom.name] = (symptomCounts[symptom.name] || 0) + 1;
      });
    });

    const mostCommonSymptoms = Object.entries(symptomCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([symptom, count]) => ({ symptom, count }));

    const statistics = {
      period,
      totalVisits: medicalHistories.length,
      totalSymptoms,
      avgSymptomsPerVisit: Math.round(avgSymptomsPerVisit * 100) / 100,
      severityDistribution: severityCounts,
      mostCommonSymptoms,
      dateRange: {
        start: startDate,
        end: endDate
      }
    };

    const response: ApiResponse = {
      success: true,
      message: 'Estadísticas de síntomas obtenidas exitosamente',
      data: statistics
    };

    res.status(200).json(response);
  } catch (error: any) {
    logger.error('Symptom statistics retrieval failed', {
      patientId,
      error: error.message
    });
    throw error;
  }
});
