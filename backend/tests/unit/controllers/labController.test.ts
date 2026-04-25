import * as labController from '../../../src/controllers/labController';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../src/services/labService', () => ({
  labService: {
    getResults: jest.fn(),
    getPatientHistory: jest.fn(),
    getAbnormalResults: jest.fn(),
    getCriticalResults: jest.fn(),
    getResultById: jest.fn(),
    markResultAsReviewed: jest.fn(),
    getSummary: jest.fn(),
    flagResult: jest.fn(),
  },
}));

const { labService } = require('../../../src/services/labService');

const buildReq = (overrides: Partial<any> = {}): any => ({
  user: { _id: 'doctor-1', role: 'doctor' },
  body: {},
  params: {},
  query: {},
  ...overrides,
});

const buildRes = () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { status, json } as any;
};

const buildLabResult = (overrides: Partial<any> = {}) => ({
  _id: 'result-1',
  patientId: 'patient-1',
  testName: 'Hemoglobina',
  testCode: '718-7',
  value: 14.5,
  unit: 'g/dL',
  status: 'normal',
  date: new Date(),
  ...overrides,
});

describe('labController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getLabResults', () => {
    it('retorna resultados de laboratorio con éxito', async () => {
      const results = [buildLabResult(), buildLabResult({ _id: 'result-2' })];
      labService.getResults.mockResolvedValue(results);

      const req = buildReq({ query: { patientId: 'patient-1' } });
      const res = buildRes();
      const next = jest.fn();

      await labController.getLabResults(req, res, next);

      expect(labService.getResults).toHaveBeenCalledWith(
        expect.objectContaining({ patientId: 'patient-1' })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.status().json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: results })
      );
    });

    it('convierte flagged string a boolean correctamente', async () => {
      labService.getResults.mockResolvedValue([]);

      const req = buildReq({ query: { flagged: 'true' } });
      const res = buildRes();

      await labController.getLabResults(req, res, jest.fn());

      expect(labService.getResults).toHaveBeenCalledWith(
        expect.objectContaining({ flagged: true })
      );
    });

    it('convierte flagged=false correctamente', async () => {
      labService.getResults.mockResolvedValue([]);

      const req = buildReq({ query: { flagged: 'false' } });
      const res = buildRes();

      await labController.getLabResults(req, res, jest.fn());

      expect(labService.getResults).toHaveBeenCalledWith(
        expect.objectContaining({ flagged: false })
      );
    });

    it('propaga error del servicio al next', async () => {
      labService.getResults.mockRejectedValue(new Error('DB error'));

      const req = buildReq();
      const res = buildRes();
      const next = jest.fn();

      await labController.getLabResults(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getPatientHistory', () => {
    it('retorna historial del paciente', async () => {
      const history = [buildLabResult(), buildLabResult({ testCode: '2160-0' })];
      labService.getPatientHistory.mockResolvedValue(history);

      const req = buildReq({ params: { patientId: 'patient-1' } });
      const res = buildRes();
      const next = jest.fn();

      await labController.getPatientHistory(req, res, next);

      expect(labService.getPatientHistory).toHaveBeenCalledWith('patient-1', undefined, undefined);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('lanza error cuando falta patientId', async () => {
      const req = buildReq({ params: {} });
      const res = buildRes();
      const next = jest.fn();

      await labController.getPatientHistory(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('convierte fechas de string a Date', async () => {
      labService.getPatientHistory.mockResolvedValue([]);

      const req = buildReq({
        params: { patientId: 'patient-1' },
        query: { startDate: '2024-01-01', endDate: '2024-12-31' },
      });
      const res = buildRes();

      await labController.getPatientHistory(req, res, jest.fn());

      expect(labService.getPatientHistory).toHaveBeenCalledWith(
        'patient-1',
        expect.any(Date),
        expect.any(Date)
      );
    });
  });

  describe('getAbnormalResults', () => {
    it('retorna resultados anormales del paciente', async () => {
      const abnormal = [buildLabResult({ status: 'abnormal' })];
      labService.getAbnormalResults.mockResolvedValue(abnormal);

      const req = buildReq({ params: { patientId: 'patient-1' } });
      const res = buildRes();
      const next = jest.fn();

      await labController.getAbnormalResults(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.status().json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: abnormal })
      );
    });
  });

  describe('getCriticalResults', () => {
    it('retorna resultados críticos del paciente', async () => {
      const critical = [buildLabResult({ status: 'critical' })];
      labService.getCriticalResults.mockResolvedValue(critical);

      const req = buildReq({ params: { patientId: 'patient-1' } });
      const res = buildRes();
      const next = jest.fn();

      await labController.getCriticalResults(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.status().json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: critical })
      );
    });
  });

  describe('getResultById', () => {
    it('retorna resultado por ID', async () => {
      const result = buildLabResult();
      labService.getResultById.mockResolvedValue(result);

      const req = buildReq({ params: { id: 'result-1' } });
      const res = buildRes();
      const next = jest.fn();

      await labController.getResultById(req, res, next);

      expect(labService.getResultById).toHaveBeenCalledWith('result-1');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('lanza 404 cuando el resultado no existe', async () => {
      labService.getResultById.mockResolvedValue(null);

      const req = buildReq({ params: { id: 'nonexistent' } });
      const res = buildRes();
      const next = jest.fn();

      await labController.getResultById(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    });
  });

  describe('markAsReviewed', () => {
    it('marca resultado como revisado por el doctor', async () => {
      const result = buildLabResult({ reviewedBy: 'doctor-1' });
      labService.markResultAsReviewed.mockResolvedValue(result);

      const req = buildReq({
        params: { id: 'result-1' },
        user: { _id: 'doctor-1', role: 'doctor' },
      });
      const res = buildRes();
      const next = jest.fn();

      await labController.markAsReviewed(req, res, next);

      expect(labService.markResultAsReviewed).toHaveBeenCalledWith('result-1', 'doctor-1');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getSummary', () => {
    it('retorna resumen estadístico del paciente', async () => {
      const summary = { total: 10, normal: 7, abnormal: 2, critical: 1, flagged: 1 };
      labService.getSummary.mockResolvedValue(summary);

      const req = buildReq({ params: { patientId: 'patient-1' } });
      const res = buildRes();
      const next = jest.fn();

      await labController.getSummary(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.status().json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: summary })
      );
    });
  });
});