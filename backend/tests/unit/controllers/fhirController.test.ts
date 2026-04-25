import * as controller from '../../../src/controllers/fhirController';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../src/services/fhirService', () => ({
  fhirService: {
    getResource: jest.fn(),
    createResource: jest.fn(),
    updateResource: jest.fn(),
    searchResources: jest.fn(),
    exportPatientData: jest.fn(),
  },
}));

jest.mock('../../../src/services/fhirValidator', () => ({
  validateFhirResource: jest.fn().mockResolvedValue({ valid: true, errors: [] }),
  validateFhirResources: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../../src/services/hospitalSyncService', () => ({
  hospitalSyncService: { syncPatient: jest.fn() },
}));

jest.mock('../../../src/utils/hl7Parser', () => ({
  mapHl7ToFhirObservation: jest.fn(),
  parseHl7Message: jest.fn(),
  parseHl7Xml: jest.fn(),
}));

jest.mock('../../../src/middleware/rbac', () => ({
  requirePermission: jest.fn().mockReturnValue(jest.fn()),
}));

const { fhirService } = require('../../../src/services/fhirService');

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

const buildPatientResource = () => ({
  resourceType: 'Patient',
  id: 'patient-fhir-1',
  name: [{ given: ['Juan'], family: 'Pérez' }],
});

describe('fhirController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getFhirResource', () => {
    it('retorna recurso FHIR válido', async () => {
      const resource = buildPatientResource();
      fhirService.getResource.mockResolvedValue(resource);

      const req = buildReq({ params: { resourceType: 'Patient', id: 'patient-fhir-1' } });
      const res = buildRes();

      await controller.getFhirResource(req, res, jest.fn());

      expect(fhirService.getResource).toHaveBeenCalledWith('Patient', 'patient-fhir-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.status().json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: resource })
      );
    });

    it('lanza 400 para resourceType inválido', async () => {
      const req = buildReq({ params: { resourceType: 'InvalidResource', id: 'id-1' } });
      const next = jest.fn();

      await controller.getFhirResource(req, buildRes(), next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('lanza 404 cuando el recurso no existe (error 404 del servicio)', async () => {
      const error: any = new Error('Not found');
      error.response = { status: 404 };
      fhirService.getResource.mockRejectedValue(error);

      const req = buildReq({ params: { resourceType: 'Patient', id: 'nonexistent' } });
      const next = jest.fn();

      await controller.getFhirResource(req, buildRes(), next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    });

    it('lanza error cuando resourceType o id faltan', async () => {
      const req = buildReq({ params: {} });
      const next = jest.fn();

      await controller.getFhirResource(req, buildRes(), next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('acepta todos los resourceTypes válidos', async () => {
      const validTypes = ['Patient', 'Observation', 'Condition', 'Medication', 'DiagnosticReport'];
      fhirService.getResource.mockResolvedValue({});

      for (const type of validTypes) {
        const next = jest.fn();
        await controller.getFhirResource(
          buildReq({ params: { resourceType: type, id: 'some-id' } }),
          buildRes(),
          next
        );
        expect(next).not.toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
      }
    });
  });

  describe('createFhirResource', () => {
    it('crea recurso FHIR con éxito', async () => {
      const resource = buildPatientResource();
      fhirService.createResource.mockResolvedValue({ ...resource, id: 'new-id' });

      const req = buildReq({
        params: { resourceType: 'Patient' },
        body: resource,
      });
      const res = buildRes();

      await controller.createFhirResource(req, res, jest.fn());

      expect(fhirService.createResource).toHaveBeenCalledWith('Patient', resource);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('lanza 400 cuando falta resourceType', async () => {
      const req = buildReq({ params: {}, body: {} });
      const next = jest.fn();

      await controller.createFhirResource(req, buildRes(), next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('propaga error del servicio', async () => {
      fhirService.createResource.mockRejectedValue(new Error('FHIR server error'));

      const req = buildReq({ params: { resourceType: 'Patient' }, body: {} });
      const next = jest.fn();

      await controller.createFhirResource(req, buildRes(), next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});