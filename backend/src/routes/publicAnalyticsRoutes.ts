/**
 * Public Analytics Routes (TS)
 *
 * Unauthenticated dashboard endpoints backed by MongoDB aggregations.
 * Intentionally NOT auth-guarded: the dev/demo web dashboard renders these
 * without a user token. The authenticated equivalents (RBAC-guarded) live
 * in analyticsRoutes.ts under /api/v1/analytics/*.
 *
 * Mounts (index-dev.js): /api/analytics
 * Endpoints:
 *   GET /dashboard         — overview + distributions + top districts
 *   GET /temporal-trends   — daily/weekly counts + top symptoms
 *   GET /disease-reports   — symptom + chat-derived disease analysis
 */

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

const SymptomReport = require('../models/SymptomReport');
const ChatConversation = require('../models/ChatConversation');

const router = Router();

const PERIOD_TO_DAYS: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };

const requireMongoConnected = (res: Response): boolean => {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({
      success: false,
      message: 'MongoDB no está conectado.',
      error: 'Database connection unavailable',
    });
    return false;
  }
  return true;
};

// ---------------------------------------------------------------------------
// GET /dashboard
// ---------------------------------------------------------------------------
router.get('/dashboard', async (_req: Request, res: Response) => {
  if (!requireMongoConnected(res)) return;
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const severitySwitch = {
      $switch: {
        branches: [
          { case: { $eq: ['$overallSeverity', 'low'] }, then: 1 },
          { case: { $eq: ['$overallSeverity', 'medium'] }, then: 2 },
          { case: { $eq: ['$overallSeverity', 'high'] }, then: 3 },
        ],
        default: 1,
      },
    };

    const [
      overviewCounts,
      severityDistribution,
      categoryDistribution,
      topDistricts,
      recentActivityRaw,
    ] = await Promise.all([
      Promise.all([
        SymptomReport.countDocuments().exec(),
        SymptomReport.countDocuments({
          $or: [
            { reportedAt: { $gte: sevenDaysAgo, $lte: now } },
            { createdAt: { $gte: sevenDaysAgo, $lte: now } },
          ],
        }).exec(),
        SymptomReport.countDocuments({
          $or: [{ status: 'urgent' }, { overallSeverity: 'high' }],
        }).exec(),
        ChatConversation.countDocuments().exec(),
        ChatConversation.countDocuments({
          $or: [
            { startedAt: { $gte: sevenDaysAgo, $lte: now } },
            { createdAt: { $gte: sevenDaysAgo, $lte: now } },
          ],
        }).exec(),
      ]),
      SymptomReport.aggregate([{ $group: { _id: '$overallSeverity', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      SymptomReport.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      SymptomReport.aggregate([
        { $match: { 'location.district': { $exists: true, $nin: [null, ''] } } },
        { $group: { _id: '$location.district', count: { $sum: 1 }, avgSeverity: { $avg: severitySwitch } } },
        { $match: { count: { $gt: 0 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
      SymptomReport.find()
        .sort({ reportedAt: -1, createdAt: -1 })
        .limit(10)
        .select(['location', 'symptoms', 'overallSeverity', 'category', 'reportedAt', 'createdAt'])
        .lean(),
    ]);

    const [totalReports, recentReports, urgentReports, totalConversations, recentConversations] = overviewCounts;

    const formatSeverityLevel = (value: number): string => {
      if (value >= 2.5) return 'high';
      if (value >= 1.5) return 'medium';
      return 'low';
    };

    res.status(200).json({
      success: true,
      data: {
        overview: { totalReports, recentReports, urgentReports, totalConversations, recentConversations },
        distributions: {
          severity: severityDistribution.map((item: any) => ({ _id: item._id, count: item.count })),
          category: categoryDistribution.map((item: any) => ({ _id: item._id, count: item.count })),
        },
        topDistricts: topDistricts
          .filter((d: any) => d && d._id && d.count > 0)
          .map((d: any) => ({
            _id: String(d._id ?? '').trim(),
            count: Number(d.count ?? 0),
            avgSeverity: Number((d.avgSeverity ?? 0).toFixed(2)),
            severityLevel: formatSeverityLevel(d.avgSeverity ?? 1),
          })),
        recentActivity: recentActivityRaw.map((r: any) => ({
          district: r.location?.district ?? 'Sin distrito',
          symptoms: (r.symptoms ?? []).slice(0, 4),
          severityLevel: r.overallSeverity ?? 'low',
          category: r.category ?? 'respiratory',
          reportedAt: r.reportedAt ?? r.createdAt,
        })),
        lastUpdated: now,
        dataSource: 'database',
      },
    });
  } catch (err: any) {
    logger.error('public /dashboard failed', { error: err.message });
    res.status(500).json({ success: false, message: 'Error fetching dashboard data from database', error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /temporal-trends
// ---------------------------------------------------------------------------
router.get('/temporal-trends', async (req: Request, res: Response) => {
  if (!requireMongoConnected(res)) return;
  try {
    const period = (req.query['period'] as string) ?? '30d';
    const district = req.query['district'] as string | undefined;
    const category = req.query['category'] as string | undefined;

    const now = new Date();
    const days = PERIOD_TO_DAYS[period] ?? 30;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const baseFilter: Record<string, any> = {
      $or: [
        { reportedAt: { $gte: startDate, $lte: now } },
        { createdAt: { $gte: startDate, $lte: now } },
      ],
    };
    if (district && district !== 'all') baseFilter['location.district'] = district;
    if (category && category !== 'all') baseFilter.category = category;

    const severitySwitch = {
      $switch: {
        branches: [
          { case: { $eq: ['$overallSeverity', 'low'] }, then: 1 },
          { case: { $eq: ['$overallSeverity', 'medium'] }, then: 2 },
          { case: { $eq: ['$overallSeverity', 'high'] }, then: 3 },
        ],
        default: 1,
      },
    };

    const [dailyTrends, weeklyTrends, topSymptoms] = await Promise.all([
      SymptomReport.aggregate([
        { $match: baseFilter },
        {
          $project: {
            date: { $dateToString: { format: '%Y-%m-%d', date: { $ifNull: ['$reportedAt', '$createdAt'] } } },
            severity: '$overallSeverity',
          },
        },
        { $group: { _id: { date: '$date', severity: '$severity' }, count: { $sum: 1 } } },
        { $group: { _id: '$_id.date', data: { $push: { severity: '$_id.severity', count: '$count' } }, total: { $sum: '$count' } } },
        { $sort: { _id: 1 } },
      ]).exec(),
      SymptomReport.aggregate([
        { $match: baseFilter },
        {
          $group: {
            _id: {
              year: { $year: { $ifNull: ['$reportedAt', '$createdAt'] } },
              week: { $week: { $ifNull: ['$reportedAt', '$createdAt'] } },
            },
            count: { $sum: 1 },
            avgSeverity: { $avg: severitySwitch },
          },
        },
        { $sort: { '_id.year': 1, '_id.week': 1 } },
      ]).exec(),
      SymptomReport.aggregate([
        { $match: baseFilter },
        { $unwind: '$symptoms' },
        { $group: { _id: '$symptoms.name', totalCount: { $sum: 1 } } },
        { $sort: { totalCount: -1 } },
        { $limit: 10 },
      ]).exec(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        dailyTrends: dailyTrends.map((item: any) => ({ _id: item._id, data: item.data, total: item.total })),
        weeklyTrends: weeklyTrends.map((item: any) => ({
          _id: item._id,
          count: item.count,
          avgSeverity: Math.round(item.avgSeverity * 100) / 100,
        })),
        topSymptoms: topSymptoms.map((item: any) => ({ _id: item._id, totalCount: item.totalCount, dailyData: [] })),
      },
    });
  } catch (err: any) {
    logger.error('public /temporal-trends failed', { error: err.message });
    res.status(500).json({ success: false, message: 'Error fetching temporal trends from database', error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /disease-reports
// ---------------------------------------------------------------------------
router.get('/disease-reports', async (req: Request, res: Response) => {
  if (!requireMongoConnected(res)) return;
  try {
    const district = req.query['district'] as string | undefined;
    const period = (req.query['period'] as string) ?? '30d';
    const days = PERIOD_TO_DAYS[period] ?? 30;
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const symptomFilter: Record<string, any> = { createdAt: { $gte: startDate, $lte: now } };
    if (district && district !== 'all') symptomFilter['location.district'] = district;

    const symptomSeveritySwitch = {
      $switch: {
        branches: [
          { case: { $eq: ['$symptoms.severity', 'mild'] }, then: 1 },
          { case: { $eq: ['$symptoms.severity', 'moderate'] }, then: 2 },
          { case: { $eq: ['$symptoms.severity', 'severe'] }, then: 3 },
        ],
        default: 1,
      },
    };

    const [symptomAnalysis, chatDiseaseAnalysis, districtDiseaseDistribution] = await Promise.all([
      SymptomReport.aggregate([
        { $match: symptomFilter },
        { $unwind: '$symptoms' },
        {
          $group: {
            _id: '$symptoms.name',
            count: { $sum: 1 },
            avgSeverity: { $avg: symptomSeveritySwitch },
            districts: { $addToSet: '$location.district' },
            categories: { $addToSet: '$category' },
          },
        },
        { $sort: { count: -1 } },
      ]),
      ChatConversation.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: now } } },
        { $unwind: '$messages' },
        {
          $match: {
            'messages.role': 'bot',
            $expr: {
              $gt: [
                {
                  $size: {
                    $filter: {
                      input: { $ifNull: ['$messages.metadata.detectedDiseases', []] },
                      as: 'disease',
                      cond: { $ne: ['$$disease', null] },
                    },
                  },
                },
                0,
              ],
            },
          },
        },
        { $unwind: '$messages.metadata.detectedDiseases' },
        {
          $group: {
            _id: '$messages.metadata.detectedDiseases',
            count: { $sum: 1 },
            avgConfidence: { $avg: '$messages.metadata.confidence' },
            avgUrgency: {
              $avg: {
                $switch: {
                  branches: [
                    { case: { $eq: ['$messages.metadata.urgencyLevel', 'very_low'] }, then: 1 },
                    { case: { $eq: ['$messages.metadata.urgencyLevel', 'low'] }, then: 2 },
                    { case: { $eq: ['$messages.metadata.urgencyLevel', 'medium'] }, then: 3 },
                    { case: { $eq: ['$messages.metadata.urgencyLevel', 'high'] }, then: 4 },
                    { case: { $eq: ['$messages.metadata.urgencyLevel', 'critical'] }, then: 5 },
                  ],
                  default: 1,
                },
              },
            },
          },
        },
        { $sort: { count: -1 } },
      ]),
      SymptomReport.aggregate([
        { $match: symptomFilter },
        { $unwind: '$symptoms' },
        {
          $group: {
            _id: { district: '$location.district', symptom: '$symptoms.name' },
            count: { $sum: 1 },
            severity: { $avg: symptomSeveritySwitch },
          },
        },
        {
          $group: {
            _id: '$_id.district',
            symptoms: { $push: { name: '$_id.symptom', count: '$count', severity: '$severity' } },
            totalReports: { $sum: '$count' },
          },
        },
        { $sort: { totalReports: -1 } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        symptomAnalysis,
        chatDiseaseAnalysis,
        districtDistribution: districtDiseaseDistribution,
        period,
        dateRange: { start: startDate, end: now },
      },
    });
  } catch (err: any) {
    logger.error('public /disease-reports failed', { error: err.message });
    res.status(500).json({ success: false, message: 'Error fetching disease reports from database', error: err.message });
  }
});

export default router;
