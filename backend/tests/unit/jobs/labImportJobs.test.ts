import { startLabImportJobs, stopLabImportJobs, runLabImportManually } from '../../../src/jobs/labImportJobs';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('node-cron', () => ({
  schedule: jest.fn().mockReturnValue({
    stop: jest.fn(),
  }),
}));

jest.mock('../../../src/services/laboratoryIntegrationService', () => ({
  laboratoryIntegrationService: {
    importResultsAutomatically: jest.fn().mockResolvedValue({ total: 10, success: 9, errors: 1 }),
  },
}));

jest.mock('../../../src/models/User', () => ({
  __esModule: true,
  default: {
    find: jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue([
        { _id: { toString: () => 'patient-1' } },
        { _id: { toString: () => 'patient-2' } },
      ]),
    }),
  },
}));

const cron = require('node-cron');
const { laboratoryIntegrationService } = require('../../../src/services/laboratoryIntegrationService');
const UserModel = require('../../../src/models/User').default;

describe('labImportJobs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stopLabImportJobs();
  });

  afterEach(() => {
    stopLabImportJobs();
  });

  describe('startLabImportJobs', () => {
    it('programa el job con cron', () => {
      startLabImportJobs();
      expect(cron.schedule).toHaveBeenCalledWith('0 2 * * *', expect.any(Function));
    });

    it('no crea job duplicado al llamar dos veces', () => {
      startLabImportJobs();
      startLabImportJobs();
      expect(cron.schedule).toHaveBeenCalledTimes(1);
    });
  });

  describe('stopLabImportJobs', () => {
    it('detiene el job cron correctamente', () => {
      startLabImportJobs();
      const mockStop = cron.schedule.mock.results[0].value.stop;
      stopLabImportJobs();
      expect(mockStop).toHaveBeenCalled();
    });

    it('no lanza error al llamar sin haber iniciado', () => {
      expect(() => stopLabImportJobs()).not.toThrow();
    });

    it('permite reiniciar después de detener', () => {
      startLabImportJobs();
      stopLabImportJobs();
      startLabImportJobs();
      expect(cron.schedule).toHaveBeenCalledTimes(2);
    });
  });

  describe('runLabImportManually', () => {
    it('importa resultados para todos los pacientes activos', async () => {
      const result = await runLabImportManually();

      expect(laboratoryIntegrationService.importResultsAutomatically).toHaveBeenCalled();
      expect(result).toEqual({ total: 10, success: 9, errors: 1 });
    });

    it('acepta lista de patientIds específicos', async () => {
      const patientIds = ['patient-a', 'patient-b'];
      await runLabImportManually(patientIds);

      expect(laboratoryIntegrationService.importResultsAutomatically).toHaveBeenCalledWith(patientIds);
    });

    it('propaga error si falla la importación', async () => {
      laboratoryIntegrationService.importResultsAutomatically.mockRejectedValue(new Error('Import error'));

      await expect(runLabImportManually()).rejects.toThrow('Import error');
    });
  });

  describe('cron job execution', () => {
    it('ejecuta importación cuando hay pacientes activos', async () => {
      startLabImportJobs();
      const cronCallback = cron.schedule.mock.calls[0][1];

      await cronCallback();

      expect(laboratoryIntegrationService.importResultsAutomatically).toHaveBeenCalledWith(
        expect.arrayContaining(['patient-1', 'patient-2'])
      );
    });

    it('no importa cuando no hay pacientes activos', async () => {
      UserModel.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([]),
      });

      startLabImportJobs();
      const cronCallback = cron.schedule.mock.calls[0][1];

      await cronCallback();

      expect(laboratoryIntegrationService.importResultsAutomatically).not.toHaveBeenCalled();
    });

    it('maneja errores en el callback del cron', async () => {
      laboratoryIntegrationService.importResultsAutomatically.mockRejectedValue(new Error('Cron error'));

      startLabImportJobs();
      const cronCallback = cron.schedule.mock.calls[0][1];

      await expect(cronCallback()).resolves.not.toThrow();
    });
  });
});