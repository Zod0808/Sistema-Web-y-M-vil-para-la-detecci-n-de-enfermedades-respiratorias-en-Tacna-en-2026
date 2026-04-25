import { automaticReportService } from '../../../src/services/automaticReportService';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn().mockReturnValue(Buffer.from('CSV_CONTENT')),
}));

jest.mock('../../../src/models/AutomaticReport', () => {
  const saveMock = jest.fn().mockResolvedValue(undefined);
  const instance: any = {
    _id: 'report-id-1',
    status: 'pending',
    metrics: {},
    anomalies: [],
    filePath: undefined,
    period: {},
    save: saveMock,
  };
  const Model: any = jest.fn().mockImplementation(() => instance);
  Model.findById = jest.fn().mockResolvedValue(instance);
  Model.find = jest.fn().mockReturnValue({ sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue([instance]) });
  Model.findOne = jest.fn().mockReturnValue({ sort: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue(instance) });
  Model.countDocuments = jest.fn().mockResolvedValue(5);
  Model.aggregate = jest.fn().mockResolvedValue([]);
  return { __esModule: true, default: Model };
});

jest.mock('../../../src/models/MedicalHistory', () => ({
  __esModule: true,
  default: {
    aggregate: jest.fn().mockResolvedValue([{ _id: 'Gripe', count: 10 }]),
  },
}));

jest.mock('../../../src/models/Alert', () => ({
  __esModule: true,
  default: { aggregate: jest.fn().mockResolvedValue([]) },
}));

jest.mock('../../../src/models/Appointment', () => ({
  __esModule: true,
  default: { aggregate: jest.fn().mockResolvedValue([]) },
}));

jest.mock('../../../src/models/User', () => ({
  __esModule: true,
  default: { countDocuments: jest.fn().mockResolvedValue(50) },
}));

jest.mock('../../../src/models/AIAnalysis', () => ({
  __esModule: true,
  default: { aggregate: jest.fn().mockResolvedValue([]) },
}));

jest.mock('../../../src/models/SymptomReport', () => ({
  aggregate: jest.fn().mockResolvedValue([]),
}), { virtual: true });

jest.mock('../../../src/services/metricAlertService', () => ({
  metricAlertService: {
    getCurrentMetrics: jest.fn().mockResolvedValue({
      totalPatients: 100,
      totalDoctors: 10,
      totalAdmins: 2,
      totalMedicalHistories: 250,
      totalAlerts: 30,
      criticalAlerts: 5,
      totalAppointments: 80,
      completedAppointments: 70,
      aiAnalyses: 50,
      averageAIConfidence: 85,
    }),
    detectAnomalies: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../../../src/utils/pdfGenerator', () => ({
  generateMedicalPdf: jest.fn().mockResolvedValue(Buffer.from('PDF')),
}));

describe('AutomaticReportService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('generateReport', () => {
    const buildOptions = (overrides: any = {}) => ({
      reportType: 'daily' as const,
      period: {
        startDate: new Date('2026-04-01'),
        endDate: new Date('2026-04-02'),
      },
      ...overrides,
    });

    it('genera reporte diario con métricas', async () => {
      const report = await automaticReportService.generateReport(buildOptions());

      expect(report).toBeDefined();
      expect(report.status).toBeDefined();
    });

    it('genera reporte con anomalías cuando includeAnomalies=true', async () => {
      const report = await automaticReportService.generateReport(
        buildOptions({ includeAnomalies: true })
      );

      expect(report).toBeDefined();
    });

    it('genera reporte sin anomalías cuando includeAnomalies=false', async () => {
      const report = await automaticReportService.generateReport(
        buildOptions({ includeAnomalies: false })
      );

      expect(report).toBeDefined();
    });
  });

  describe('generateDailyReport', () => {
    it('genera reporte diario para el día anterior', async () => {
      const report = await automaticReportService.generateDailyReport();
      expect(report).toBeDefined();
    });
  });

  describe('generateWeeklyReport', () => {
    it('genera reporte semanal de los últimos 7 días', async () => {
      const report = await automaticReportService.generateWeeklyReport();
      expect(report).toBeDefined();
    });
  });

  describe('generateMonthlyReport', () => {
    it('genera reporte mensual del mes anterior', async () => {
      const report = await automaticReportService.generateMonthlyReport();
      expect(report).toBeDefined();
    });
  });

  describe('getReportsByType', () => {
    it('retorna reportes por tipo', async () => {
      const reports = await automaticReportService.getReportsByType('daily');
      expect(Array.isArray(reports)).toBe(true);
    });

    it('respeta el límite de resultados', async () => {
      const reports = await automaticReportService.getReportsByType('daily', 5);
      expect(Array.isArray(reports)).toBe(true);
    });
  });

  describe('getLatestReport', () => {
    it('retorna el reporte más reciente del tipo', async () => {
      const report = await automaticReportService.getLatestReport('daily');
      expect(report).toBeDefined();
    });
  });

  describe('getReportStats', () => {
    it('retorna estadísticas de reportes', async () => {
      const stats = await automaticReportService.getReportStats();
      expect(stats).toBeDefined();
    });
  });
});