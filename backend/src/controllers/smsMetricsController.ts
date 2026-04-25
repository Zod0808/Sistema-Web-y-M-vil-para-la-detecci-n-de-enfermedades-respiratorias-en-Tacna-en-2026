/**
 * SMS Metrics Controller
 * Controlador para obtener métricas de SMS
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { smsMetricsService } from '../services/smsMetricsService';
import { smsService } from '../services/smsService';
import { asyncHandler } from '../utils/asyncHandler';
import { requireRole as authorize } from '../middleware/rbac';

/**
 * GET /api/v1/sms/metrics
 * Obtener métricas generales de SMS
 */
export const getSMSMetrics = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { provider } = req.query;

    const metrics = await smsMetricsService.getMetrics(
      provider as string | undefined
    );

    res.status(200).json({
      success: true,
      data: metrics,
    });
  }
);

/**
 * GET /api/v1/sms/metrics/costs
 * Obtener costos de SMS por período
 */
export const getSMSCosts = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { startDate, endDate, provider } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const costs = await smsMetricsService.getCosts(
      start,
      end,
      provider as string | undefined
    );

    res.status(200).json({
      success: true,
      data: costs,
    });
  }
);

/**
 * GET /api/v1/sms/metrics/rate-limit
 * Obtener estadísticas de rate limiting
 */
export const getRateLimitStats = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const stats = await smsService.getRateLimitStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
  }
);

