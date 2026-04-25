import * as controller from '../../../src/controllers/integrationController';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../src/services/laboratoryIntegrationService', () => ({
  laboratoryIntegrationService: {
    importResults: jest.fn(),
    importFromHl7: jest.fn(),
    getIntegrationStatus: jest.fn(),
    testConnection: jest.fn(),
  },
}));

jest.mock('../../../src/services/drugIntegrationService', () => ({
  drugIntegrationService: {
    searchDrug: jest.fn(),
    searchGenericDrugs: jest.fn(),
    checkInteractions: jest.fn(),
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

describe('integrationController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('importLaboratoryResults', () => {
    it('importa resultados de laboratorio con éxito', async () => {
      const results = [{ testName: 'Hemoglobina', value: 14.5 }];
      laboratoryIntegrationService.importResults.mockResolvedValue(results);

      const req = buildReq({ body: { patientId: 'patient-1' } });
      const res = buildRes();

      await controller.importLaboratoryResults(req, res, jest.fn());

      expect(laboratoryIntegrationService.importResults).toHaveBeenCalledWith(
        'patient-1', undefined, undefined
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.status().json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('convierte fechas de string a Date', async () => {
      laboratoryIntegrationService.importResults.mockResolvedValue([]);

      const req = buildReq({
        body: { patientId: 'patient-1', startDate: '2026-01-01', endDate: '2026-04-01' },
      });

      await controller.importLaboratoryResults(req, buildRes(), jest.fn());

      expect(laboratoryIntegrationService.importResults).toHaveBeenCalledWith(
        'patient-1',
        expect.any(Date),
        expect.any(Date)
      );
    });

    it('lanza 400 cuando falta patientId', async () => {
      const req = buildReq({ body: {} });
      const next = jest.fn();

      await controller.importLaboratoryResults(req, buildRes(), next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('propaga error del servicio al next', async () => {
      laboratoryIntegrationService.importResults.mockRejectedValue(new Error('Lab API error'));

      const req = buildReq({ body: { patientId: 'patient-1' } });
      const next = jest.fn();

      await controller.importLaboratoryResults(req, buildRes(), next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('importLaboratoryFromHl7', () => {
    it('importa resultado desde mensaje HL7', async () => {
      const result = { patientId: 'patient-1', testName: 'Glucosa', value: 95 };
      laboratoryIntegrationService.importFromHl7.mockResolvedValue(result);

      const req = buildReq({ body: { hl7Message: 'MSH|^~\\&|...' } });
      const res = buildRes();

      await controller.importLaboratoryFromHl7(req, res, jest.fn());

      expect(laboratoryIntegrationService.importFromHl7).toHaveBeenCalledWith('MSH|^~\\&|...');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('lanza 400 cuando falta hl7Message', async () => {
      const req = buildReq({ body: {} });
      const next = jest.fn();

      await controller.importLaboratoryFromHl7(req, buildRes(), next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('lanza 400 cuando el parseo HL7 retorna null', async () => {
      laboratoryIntegrationService.importFromHl7.mockResolvedValue(null);

      const req = buildReq({ body: { hl7Message: 'invalid hl7' } });
      const next = jest.fn();

      await controller.importLaboratoryFromHl7(req, buildRes(), next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });
  });
});