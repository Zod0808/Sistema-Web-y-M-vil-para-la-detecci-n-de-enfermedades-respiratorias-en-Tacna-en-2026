import * as controller from '../../../src/controllers/fhirController';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../src/services/fhirService', () => ({
  fhirService: {
    getResource: jest.fn(),
    createResource: jest.fn(),
    patchResource: jest.fn(),
    search: jest.fn(),
    syncBundle: jest.fn(),
  },
}));

jest.mock('../../../src/services/fhirValidator', () => ({
  validateFhirResource: jest.fn(),
  validateFhirResources: jest.fn(),
}));

jest.mock('../../../src/services/hospitalSyncService', () => ({
  hospitalSyncService: {
    syncFromExternal: jest.fn(),
    syncToExternal: jest.fn(),
    syncBidirectional: jest.fn(),
    getRegisteredHospitals: jest.fn(),
  },
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
const { validateFhirResource, validateFhirResources } = require('../../../src/services/fhirValidator');
const { hospitalSyncService } = require('../../../src/services/hospitalSyncService');
const { mapHl7ToFhirObservation, parseHl7Xml } = require('../../../src/utils/hl7Parser');

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

const nextError = () => jest.fn();

const runHandler = async (handler: any, req: any, res = buildRes(), next = nextError()) => {
  await handler(req, res, next);
  return { res, next };
};

const expectStatusError = (next: jest.Mock, code: number) => {
  expect(next).toHaveBeenCalled();
  const arg = next.mock.calls[0]?.[0];
  expect(arg).toBeInstanceOf(Error);
  expect(arg.statusCode).toBe(code);
};

describe('fhirController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getFhirResource', () => {
    it('retorna 200 con el recurso', async () => {
      fhirService.getResource.mockResolvedValue({ resourceType: 'Patient', id: 'p1' });
      const { res, next } = await runHandler(
        controller.getFhirResource,
        buildReq({ params: { resourceType: 'Patient', id: 'p1' } }),
      );
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('400 cuando faltan params', async () => {
      const { next } = await runHandler(
        controller.getFhirResource,
        buildReq({ params: {} }),
      );
      expectStatusError(next, 400);
    });

    it('400 para resourceType inválido', async () => {
      const { next } = await runHandler(
        controller.getFhirResource,
        buildReq({ params: { resourceType: 'BadType', id: '1' } }),
      );
      expectStatusError(next, 400);
    });

    it('404 cuando el servicio responde con response.status 404', async () => {
      const err: any = new Error('nf');
      err.response = { status: 404 };
      fhirService.getResource.mockRejectedValue(err);
      const { next } = await runHandler(
        controller.getFhirResource,
        buildReq({ params: { resourceType: 'Patient', id: 'x' } }),
      );
      expectStatusError(next, 404);
    });

    it('propaga otros errores', async () => {
      fhirService.getResource.mockRejectedValue(new Error('boom'));
      const { next } = await runHandler(
        controller.getFhirResource,
        buildReq({ params: { resourceType: 'Patient', id: 'x' } }),
      );
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('createFhirResource', () => {
    it('201 cuando el body coincide con resourceType de la URL', async () => {
      fhirService.createResource.mockResolvedValue({ id: 'p2', resourceType: 'Patient' });
      const { res, next } = await runHandler(
        controller.createFhirResource,
        buildReq({ params: { resourceType: 'Patient' }, body: { resourceType: 'Patient' } }),
      );
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(fhirService.createResource).toHaveBeenCalledWith(
        expect.objectContaining({ resourceType: 'Patient' }),
      );
    });

    it('201 cuando el body no tiene resourceType (se rellena desde URL)', async () => {
      fhirService.createResource.mockResolvedValue({ id: 'x' });
      const { res } = await runHandler(
        controller.createFhirResource,
        buildReq({ params: { resourceType: 'Patient' }, body: {} }),
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('400 cuando body.resourceType difiere de la URL', async () => {
      const { next } = await runHandler(
        controller.createFhirResource,
        buildReq({ params: { resourceType: 'Patient' }, body: { resourceType: 'Observation' } }),
      );
      expectStatusError(next, 400);
    });

    it('400 cuando falta resourceType en URL', async () => {
      const { next } = await runHandler(
        controller.createFhirResource,
        buildReq({ params: {}, body: {} }),
      );
      expectStatusError(next, 400);
    });

    it('propaga error del servicio', async () => {
      fhirService.createResource.mockRejectedValue(new Error('svc'));
      const { next } = await runHandler(
        controller.createFhirResource,
        buildReq({ params: { resourceType: 'Patient' }, body: {} }),
      );
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('searchFhirResources', () => {
    it('200 y meta.total con la búsqueda', async () => {
      fhirService.search.mockResolvedValue({ resourceType: 'Bundle', entry: [{}, {}] });
      const { res } = await runHandler(
        controller.searchFhirResources,
        buildReq({ params: { resourceType: 'Patient' }, query: { name: 'x' } }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(fhirService.search).toHaveBeenCalledWith('Patient', { name: 'x' });
    });

    it('400 cuando falta resourceType', async () => {
      const { next } = await runHandler(
        controller.searchFhirResources,
        buildReq({ params: {} }),
      );
      expectStatusError(next, 400);
    });

    it('propaga error del servicio', async () => {
      fhirService.search.mockRejectedValue(new Error('down'));
      const { next } = await runHandler(
        controller.searchFhirResources,
        buildReq({ params: { resourceType: 'Patient' } }),
      );
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('patchFhirResource', () => {
    it('200 con recurso actualizado', async () => {
      fhirService.patchResource.mockResolvedValue({ id: 'p1', resourceType: 'Patient' });
      const { res } = await runHandler(
        controller.patchFhirResource,
        buildReq({
          params: { resourceType: 'Patient', id: 'p1' },
          body: [{ op: 'replace', path: '/active', value: false }],
        }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(fhirService.patchResource).toHaveBeenCalledWith(
        'Patient',
        'p1',
        expect.arrayContaining([expect.objectContaining({ op: 'replace' })]),
      );
    });

    it('400 cuando faltan resourceType/id', async () => {
      const { next } = await runHandler(
        controller.patchFhirResource,
        buildReq({ params: {}, body: [] }),
      );
      expectStatusError(next, 400);
    });

    it('400 cuando body no es array', async () => {
      const { next } = await runHandler(
        controller.patchFhirResource,
        buildReq({ params: { resourceType: 'Patient', id: 'p1' }, body: {} }),
      );
      expectStatusError(next, 400);
    });

    it('404 cuando el servicio responde 404', async () => {
      const err: any = new Error('nf');
      err.response = { status: 404 };
      fhirService.patchResource.mockRejectedValue(err);
      const { next } = await runHandler(
        controller.patchFhirResource,
        buildReq({ params: { resourceType: 'Patient', id: 'x' }, body: [] }),
      );
      expectStatusError(next, 404);
    });

    it('propaga otros errores', async () => {
      fhirService.patchResource.mockRejectedValue(new Error('boom'));
      const { next } = await runHandler(
        controller.patchFhirResource,
        buildReq({ params: { resourceType: 'Patient', id: 'x' }, body: [] }),
      );
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('processFhirBundle', () => {
    it('200 procesando transaction', async () => {
      fhirService.syncBundle.mockResolvedValue({ processed: 2 });
      const { res } = await runHandler(
        controller.processFhirBundle,
        buildReq({
          body: { resourceType: 'Bundle', type: 'transaction', entry: [{}, {}] },
        }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('200 procesando batch', async () => {
      fhirService.syncBundle.mockResolvedValue({ processed: 1 });
      const { res } = await runHandler(
        controller.processFhirBundle,
        buildReq({
          body: { resourceType: 'Bundle', type: 'batch', entry: [{}] },
        }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('400 cuando body no es Bundle', async () => {
      const { next } = await runHandler(
        controller.processFhirBundle,
        buildReq({ body: { resourceType: 'Patient' } }),
      );
      expectStatusError(next, 400);
    });

    it('400 cuando type no es transaction ni batch', async () => {
      const { next } = await runHandler(
        controller.processFhirBundle,
        buildReq({ body: { resourceType: 'Bundle', type: 'searchset' } }),
      );
      expectStatusError(next, 400);
    });

    it('propaga error del servicio', async () => {
      fhirService.syncBundle.mockRejectedValue(new Error('bundle err'));
      const { next } = await runHandler(
        controller.processFhirBundle,
        buildReq({ body: { resourceType: 'Bundle', type: 'batch' } }),
      );
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('parseHl7ToFhir', () => {
    it('convierte HL7 v2 a Observation', async () => {
      mapHl7ToFhirObservation.mockReturnValue({ resourceType: 'Observation', status: 'final' });
      const { res } = await runHandler(
        controller.parseHl7ToFhir,
        buildReq({ body: { message: 'MSH|^~...' } }),
      );
      expect(mapHl7ToFhirObservation).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('convierte HL7 v3 XML a Observation', async () => {
      parseHl7Xml.mockResolvedValue({});
      const { res } = await runHandler(
        controller.parseHl7ToFhir,
        buildReq({ body: { message: '<xml/>', format: 'v3' } }),
      );
      expect(parseHl7Xml).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('convierte HL7 xml a Observation (format="xml")', async () => {
      parseHl7Xml.mockResolvedValue({});
      const { res } = await runHandler(
        controller.parseHl7ToFhir,
        buildReq({ body: { message: '<xml/>', format: 'xml' } }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('400 cuando falta message', async () => {
      const { next } = await runHandler(
        controller.parseHl7ToFhir,
        buildReq({ body: {} }),
      );
      expectStatusError(next, 400);
    });

    it('400 cuando el mapper retorna null', async () => {
      mapHl7ToFhirObservation.mockReturnValue(null);
      const { next } = await runHandler(
        controller.parseHl7ToFhir,
        buildReq({ body: { message: 'INVALID' } }),
      );
      expectStatusError(next, 400);
    });

    it('propaga error cuando parseHl7Xml lanza', async () => {
      parseHl7Xml.mockRejectedValue(new Error('xml bad'));
      const { next } = await runHandler(
        controller.parseHl7ToFhir,
        buildReq({ body: { message: '<x/>', format: 'v3' } }),
      );
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getCapabilities', () => {
    it('devuelve un CapabilityStatement 200', async () => {
      const res = buildRes();
      const json = jest.fn();
      res.status = jest.fn().mockReturnValue({ json });

      await controller.getCapabilities(buildReq(), res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ resourceType: 'CapabilityStatement' }),
        }),
      );
    });
  });

  describe('validateFhirResourceEndpoint', () => {
    it('200 con resultado de validación', async () => {
      validateFhirResource.mockReturnValue({ valid: true, errors: [], warnings: [] });
      const { res } = await runHandler(
        controller.validateFhirResourceEndpoint,
        buildReq({ body: { resourceType: 'Patient' } }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('400 cuando body no tiene resourceType', async () => {
      const { next } = await runHandler(
        controller.validateFhirResourceEndpoint,
        buildReq({ body: {} }),
      );
      expectStatusError(next, 400);
    });
  });

  describe('validateFhirResourcesBatch', () => {
    it('200 con validación batch', async () => {
      validateFhirResources.mockReturnValue({ valid: true, errors: [], warnings: [] });
      const { res } = await runHandler(
        controller.validateFhirResourcesBatch,
        buildReq({ body: [{ resourceType: 'Patient' }] }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('400 cuando body no es array', async () => {
      const { next } = await runHandler(
        controller.validateFhirResourcesBatch,
        buildReq({ body: { resourceType: 'Patient' } }),
      );
      expectStatusError(next, 400);
    });

    it('400 cuando el array está vacío', async () => {
      const { next } = await runHandler(
        controller.validateFhirResourcesBatch,
        buildReq({ body: [] }),
      );
      expectStatusError(next, 400);
    });
  });

  describe('syncFromHospital', () => {
    it('200 con resultado de sync', async () => {
      hospitalSyncService.syncFromExternal.mockResolvedValue({ imported: 5, errors: [] });
      const { res } = await runHandler(
        controller.syncFromHospital,
        buildReq({ params: { hospitalName: 'HospA' }, body: { patientId: 'p1' } }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('400 cuando falta patientId', async () => {
      const { next } = await runHandler(
        controller.syncFromHospital,
        buildReq({ params: { hospitalName: 'HospA' }, body: {} }),
      );
      expectStatusError(next, 400);
    });

    it('propaga error del servicio', async () => {
      hospitalSyncService.syncFromExternal.mockRejectedValue(new Error('sync boom'));
      const { next } = await runHandler(
        controller.syncFromHospital,
        buildReq({ params: { hospitalName: 'HospA' }, body: { patientId: 'p1' } }),
      );
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('syncToHospital', () => {
    it('200 con recursos exportados', async () => {
      hospitalSyncService.syncToExternal.mockResolvedValue({ exported: 3, errors: [] });
      const { res } = await runHandler(
        controller.syncToHospital,
        buildReq({
          params: { hospitalName: 'HospB' },
          body: { patientId: 'p1', resources: [{ resourceType: 'Patient' }] },
        }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('400 cuando falta patientId', async () => {
      const { next } = await runHandler(
        controller.syncToHospital,
        buildReq({ params: { hospitalName: 'HospB' }, body: { resources: [] } }),
      );
      expectStatusError(next, 400);
    });

    it('400 cuando resources no es array o está vacío', async () => {
      const { next } = await runHandler(
        controller.syncToHospital,
        buildReq({
          params: { hospitalName: 'HospB' },
          body: { patientId: 'p1', resources: [] },
        }),
      );
      expectStatusError(next, 400);
    });

    it('propaga error del servicio', async () => {
      hospitalSyncService.syncToExternal.mockRejectedValue(new Error('sync err'));
      const { next } = await runHandler(
        controller.syncToHospital,
        buildReq({
          params: { hospitalName: 'HospB' },
          body: { patientId: 'p1', resources: [{ resourceType: 'X' }] },
        }),
      );
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('syncBidirectional', () => {
    it('200 con conteo bidireccional', async () => {
      hospitalSyncService.syncBidirectional.mockResolvedValue({
        from: { imported: 2 },
        to: { exported: 3 },
      });
      const { res } = await runHandler(
        controller.syncBidirectional,
        buildReq({ params: { hospitalName: 'HospC' }, body: { patientId: 'p1' } }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('400 cuando falta patientId', async () => {
      const { next } = await runHandler(
        controller.syncBidirectional,
        buildReq({ params: { hospitalName: 'HospC' }, body: {} }),
      );
      expectStatusError(next, 400);
    });

    it('propaga error del servicio', async () => {
      hospitalSyncService.syncBidirectional.mockRejectedValue(new Error('bi err'));
      const { next } = await runHandler(
        controller.syncBidirectional,
        buildReq({ params: { hospitalName: 'HospC' }, body: { patientId: 'p1' } }),
      );
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getRegisteredHospitals', () => {
    it('200 con lista de hospitales', async () => {
      hospitalSyncService.getRegisteredHospitals.mockReturnValue(['HospA', 'HospB']);
      const { res } = await runHandler(controller.getRegisteredHospitals, buildReq());
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
