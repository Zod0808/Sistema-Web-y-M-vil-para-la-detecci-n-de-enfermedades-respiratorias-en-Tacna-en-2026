import {
  startMlMetricsJobs,
  stopMlMetricsJobs,
  calculateMetricsManually,
} from '../../../src/jobs/mlMetricsJobs';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('node-cron', () => ({
  schedule: jest.fn().mockReturnValue({ stop: jest.fn() }),
}));

jest.mock('../../../src/services/aiIntegration', () => ({
  aiIntegrationService: {
    getMlMonitoringMetrics: jest.fn().mockResolvedValue({ summary: {}, distributions: {}, quality_metrics: {} }),
    getMlFeatureInfluence: jest.fn().mockResolvedValue({ top_features: [], friendly_factors: [] }),
    getMlFairnessMetrics: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('../../../src/config/redisClient', () => ({
  getRedisClient: jest.fn().mockReturnValue(null),
}));

const cron = require('node-cron');
const { aiIntegrationService } = require('../../../src/services/aiIntegration');
const { getRedisClient } = require('../../../src/config/redisClient');

describe('mlMetricsJobs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset module state: stop any existing jobs
    stopMlMetricsJobs();
    cron.schedule.mockClear();
  });

  describe('startMlMetricsJobs', () => {
    it('registra 3 jobs de cron al iniciar', () => {
      startMlMetricsJobs();

      expect(cron.schedule).toHaveBeenCalledTimes(3);
    });

    it('registra job horario con expresión correcta', () => {
      startMlMetricsJobs();

      expect(cron.schedule).toHaveBeenCalledWith(
        '0 * * * *',
        expect.any(Function),
        expect.objectContaining({ timezone: 'America/Lima' })
      );
    });

    it('registra job diario con expresión correcta', () => {
      startMlMetricsJobs();

      expect(cron.schedule).toHaveBeenCalledWith(
        '0 2 * * *',
        expect.any(Function),
        expect.objectContaining({ timezone: 'America/Lima' })
      );
    });

    it('registra job semanal con expresión correcta (lunes)', () => {
      startMlMetricsJobs();

      expect(cron.schedule).toHaveBeenCalledWith(
        '0 3 * * 1',
        expect.any(Function),
        expect.objectContaining({ timezone: 'America/Lima' })
      );
    });

    it('no registra jobs duplicados si se llama dos veces', () => {
      startMlMetricsJobs();
      startMlMetricsJobs();

      expect(cron.schedule).toHaveBeenCalledTimes(3);
    });
  });

  describe('stopMlMetricsJobs', () => {
    it('detiene todos los jobs activos', () => {
      const mockTask = { stop: jest.fn() };
      cron.schedule.mockReturnValue(mockTask);

      startMlMetricsJobs();
      stopMlMetricsJobs();

      expect(mockTask.stop).toHaveBeenCalledTimes(3);
    });

    it('permite reinicio después de stop', () => {
      startMlMetricsJobs();
      stopMlMetricsJobs();
      cron.schedule.mockClear();
      startMlMetricsJobs();

      expect(cron.schedule).toHaveBeenCalledTimes(3);
    });
  });

  describe('calculateMetricsManually', () => {
    it('calcula métricas para período 1h', async () => {
      await calculateMetricsManually('1h', 1);

      expect(aiIntegrationService.getMlMonitoringMetrics).toHaveBeenCalledWith({ days: 1 });
      expect(aiIntegrationService.getMlFeatureInfluence).toHaveBeenCalledWith({ top_n: 20 });
      expect(aiIntegrationService.getMlFairnessMetrics).toHaveBeenCalled();
    });

    it('calcula métricas para período 24h', async () => {
      await calculateMetricsManually('24h', 1);

      expect(aiIntegrationService.getMlMonitoringMetrics).toHaveBeenCalledWith({ days: 1 });
    });

    it('calcula métricas para período 7d con 7 días', async () => {
      await calculateMetricsManually('7d', 7);

      expect(aiIntegrationService.getMlMonitoringMetrics).toHaveBeenCalledWith({ days: 7 });
    });

    it('almacena en Redis cuando está disponible', async () => {
      const mockRedis = {
        setEx: jest.fn().mockResolvedValue('OK'),
        lPush: jest.fn().mockResolvedValue(1),
        lTrim: jest.fn().mockResolvedValue('OK'),
      };
      getRedisClient.mockReturnValue(mockRedis);

      await calculateMetricsManually('1h', 1);

      expect(mockRedis.setEx).toHaveBeenCalled();
      expect(mockRedis.lPush).toHaveBeenCalled();
      expect(mockRedis.lTrim).toHaveBeenCalled();
    });

    it('no falla cuando Redis no está disponible', async () => {
      getRedisClient.mockReturnValue(null);

      await expect(calculateMetricsManually('1h', 1)).resolves.not.toThrow();
    });

    it('propaga error cuando aiIntegrationService falla', async () => {
      aiIntegrationService.getMlMonitoringMetrics.mockRejectedValue(new Error('AI service error'));

      await expect(calculateMetricsManually('1h', 1)).rejects.toThrow('AI service error');
    });
  });

  describe('ejecución del callback de cron', () => {
    it('ejecuta callback sin error y llama a calculateAndStoreMetrics', async () => {
      startMlMetricsJobs();

      // Get the hourly job callback
      const hourlyCallback = cron.schedule.mock.calls[0][1];
      hourlyCallback();

      // Allow async operations to complete
      await new Promise(r => setTimeout(r, 50));

      expect(aiIntegrationService.getMlMonitoringMetrics).toHaveBeenCalled();
    });

    it('maneja errores en callbacks sin propagar', async () => {
      aiIntegrationService.getMlMonitoringMetrics.mockRejectedValue(new Error('service error'));

      startMlMetricsJobs();
      const hourlyCallback = cron.schedule.mock.calls[0][1];

      // Should not throw
      expect(() => hourlyCallback()).not.toThrow();
      await new Promise(r => setTimeout(r, 50));
    });
  });
});