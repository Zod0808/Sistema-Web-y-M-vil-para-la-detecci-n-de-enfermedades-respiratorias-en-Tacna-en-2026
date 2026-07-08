/* eslint-disable @typescript-eslint/no-var-requires */
import { Types } from 'mongoose';
import MedicalHistoryModel from '../models/MedicalHistory';
import AIAnalysisModel from '../models/AIAnalysis';
import AlertModel from '../models/Alert';
import AppointmentModel from '../models/Appointment';
import UserModel from '../models/User';
import { epidemiologicalService } from './epidemiologicalService';
import { logger } from '../utils/logger';

const SymptomReportModel: any = require('../models/SymptomReport');

type DateRange = {
  from: Date;
  to: Date;
};

type ExecutiveDashboardOptions = {
  periodInDays?: number;
  includeOutbreakPrediction?: boolean;
};

export interface ExecutiveDashboardResponse {
  timeframe: {
    from: string;
    to: string;
    periodInDays: number;
  };
  summary: {
    patients: number;
    doctors: number;
    admins: number;
    activeUsers: number;
    openAlerts: number;
    criticalAlerts: number;
    openAppointments: number;
  };
  kpis: {
    averageAcknowledgementMinutes: number;
    appointmentCompletionRate: number;
    aiConfidenceAverage: number;
    criticalAlertRatio: number;
    satisfactionScore: number;
  };
  usage: {
    loginsLastPeriod: number;
    appointments: {
      completed: number;
      cancelled: number;
      noShow: number;
    };
    alertsByStatus: Record<string, number>;
    alertsByPriority: Record<string, number>;
    urgencyMix: Record<string, number>;
  };
  trends: {
    topDiagnoses: Array<{ diagnosis: string; count: number }>;
    symptomCategories: Array<{ category: string; total: number }>;
    dailySymptomSeries: Array<{ date: string; total: number }>;
  };
  outbreaks?: Awaited<ReturnType<typeof epidemiologicalService.predictOutbreaks>>;
  epidemiology?: Record<string, unknown>;
  predictiveInsights?: unknown;
  generatedAt: string;
}

const MINUTES_IN_MS = 60 * 1000;

class AnalyticsService {
  private buildDateRange(days: number): DateRange {
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * MINUTES_IN_MS);
    return { from, to };
  }

  private asIsoString(range: DateRange, days: number) {
    return {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      periodInDays: days,
    };
  }

  private mapAggregationToRecord(data: Array<{ _id: string; count: number }>): Record<string, number> {
    return data.reduce<Record<string, number>>((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});
  }

  private safeRatio(numerator: number, denominator: number): number {
    if (!denominator || denominator === 0) {
      return 0;
    }
    return Number((numerator / denominator).toFixed(4));
  }

  async getExecutiveDashboardData(
    options: ExecutiveDashboardOptions = {},
  ): Promise<ExecutiveDashboardResponse> {
    const periodInDays = options.periodInDays ?? 30;
    const range = this.buildDateRange(periodInDays);

    try {
      const [
        patientCount,
        doctorCount,
        adminCount,
        activeUserCount,
        openAlerts,
        criticalAlerts,
        alertStatusAggregation,
        alertPriorityAggregation,
        acknowledgementStats,
        appointmentAggregation,
        aiStats,
        urgentDistribution,
        loginCount,
        topDiagnoses,
        symptomCategoryAggregation,
        symptomTimeline,
        outbreaks,
        districtTrends,
      ] = await Promise.all([
        UserModel.countDocuments({ role: 'patient' }),
        UserModel.countDocuments({ role: 'doctor' }),
        UserModel.countDocuments({ role: 'admin' }),
        UserModel.countDocuments({ isActive: true }),
        AlertModel.countDocuments({ status: { $in: ['pending', 'scheduled', 'sent'] } }),
        AlertModel.countDocuments({ status: { $in: ['pending', 'scheduled', 'sent'] }, priority: 'critical' }),
        AlertModel.aggregate([
          { $match: { createdAt: { $gte: range.from } } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        AlertModel.aggregate([
          { $match: { createdAt: { $gte: range.from } } },
          { $group: { _id: '$priority', count: { $sum: 1 } } },
        ]),
        AlertModel.aggregate([
          {
            $match: {
              createdAt: { $gte: range.from },
              acknowledgedAt: { $ne: null },
            },
          },
          {
            $project: {
              acknowledgementMinutes: {
                $divide: [{ $subtract: ['$acknowledgedAt', '$createdAt'] }, MINUTES_IN_MS],
              },
            },
          },
          {
            $group: {
              _id: null,
              avgMinutes: { $avg: '$acknowledgementMinutes' },
            },
          },
        ]),
        AppointmentModel.aggregate([
          { $match: { scheduledAt: { $gte: range.from } } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        AIAnalysisModel.aggregate([
          { $match: { timestamp: { $gte: range.from } } },
          {
            $group: {
              _id: null,
              avgConfidence: { $avg: '$confidence' },
              totalAnalyses: { $sum: 1 },
            },
          },
        ]),
        AIAnalysisModel.aggregate([
          { $match: { timestamp: { $gte: range.from } } },
          {
            $group: {
              _id: '$urgency',
              count: { $sum: 1 },
            },
          },
        ]),
        UserModel.countDocuments({
          lastLogin: { $gte: range.from },
        }),
        MedicalHistoryModel.aggregate([
          { $match: { date: { $gte: range.from } } },
          { $group: { _id: '$diagnosis', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
        ]),
        SymptomReportModel.aggregate([
          { $match: { createdAt: { $gte: range.from } } },
          { $group: { _id: '$category', total: { $sum: 1 } } },
          { $sort: { total: -1 } },
        ]),
        SymptomReportModel.aggregate([
          { $match: { createdAt: { $gte: range.from } } },
          {
            $group: {
              _id: {
                day: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$createdAt',
                  },
                },
              },
              total: { $sum: 1 },
            },
          },
          { $sort: { '_id.day': 1 } },
        ]),
        options.includeOutbreakPrediction
          ? epidemiologicalService.predictOutbreaks()
          : undefined,
        epidemiologicalService.getDistrictTrends({ days: periodInDays }),
      ]);

      const appointmentLookup = this.mapAggregationToRecord(appointmentAggregation || []);
      const alertStatus = this.mapAggregationToRecord(alertStatusAggregation || []);
      const alertPriorities = this.mapAggregationToRecord(alertPriorityAggregation || []);
      const urgencyMix = this.mapAggregationToRecord(urgentDistribution || []);

      const completedAppointments = appointmentLookup.completed ?? 0;
      const cancelledAppointments = appointmentLookup.cancelled ?? 0;
      const noShowAppointments = appointmentLookup.no_show ?? 0;
      const totalAppointments =
        completedAppointments + cancelledAppointments + noShowAppointments;

      const satisfactionScore = this.calculateSatisfactionScore(alertStatus, appointmentLookup);

      const averageAcknowledgementMinutes =
        acknowledgementStats && acknowledgementStats.length > 0
          ? Number(acknowledgementStats[0].avgMinutes.toFixed(2))
          : 0;

      const aiConfidenceAverage =
        aiStats && aiStats.length > 0 && aiStats[0].avgConfidence
          ? Number(aiStats[0].avgConfidence.toFixed(2))
          : 0;

      const totalAlertsInPeriod = Object.values(alertStatus).reduce((acc, value) => acc + value, 0);

      const predictiveInsights = this.buildPredictiveInsights(
        (symptomTimeline || []).map((item: any) => ({
          date: item._id?.day ?? '',
          total: item.total ?? 0,
        })),
        topDiagnoses || [],
        appointmentLookup,
      );

      return {
        timeframe: this.asIsoString(range, periodInDays),
        summary: {
          patients: patientCount,
          doctors: doctorCount,
          admins: adminCount,
          activeUsers: activeUserCount,
          openAlerts,
          criticalAlerts,
          openAppointments: appointmentLookup.scheduled ?? 0,
        },
        kpis: {
          averageAcknowledgementMinutes,
          appointmentCompletionRate: this.safeRatio(completedAppointments, totalAppointments),
          aiConfidenceAverage,
          criticalAlertRatio: this.safeRatio(criticalAlerts, openAlerts || criticalAlerts),
          satisfactionScore,
        },
        usage: {
          loginsLastPeriod: loginCount,
          appointments: {
            completed: completedAppointments,
            cancelled: cancelledAppointments,
            noShow: noShowAppointments,
          },
          alertsByStatus: alertStatus,
          alertsByPriority: alertPriorities,
          urgencyMix,
        },
        trends: {
          topDiagnoses: (topDiagnoses || []).map((item: any) => ({
            diagnosis: item._id ?? 'Desconocido',
            count: item.count ?? 0,
          })),
          symptomCategories: (symptomCategoryAggregation || []).map((item: any) => ({
            category: item._id ?? 'unknown',
            total: item.total ?? 0,
          })),
          dailySymptomSeries: (symptomTimeline || []).map((item: any) => ({
            date: item._id?.day ?? '',
            total: item.total ?? 0,
          })),
        },
        outbreaks,
        epidemiology: {
          districtTrends,
        },
        predictiveInsights,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('analyticsService.getExecutiveDashboardData failed', {
        error,
      });
      throw error;
    }
  }

  private calculateSatisfactionScore(
    alertStatus: Record<string, number>,
    appointmentLookup: Record<string, number>,
  ): number {
    const resolvedAlerts =
      (alertStatus.delivered ?? 0) + (alertStatus.acknowledged ?? 0);
    const totalAlerts =
      resolvedAlerts + (alertStatus.failed ?? 0) + (alertStatus.pending ?? 0) + (alertStatus.sent ?? 0);

    const completedAppointments = appointmentLookup.completed ?? 0;
    const cancelledAppointments = appointmentLookup.cancelled ?? 0;
    const satisfactionFromAlerts = this.safeRatio(resolvedAlerts, totalAlerts || resolvedAlerts);
    const satisfactionFromAppointments = this.safeRatio(
      completedAppointments,
      completedAppointments + cancelledAppointments,
    );

    const combined = (satisfactionFromAlerts + satisfactionFromAppointments) / 2;
    return Number((combined * 100).toFixed(2));
  }

  private buildPredictiveInsights(
    timeline: Array<{ date: string; total: number }>,
    topDiagnoses: Array<{ diagnosis: string; count: number }>,
    appointmentLookup: Record<string, number>,
  ) {
    if (!timeline.length) {
      return {};
    }

    const orderedTimeline = timeline.slice().sort((a, b) => a.date.localeCompare(b.date));
    const recentSeries = orderedTimeline.slice(-Math.min(14, orderedTimeline.length));
    const totals = recentSeries.map((item) => Number(item.total ?? 0));

    const firstValue = totals[0] ?? 0;
    const lastValue = totals[totals.length - 1] ?? 0;
    const changePct =
      firstValue === 0 ? (lastValue > 0 ? 100 : 0) : Number((((lastValue - firstValue) / firstValue) * 100).toFixed(2));

    const slope =
      totals.length > 1
        ? (lastValue - firstValue) / (totals.length - 1)
        : 0;

    const lastDate = new Date(recentSeries[recentSeries.length - 1].date);
    const forecastHorizon = 3;
    const forecast: Array<{ date: string; predicted: number }> = [];

    for (let step = 1; step <= forecastHorizon; step += 1) {
      const nextDate = new Date(lastDate.getTime() + step * 24 * 60 * 60 * 1000);
      const predicted = Math.max(0, lastValue + slope * step);
      forecast.push({
        date: nextDate.toISOString().slice(0, 10),
        predicted: Number(predicted.toFixed(2)),
      });
    }

    const primaryDiagnosis = topDiagnoses.length ? topDiagnoses[0] : undefined;
    const totalAppointments =
      (appointmentLookup.completed ?? 0) + (appointmentLookup.cancelled ?? 0) + (appointmentLookup.no_show ?? 0);
    const projectedLoad =
      totalAppointments > 0
        ? Number(
            (
              (appointmentLookup.completed ?? 0) +
              (appointmentLookup.scheduled ?? 0) * 0.8
            ) /
              totalAppointments,
          ).toFixed(2)
        : 0;

    return {
      diseaseTrend: primaryDiagnosis
        ? {
            disease: primaryDiagnosis.diagnosis,
            lastObserved: lastValue,
            changePct,
            trend: changePct > 5 ? 'increasing' : changePct < -5 ? 'decreasing' : 'stable',
            forecast,
          }
        : undefined,
      resourceDemand: {
        resource: 'clinical_capacity',
        projectedLoad: Math.min(1, Number(projectedLoad)),
        notes: 'Proyección basada en citas completadas y agendadas próximas.',
      },
    };
  }
}

export const analyticsService = new AnalyticsService();
export type AnalyticsServiceType = AnalyticsService;

