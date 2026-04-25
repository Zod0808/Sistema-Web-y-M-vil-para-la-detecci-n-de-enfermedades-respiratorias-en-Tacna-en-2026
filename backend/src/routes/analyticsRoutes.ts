import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { analyticsService } from '../services/analyticsService';
import { epidemiologicalService } from '../services/epidemiologicalService';
import { aiIntegrationService } from '../services/aiIntegration';
import { authenticate } from '../middleware/auth';
import { requireRole, requirePermission } from '../middleware/rbac';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

router.get(
  '/executive-dashboard',
  requireRole('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const periodInDays = req.query.periodInDays
      ? parseInt(req.query.periodInDays as string, 10)
      : undefined;
    const includeOutbreakPrediction =
      (req.query.includeOutbreak as string)?.toLowerCase() === 'true';

    const data = await analyticsService.getExecutiveDashboardData({
      periodInDays,
      includeOutbreakPrediction,
    });

    res.status(200).json({
      success: true,
      data,
    });
  }),
);

router.get(
  '/epidemiology/district-trends',
  requireRole('doctor'),
  asyncHandler(async (req: Request, res: Response) => {
    const periodInDays = req.query.periodInDays
      ? parseInt(req.query.periodInDays as string, 10)
      : 30;

    const data = await epidemiologicalService.getDistrictTrends({
      days: periodInDays,
    });

    res.status(200).json({
      success: true,
      data,
    });
  }),
);

router.get(
  '/epidemiology/outbreaks',
  requireRole('doctor'),
  asyncHandler(async (req: Request, res: Response) => {
    const recentWindowDays = req.query.recentWindowDays
      ? parseInt(req.query.recentWindowDays as string, 10)
      : undefined;
    const baselineWindowDays = req.query.baselineWindowDays
      ? parseInt(req.query.baselineWindowDays as string, 10)
      : undefined;

    const data = await epidemiologicalService.predictOutbreaks({
      recentWindowDays,
      baselineWindowDays,
    });

    res.status(200).json({
      success: true,
      data,
    });
  }),
);

router.get(
  '/ml/monitoring',
  asyncHandler(async (req: Request, res: Response) => {
    const days = req.query.days ? parseInt(req.query.days as string, 10) : undefined;
    const data = await aiIntegrationService.getMlMonitoringMetrics({ days });
    res.status(200).json({ success: true, data });
  }),
);

router.get(
  '/ml/features',
  asyncHandler(async (req: Request, res: Response) => {
    const top = req.query.top ? parseInt(req.query.top as string, 10) : undefined;
    const data = await aiIntegrationService.getMlFeatureInfluence({ top_n: top });
    res.status(200).json({ success: true, data });
  }),
);

router.get(
  '/ml/fairness',
  asyncHandler(async (req: Request, res: Response) => {
    const groupField = (req.query.groupField as string) || 'gender';
    const highConfidenceThreshold = req.query.highConfidenceThreshold
      ? parseFloat(req.query.highConfidenceThreshold as string)
      : undefined;

    const data = await aiIntegrationService.getMlFairnessMetrics({
      group_field: groupField,
      high_confidence_threshold: highConfidenceThreshold,
    });

    res.status(200).json({ success: true, data });
  }),
);

export default router;

