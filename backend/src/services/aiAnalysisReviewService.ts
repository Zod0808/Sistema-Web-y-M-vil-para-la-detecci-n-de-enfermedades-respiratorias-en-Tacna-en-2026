/**
 * AI Analysis Review Service
 * Permite al médico revisar, aprobar, rechazar o ajustar predicciones de IA (RF-007)
 */

import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import AIAnalysisModel, { AIAnalysisDocument, AIReviewSignatureMethod } from '../models/AIAnalysis';
import { alertService } from './alertService';
import UserModel from '../models/User';

type ReviewFilters = {
  patientId?: string;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  page?: number;
  limit?: number;
};

type ReviewSignaturePayload = {
  signatureData: string;
  signatureMethod: AIReviewSignatureMethod;
};

type AdjustPayload = {
  adjustedDiagnosis?: string;
  adjustedUrgency?: 'low' | 'medium' | 'high' | 'critical';
  comments?: string;
};

class AIAnalysisReviewService {
  /**
   * Listar predicciones de IA pendientes de revisión médica
   */
  async listPendingReview(filters: ReviewFilters = {}): Promise<{
    analyses: AIAnalysisDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query: any = {
      $or: [{ review: { $exists: false } }, { 'review.status': 'pending' }]
    };

    if (filters.patientId) {
      query.patientId = filters.patientId;
    }
    if (filters.urgency) {
      query.urgency = filters.urgency;
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [analyses, total] = await Promise.all([
      AIAnalysisModel.find(query)
        .sort({ urgency: -1, timestamp: -1 })
        .skip(skip)
        .limit(limit),
      AIAnalysisModel.countDocuments(query)
    ]);

    return {
      analyses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Obtener una predicción de IA por ID
   */
  async getById(analysisId: string): Promise<AIAnalysisDocument> {
    const analysis = await AIAnalysisModel.findById(analysisId);
    if (!analysis) {
      throw new AppError('Análisis de IA no encontrado', 404);
    }
    return analysis;
  }

  /**
   * Aprobar, rechazar o ajustar una predicción de IA, con firma electrónica del médico
   */
  async reviewPrediction(
    analysisId: string,
    decision: 'approved' | 'rejected' | 'adjusted',
    doctorId: string,
    comments: string | undefined,
    signature: ReviewSignaturePayload,
    adjustment?: AdjustPayload
  ): Promise<AIAnalysisDocument> {
    const doctor = await UserModel.findById(doctorId);
    if (!doctor || (doctor.role !== 'doctor' && doctor.role !== 'admin')) {
      throw new AppError('El médico revisor no existe o no es válido', 400);
    }

    const analysis = await AIAnalysisModel.findById(analysisId);
    if (!analysis) {
      throw new AppError('Análisis de IA no encontrado', 404);
    }

    if (analysis.review && analysis.review.status !== 'pending') {
      throw new AppError('Este análisis de IA ya fue revisado', 400);
    }

    if (decision === 'approved') {
      await analysis.approve(doctorId, doctor.name, comments, signature);
    } else if (decision === 'rejected') {
      await analysis.reject(doctorId, doctor.name, comments, signature);
    } else {
      await analysis.adjust(doctorId, doctor.name, { ...adjustment, comments }, signature);
    }

    if (analysis.patientId) {
      await alertService.createAlert({
        userId: analysis.patientId,
        patientId: analysis.patientId,
        doctorId,
        title: 'Predicción de IA revisada por tu médico',
        message: `El Dr(a). ${doctor.name} ha ${
          decision === 'approved' ? 'aprobado' : decision === 'rejected' ? 'rechazado' : 'ajustado'
        } el análisis generado por el asistente de IA`,
        category: 'ai_analysis',
        priority: analysis.urgency as any,
        channels: ['push', 'in_app'],
        trigger: {
          source: 'ai_analysis_review',
          referenceId: String(analysis._id)
        }
      });
    }

    logger.info('Análisis de IA revisado', {
      analysisId: String(analysis._id),
      doctorId,
      decision
    });

    return analysis;
  }
}

export const aiAnalysisReviewService = new AIAnalysisReviewService();
