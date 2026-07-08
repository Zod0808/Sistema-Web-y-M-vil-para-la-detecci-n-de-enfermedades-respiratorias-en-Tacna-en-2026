jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
}));

const pdfDocumentInstance = {
  fontSize: jest.fn().mockReturnThis(),
  text: jest.fn().mockReturnThis(),
  moveDown: jest.fn().mockReturnThis(),
  _listeners: {} as Record<string, Function[]>,
  on: jest.fn(function (this: any, event: string, handler: Function) {
    this._listeners[event] = this._listeners[event] || [];
    this._listeners[event].push(handler);
    return this;
  }),
  end: jest.fn(function (this: any) {
    setImmediate(() => {
      (this._listeners['data'] || []).forEach((h: Function) => h(Buffer.from('PDF')));
      (this._listeners['end'] || []).forEach((h: Function) => h());
    });
  }),
};

jest.mock('pdfkit', () =>
  jest.fn().mockImplementation(() => {
    pdfDocumentInstance._listeners = {};
    return pdfDocumentInstance;
  }),
);

const buildReportDoc = (overrides: any = {}): any => ({
  _id: { toString: () => 'rep-1' },
  reportType: 'daily',
  status: 'generating',
  period: { startDate: new Date('2026-04-01'), endDate: new Date('2026-04-02') },
  metrics: {
    totalPatients: 100,
    totalDoctors: 10,
    totalMedicalHistories: 250,
    totalAlerts: 30,
    criticalAlerts: 5,
    totalAppointments: 80,
    completedAppointments: 70,
    aiAnalyses: 50,
    averageAIConfidence: 0.85,
  },
  anomalies: [],
  filePath: undefined,
  exportedAt: undefined,
  exportFormat: undefined,
  save: jest.fn().mockResolvedValue(undefined),
  toJSON() {
    return { ...this };
  },
  ...overrides,
});

jest.mock('../../../src/models/AutomaticReport', () => {
  const Model: any = jest.fn().mockImplementation(function (this: any, data: any = {}) {
    Object.assign(this, buildReportDoc(data));
  });
  Model.findById = jest.fn();
  Model.findByType = jest.fn().mockResolvedValue([]);
  Model.findLatestByType = jest.fn().mockResolvedValue(null);
  Model.getReportStats = jest.fn().mockResolvedValue({ totalReports: 0 });
  return { __esModule: true, default: Model };
});

jest.mock('../../../src/models/MedicalHistory', () => ({
  __esModule: true,
  default: {
    aggregate: jest.fn().mockResolvedValue([
      { _id: 'Gripe', count: 10 },
      { _id: null, count: 3 },
    ]),
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
  aggregate: jest.fn().mockResolvedValue([{ _id: 'respiratory', total: 20 }]),
}));

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
      averageAIConfidence: 0.85,
    }),
    detectAnomalies: jest.fn().mockResolvedValue([]),
  },
}));

import { automaticReportService } from '../../../src/services/automaticReportService';
const fs = require('fs');
const AutomaticReport = require('../../../src/models/AutomaticReport').default;
const MedicalHistory = require('../../../src/models/MedicalHistory').default;
const { metricAlertService } = require('../../../src/services/metricAlertService');

const buildOptions = (overrides: any = {}) => ({
  reportType: 'daily' as const,
  period: {
    startDate: new Date('2026-04-01'),
    endDate: new Date('2026-04-02'),
  },
  includeAnomalies: false,
  autoExport: false,
  ...overrides,
});

describe('AutomaticReportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockReturnValue(true);
  });

  describe('generateReport', () => {
    it('genera reporte "daily" con métricas y status completed', async () => {
      const report: any = await automaticReportService.generateReport(buildOptions());

      expect(report.status).toBe('completed');
      expect(report.metrics.totalPatients).toBe(100);
      expect(report.metrics.topDiagnoses[0]).toEqual({ diagnosis: 'Gripe', count: 10 });
      expect(report.metrics.symptomCategories[0]).toEqual({ category: 'respiratory', total: 20 });
      expect(report.save).toHaveBeenCalled();
    });

    it('sustituye diagnóstico null por "Desconocido"', async () => {
      const report: any = await automaticReportService.generateReport(buildOptions());
      const desconocido = report.metrics.topDiagnoses.find(
        (d: any) => d.diagnosis === 'Desconocido',
      );
      expect(desconocido).toBeDefined();
    });

    it('incluye anomalías cuando includeAnomalies=true y hay hallazgos', async () => {
      metricAlertService.detectAnomalies.mockResolvedValueOnce([
        { metric: 'alerts', value: 100, severity: 'high', description: 'Pico inusual' },
      ]);
      const report: any = await automaticReportService.generateReport(
        buildOptions({ includeAnomalies: true }),
      );
      expect(report.anomalies).toHaveLength(1);
    });

    it('omite anomalías cuando includeAnomalies=false', async () => {
      const report: any = await automaticReportService.generateReport(
        buildOptions({ includeAnomalies: false }),
      );
      expect(report.anomalies).toEqual([]);
    });

    it('calcula growthMetrics comparando con período anterior', async () => {
      metricAlertService.getCurrentMetrics
        .mockResolvedValueOnce({
          totalPatients: 100,
          totalDoctors: 10,
          totalAdmins: 2,
          totalMedicalHistories: 250,
          totalAlerts: 30,
          criticalAlerts: 5,
          totalAppointments: 80,
          completedAppointments: 70,
          aiAnalyses: 50,
          averageAIConfidence: 0.85,
        })
        .mockResolvedValueOnce({
          totalPatients: 80,
          totalDoctors: 10,
          totalAdmins: 2,
          totalMedicalHistories: 200,
          totalAlerts: 20,
          criticalAlerts: 4,
          totalAppointments: 70,
          completedAppointments: 60,
          aiAnalyses: 40,
          averageAIConfidence: 0.80,
        });

      const report: any = await automaticReportService.generateReport(buildOptions());
      expect(report.metrics.growthMetrics.patientsGrowth).toBe(25);
      expect(report.metrics.growthMetrics.historiesGrowth).toBe(25);
      expect(report.metrics.growthMetrics.alertsGrowth).toBe(50);
    });

    it('calculateGrowth retorna 100 cuando previous=0 y current>0', async () => {
      metricAlertService.getCurrentMetrics
        .mockResolvedValueOnce({
          totalPatients: 10,
          totalDoctors: 10,
          totalAdmins: 2,
          totalMedicalHistories: 100,
          totalAlerts: 5,
          criticalAlerts: 1,
          totalAppointments: 10,
          completedAppointments: 5,
          aiAnalyses: 5,
          averageAIConfidence: 0.5,
        })
        .mockResolvedValueOnce({
          totalPatients: 0,
          totalDoctors: 0,
          totalAdmins: 0,
          totalMedicalHistories: 0,
          totalAlerts: 0,
          criticalAlerts: 0,
          totalAppointments: 0,
          completedAppointments: 0,
          aiAnalyses: 0,
          averageAIConfidence: 0,
        });

      const report: any = await automaticReportService.generateReport(buildOptions());
      expect(report.metrics.growthMetrics.patientsGrowth).toBe(100);
    });

    it('calculateGrowth retorna 0 cuando previous=0 y current=0', async () => {
      metricAlertService.getCurrentMetrics
        .mockResolvedValueOnce({
          totalPatients: 0,
          totalDoctors: 0,
          totalAdmins: 0,
          totalMedicalHistories: 0,
          totalAlerts: 0,
          criticalAlerts: 0,
          totalAppointments: 0,
          completedAppointments: 0,
          aiAnalyses: 0,
          averageAIConfidence: 0,
        })
        .mockResolvedValueOnce({
          totalPatients: 0,
          totalDoctors: 0,
          totalAdmins: 0,
          totalMedicalHistories: 0,
          totalAlerts: 0,
          criticalAlerts: 0,
          totalAppointments: 0,
          completedAppointments: 0,
          aiAnalyses: 0,
          averageAIConfidence: 0,
        });

      const report: any = await automaticReportService.generateReport(buildOptions());
      expect(report.metrics.growthMetrics.patientsGrowth).toBe(0);
    });

    it('setea status=failed y re-lanza cuando algo dentro falla', async () => {
      metricAlertService.getCurrentMetrics.mockRejectedValueOnce(new Error('metrics down'));

      await expect(automaticReportService.generateReport(buildOptions())).rejects.toThrow(
        'metrics down',
      );
    });

    it('exporta automáticamente cuando autoExport=true (json)', async () => {
      AutomaticReport.findById.mockResolvedValueOnce(buildReportDoc());

      await automaticReportService.generateReport(
        buildOptions({ autoExport: true, exportFormat: 'json' }),
      );

      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('generate{Daily,Weekly,Monthly}Report', () => {
    beforeEach(() => {
      AutomaticReport.findById.mockResolvedValue(buildReportDoc());
    });

    it('generateDailyReport produce reporte de tipo daily', async () => {
      const report: any = await automaticReportService.generateDailyReport();
      expect(report.reportType).toBe('daily');
    });

    it('generateWeeklyReport produce reporte de tipo weekly', async () => {
      const report: any = await automaticReportService.generateWeeklyReport();
      expect(report.reportType).toBe('weekly');
    });

    it('generateMonthlyReport produce reporte de tipo monthly', async () => {
      const report: any = await automaticReportService.generateMonthlyReport();
      expect(report.reportType).toBe('monthly');
    });
  });

  describe('exportReport', () => {
    it('exporta en JSON escribiendo el archivo', async () => {
      const doc = buildReportDoc();
      AutomaticReport.findById.mockResolvedValueOnce(doc);

      const filePath = await automaticReportService.exportReport('rep-1', 'json');

      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(filePath).toMatch(/report_daily_.+\.json$/);
      expect(doc.status).toBe('exported');
      expect(doc.exportFormat).toBe('json');
      expect(doc.exportedAt).toBeInstanceOf(Date);
    });

    it('exporta en CSV con métricas y anomalías', async () => {
      const doc = buildReportDoc({
        anomalies: [
          { metric: 'alerts', value: 42, severity: 'high', description: 'Pico' },
        ],
      });
      AutomaticReport.findById.mockResolvedValueOnce(doc);

      const filePath = await automaticReportService.exportReport('rep-1', 'csv');

      expect(filePath).toMatch(/\.csv$/);
      const buffer = (fs.writeFileSync as jest.Mock).mock.calls[0][1];
      const csv = buffer.toString('utf-8');
      expect(csv).toContain('Total Pacientes,100');
      expect(csv).toContain('Anomalías Detectadas');
      expect(csv).toContain('alerts,42,high');
    });

    it('exporta en CSV sin sección de anomalías cuando no las hay', async () => {
      const doc = buildReportDoc({ anomalies: [] });
      AutomaticReport.findById.mockResolvedValueOnce(doc);

      await automaticReportService.exportReport('rep-1', 'csv');

      const csv = (fs.writeFileSync as jest.Mock).mock.calls[0][1].toString('utf-8');
      expect(csv).not.toContain('Anomalías Detectadas');
    });

    it('exporta en PDF invocando pdfkit', async () => {
      const doc = buildReportDoc({
        anomalies: [
          { metric: 'alerts', value: 42, severity: 'high', description: 'Pico' },
        ],
      });
      AutomaticReport.findById.mockResolvedValueOnce(doc);

      const filePath = await automaticReportService.exportReport('rep-1', 'pdf');

      expect(filePath).toMatch(/\.pdf$/);
      expect(pdfDocumentInstance.text).toHaveBeenCalled();
      expect(pdfDocumentInstance.end).toHaveBeenCalled();
    });

    it('exporta PDF sin sección de anomalías cuando el arreglo está vacío', async () => {
      const doc = buildReportDoc({ anomalies: [] });
      AutomaticReport.findById.mockResolvedValueOnce(doc);

      await automaticReportService.exportReport('rep-1', 'pdf');

      expect(pdfDocumentInstance.end).toHaveBeenCalled();
    });

    it('lanza cuando el reporte no existe', async () => {
      AutomaticReport.findById.mockResolvedValueOnce(null);
      await expect(automaticReportService.exportReport('missing', 'json')).rejects.toThrow(
        /no encontrado/,
      );
    });

    it('lanza cuando el formato no es soportado', async () => {
      AutomaticReport.findById.mockResolvedValueOnce(buildReportDoc());
      await expect(
        automaticReportService.exportReport('rep-1', 'xml' as any),
      ).rejects.toThrow(/no soportado/);
    });

    it('propaga error de writeFileSync', async () => {
      AutomaticReport.findById.mockResolvedValueOnce(buildReportDoc());
      (fs.writeFileSync as jest.Mock).mockImplementationOnce(() => {
        throw new Error('disk full');
      });

      await expect(automaticReportService.exportReport('rep-1', 'json')).rejects.toThrow(
        'disk full',
      );
    });
  });

  describe('getters', () => {
    it('getReportsByType delega a findByType', async () => {
      AutomaticReport.findByType.mockResolvedValueOnce([buildReportDoc()]);
      const reports = await automaticReportService.getReportsByType('daily', 5);
      expect(AutomaticReport.findByType).toHaveBeenCalledWith('daily', 5);
      expect(reports).toHaveLength(1);
    });

    it('getReportsByType usa límite por defecto (10)', async () => {
      AutomaticReport.findByType.mockResolvedValueOnce([]);
      await automaticReportService.getReportsByType('weekly');
      expect(AutomaticReport.findByType).toHaveBeenCalledWith('weekly', 10);
    });

    it('getLatestReport delega a findLatestByType', async () => {
      const doc = buildReportDoc();
      AutomaticReport.findLatestByType.mockResolvedValueOnce(doc);
      const report = await automaticReportService.getLatestReport('monthly');
      expect(AutomaticReport.findLatestByType).toHaveBeenCalledWith('monthly');
      expect(report).toBe(doc);
    });

    it('getReportStats delega a getReportStats', async () => {
      AutomaticReport.getReportStats.mockResolvedValueOnce({ totalReports: 42 });
      const stats = await automaticReportService.getReportStats();
      expect(stats).toEqual({ totalReports: 42 });
    });
  });

  describe('storage initialization', () => {
    it('crea el directorio de reportes si no existe', () => {
      // Ya se ejecutó al importar el servicio (singleton). Reimportamos para forzar el path.
      jest.isolateModules(() => {
        const fsMod = require('fs');
        (fsMod.existsSync as jest.Mock).mockReturnValue(false);
        require('../../../src/services/automaticReportService');
        expect(fsMod.mkdirSync).toHaveBeenCalledWith(
          expect.stringContaining('automatic'),
          { recursive: true },
        );
      });
    });
  });
});
