import { startAppointmentJobs, stopAppointmentJobs } from '../../../src/jobs/appointmentJobs';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../src/services/appointmentService', () => ({
  appointmentService: {
    processUpcomingReminders: jest.fn().mockResolvedValue(0),
  },
}));

const { appointmentService } = require('../../../src/services/appointmentService');

describe('appointmentJobs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    stopAppointmentJobs();
  });

  afterEach(() => {
    stopAppointmentJobs();
    jest.useRealTimers();
  });

  describe('startAppointmentJobs', () => {
    it('inicia el intervalo de recordatorios', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      startAppointmentJobs({ reminderIntervalMs: 1000 });

      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    });

    it('no crea intervalo duplicado al llamar dos veces', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      startAppointmentJobs({ reminderIntervalMs: 1000 });
      startAppointmentJobs({ reminderIntervalMs: 1000 });

      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    });

    it('procesa recordatorios al ejecutar el intervalo', async () => {
      appointmentService.processUpcomingReminders.mockResolvedValue(2);

      startAppointmentJobs({ reminderIntervalMs: 500 });
      jest.advanceTimersByTime(500);

      await Promise.resolve();
      await Promise.resolve();

      expect(appointmentService.processUpcomingReminders).toHaveBeenCalled();
    });

    it('maneja errores sin propagar', async () => {
      appointmentService.processUpcomingReminders.mockRejectedValue(new Error('Reminder error'));

      startAppointmentJobs({ reminderIntervalMs: 500 });
      jest.advanceTimersByTime(500);

      await Promise.resolve();
      await Promise.resolve();

      expect(appointmentService.processUpcomingReminders).toHaveBeenCalled();
    });

    it('usa intervalo por defecto cuando no se pasan parámetros', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      startAppointmentJobs();

      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('stopAppointmentJobs', () => {
    it('detiene el intervalo al llamar stopAppointmentJobs', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      startAppointmentJobs({ reminderIntervalMs: 1000 });
      stopAppointmentJobs();

      expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    });

    it('no lanza error al llamar stopAppointmentJobs sin haber iniciado', () => {
      expect(() => stopAppointmentJobs()).not.toThrow();
    });

    it('no ejecuta más trabajos después de stop', async () => {
      startAppointmentJobs({ reminderIntervalMs: 1000 });
      stopAppointmentJobs();

      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      expect(appointmentService.processUpcomingReminders).not.toHaveBeenCalled();
    });

    it('permite reiniciar después de detener', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      startAppointmentJobs({ reminderIntervalMs: 1000 });
      stopAppointmentJobs();
      startAppointmentJobs({ reminderIntervalMs: 1000 });

      expect(setIntervalSpy).toHaveBeenCalledTimes(2);
    });
  });
});