import * as controller from '../../../src/controllers/integrationController';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../src/services/laboratoryIntegrationService', () => ({
  laboratoryIntegrationService: {
    importResults: jest.fn(),
    importFromHl7: jest.fn(),
    syncResults: jest.fn(),
  },
}));

jest.mock('../../../src/services/drugIntegrationService', () => ({
  drugIntegrationService: {
    searchDrug: jest.fn(),
    searchGenericDrugs: jest.fn(),
    checkInteractions: jest.fn(),
    getDosage: jest.fn(),
    checkContraindications: jest.fn(),
  },
}));

jest.mock('../../../src/middleware/rbac', () => ({
  requirePermission: jest.fn().mockReturnValue(jest.fn()),
}));

const { laboratoryIntegrationService } = require('../../../src/services/laboratoryIntegrationService');
const { drugIntegrationService } = require('../../../src/services/drugIntegrationService');

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

describe('integrationController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('importLaboratoryResults', () => {
    it('200 con resultados importados', async () => {
      laboratoryIntegrationService.importResults.mockResolvedValue([{ id: 'r1' }]);
      const { res } = await runHandler(
        controller.importLaboratoryResults,
        buildReq({ body: { patientId: 'p1' } }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(laboratoryIntegrationService.importResults).toHaveBeenCalledWith('p1', undefined, undefined);
    });

    it('convierte startDate/endDate a Date', async () => {
      laboratoryIntegrationService.importResults.mockResolvedValue([]);
      await runHandler(
        controller.importLaboratoryResults,
        buildReq({ body: { patientId: 'p1', startDate: '2026-01-01', endDate: '2026-04-01' } }),
      );
      expect(laboratoryIntegrationService.importResults).toHaveBeenCalledWith(
        'p1',
        expect.any(Date),
        expect.any(Date),
      );
    });

    it('400 cuando falta patientId', async () => {
      const { next } = await runHandler(
        controller.importLaboratoryResults,
        buildReq({ body: {} }),
      );
      expectStatusError(next, 400);
    });

    it('propaga error del servicio', async () => {
      laboratoryIntegrationService.importResults.mockRejectedValue(new Error('boom'));
      const { next } = await runHandler(
        controller.importLaboratoryResults,
        buildReq({ body: { patientId: 'p1' } }),
      );
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('importLaboratoryFromHl7', () => {
    it('200 con resultado importado', async () => {
      laboratoryIntegrationService.importFromHl7.mockResolvedValue({ patientId: 'p1' });
      const { res } = await runHandler(
        controller.importLaboratoryFromHl7,
        buildReq({ body: { hl7Message: 'MSH|^~\\&|' } }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('400 cuando falta hl7Message', async () => {
      const { next } = await runHandler(
        controller.importLaboratoryFromHl7,
        buildReq({ body: {} }),
      );
      expectStatusError(next, 400);
    });

    it('400 cuando el parseo retorna null', async () => {
      laboratoryIntegrationService.importFromHl7.mockResolvedValue(null);
      const { next } = await runHandler(
        controller.importLaboratoryFromHl7,
        buildReq({ body: { hl7Message: 'invalid' } }),
      );
      expectStatusError(next, 400);
    });

    it('propaga error del servicio', async () => {
      laboratoryIntegrationService.importFromHl7.mockRejectedValue(new Error('boom'));
      const { next } = await runHandler(
        controller.importLaboratoryFromHl7,
        buildReq({ body: { hl7Message: 'MSH|' } }),
      );
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('syncLaboratoryResults', () => {
    it('200 con imported/exported', async () => {
      laboratoryIntegrationService.syncResults.mockResolvedValue({ imported: 3, exported: 2 });
      const { res } = await runHandler(
        controller.syncLaboratoryResults,
        buildReq({ body: { patientId: 'p1' } }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('400 cuando falta patientId', async () => {
      const { next } = await runHandler(
        controller.syncLaboratoryResults,
        buildReq({ body: {} }),
      );
      expectStatusError(next, 400);
    });

    it('propaga error del servicio', async () => {
      laboratoryIntegrationService.syncResults.mockRejectedValue(new Error('boom'));
      const { next } = await runHandler(
        controller.syncLaboratoryResults,
        buildReq({ body: { patientId: 'p1' } }),
      );
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('searchDrug', () => {
    it('200 con drugInfo', async () => {
      drugIntegrationService.searchDrug.mockResolvedValue({ name: 'Aspirin' });
      const { res } = await runHandler(
        controller.searchDrug,
        buildReq({ query: { name: 'Aspirin' } }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('400 cuando falta name', async () => {
      const { next } = await runHandler(
        controller.searchDrug,
        buildReq({ query: {} }),
      );
      expectStatusError(next, 400);
    });

    it('400 cuando name no es string', async () => {
      const { next } = await runHandler(
        controller.searchDrug,
        buildReq({ query: { name: ['x'] } }),
      );
      expectStatusError(next, 400);
    });

    it('404 cuando el medicamento no se encuentra', async () => {
      drugIntegrationService.searchDrug.mockResolvedValue(null);
      const { next } = await runHandler(
        controller.searchDrug,
        buildReq({ query: { name: 'Xyz' } }),
      );
      expectStatusError(next, 404);
    });

    it('propaga error del servicio', async () => {
      drugIntegrationService.searchDrug.mockRejectedValue(new Error('boom'));
      const { next } = await runHandler(
        controller.searchDrug,
        buildReq({ query: { name: 'Aspirin' } }),
      );
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('checkDrugInteractions', () => {
    it('200 con interacciones y meta.drugsChecked', async () => {
      drugIntegrationService.checkInteractions.mockResolvedValue([{ drug1: 'A', drug2: 'B' }]);
      const { res } = await runHandler(
        controller.checkDrugInteractions,
        buildReq({ body: { drugs: ['A', 'B', 'C'] } }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('400 cuando drugs no es array', async () => {
      const { next } = await runHandler(
        controller.checkDrugInteractions,
        buildReq({ body: { drugs: 'aspirin' } }),
      );
      expectStatusError(next, 400);
    });

    it('400 cuando hay menos de 2 medicamentos', async () => {
      const { next } = await runHandler(
        controller.checkDrugInteractions,
        buildReq({ body: { drugs: ['A'] } }),
      );
      expectStatusError(next, 400);
    });

    it('propaga error del servicio', async () => {
      drugIntegrationService.checkInteractions.mockRejectedValue(new Error('boom'));
      const { next } = await runHandler(
        controller.checkDrugInteractions,
        buildReq({ body: { drugs: ['A', 'B'] } }),
      );
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getDrugDosage', () => {
    it('200 con dosage', async () => {
      drugIntegrationService.getDosage.mockResolvedValue({ min: 100, max: 200, unit: 'mg' });
      const { res } = await runHandler(
        controller.getDrugDosage,
        buildReq({ query: { name: 'X', condition: 'flu', age: '30', weight: '70' } }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(drugIntegrationService.getDosage).toHaveBeenCalledWith('X', 'flu', 30, 70);
    });

    it('400 cuando falta name', async () => {
      const { next } = await runHandler(
        controller.getDrugDosage,
        buildReq({ query: {} }),
      );
      expectStatusError(next, 400);
    });

    it('404 cuando no hay dosificación', async () => {
      drugIntegrationService.getDosage.mockResolvedValue(null);
      const { next } = await runHandler(
        controller.getDrugDosage,
        buildReq({ query: { name: 'X' } }),
      );
      expectStatusError(next, 404);
    });

    it('propaga error del servicio', async () => {
      drugIntegrationService.getDosage.mockRejectedValue(new Error('boom'));
      const { next } = await runHandler(
        controller.getDrugDosage,
        buildReq({ query: { name: 'X' } }),
      );
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('searchGenericDrugs', () => {
    it('200 con genéricos', async () => {
      drugIntegrationService.searchGenericDrugs.mockResolvedValue([{ name: 'g1' }]);
      const { res } = await runHandler(
        controller.searchGenericDrugs,
        buildReq({ query: { brandName: 'Tylenol' } }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('400 cuando falta brandName', async () => {
      const { next } = await runHandler(
        controller.searchGenericDrugs,
        buildReq({ query: {} }),
      );
      expectStatusError(next, 400);
    });

    it('propaga error del servicio', async () => {
      drugIntegrationService.searchGenericDrugs.mockRejectedValue(new Error('boom'));
      const { next } = await runHandler(
        controller.searchGenericDrugs,
        buildReq({ query: { brandName: 'X' } }),
      );
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('checkContraindications', () => {
    it('200 con conteo de errors y warnings', async () => {
      drugIntegrationService.checkContraindications.mockResolvedValue({
        contraindicated: true,
        alerts: [
          { severity: 'error', message: 'x', reason: 'r' },
          { severity: 'warning', message: 'y', reason: 'r' },
        ],
      });
      const { res } = await runHandler(
        controller.checkContraindications,
        buildReq({ body: { drugName: 'X', patientContext: { allergies: ['p'] } } }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('400 cuando falta drugName', async () => {
      const { next } = await runHandler(
        controller.checkContraindications,
        buildReq({ body: { patientContext: {} } }),
      );
      expectStatusError(next, 400);
    });

    it('400 cuando falta patientContext', async () => {
      const { next } = await runHandler(
        controller.checkContraindications,
        buildReq({ body: { drugName: 'X' } }),
      );
      expectStatusError(next, 400);
    });

    it('propaga error del servicio', async () => {
      drugIntegrationService.checkContraindications.mockRejectedValue(new Error('boom'));
      const { next } = await runHandler(
        controller.checkContraindications,
        buildReq({ body: { drugName: 'X', patientContext: {} } }),
      );
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
