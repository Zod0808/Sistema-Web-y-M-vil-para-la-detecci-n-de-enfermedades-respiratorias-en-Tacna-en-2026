/**
 * AI Analysis Review Routes
 * Permite al médico revisar, aprobar, rechazar o ajustar predicciones de IA,
 * con firma electrónica (RF-007: Panel del doctor)
 */

import { Router } from 'express';
import { body, param } from 'express-validator';
import { auth, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { asyncHandler } from '../utils/asyncHandler';
import { parsePagination } from '../utils/pagination';
import { aiAnalysisReviewService } from '../services/aiAnalysisReviewService';
import { ApiResponse, AuthenticatedRequest } from '../types';
import { AppError } from '../utils/AppError';

const router = Router();

router.use(auth);

// Listar predicciones de IA pendientes de revisión médica
router.get(
  '/pending',
  authorize('doctor', 'admin'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { page, limit } = parsePagination(req.query);

    const result = await aiAnalysisReviewService.listPendingReview({
      patientId: req.query.patientId as string | undefined,
      urgency: req.query.urgency as any,
      page,
      limit,
    });

    res.json({
      success: true,
      message: 'Análisis de IA pendientes obtenidos correctamente',
      data: result.analyses,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    } as unknown as ApiResponse);
  })
);

// Obtener un análisis de IA por ID
router.get(
  '/:id',
  authorize('doctor', 'admin', 'patient'),
  param('id').isMongoId().withMessage('ID de análisis inválido'),
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const analysis = await aiAnalysisReviewService.getById(req.params.id);

    if (req.user?.role === 'patient' && analysis.patientId !== req.user._id.toString()) {
      throw new AppError('No tiene acceso a este análisis', 403);
    }

    res.json({
      success: true,
      data: analysis,
    } as ApiResponse);
  })
);

// Revisar (aprobar, rechazar o ajustar) un análisis de IA, con firma electrónica
router.post(
  '/:id/review',
  authorize('doctor', 'admin'),
  param('id').isMongoId().withMessage('ID de análisis inválido'),
  body('decision').isIn(['approved', 'rejected', 'adjusted']).withMessage('Decisión inválida'),
  body('comments').optional().isString().isLength({ max: 2000 }),
  body('adjustedDiagnosis').optional().isString().isLength({ max: 200 }),
  body('adjustedUrgency').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('signature.signatureData').isString().notEmpty().withMessage('La firma del médico es obligatoria'),
  body('signature.signatureMethod')
    .isIn(['digital', 'typed', 'click_to_sign'])
    .withMessage('Método de firma inválido'),
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (req.body.decision === 'adjusted' && !req.body.adjustedDiagnosis && !req.body.adjustedUrgency) {
      throw new AppError('Debe indicar un diagnóstico o urgencia ajustada', 400);
    }

    const analysis = await aiAnalysisReviewService.reviewPrediction(
      req.params.id,
      req.body.decision,
      req.user!._id.toString(),
      req.body.comments,
      req.body.signature,
      {
        adjustedDiagnosis: req.body.adjustedDiagnosis,
        adjustedUrgency: req.body.adjustedUrgency,
      }
    );

    res.json({
      success: true,
      data: analysis,
      message: 'Análisis de IA revisado exitosamente',
    } as ApiResponse);
  })
);

export default router;
