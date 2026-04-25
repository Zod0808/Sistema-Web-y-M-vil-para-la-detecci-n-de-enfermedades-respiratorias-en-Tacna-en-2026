import { analyticsService } from '../../../src/services/analyticsService';
import { epidemiologicalService } from '../../../src/services/epidemiologicalService';

jest.mock('../../../src/models/MedicalHistory', () => ({
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
}));

jest.mock('../../../src/models/AIAnalysis', () => ({
  aggregate: jest.fn(),
}));

jest.mock('../../../src/models/Alert', () => ({
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
}));

jest.mock('../../../src/models/Appointment', () => ({
  aggregate: jest.fn(),
}));

jest.mock('../../../src/models/User', () => ({
  countDocuments: jest.fn(),
}));

jest.mock('../../../src/models/SymptomReport', () => ({
  aggregate: jest.fn(),
}));

jest.mock('../../../src/services/epidemiologicalService', () => ({
  epidemiologicalService: {
    predictOutbreaks: jest.fn(),
  },
}));

const MedicalHistoryModel = require('../../../src/models/MedicalHistory');
const AIAnalysisModel = require('../../../src/models/AIAnalysis');
const AlertModel = require('../../../src/models/Alert');
const AppointmentModel = require('../../../src/models/Appointment');
const UserModel = require('../../../src/models/User');
const SymptomReportModel = require('../../../src/models/SymptomReport');

describe('analyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    UserModel.countDocuments.mockResolvedValueOnce(1200); // patients
    UserModel.countDocuments.mockResolvedValueOnce(85); // doctors
    UserModel.countDocuments.mockResolvedValueOnce(12); // admins
    UserModel.countDocuments.mockResolvedValueOnce(980); // active users

    AlertModel.countDocuments.mockResolvedValueOnce(42); // open alerts
    AlertModel.countDocuments.mockResolvedValueOnce(8); // critical alerts

    AlertModel.aggregate.mockImplementation((pipeline: any[]) => {
      if (pipeline[1]?.$group?._id === '$status') {
        return Promise.resolve([
          { _id: 'pending', count: 10 },
          { _id: 'sent', count: 5 },
          { _id: 'delivered', count: 20 },
          { _id: 'failed', count: 2 },
        ]);
      }
      if (pipeline[1]?.$group?._id === '$priority') {
        return Promise.resolve([
          { _id: 'low', count: 5 },
          { _id: 'medium', count: 10 },
          { _id: 'high', count: 12 },
          { _id: 'critical', count: 8 },
        ]);
      }
      if (pipeline[1]?.$project?.acknowledgementMinutes) {
        return Promise.resolve([{ avgMinutes: 38.4 }]);
      }
      return Promise.resolve([]);
    });

    AppointmentModel.aggregate.mockResolvedValue([
      { _id: 'completed', count: 60 },
      { _id: 'cancelled', count: 8 },
      { _id: 'no_show', count: 4 },
      { _id: 'scheduled', count: 12 },
    ]);

    AIAnalysisModel.aggregate.mockImplementation((pipeline: any[]) => {
      if (pipeline[1]?.$group?._id === null) {
        return Promise.resolve([{ avgConfidence: 87.5, totalAnalyses: 120 }]);
      }
      return Promise.resolve([
        { _id: 'low', count: 25 },
        { _id: 'medium', count: 40 },
        { _id: 'high', count: 30 },
        { _id: 'critical', count: 10 },
      ]);
    });

    MedicalHistoryModel.aggregate.mockResolvedValue([
      { _id: 'Bronquitis', count: 22 },
      { _id: 'Asma', count: 18 },
    ]);

    SymptomReportModel.aggregate.mockImplementation((pipeline: any[]) => {
      if (pipeline.length === 3 && pipeline[1]?.$group?._id === '$category') {
        return Promise.resolve([
          { _id: 'respiratory', total: 30 },
          { _id: 'fever', total: 15 },
        ]);
      }
      return Promise.resolve([
        { _id: { day: '2025-11-04' }, total: 8 },
        { _id: { day: '2025-11-05' }, total: 12 },
      ]);
    });

    (epidemiologicalService.predictOutbreaks as jest.Mock).mockResolvedValue([
      {
        district: 'Gregorio Albarracín',
        category: 'respiratory',
        recentTotal: 18,
        baselineTotal: 9,
        growthRate: 1,
        severityRate: 0.44,
        riskLevel: 'high',
        confidence: 0.78,
      },
    ]);
  });

  it('retorna métricas ejecutivas combinadas', async () => {
    const result = await analyticsService.getExecutiveDashboardData({
      periodInDays: 14,
      includeOutbreakPrediction: true,
    });

    expect(result.summary.patients).toBe(1200);
    expect(result.summary.doctors).toBe(85);
    expect(result.summary.openAlerts).toBe(42);
    expect(result.kpis.aiConfidenceAverage).toBeCloseTo(87.5);
    expect(result.kpis.appointmentCompletionRate).toBeGreaterThan(0);
    expect(result.usage.alertsByStatus.pending).toBe(10);
    expect(result.trends.topDiagnoses[0].diagnosis).toBe('Bronquitis');
    expect(result.outbreaks).toHaveLength(1);
    expect(epidemiologicalService.predictOutbreaks).toHaveBeenCalled();
  });

  it('calcula satisfacción aún con datos parciales', async () => {
    SymptomReportModel.aggregate.mockResolvedValueOnce([
      { _id: 'respiratory', total: 5 },
    ]);

    const result = await analyticsService.getExecutiveDashboardData({
      includeOutbreakPrediction: false,
    });

    expect(result.kpis.satisfactionScore).toBeGreaterThanOrEqual(0);
    expect(result.outbreaks).toBeUndefined();
  });
});

