/**
 * ML Analytics Routes (TS)
 *
 * Thin public-access proxy to the AI service ML monitoring endpoints, with
 * mock fallbacks when the AI service is unreachable. Intentionally does NOT
 * require auth — this is the dev/dashboard surface. The authenticated
 * equivalents live in analyticsRoutes.ts under /api/v1/analytics/ml/*.
 *
 * Mounts (see src/dev/index.ts): /api/analytics, /api/v1/analytics (dev only)
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import { logger } from '../utils/logger';

const router = Router();
const AI_SERVICE_URL = process.env['AI_SERVICE_URL'] ?? 'http://ai-services:8000';

router.get('/ml/monitoring', async (req: Request, res: Response) => {
  try {
    const days = req.query['days'] ? parseInt(req.query['days'] as string, 10) : undefined;
    const response = await axios.get(`${AI_SERVICE_URL}/api/v1/ml/monitoring/metrics`, {
      params: days ? { days } : {},
      timeout: 10000,
    });
    if (response.data?.success) {
      return res.json({ success: true, data: response.data.data ?? response.data });
    }
    return res.json({ success: true, data: response.data ?? {} });
  } catch (err: any) {
    logger.warn('ML monitoring fetch failed, returning mock', { error: err.message });
    return res.json({
      success: true,
      data: {
        total_predictions: 0,
        average_confidence: 0.85,
        distributions: { diseases: {}, urgency_levels: {} },
        quality_metrics: { avg_confidence: 0.85, high_confidence_rate: 0.75, low_confidence_rate: 0.05 },
        performance_metrics: { avg_response_time_ms: 150, p95_response_time_ms: 250 },
        error_rate: 0.02,
        timestamp: new Date().toISOString(),
      },
      message: 'Using mock data (AI service unavailable)',
      error: err.message,
    });
  }
});

router.get('/ml/features', async (req: Request, res: Response) => {
  try {
    const top = req.query['top'] ? parseInt(req.query['top'] as string, 10) : undefined;
    const response = await axios.get(`${AI_SERVICE_URL}/api/v1/ml/features/influence`, {
      params: top ? { top_n: top } : {},
      timeout: 10000,
    });
    if (response.data?.success) {
      return res.json({ success: true, data: response.data.data ?? response.data });
    }
    return res.json({ success: true, data: response.data ?? [] });
  } catch (err: any) {
    logger.warn('ML features fetch failed, returning mock', { error: err.message });
    return res.json({
      success: true,
      data: [
        { feature: 'tos', importance: 0.45, shap_abs: 0.45 },
        { feature: 'dificultad_respiratoria', importance: 0.32, shap_abs: 0.32 },
        { feature: 'sibilancias', importance: 0.28, shap_abs: 0.28 },
        { feature: 'fiebre', importance: 0.25, shap_abs: 0.25 },
        { feature: 'dolor_pecho', importance: 0.20, shap_abs: 0.20 },
        { feature: 'fatiga', importance: 0.18, shap_abs: 0.18 },
      ],
      message: 'Using mock data (AI service unavailable)',
      error: err.message,
    });
  }
});

router.get('/ml/fairness', async (req: Request, res: Response) => {
  try {
    const groupField = (req.query['groupField'] as string) ?? 'gender';
    const rawThreshold = req.query['highConfidenceThreshold'];
    const highConfidenceThreshold = rawThreshold ? parseFloat(rawThreshold as string) : undefined;
    const params: Record<string, unknown> = { group_field: groupField };
    if (highConfidenceThreshold !== undefined) {
      params['high_confidence_threshold'] = highConfidenceThreshold;
    }
    const response = await axios.get(`${AI_SERVICE_URL}/api/v1/ml/monitoring/fairness`, {
      params,
      timeout: 10000,
    });
    if (response.data?.success) {
      return res.json({ success: true, data: response.data.data ?? response.data });
    }
    return res.json({ success: true, data: response.data ?? {} });
  } catch (err: any) {
    logger.warn('ML fairness fetch failed, returning mock', { error: err.message });
    return res.json({
      success: true,
      data: {
        group_field: (req.query['groupField'] as string) ?? 'gender',
        groups: {
          M: { count: 450, avg_confidence: 0.87, high_confidence_rate: 0.80 },
          F: { count: 380, avg_confidence: 0.85, high_confidence_rate: 0.78 },
          Other: { count: 30, avg_confidence: 0.83, high_confidence_rate: 0.75 },
        },
        fairness_score: 0.92,
        timestamp: new Date().toISOString(),
      },
      message: 'Using mock data (AI service unavailable)',
      error: err.message,
    });
  }
});

export default router;
