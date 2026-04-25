import { LaboratoryIntegrationService } from '../../../src/services/laboratoryIntegrationService';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../src/services/fhirService', () => ({
  fhirService: {
    createResource: jest.fn().mockResolvedValue({ id: 'obs-1' }),
    search: jest.fn().mockResolvedValue({ entry: [] }),
  },
}));

jest.mock('../../../src/utils/hl7Parser', () => ({
  mapHl7ToFhirObservation: jest.fn(),
}));

jest.mock('../../../src/services/labService', () => ({
  labService: { saveResult: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('../../../src/services/alertService', () => ({
  alertService: { createAlert: jest.fn().mockResolvedValue(undefined) },
}));

const { fhirService } = require('../../../src/services/fhirService');
const { mapHl7ToFhirObservation } = require('../../../src/utils/hl7Parser');

const buildFhirBundle = (entries: any[] = []) => ({
  resourceType: 'Bundle',
  entry: entries.map(obs => ({ resource: obs })),
});

const buildObservation = (overrides: any = {}) => ({
  resourceType: 'Observation',
  code: { text: 'Hemoglobina', coding: [{ code: 'HGB' }] },
  valueQuantity: { value: 14.5, unit: 'g/dL' },
  effectiveDateTime: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('LaboratoryIntegrationService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('importResults (with client configured)', () => {
    let mockGet: jest.Mock;
    let service: LaboratoryIntegrationService;

    beforeEach(() => {
      mockGet = jest.fn();
      jest.spyOn(require('axios'), 'create').mockReturnValue({ get: mockGet, post: jest.fn() });
      service = new LaboratoryIntegrationService({
        baseUrl: 'http://lab-api.test',
        apiKey: 'test-key',
        format: 'fhir',
        enableAlerts: false,
      });
    });

    it('importa resultados en formato FHIR', async () => {
      const bundle = buildFhirBundle([buildObservation()]);
      mockGet.mockResolvedValue({ data: bundle });

      const results = await service.importResults('patient-1');

      expect(mockGet).toHaveBeenCalledWith('/results', { params: { patientId: 'patient-1' } });
      expect(results).toHaveLength(1);
      expect(results[0].testName).toBe('Hemoglobina');
      expect(results[0].patientId).toBe('patient-1');
    });

    it('incluye startDate y endDate en los parámetros', async () => {
      mockGet.mockResolvedValue({ data: buildFhirBundle([]) });
      const start = new Date('2026-01-01');
      const end = new Date('2026-04-01');

      await service.importResults('patient-1', start, end);

      expect(mockGet).toHaveBeenCalledWith('/results', {
        params: {
          patientId: 'patient-1',
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
      });
    });

    it('importa resultados en formato JSON', async () => {
      const jsonService = new LaboratoryIntegrationService({
        baseUrl: 'http://lab-api.test',
        format: 'json',
        enableAlerts: false,
      });
      const data = [{ testName: 'Glucosa', testCode: 'GLU', value: 95, unit: 'mg/dL', status: 'normal' }];
      mockGet.mockResolvedValue({ data });

      const results = await jsonService.importResults('patient-1');

      expect(results).toHaveLength(1);
      expect(results[0].testName).toBe('Glucosa');
    });

    it('guarda resultados como FHIR Observations cuando format=fhir', async () => {
      mockGet.mockResolvedValue({ data: buildFhirBundle([buildObservation()]) });

      await service.importResults('patient-1');

      expect(fhirService.createResource).toHaveBeenCalled();
    });

    it('lanza AppError 500 cuando el cliente HTTP falla', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));

      await expect(service.importResults('patient-1')).rejects.toMatchObject({ statusCode: 500 });
    });
  });

  describe('importResults (without client)', () => {
    it('lanza 500 cuando no hay client configurado', async () => {
      const service = new LaboratoryIntegrationService({});

      await expect(service.importResults('patient-1')).rejects.toMatchObject({ statusCode: 500 });
    });
  });

  describe('importFromHl7', () => {
    let service: LaboratoryIntegrationService;

    beforeEach(() => {
      service = new LaboratoryIntegrationService({ enableAlerts: false });
    });

    it('importa resultado desde mensaje HL7 válido', async () => {
      const observation = {
        resourceType: 'Observation',
        subject: { reference: 'Patient/patient-1' },
        code: { text: 'Glucosa', coding: [{ code: 'GLU' }] },
        valueQuantity: { value: 95, unit: 'mg/dL' },
        effectiveDateTime: '2026-01-01T00:00:00Z',
      };
      mapHl7ToFhirObservation.mockReturnValue(observation);

      const result = await service.importFromHl7('MSH|^~\\&|...');

      expect(result).not.toBeNull();
      expect(result!.patientId).toBe('patient-1');
      expect(result!.testName).toBe('Glucosa');
      expect(fhirService.createResource).toHaveBeenCalledWith(observation);
    });

    it('retorna null cuando HL7 no se puede parsear', async () => {
      mapHl7ToFhirObservation.mockReturnValue(null);

      const result = await service.importFromHl7('invalid hl7');

      expect(result).toBeNull();
    });

    it('propaga error cuando el parsing lanza excepción', async () => {
      mapHl7ToFhirObservation.mockImplementation(() => {
        throw new Error('Parse error');
      });

      await expect(service.importFromHl7('MSH|...')).rejects.toThrow('Parse error');
    });
  });

  describe('importResultsAutomatically', () => {
    let mockGet: jest.Mock;
    let service: LaboratoryIntegrationService;

    beforeEach(() => {
      mockGet = jest.fn().mockResolvedValue({ data: buildFhirBundle([]) });
      jest.spyOn(require('axios'), 'create').mockReturnValue({ get: mockGet, post: jest.fn() });
      service = new LaboratoryIntegrationService({
        baseUrl: 'http://lab-api.test',
        format: 'fhir',
        enableAlerts: false,
      });
    });

    it('retorna stats vacías cuando no hay patientIds', async () => {
      const stats = await service.importResultsAutomatically([]);

      expect(stats).toEqual({ total: 0, success: 0, errors: 0 });
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('procesa múltiples pacientes y cuenta éxitos', async () => {
      const stats = await service.importResultsAutomatically(['p1', 'p2', 'p3']);

      expect(stats.total).toBe(3);
      expect(stats.success).toBe(3);
      expect(stats.errors).toBe(0);
    });

    it('cuenta errores cuando falla algún paciente', async () => {
      mockGet
        .mockResolvedValueOnce({ data: buildFhirBundle([]) })
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValueOnce({ data: buildFhirBundle([]) });

      const stats = await service.importResultsAutomatically(['p1', 'p2', 'p3']);

      expect(stats.total).toBe(3);
      expect(stats.success).toBe(2);
      expect(stats.errors).toBe(1);
    });
  });

  describe('determineStatus (via importFromHl7)', () => {
    let service: LaboratoryIntegrationService;

    beforeEach(() => {
      service = new LaboratoryIntegrationService({ enableAlerts: false });
    });

    it('status normal cuando no hay referenceRange', async () => {
      mapHl7ToFhirObservation.mockReturnValue({
        subject: { reference: 'Patient/p1' },
        code: { text: 'Test', coding: [{ code: 'T1' }] },
        valueQuantity: { value: 50, unit: 'mg' },
      });

      const result = await service.importFromHl7('MSH|...');

      expect(result!.status).toBe('normal');
    });
  });
});