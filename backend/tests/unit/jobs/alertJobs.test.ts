import { startAlertJobs, stopAlertJobs } from '../../../src/jobs/alertJobs';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../src/config/config', () => ({
  config: {
    jobs: {
      alerts: {
        scheduledIntervalMs: 60000,
        pendingIntervalMs: 30000,
      },
    },
  },
}));

jest.mock('../../../src/services/notificationService', () => ({
  notificationService: {
    processScheduledQueue: jest.fn().mockResolvedValue(0),
  },
}));

jest.mock('../../../src/services/alertService', () => ({
  alertService: {
    processPendingAlerts: jest.fn().mockResolvedValue({ processed: 0, delivered: 0, failed: 0 }),
  },
}));

const { notificationService } = require('../../../src/services/notificationService');
const { alertService } = require('../../../src/services/alertService');

describe('alertJobs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Siempre detener jobs antes de cada test para resetear estado
    stopAlertJobs();
  });

  afterEach(() => {
    stopAlertJobs();
    jest.useRealTimers();
  });

  describe('startAlertJobs', () => {
    it('inicia los intervalos de alertas', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      startAlertJobs({ scheduledIntervalMs: 1000, pendingIntervalMs: 500 });

      expect(setIntervalSpy).toHaveBeenCalledTimes(2);
    });

    it('no crea intervalos duplicados al llamar dos veces', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      startAlertJobs({ scheduledIntervalMs: 1000, pendingIntervalMs: 500 });
      startAlertJobs({ scheduledIntervalMs: 1000, pendingIntervalMs: 500 });

      expect(setIntervalSpy).toHaveBeenCalledTimes(2);
    });

    it('procesa la cola programada al ejecutar el intervalo', async () => {
      notificationService.processScheduledQueue.mockResolvedValue(3);

      startAlertJobs({ scheduledIntervalMs: 1000, pendingIntervalMs: 60000 });
      jest.advanceTimersByTime(1000);

      await Promise.resolve();
      await Promise.resolve();

      expect(notificationService.processScheduledQueue).toHaveBeenCalled();
    });

    it('procesa alertas pendientes al ejecutar el intervalo', async () => {
      alertService.processPendingAlerts.mockResolvedValue({ processed: 5, delivered: 4, failed: 1 });

      startAlertJobs({ scheduledIntervalMs: 60000, pendingIntervalMs: 1000 });
      jest.advanceTimersByTime(1000);

      await Promise.resolve();
      await Promise.resolve();

      expect(alertService.processPendingAlerts).toHaveBeenCalled();
    });

    it('maneja errores en processScheduledQueue sin propagar', async () => {
      notificationService.processScheduledQueue.mockRejectedValue(new Error('Queue error'));

      startAlertJobs({ scheduledIntervalMs: 1000, pendingIntervalMs: 60000 });
      jest.advanceTimersByTime(1000);

      await Promise.resolve();
      await Promise.resolve();

      // No debe lanzar error
      expect(notificationService.processScheduledQueue).toHaveBeenCalled();
    });

    it('maneja errores en processPendingAlerts sin propagar', async () => {
      alertService.processPendingAlerts.mockRejectedValue(new Error('Alerts error'));

      startAlertJobs({ scheduledIntervalMs: 60000, pendingIntervalMs: 1000 });
      jest.advanceTimersByTime(1000);

      await Promise.resolve();
      await Promise.resolve();

      expect(alertService.processPendingAlerts).toHaveBeenCalled();
    });

    it('usa intervalos por defecto cuando no se pasan parámetros', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      startAlertJobs();

      expect(setIntervalSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('stopAlertJobs', () => {
    it('detiene los intervalos al llamar stopAlertJobs', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      startAlertJobs({ scheduledIntervalMs: 1000, pendingIntervalMs: 500 });
      stopAlertJobs();

      expect(clearIntervalSpy).toHaveBeenCalledTimes(2);
    });

    it('no lanza error al llamar stopAlertJobs sin haber iniciado', () => {
      expect(() => stopAlertJobs()).not.toThrow();
    });

    it('no ejecuta más trabajos después de stop', async () => {
      startAlertJobs({ scheduledIntervalMs: 1000, pendingIntervalMs: 1000 });
      stopAlertJobs();

      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      expect(notificationService.processScheduledQueue).not.toHaveBeenCalled();
      expect(alertService.processPendingAlerts).not.toHaveBeenCalled();
    });

    it('permite reiniciar después de detener', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      startAlertJobs({ scheduledIntervalMs: 1000, pendingIntervalMs: 500 });
      stopAlertJobs();
      startAlertJobs({ scheduledIntervalMs: 1000, pendingIntervalMs: 500 });

      // Se llama dos veces: primera vez al iniciar, segunda vez al reiniciar
      expect(setIntervalSpy).toHaveBeenCalledTimes(4);
    });
  });
});