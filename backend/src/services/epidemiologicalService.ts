/* eslint-disable @typescript-eslint/no-var-requires */
import { logger } from '../utils/logger';

const SymptomReportModel: any = require('../models/SymptomReport');

type TrendOptions = {
  days?: number;
};

type OutbreakPredictionOptions = {
  recentWindowDays?: number;
  baselineWindowDays?: number;
  growthThreshold?: number;
  minCases?: number;
};

export interface DistrictTrend {
  district: string;
  category: string;
  totalReports: number;
  highSeverityPercentage: number;
  trend: 'increase' | 'stable' | 'decrease';
}

export interface OutbreakPrediction {
  district: string;
  category: string;
  recentTotal: number;
  baselineTotal: number;
  growthRate: number;
  severityRate: number;
  riskLevel: 'stable' | 'warning' | 'high';
  confidence: number;
}

class EpidemiologicalService {
  private buildRange(days: number) {
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
    return { from, to };
  }

  async getDistrictTrends(options: TrendOptions = {}): Promise<DistrictTrend[]> {
    const { days = 30 } = options;
    const range = this.buildRange(days);

    try {
      const results = await SymptomReportModel.aggregate([
        { $match: { createdAt: { $gte: range.from } } },
        {
          $group: {
            _id: {
              district: '$location.district',
              category: '$category',
              severity: '$overallSeverity',
            },
            total: { $sum: 1 },
          },
        },
        {
          $project: {
            district: '$_id.district',
            category: '$_id.category',
            severity: '$_id.severity',
            total: 1,
          },
        },
        {
          $group: {
            _id: { district: '$district', category: '$category' },
            totalReports: { $sum: '$total' },
            highSeverity: {
              $sum: {
                $cond: [{ $eq: ['$severity', 'high'] }, '$total', 0],
              },
            },
            mediumSeverity: {
              $sum: {
                $cond: [{ $eq: ['$severity', 'medium'] }, '$total', 0],
              },
            },
          },
        },
        { $sort: { totalReports: -1 } },
      ]);

      return (results || []).map((item: any) => {
        const highSeverityPercentage = item.totalReports
          ? Number(((item.highSeverity / item.totalReports) * 100).toFixed(2))
          : 0;
        const mediumSeverityRate = item.totalReports
          ? item.mediumSeverity / item.totalReports
          : 0;
        const trend =
          highSeverityPercentage >= 40 || mediumSeverityRate >= 0.5
            ? 'increase'
            : highSeverityPercentage <= 10
              ? 'decrease'
              : 'stable';

        return {
          district: item._id.district,
          category: item._id.category,
          totalReports: item.totalReports,
          highSeverityPercentage,
          trend,
        };
      });
    } catch (error) {
      logger.error('epidemiologicalService.getDistrictTrends failed', { error });
      throw error;
    }
  }

  async predictOutbreaks(
    options: OutbreakPredictionOptions = {},
  ): Promise<OutbreakPrediction[]> {
    const {
      recentWindowDays = 7,
      baselineWindowDays = 21,
      growthThreshold = 0.35,
      minCases = 10,
    } = options;

    const now = new Date();
    const recentStart = new Date(now.getTime() - recentWindowDays * 24 * 60 * 60 * 1000);
    const baselineStart = new Date(
      recentStart.getTime() - baselineWindowDays * 24 * 60 * 60 * 1000,
    );

    try {
      const aggregation = await SymptomReportModel.aggregate([
        { $match: { createdAt: { $gte: baselineStart } } },
        {
          $group: {
            _id: {
              district: '$location.district',
              category: '$category',
              period: {
                $cond: [{ $gte: ['$createdAt', recentStart] }, 'recent', 'baseline'],
              },
            },
            total: { $sum: 1 },
            highSeverity: {
              $sum: {
                $cond: [{ $eq: ['$overallSeverity', 'high'] }, 1, 0],
              },
            },
          },
        },
        {
          $group: {
            _id: {
              district: '$_id.district',
              category: '$_id.category',
            },
            breakdown: {
              $push: {
                period: '$_id.period',
                total: '$total',
                highSeverity: '$highSeverity',
              },
            },
          },
        },
        {
          $project: {
            district: '$_id.district',
            category: '$_id.category',
            recent: {
              $first: {
                $filter: {
                  input: '$breakdown',
                  as: 'item',
                  cond: { $eq: ['$$item.period', 'recent'] },
                },
              },
            },
            baseline: {
              $first: {
                $filter: {
                  input: '$breakdown',
                  as: 'item',
                  cond: { $eq: ['$$item.period', 'baseline'] },
                },
              },
            },
          },
        },
        {
          $project: {
            district: 1,
            category: 1,
            recentTotal: { $ifNull: ['$recent.total', 0] },
            baselineTotal: { $ifNull: ['$baseline.total', 0] },
            recentSeverity: { $ifNull: ['$recent.highSeverity', 0] },
          },
        },
        {
          $project: {
            district: 1,
            category: 1,
            recentTotal: 1,
            baselineTotal: 1,
            growthRate: {
              $cond: [
                { $lt: ['$baselineTotal', 1] },
                1,
                {
                  $divide: [
                    { $subtract: ['$recentTotal', '$baselineTotal'] },
                    { $max: ['$baselineTotal', 1] },
                  ],
                },
              ],
            },
            severityRate: {
              $cond: [
                { $lt: ['$recentTotal', 1] },
                0,
                { $divide: ['$recentSeverity', '$recentTotal'] },
              ],
            },
          },
        },
        {
          $addFields: {
            riskLevel: {
              $switch: {
                branches: [
                  {
                    case: {
                      $and: [
                        { $gte: ['$recentTotal', minCases] },
                        { $gte: ['$growthRate', growthThreshold * 2] },
                      ],
                    },
                    then: 'high',
                  },
                  {
                    case: {
                      $and: [
                        { $gte: ['$recentTotal', minCases / 2] },
                        { $gte: ['$growthRate', growthThreshold] },
                      ],
                    },
                    then: 'warning',
                  },
                ],
                default: 'stable',
              },
            },
          },
        },
        { $sort: { growthRate: -1 } },
      ]);

      return (aggregation || []).map((item: any) => {
        const confidence = this.calculateConfidenceScore(item);
        return {
          district: item.district,
          category: item.category,
          recentTotal: item.recentTotal,
          baselineTotal: item.baselineTotal,
          growthRate: Number(item.growthRate.toFixed(3)),
          severityRate: Number((item.severityRate ?? 0).toFixed(3)),
          riskLevel: item.riskLevel,
          confidence,
        } as OutbreakPrediction;
      });
    } catch (error) {
      logger.error('epidemiologicalService.predictOutbreaks failed', { error });
      throw error;
    }
  }

  private calculateConfidenceScore(item: any): number {
    const totalObservations = (item.recentTotal ?? 0) + (item.baselineTotal ?? 0);
    if (!totalObservations) {
      return 0;
    }

    const severityBoost = Math.min(item.severityRate ?? 0, 0.6);
    const baseConfidence = Math.min(totalObservations / 50, 1);
    const growthBoost = Math.min(Math.abs(item.growthRate ?? 0), 1);

    return Number(((baseConfidence * 0.6) + (growthBoost * 0.3) + (severityBoost * 0.1)).toFixed(2));
  }
}

export const epidemiologicalService = new EpidemiologicalService();
export type EpidemiologicalServiceType = EpidemiologicalService;

