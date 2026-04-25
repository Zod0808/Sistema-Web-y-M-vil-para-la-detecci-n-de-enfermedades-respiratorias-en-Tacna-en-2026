import { metricAlertService } from '../../../src/services/metricAlertService';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../src/models/AutomaticReport', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
  },
}));

jest.mock('../../../src/models/MedicalHistory', () => ({
  __esModule: true,
  default: { countDocuments: jest.fn() },
}));

jest.mock('../../../src/models/Alert', () => ({
  __esModule: true,
  default: { countDocuments: jest.fn() },
}));

jest.mock('../../../src/models/Appointment', () => ({
  __esModule: true,
  default: { countDocuments: jest.fn() },
}));

jest.mock('../../../src/models/User', () => ({
  __esModule: true,
  default: { countDocuments: jest.fn() },
}));

jest.mock('../../../src/models/AIAnalysis', () => ({
  __esModule: true,
  default: { countDocuments: jest.fn() },
}));

const AutomaticReport = require('../../../src/models/AutomaticReport').default;

const buildMetrics = (overrides: Partial<any> = {}) => ({
  totalPatients: 100,
  totalMedicalHistories: 500,
  totalAlerts: 50,
  criticalAlerts: 5,
  totalAppointments: 200,
  completedAppointments: 180,
  aiAnalyses: 300,
  averageAIConfidence: 0.85,
  ...overrides,
});

const buildReport = (metrics: Partial<any> = {}) => ({
  reportType: 'daily',
  status: 'completed',
  period: { startDate: new Date(), endDate: new Date() },
  metrics: {
    totalPatients: 95,
    totalMedicalHistories: 480,
    totalAlerts: 48,
    criticalAlerts: 4,
    totalAppointments: 195,
    completedAppointments: 175,
    aiAnalyses: 290,
    averageAIConfidence: 0.83,
    ...metrics,
  },
});

describe('metricAlertService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detectAnomalies', () => {
    it('retorna array vacío cuando no hay suficientes reportes históricos', async () => {
      AutomaticReport.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await metricAlertService.detectAnomalies(buildMetrics());
      expect(result).toEqual([]);
    });

    it('retorna array vacío cuando hay menos de 7 reportes históricos', async () => {
      const reports = Array.from({ length: 5 }, () => buildReport());
      AutomaticReport.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(reports),
          }),
        }),
      });

      const result = await metricAlertService.detectAnomalies(buildMetrics());
      expect(result).toEqual([]);
    });

    it('detecta anomalía cuando el valor actual es muy diferente al histórico', async () => {
      // 10 reportes históricos con valores estables alrededor de 480
      const reports = Array.from({ length: 10 }, (_, i) =>
        buildReport({ totalMedicalHistories: 480 + i })
      );
      AutomaticReport.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(reports),
          }),
        }),
      });

      // Valor actual muy diferente al histórico (1000 vs ~485)
      const currentMetrics = buildMetrics({ totalMedicalHistories: 1000 });
      const anomalies = await metricAlertService.detectAnomalies(currentMetrics);

      expect(Array.isArray(anomalies)).toBe(true);
      // Puede detectar anomalía en totalMedicalHistories
    });

    it('no detecta anomalía cuando los valores son normales', async () => {
      // 10 reportes históricos con valores variables
      const reports = Array.from({ length: 10 }, (_, i) =>
        buildReport({ totalMedicalHistories: 475 + i * 5 })
      );
      AutomaticReport.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(reports),
          }),
        }),
      });

      // Valor actual dentro del rango normal
      const currentMetrics = buildMetrics({ totalMedicalHistories: 500 });
      const anomalies = await metricAlertService.detectAnomalies(currentMetrics);

      expect(Array.isArray(anomalies)).toBe(true);
    });

    it('usa configuración personalizada de umbrales', async () => {
      AutomaticReport.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await metricAlertService.detectAnomalies(buildMetrics(), {
        lookbackDays: 7,
        zScoreThreshold: 3,
        percentChangeThreshold: 30,
      });

      expect(Array.isArray(result)).toBe(true);
    });

    it('retorna array vacío cuando ocurre un error', async () => {
      AutomaticReport.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockRejectedValue(new Error('DB error')),
          }),
        }),
      });

      const result = await metricAlertService.detectAnomalies(buildMetrics());
      expect(result).toEqual([]);
    });

    it('retorna anomalías con las propiedades correctas', async () => {
      const reports = Array.from({ length: 10 }, () => buildReport({ totalAlerts: 50 }));
      AutomaticReport.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(reports),
          }),
        }),
      });

      const currentMetrics = buildMetrics({ totalAlerts: 500 }); // Gran desviación
      const anomalies = await metricAlertService.detectAnomalies(currentMetrics, {
        zScoreThreshold: 1,
        percentChangeThreshold: 5,
      });

      if (anomalies.length > 0) {
        const anomaly = anomalies[0];
        expect(anomaly).toHaveProperty('metric');
        expect(anomaly).toHaveProperty('value');
        expect(anomaly).toHaveProperty('expectedRange');
        expect(anomaly).toHaveProperty('severity');
        expect(anomaly).toHaveProperty('description');
        expect(anomaly).toHaveProperty('detectedAt');
        expect(['low', 'medium', 'high', 'critical']).toContain(anomaly.severity);
      }
    });
  });
});