import { epidemiologicalService } from '../../../src/services/epidemiologicalService';

jest.mock('../../../src/models/SymptomReport', () => ({
  aggregate: jest.fn(),
}));

const SymptomReportModel = require('../../../src/models/SymptomReport');

describe('epidemiologicalService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('obtiene tendencias por distrito', async () => {
    SymptomReportModel.aggregate.mockResolvedValue([
      {
        _id: { district: 'Centro de Tacna', category: 'respiratory' },
        totalReports: 40,
        highSeverity: 18,
        mediumSeverity: 12,
      },
      {
        _id: { district: 'Pocollay', category: 'fever' },
        totalReports: 12,
        highSeverity: 1,
        mediumSeverity: 4,
      },
    ]);

    const result = await epidemiologicalService.getDistrictTrends({ days: 15 });

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      district: 'Centro de Tacna',
      category: 'respiratory',
      trend: 'increase',
    });
    expect(result[1].trend).toBe('decrease');
  });

  it('predice brotes considerando ventanas recientes y baseline', async () => {
    SymptomReportModel.aggregate.mockResolvedValue([
      {
        district: 'Gregorio Albarracín',
        category: 'respiratory',
        recentTotal: 24,
        baselineTotal: 10,
        growthRate: 1.4,
        severityRate: 0.5,
        riskLevel: 'high',
      },
      {
        district: 'Ciudad Nueva',
        category: 'fever',
        recentTotal: 6,
        baselineTotal: 5,
        growthRate: 0.2,
        severityRate: 0.1,
        riskLevel: 'stable',
      },
    ]);

    const result = await epidemiologicalService.predictOutbreaks({
      recentWindowDays: 5,
      baselineWindowDays: 10,
      growthThreshold: 0.3,
      minCases: 8,
    });

    expect(result).toHaveLength(2);
    const highRisk = result.find((item) => item.riskLevel === 'high');
    expect(highRisk).toBeDefined();
    expect(highRisk?.confidence).toBeGreaterThan(0);
  });
});

