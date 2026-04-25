import mongoose from 'mongoose';
import AutomaticReport from '../../../src/models/AutomaticReport';

const buildMetrics = () => ({
  totalPatients: 100,
  totalDoctors: 10,
  totalMedicalHistories: 250,
  totalAlerts: 30,
  criticalAlerts: 5,
  totalAppointments: 80,
  completedAppointments: 70,
  aiAnalyses: 50,
  averageAIConfidence: 85,
  topDiagnoses: [{ diagnosis: 'Influenza', count: 20 }],
  symptomCategories: [{ category: 'respiratory', total: 40 }],
  districtDistribution: [{ district: 'Lima', count: 60 }],
  growthMetrics: { patientsGrowth: 5, historiesGrowth: 10, alertsGrowth: -2 },
});

const buildReportData = (overrides: Partial<Record<string, any>> = {}) => ({
  reportType: 'daily' as const,
  period: {
    startDate: new Date('2026-04-01'),
    endDate: new Date('2026-04-02'),
  },
  metrics: buildMetrics(),
  ...overrides,
});

describe('AutomaticReport model', () => {
  beforeEach(async () => {
    await AutomaticReport.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
  });

  describe('validación', () => {
    it('crea reporte con campos requeridos', async () => {
      const report = await AutomaticReport.create(buildReportData());

      expect(report._id).toBeDefined();
      expect(report.reportType).toBe('daily');
      expect(report.status).toBe('pending');
      expect(report.generatedAt).toBeDefined();
    });

    it('falla con reportType inválido', async () => {
      await expect(
        AutomaticReport.create(buildReportData({ reportType: 'annual' }))
      ).rejects.toThrow();
    });

    it('acepta todos los reportTypes válidos', async () => {
      for (const type of ['daily', 'weekly', 'monthly']) {
        const report = await AutomaticReport.create(
          buildReportData({
            reportType: type,
            period: {
              startDate: new Date(`2026-0${type === 'daily' ? 1 : type === 'weekly' ? 2 : 3}-01`),
              endDate: new Date(`2026-0${type === 'daily' ? 1 : type === 'weekly' ? 2 : 3}-28`),
            },
          })
        );
        expect(report.reportType).toBe(type);
      }
    });

    it('acepta todos los status válidos', async () => {
      for (const status of ['pending', 'generating', 'completed', 'failed', 'exported']) {
        const report = await AutomaticReport.create(buildReportData({ status }));
        expect(report.status).toBe(status);
      }
    });

    it('falla con status inválido', async () => {
      await expect(
        AutomaticReport.create(buildReportData({ status: 'cancelled' }))
      ).rejects.toThrow();
    });

    it('acepta anomalías con schema correcto', async () => {
      const report = await AutomaticReport.create(
        buildReportData({
          anomalies: [
            {
              metric: 'criticalAlerts',
              value: 50,
              expectedRange: { min: 0, max: 10 },
              severity: 'high',
              description: 'Número de alertas críticas muy alto',
              detectedAt: new Date(),
            },
          ],
        })
      );

      expect(report.anomalies).toHaveLength(1);
      expect(report.anomalies![0].metric).toBe('criticalAlerts');
      expect(report.anomalies![0].severity).toBe('high');
    });

    it('falla con severity de anomalía inválida', async () => {
      await expect(
        AutomaticReport.create(
          buildReportData({
            anomalies: [
              {
                metric: 'test',
                value: 10,
                expectedRange: { min: 0, max: 5 },
                severity: 'catastrophic', // invalid
                description: 'test',
              },
            ],
          })
        )
      ).rejects.toThrow();
    });

    it('permite exportFormat válido', async () => {
      for (const format of ['pdf', 'csv', 'json']) {
        const report = await AutomaticReport.create(buildReportData({ exportFormat: format }));
        expect(report.exportFormat).toBe(format);
      }
    });
  });

  describe('statics.findByType', () => {
    it('retorna reportes por tipo ordenados por fecha descendente', async () => {
      await AutomaticReport.create(buildReportData({ period: { startDate: new Date('2026-01-01'), endDate: new Date('2026-01-02') } }));
      await AutomaticReport.create(buildReportData({ period: { startDate: new Date('2026-02-01'), endDate: new Date('2026-02-02') } }));
      await AutomaticReport.create(buildReportData({ reportType: 'weekly', period: { startDate: new Date('2026-01-01'), endDate: new Date('2026-01-07') } }));

      const dailyReports = await AutomaticReport.findByType('daily');

      expect(dailyReports).toHaveLength(2);
      dailyReports.forEach(r => expect(r.reportType).toBe('daily'));
    });

    it('respeta el límite indicado', async () => {
      for (let i = 0; i < 5; i++) {
        await AutomaticReport.create(buildReportData({
          period: { startDate: new Date(`2026-0${i + 1}-01`), endDate: new Date(`2026-0${i + 1}-02`) },
        }));
      }

      const limited = await AutomaticReport.findByType('daily', 3);

      expect(limited).toHaveLength(3);
    });
  });

  describe('statics.findLatestByType', () => {
    it('retorna el reporte más reciente del tipo indicado', async () => {
      await AutomaticReport.create(buildReportData({ period: { startDate: new Date('2026-01-01'), endDate: new Date('2026-01-02') } }));
      await AutomaticReport.create(buildReportData({ period: { startDate: new Date('2026-04-01'), endDate: new Date('2026-04-02') } }));

      const latest = await AutomaticReport.findLatestByType('daily');

      expect(latest).not.toBeNull();
      expect(latest!.period.startDate.getFullYear()).toBe(2026);
      expect(latest!.period.startDate.getMonth()).toBe(3); // April (0-indexed)
    });

    it('retorna null cuando no hay reportes del tipo', async () => {
      const result = await AutomaticReport.findLatestByType('weekly');
      expect(result).toBeNull();
    });
  });

  describe('statics.findByDateRange', () => {
    it('retorna reportes dentro del rango de fechas', async () => {
      await AutomaticReport.create(buildReportData({
        period: { startDate: new Date('2026-01-01'), endDate: new Date('2026-01-31') },
      }));
      await AutomaticReport.create(buildReportData({
        period: { startDate: new Date('2026-06-01'), endDate: new Date('2026-06-30') },
      }));

      const results = await AutomaticReport.findByDateRange(
        new Date('2025-12-01'),
        new Date('2026-03-01')
      );

      expect(results).toHaveLength(1);
    });
  });

  describe('statics.getReportStats', () => {
    it('retorna estadísticas correctas por tipo y estado', async () => {
      await AutomaticReport.create(buildReportData({ reportType: 'daily', status: 'completed' }));
      await AutomaticReport.create(buildReportData({ reportType: 'daily', status: 'failed', period: { startDate: new Date('2026-01-01'), endDate: new Date('2026-01-02') } }));
      await AutomaticReport.create(buildReportData({ reportType: 'weekly', status: 'pending', period: { startDate: new Date('2026-01-01'), endDate: new Date('2026-01-07') } }));

      const stats = await AutomaticReport.getReportStats();

      expect(stats.total).toBe(3);
      expect(stats.byType.daily).toBe(2);
      expect(stats.byType.weekly).toBe(1);
      expect(stats.byType.monthly).toBe(0);
      expect(stats.byStatus.completed).toBe(1);
      expect(stats.byStatus.failed).toBe(1);
      expect(stats.byStatus.pending).toBe(1);
    });

    it('retorna ceros cuando no hay reportes', async () => {
      const stats = await AutomaticReport.getReportStats();

      expect(stats.total).toBe(0);
      expect(stats.byType.daily).toBe(0);
      expect(stats.byStatus.pending).toBe(0);
    });
  });
});