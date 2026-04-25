import {
  startReportJobs,
  stopReportJobs,
  generateManualReport,
} from '../../../src/jobs/reportJobs';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('node-cron', () => ({
  schedule: jest.fn().mockReturnValue({ stop: jest.fn() }),
}));

jest.mock('../../../src/services/automaticReportService', () => ({
  automaticReportService: {
    generateDailyReport: jest.fn().mockResolvedValue({}),
    generateWeeklyReport: jest.fn().mockResolvedValue({}),
    generateMonthlyReport: jest.fn().mockResolvedValue({}),
  },
}));

const cron = require('node-cron');
const { automaticReportService } = require('../../../src/services/automaticReportService');

describe('reportJobs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stopReportJobs();
    cron.schedule.mockClear();
  });

  describe('startReportJobs', () => {
    it('registra 3 jobs de cron al iniciar', () => {
      startReportJobs();

      expect(cron.schedule).toHaveBeenCalledTimes(3);
    });

    it('registra job diario a las 23:59', () => {
      startReportJobs();

      expect(cron.schedule).toHaveBeenCalledWith(
        '59 23 * * *',
        expect.any(Function),
        expect.objectContaining({ timezone: 'America/Lima' })
      );
    });

    it('registra job semanal los domingos a las 23:59', () => {
      startReportJobs();

      expect(cron.schedule).toHaveBeenCalledWith(
        '59 23 * * 0',
        expect.any(Function),
        expect.objectContaining({ timezone: 'America/Lima' })
      );
    });

    it('registra job mensual el día 1 de cada mes', () => {
      startReportJobs();

      expect(cron.schedule).toHaveBeenCalledWith(
        '0 0 1 * *',
        expect.any(Function),
        expect.objectContaining({ timezone: 'America/Lima' })
      );
    });

    it('no registra jobs duplicados si se llama dos veces', () => {
      startReportJobs();
      startReportJobs();

      expect(cron.schedule).toHaveBeenCalledTimes(3);
    });
  });

  describe('stopReportJobs', () => {
    it('detiene todos los jobs activos', () => {
      const mockTask = { stop: jest.fn() };
      cron.schedule.mockReturnValue(mockTask);

      startReportJobs();
      stopReportJobs();

      expect(mockTask.stop).toHaveBeenCalledTimes(3);
    });

    it('no falla si no hay jobs activos', () => {
      expect(() => stopReportJobs()).not.toThrow();
    });

    it('permite reinicio después de stop', () => {
      startReportJobs();
      stopReportJobs();
      cron.schedule.mockClear();
      startReportJobs();

      expect(cron.schedule).toHaveBeenCalledTimes(3);
    });
  });

  describe('generateManualReport', () => {
    it('genera reporte diario manualmente', async () => {
      await generateManualReport('daily');

      expect(automaticReportService.generateDailyReport).toHaveBeenCalledTimes(1);
    });

    it('genera reporte semanal manualmente', async () => {
      await generateManualReport('weekly');

      expect(automaticReportService.generateWeeklyReport).toHaveBeenCalledTimes(1);
    });

    it('genera reporte mensual manualmente', async () => {
      await generateManualReport('monthly');

      expect(automaticReportService.generateMonthlyReport).toHaveBeenCalledTimes(1);
    });

    it('propaga error cuando el servicio falla', async () => {
      automaticReportService.generateDailyReport.mockRejectedValue(new Error('Report error'));

      await expect(generateManualReport('daily')).rejects.toThrow('Report error');
    });

    it('lanza error para tipo de reporte inválido', async () => {
      await expect(generateManualReport('annual' as any)).rejects.toThrow();
    });
  });

  describe('ejecución del callback de cron', () => {
    it('ejecuta callback de reporte diario correctamente', async () => {
      startReportJobs();

      // daily job is the first cron.schedule call
      const dailyCallback = cron.schedule.mock.calls[0][1];
      dailyCallback();

      await new Promise(r => setTimeout(r, 50));

      expect(automaticReportService.generateDailyReport).toHaveBeenCalled();
    });

    it('ejecuta callback de reporte semanal correctamente', async () => {
      startReportJobs();

      const weeklyCallback = cron.schedule.mock.calls[1][1];
      weeklyCallback();

      await new Promise(r => setTimeout(r, 50));

      expect(automaticReportService.generateWeeklyReport).toHaveBeenCalled();
    });

    it('maneja errores en callbacks sin propagar', async () => {
      automaticReportService.generateDailyReport.mockRejectedValue(new Error('DB error'));

      startReportJobs();
      const dailyCallback = cron.schedule.mock.calls[0][1];

      expect(() => dailyCallback()).not.toThrow();
      await new Promise(r => setTimeout(r, 50));
    });
  });
});