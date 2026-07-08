import * as controller from '../../../src/controllers/labController';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../src/services/labService', () => ({
  labService: {
    getResults: jest.fn(),
    getPatientHistory: jest.fn(),
    getAbnormalResults: jest.fn(),
    getCriticalResults: jest.fn(),
    getLatestResult: jest.fn(),
    getPatientSummary: jest.fn(),
    markAsReviewed: jest.fn(),
    flagForReview: jest.fn(),
    importAndSaveResults: jest.fn(),
  },
}));

jest.mock('../../../src/middleware/rbac', () => ({
  requirePermission: jest.fn().mockReturnValue(jest.fn()),
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

const flushMicrotasks = () => new Promise((resolve) => setImmediate(resolve));

const runHandler = async (handler: any, req: any, res = buildRes(), next = jest.fn()) => {
  await handler(req, res, next);
  await flushMicrotasks();
  return { res, next };
};

const expectStatusError = (next: jest.Mock, code: number) => {
  expect(next).toHaveBeenCalled();
  const arg = next.mock.calls[0]?.[0];
  expect(arg).toBeInstanceOf(Error);
  expect(arg.statusCode).toBe(code);
};

const buildLabResult = (overrides: any = {}) => ({
  _id: 'r1',
  patientId: 'p1',
  testName: 'Hemoglobina',
  testCode: '718-7',
  value: 14.5,
  unit: 'g/dL',
  status: 'normal',
  date: new Date(),
  ...overrides,
});

describe('labController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getLabResults', () => {
    it('200 con resultados y meta.count', async () => {
      labService.getResults.mockResolvedValue([buildLabResult(), buildLabResult()]);
      const { res } = await runHandler(
        controller.getLabResults,
        buildReq({ query: { patientId: 'p1' } }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(labService.getResults).toHaveBeenCalledWith(
        expect.objectContaining({ patientId: 'p1' }),
      );
    });

    it('convierte flagged="true" a boolean true', async () => {
      labService.getResults.mockResolvedValue([]);
      await runHandler(
        controller.getLabResults,
        buildReq({ query: { flagged: 'true' } }),
      );
      expect(labService.getResults).toHaveBeenCalledWith(
        expect.objectContaining({ flagged: true }),
      );
    });

    it('convierte flagged="false" a boolean false', async () => {
      labService.getResults.mockResolvedValue([]);
      await runHandler(
        controller.getLabResults,
        buildReq({ query: { flagged: 'false' } }),
      );
      expect(labService.getResults).toHaveBeenCalledWith(
        expect.objectContaining({ flagged: false }),
      );
    });

    it('flagged sin valor → undefined', async () => {
      labService.getResults.mockResolvedValue([]);
      await runHandler(controller.getLabResults, buildReq({ query: {} }));
      expect(labService.getResults).toHaveBeenCalledWith(
        expect.objectContaining({ flagged: undefined }),
      );
    });

    it('parsea startDate/endDate a Date', async () => {
      labService.getResults.mockResolvedValue([]);
      await runHandler(
        controller.getLabResults,
        buildReq({ query: { startDate: '2026-01-01', endDate: '2026-04-01' } }),
      );
      expect(labService.getResults).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        }),
      );
    });

    it('400 cuando startDate no es una fecha válida', async () => {
      const { next } = await runHandler(
        controller.getLabResults,
        buildReq({ query: { startDate: 'not-a-date' } }),
      );
      expectStatusError(next, 400);
    });

    it('400 cuando endDate no es una fecha válida', async () => {
      const { next } = await runHandler(
        controller.getLabResults,
        buildReq({ query: { endDate: 'invalid' } }),
      );
      expectStatusError(next, 400);
    });

    it('propaga error del servicio', async () => {
      labService.getResults.mockRejectedValue(new Error('svc'));
      const { next } = await runHandler(controller.getLabResults, buildReq());
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getPatientHistory', () => {
    it('200 con el historial', async () => {
      labService.getPatientHistory.mockResolvedValue([buildLabResult()]);
      const { res } = await runHandler(
        controller.getPatientHistory,
        buildReq({ params: { patientId: 'p1' } }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(labService.getPatientHistory).toHaveBeenCalledWith('p1', undefined, undefined);
    });

    it('400 cuando falta patientId', async () => {
      const { next } = await runHandler(
        controller.getPatientHistory,
        buildReq({ params: {} }),
      );
      expectStatusError(next, 400);
    });

    it('convierte startDate/endDate a Date', async () => {
      labService.getPatientHistory.mockResolvedValue([]);
      await runHandler(
        controller.getPatientHistory,
        buildReq({
          params: { patientId: 'p1' },
          query: { startDate: '2026-01-01', endDate: '2026-12-31' },
        }),
      );
      expect(labService.getPatientHistory).toHaveBeenCalledWith(
        'p1',
        expect.any(Date),
        expect.any(Date),
      );
    });

    it('propaga error del servicio', async () => {
      labService.getPatientHistory.mockRejectedValue(new Error('boom'));
      const { next } = await runHandler(
        controller.getPatientHistory,
        buildReq({ params: { patientId: 'p1' } }),
      );
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getAbnormalResults', () => {
    it('200 con conteos de critical y abnormal en meta', async () => {
      labService.getAbnormalResults.mockResolvedValue([
        buildLabResult({ status: 'abnormal' }),
        buildLabResult({ status: 'critical' }),
        buildLabResult({ status: 'abnormal' }),
      ]);
      const res = buildRes();
      const json = jest.fn();
      res.status = jest.fn().mockReturnValue({ json });

      await controller.getAbnormalResults(
        buildReq({ params: { patientId: 'p1' } }),
        res,
        jest.fn(),
      );
      await flushMicrotasks();

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({ critical: 1, abnormal: 2, count: 3 }),
        }),
      );
    });

    it('400 cuando falta patientId', async () => {
      const { next } = await runHandler(
        controller.getAbnormalResults,
        buildReq({ params: {} }),
      );
      expectStatusError(next, 400);
    });

    it('propaga error del servicio', async () => {
      labService.getAbnormalResults.mockRejectedValue(new Error('down'));
      const { next } = await runHandler(
        controller.getAbnormalResults,
        buildReq({ params: { patientId: 'p1' } }),
      );
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getCriticalResults', () => {
    it('200 con resultados críticos', async () => {
      labService.getCriticalResults.mockResolvedValue([
        buildLabResult({ status: 'critical' }),
      ]);
      const { res } = await runHandler(
        controller.getCriticalResults,
        buildReq({ params: { patientId: 'p1' } }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('400 cuando falta patientId', async () => {
      const { next } = await runHandler(
        controller.getCriticalResults,
        buildReq({ params: {} }),
      );
      expectStatusError(next, 400);
    });

    it('convierte startDate/endDate a Date', async () => {
      labService.getCriticalResults.mockResolvedValue([]);
      await runHandler(
        controller.getCriticalResults,
        buildReq({
          params: { patientId: 'p1' },
          query: { startDate: '2026-01-01', endDate: '2026-12-31' },
        }),
      );
      expect(labService.getCriticalResults).toHaveBeenCalledWith(
        'p1',
        expect.any(Date),
        expect.any(Date),
      );
    });

    it('propaga error del servicio', async () => {
      labService.getCriticalResults.mockRejectedValue(new Error('down'));
      const { next } = await runHandler(
        controller.getCriticalResults,
        buildReq({ params: { patientId: 'p1' } }),
      );
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getLatestResult', () => {
    it('200 con el último resultado', async () => {
      labService.getLatestResult.mockResolvedValue(buildLabResult());
      const { res } = await runHandler(
        controller.getLatestResult,
        buildReq({ params: { patientId: 'p1', testCode: '718-7' } }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(labService.getLatestResult).toHaveBeenCalledWith('p1', '718-7');
    });

    it('400 cuando faltan params', async () => {
      const { next } = await runHandler(
        controller.getLatestResult,
        buildReq({ params: { patientId: 'p1' } }),
      );
      expectStatusError(next, 400);
    });

    it('404 cuando no existe resultado', async () => {
      labService.getLatestResult.mockResolvedValue(null);
      const { next } = await runHandler(
        controller.getLatestResult,
        buildReq({ params: { patientId: 'p1', testCode: '718-7' } }),
      );
      expectStatusError(next, 404);
    });

    it('propaga error del servicio', async () => {
      labService.getLatestResult.mockRejectedValue(new Error('down'));
      const { next } = await runHandler(
        controller.getLatestResult,
        buildReq({ params: { patientId: 'p1', testCode: '718-7' } }),
      );
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getPatientSummary', () => {
    it('200 con el summary', async () => {
      labService.getPatientSummary.mockResolvedValue({ total: 10, normal: 8, abnormal: 2 });
      const { res } = await runHandler(
        controller.getPatientSummary,
        buildReq({ params: { patientId: 'p1' } }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('400 cuando falta patientId', async () => {
      const { next } = await runHandler(
        controller.getPatientSummary,
        buildReq({ params: {} }),
      );
      expectStatusError(next, 400);
    });

    it('propaga error del servicio', async () => {
      labService.getPatientSummary.mockRejectedValue(new Error('down'));
      const { next } = await runHandler(
        controller.getPatientSummary,
        buildReq({ params: { patientId: 'p1' } }),
      );
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('markAsReviewed', () => {
    it('200 al marcar como revisado', async () => {
      labService.markAsReviewed.mockResolvedValue(undefined);
      const { res } = await runHandler(
        controller.markAsReviewed,
        buildReq({ params: { resultId: 'r1' } }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(labService.markAsReviewed).toHaveBeenCalledWith('r1', 'doctor-1');
    });

    it('400 cuando falta resultId', async () => {
      const { next } = await runHandler(
        controller.markAsReviewed,
        buildReq({ params: {} }),
      );
      expectStatusError(next, 400);
    });

    it('401 cuando no hay usuario autenticado', async () => {
      const { next } = await runHandler(
        controller.markAsReviewed,
        buildReq({ params: { resultId: 'r1' }, user: null }),
      );
      expectStatusError(next, 401);
    });

    it('propaga error del servicio', async () => {
      labService.markAsReviewed.mockRejectedValue(new Error('down'));
      const { next } = await runHandler(
        controller.markAsReviewed,
        buildReq({ params: { resultId: 'r1' } }),
      );
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('flagForReview', () => {
    it('200 al marcar para revisión', async () => {
      labService.flagForReview.mockResolvedValue(undefined);
      const { res } = await runHandler(
        controller.flagForReview,
        buildReq({
          params: { resultId: 'r1' },
          body: { reason: 'valor sospechoso' },
        }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(labService.flagForReview).toHaveBeenCalledWith('r1', 'valor sospechoso');
    });

    it('400 cuando falta resultId', async () => {
      const { next } = await runHandler(
        controller.flagForReview,
        buildReq({ params: {} }),
      );
      expectStatusError(next, 400);
    });

    it('propaga error del servicio', async () => {
      labService.flagForReview.mockRejectedValue(new Error('down'));
      const { next } = await runHandler(
        controller.flagForReview,
        buildReq({ params: { resultId: 'r1' } }),
      );
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('importAndSaveResults', () => {
    it('200 con conteos de imported/saved/errors', async () => {
      labService.importAndSaveResults.mockResolvedValue({
        imported: 5, saved: 4, errors: 1,
      });
      const { res } = await runHandler(
        controller.importAndSaveResults,
        buildReq({
          body: { patientId: 'p1', startDate: '2026-01-01', endDate: '2026-04-01' },
        }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(labService.importAndSaveResults).toHaveBeenCalledWith(
        'p1',
        expect.any(Date),
        expect.any(Date),
      );
    });

    it('funciona sin startDate/endDate', async () => {
      labService.importAndSaveResults.mockResolvedValue({ imported: 0, saved: 0, errors: 0 });
      const { res } = await runHandler(
        controller.importAndSaveResults,
        buildReq({ body: { patientId: 'p1' } }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(labService.importAndSaveResults).toHaveBeenCalledWith('p1', undefined, undefined);
    });

    it('400 cuando falta patientId', async () => {
      const { next } = await runHandler(
        controller.importAndSaveResults,
        buildReq({ body: {} }),
      );
      expectStatusError(next, 400);
    });

    it('propaga error del servicio', async () => {
      labService.importAndSaveResults.mockRejectedValue(new Error('down'));
      const { next } = await runHandler(
        controller.importAndSaveResults,
        buildReq({ body: { patientId: 'p1' } }),
      );
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
