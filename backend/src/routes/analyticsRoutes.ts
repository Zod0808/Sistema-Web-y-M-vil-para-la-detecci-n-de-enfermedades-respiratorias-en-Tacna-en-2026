import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { analyticsService } from '../services/analyticsService';
import { epidemiologicalService } from '../services/epidemiologicalService';
import { aiIntegrationService } from '../services/aiIntegration';
import { authenticate } from '../middleware/auth';
import { requireRole, requirePermission } from '../middleware/rbac';

// Legacy dashboard endpoints (consumed by AnalyticsDashboardSimple, DiseaseReports,
// EpidemiologicalHeatmap, AdvancedTrendsChart, TemporalTrends).
// Aggregations are inlined here — small enough that a dedicated service isn't warranted yet.
const SymptomReport: any = require('../models/SymptomReport');
const ChatConversation: any = require('../models/ChatConversation');

const PERIOD_TO_DAYS: Record<string, number> = {
  '7d': 7, '30d': 30, '90d': 90, '180d': 180, '365d': 365,
  '1w': 7, '1m': 30, '3m': 90, '6m': 180, '1y': 365,
};
const periodToDays = (p: unknown, fallback = 30): number => {
  if (typeof p === 'string' && PERIOD_TO_DAYS[p]) return PERIOD_TO_DAYS[p];
  const n = Number(p);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 730) : fallback;
};
const daysAgo = (n: number) => new Date(Date.now() - n * 86400_000);
const SEVERITY_TO_LEVEL = (avg: number) => (avg >= 2.5 ? 'high' : avg >= 1.75 ? 'medium' : 'low');

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

const ALLOWED_GROUP_FIELDS = new Set(['gender', 'age_group', 'region', 'diagnosis', 'severity']);

router.get(
  '/ml/fairness',
  asyncHandler(async (req: Request, res: Response) => {
    const requestedField = req.query.groupField as string | undefined;
    const groupField = requestedField && ALLOWED_GROUP_FIELDS.has(requestedField)
      ? requestedField
      : 'gender';

    const rawThreshold = req.query.highConfidenceThreshold
      ? parseFloat(req.query.highConfidenceThreshold as string)
      : undefined;
    const highConfidenceThreshold =
      rawThreshold !== undefined && !isNaN(rawThreshold) && rawThreshold >= 0 && rawThreshold <= 1
        ? rawThreshold
        : undefined;

    const data = await aiIntegrationService.getMlFairnessMetrics({
      group_field: groupField,
      high_confidence_threshold: highConfidenceThreshold,
    });

    res.status(200).json({ success: true, data });
  }),
);

// ─────────────────────────────────────────────────────────────────────────
// Legacy endpoints
// ─────────────────────────────────────────────────────────────────────────

/**
 * GET /analytics/dashboard
 * Consumed by AnalyticsDashboardSimple.js — returns unwrapped shape.
 */
router.get(
  '/dashboard',
  asyncHandler(async (_req: Request, res: Response) => {
    const now = new Date();
    const last7d = daysAgo(7);

    const [
      totalReports,
      recentReports,
      urgentReports,
      totalConversations,
      severityAgg,
      categoryAgg,
      recentActivity,
    ] = await Promise.all([
      SymptomReport.countDocuments({}),
      SymptomReport.countDocuments({ createdAt: { $gte: last7d } }),
      SymptomReport.countDocuments({ overallSeverity: 'severe' }),
      ChatConversation.countDocuments({}),
      SymptomReport.aggregate([
        { $group: { _id: { $ifNull: ['$overallSeverity', 'unknown'] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      SymptomReport.aggregate([
        { $group: { _id: { $ifNull: ['$category', 'unknown'] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      SymptomReport.find({})
        .sort({ reportedAt: -1, createdAt: -1 })
        .limit(10)
        .select({ location: 1, symptoms: 1, category: 1, reportedAt: 1, overallSeverity: 1, createdAt: 1 })
        .lean(),
    ]);

    const severityMap: Record<string, string> = { severe: 'high', moderate: 'medium', mild: 'low' };
    const normalizedSeverity = severityAgg.map((s: any) => ({
      _id: severityMap[s._id] || s._id || 'unknown',
      count: s.count,
    }));

    res.status(200).json({
      generatedAt: now.toISOString(),
      overview: {
        totalReports,
        recentReports,
        urgentReports,
        totalConversations,
      },
      distributions: {
        severity: normalizedSeverity,
        category: categoryAgg,
      },
      recentActivity: recentActivity.map((r: any) => ({
        severityLevel: severityMap[r.overallSeverity] || 'low',
        location: r.location,
        symptoms: r.symptoms,
        reportedAt: r.reportedAt || r.createdAt,
        category: r.category,
      })),
    });
  }),
);

/**
 * GET /analytics/disease-reports?district=&period=
 * Consumed by DiseaseReports.js.
 */
router.get(
  '/disease-reports',
  asyncHandler(async (req: Request, res: Response) => {
    const days = periodToDays(req.query.period, 90);
    const district = typeof req.query.district === 'string' ? req.query.district : undefined;
    const since = daysAgo(days);

    const matchBase: any = { createdAt: { $gte: since } };
    if (district) matchBase['location.district'] = district;

    const severityToNum = {
      $switch: {
        branches: [
          { case: { $eq: ['$symptoms.severity', 'severe'] }, then: 3 },
          { case: { $eq: ['$symptoms.severity', 'moderate'] }, then: 2 },
          { case: { $eq: ['$symptoms.severity', 'mild'] }, then: 1 },
        ],
        default: 1,
      },
    };

    const [symptomAnalysis, chatDiseaseAnalysis, districtDistribution] = await Promise.all([
      // Top individual symptoms with severity + coverage across districts
      SymptomReport.aggregate([
        { $match: matchBase },
        { $unwind: '$symptoms' },
        {
          $group: {
            _id: '$symptoms.name',
            count: { $sum: 1 },
            avgSeverity: { $avg: severityToNum },
            districts: { $addToSet: '$location.district' },
            categories: { $addToSet: '$category' },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 50 },
      ]),
      // Diseases detected in chat conversations
      ChatConversation.aggregate([
        { $match: district ? { ...matchBase, 'location.district': district } : { createdAt: { $gte: since } } },
        { $unwind: { path: '$summary.detectedDiseases', preserveNullAndEmptyArrays: false } },
        {
          $group: {
            _id: '$summary.detectedDiseases',
            count: { $sum: 1 },
            avgConfidence: { $avg: '$summary.averageConfidence' },
            avgUrgency: {
              $avg: {
                $switch: {
                  branches: [
                    { case: { $eq: ['$summary.highestUrgency', 'critical'] }, then: 4 },
                    { case: { $eq: ['$summary.highestUrgency', 'high'] }, then: 3 },
                    { case: { $eq: ['$summary.highestUrgency', 'medium'] }, then: 2 },
                    { case: { $eq: ['$summary.highestUrgency', 'low'] }, then: 1 },
                  ],
                  default: 0,
                },
              },
            },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
      // Reports per district + top symptoms per district
      SymptomReport.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $unwind: '$symptoms' },
        {
          $group: {
            _id: { district: '$location.district', symptom: '$symptoms.name' },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        {
          $group: {
            _id: '$_id.district',
            symptoms: { $push: { name: '$_id.symptom', count: '$count' } },
            totalReports: { $sum: '$count' },
          },
        },
        { $sort: { totalReports: -1 } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        period: `${days}d`,
        district: district || 'all',
        symptomAnalysis,
        chatDiseaseAnalysis,
        districtDistribution,
      },
    });
  }),
);

/**
 * GET /analytics/temporal-trends?period=&district=&category=
 * Consumed by AdvancedTrendsChart.js, EpidemiologicalHeatmap.js, TemporalTrends.js.
 */
router.get(
  '/temporal-trends',
  asyncHandler(async (req: Request, res: Response) => {
    const days = periodToDays(req.query.period, 30);
    const district = typeof req.query.district === 'string' ? req.query.district : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const since = daysAgo(days);

    const match: any = { createdAt: { $gte: since } };
    if (district) match['location.district'] = district;
    if (category) match.category = category;

    const [totalReports, rawDailyTrends] = await Promise.all([
      SymptomReport.countDocuments(match),
      SymptomReport.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              severity: { $ifNull: ['$overallSeverity', 'unknown'] },
            },
            count: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: '$_id.day',
            total: { $sum: '$count' },
            data: { $push: { severity: '$_id.severity', count: '$count' } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const severityMap: Record<string, string> = { severe: 'high', moderate: 'medium', mild: 'low' };
    const dailyTrends = rawDailyTrends.map((d: any) => ({
      _id: d._id,
      total: d.total,
      data: d.data.map((x: any) => ({
        severity: severityMap[x.severity] || x.severity,
        count: x.count,
      })),
    }));

    res.status(200).json({
      success: true,
      data: {
        period: `${days}d`,
        district: district || 'all',
        category: category || 'all',
        totalReports,
        dailyTrends,
      },
    });
  }),
);

// Silence unused-import warning; helper is referenced by the frontend contract only.
void SEVERITY_TO_LEVEL;

export default router;

