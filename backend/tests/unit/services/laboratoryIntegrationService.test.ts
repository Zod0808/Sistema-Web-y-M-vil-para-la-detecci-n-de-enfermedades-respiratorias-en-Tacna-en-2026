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

  describe('parseFhirResults - branches adicionales', () => {
    let mockGet: jest.Mock;
    let service: LaboratoryIntegrationService;

    beforeEach(() => {
      mockGet = jest.fn();
      jest.spyOn(require('axios'), 'create').mockReturnValue({ get: mockGet, post: jest.fn() });
      service = new LaboratoryIntegrationService({
        baseUrl: 'http://lab-api.test',
        format: 'fhir',
        enableAlerts: false,
      });
    });

    it('filtra entries que no son Observation', async () => {
      mockGet.mockResolvedValue({
        data: {
          resourceType: 'Bundle',
          entry: [
            { resource: buildObservation() },
            { resource: { resourceType: 'Patient', id: 'p1' } },
          ],
        },
      });
      const results = await service.importResults('p1');
      expect(results).toHaveLength(1);
      expect(results[0].testName).toBe('Hemoglobina');
    });

    it('retorna [] cuando la respuesta no es un Bundle', async () => {
      mockGet.mockResolvedValue({ data: { resourceType: 'Patient' } });
      const results = await service.importResults('p1');
      expect(results).toEqual([]);
    });

    it('mapea el status desde interpretation FHIR (A, C)', async () => {
      mockGet.mockResolvedValue({
        data: {
          resourceType: 'Bundle',
          entry: [
            {
              resource: buildObservation({
                interpretation: [{ coding: [{ code: 'A' }] }],
              }),
            },
            {
              resource: buildObservation({
                interpretation: [{ coding: [{ code: 'C' }] }],
              }),
            },
          ],
        },
      });
      const results = await service.importResults('p1');
      expect(results.map(r => r.status)).toEqual(['abnormal', 'critical']);
    });
  });

  describe('parseResults - formatos alternativos', () => {
    it('parseHl7 devuelve [] (no implementado)', async () => {
      const mockGet = jest.fn().mockResolvedValue({ data: 'MSH|...' });
      jest.spyOn(require('axios'), 'create').mockReturnValue({ get: mockGet, post: jest.fn() });
      const service = new LaboratoryIntegrationService({
        baseUrl: 'http://x',
        format: 'hl7',
        enableAlerts: false,
      });
      await expect(service.importResults('p1')).resolves.toEqual([]);
    });

    it('parseJson retorna [] cuando data no es array', async () => {
      const mockGet = jest.fn().mockResolvedValue({ data: {} });
      jest.spyOn(require('axios'), 'create').mockReturnValue({ get: mockGet, post: jest.fn() });
      const service = new LaboratoryIntegrationService({
        baseUrl: 'http://x',
        format: 'json',
        enableAlerts: false,
      });
      await expect(service.importResults('p1')).resolves.toEqual([]);
    });

    it('parseJson usa item.name/item.code cuando no hay testName/testCode', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: [{ name: 'Glucose', code: 'GLU', value: 90, unit: 'mg/dL', date: '2026-01-01' }],
      });
      jest.spyOn(require('axios'), 'create').mockReturnValue({ get: mockGet, post: jest.fn() });
      const service = new LaboratoryIntegrationService({
        baseUrl: 'http://x',
        format: 'json',
        enableAlerts: false,
      });
      const results = await service.importResults('p1');
      expect(results[0].testName).toBe('Glucose');
      expect(results[0].testCode).toBe('GLU');
    });
  });

  describe('syncResults', () => {
    let mockGet: jest.Mock;
    let mockPost: jest.Mock;
    let service: LaboratoryIntegrationService;

    beforeEach(() => {
      mockGet = jest.fn();
      mockPost = jest.fn().mockResolvedValue({ data: {} });
      jest.spyOn(require('axios'), 'create').mockReturnValue({ get: mockGet, post: mockPost });
      service = new LaboratoryIntegrationService({
        baseUrl: 'http://x',
        format: 'fhir',
        enableAlerts: false,
      });
    });

    it('importa y exporta bidireccionalmente', async () => {
      mockGet.mockResolvedValue({ data: buildFhirBundle([buildObservation()]) });
      fhirService.search.mockResolvedValue({
        entry: [{ resource: buildObservation() }, { resource: buildObservation() }],
      });

      const result = await service.syncResults('p1');

      expect(result).toEqual({ imported: 1, exported: 2 });
      expect(mockPost).toHaveBeenCalledWith(
        '/results/import',
        expect.objectContaining({ patientId: 'p1' }),
      );
    });

    it('exportResults retorna [] cuando no hay observations locales', async () => {
      mockGet.mockResolvedValue({ data: buildFhirBundle([]) });
      fhirService.search.mockResolvedValue({ entry: [] });

      const result = await service.syncResults('p1');

      expect(result).toEqual({ imported: 0, exported: 0 });
    });

    it('propaga error cuando importResults falla', async () => {
      mockGet.mockRejectedValue(new Error('down'));
      await expect(service.syncResults('p1')).rejects.toThrow();
    });

    it('exportResults atrapa error del FHIR search y retorna []', async () => {
      mockGet.mockResolvedValue({ data: buildFhirBundle([]) });
      fhirService.search.mockRejectedValue(new Error('fhir down'));

      const result = await service.syncResults('p1');
      expect(result.exported).toBe(0);
    });
  });

  describe('alertas', () => {
    let mockGet: jest.Mock;
    let service: LaboratoryIntegrationService;
    let alertService: any;

    beforeEach(() => {
      mockGet = jest.fn();
      jest.spyOn(require('axios'), 'create').mockReturnValue({ get: mockGet, post: jest.fn() });
      alertService = require('../../../src/services/alertService').alertService;
    });

    it('shouldAlert=false cuando threshold=normal', async () => {
      service = new LaboratoryIntegrationService({
        baseUrl: 'http://x',
        format: 'fhir',
        enableAlerts: true,
        alertThreshold: 'normal',
      });
      mockGet.mockResolvedValue({
        data: buildFhirBundle([
          buildObservation({ interpretation: [{ coding: [{ code: 'C' }] }] }),
        ]),
      });
      await service.importResults('p1');
      expect(alertService.createAlert).not.toHaveBeenCalled();
    });

    it('threshold=abnormal genera alerta con priority=medium para abnormal', async () => {
      service = new LaboratoryIntegrationService({
        baseUrl: 'http://x',
        format: 'fhir',
        enableAlerts: true,
        alertThreshold: 'abnormal',
      });
      mockGet.mockResolvedValue({
        data: buildFhirBundle([
          buildObservation({ interpretation: [{ coding: [{ code: 'A' }] }] }),
        ]),
      });
      await service.importResults('p1');
      expect(alertService.createAlert).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 'medium', category: 'laboratory' }),
      );
    });

    it('threshold=critical solo dispara para critical', async () => {
      service = new LaboratoryIntegrationService({
        baseUrl: 'http://x',
        format: 'fhir',
        enableAlerts: true,
        alertThreshold: 'critical',
      });
      mockGet.mockResolvedValue({
        data: buildFhirBundle([
          buildObservation({ interpretation: [{ coding: [{ code: 'A' }] }] }),
          buildObservation({ interpretation: [{ coding: [{ code: 'C' }] }] }),
        ]),
      });
      await service.importResults('p1');
      expect(alertService.createAlert).toHaveBeenCalledTimes(1);
      expect(alertService.createAlert).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 'high' }),
      );
    });

    it('generateAlert atrapa error del alertService silenciosamente', async () => {
      alertService.createAlert.mockRejectedValueOnce(new Error('alerts down'));
      service = new LaboratoryIntegrationService({
        baseUrl: 'http://x',
        format: 'fhir',
        enableAlerts: true,
        alertThreshold: 'critical',
      });
      mockGet.mockResolvedValue({
        data: buildFhirBundle([
          buildObservation({ interpretation: [{ coding: [{ code: 'C' }] }] }),
        ]),
      });
      await expect(service.importResults('p1')).resolves.toBeDefined();
    });
  });

  describe('determineStatus - rangos numéricos', () => {
    let mockGet: jest.Mock;
    let service: LaboratoryIntegrationService;

    beforeEach(() => {
      mockGet = jest.fn();
      jest.spyOn(require('axios'), 'create').mockReturnValue({ get: mockGet, post: jest.fn() });
    });

    const runWithReferenceRange = async (referenceRange: string, value: number) => {
      service = new LaboratoryIntegrationService({
        baseUrl: 'http://x',
        format: 'fhir',
        enableAlerts: false,
      });
      mockGet.mockResolvedValue({
        data: buildFhirBundle([
          buildObservation({
            valueQuantity: { value, unit: 'mg/dL' },
            referenceRange: [{ text: referenceRange }],
          }),
        ]),
      });
      // No usamos importResults porque el FHIR interpretation prevalece.
      // En su lugar, invocamos importFromHl7 con una Observation sin interpretation.
      mapHl7ToFhirObservation.mockReturnValue({
        subject: { reference: 'Patient/p1' },
        code: { text: 'T', coding: [{ code: 'T' }] },
        valueQuantity: { value, unit: 'mg/dL' },
      });
      const result = await service.importFromHl7('MSH|');
      // Simular referenceRange manual (importFromHl7 no lo popula desde HL7)
      result!.referenceRange = referenceRange;
      return (service as any).determineStatus(result);
    };

    it('rango "10-20": valor 15 → normal', async () => {
      expect(await runWithReferenceRange('10-20 mg/dL', 15)).toBe('normal');
    });

    it('rango "10-20": valor 4 → critical (< low*0.5)', async () => {
      expect(await runWithReferenceRange('10-20 mg/dL', 4)).toBe('critical');
    });

    it('rango "10-20": valor 8 → abnormal (bajo pero no crítico)', async () => {
      expect(await runWithReferenceRange('10-20 mg/dL', 8)).toBe('abnormal');
    });

    it('rango "10-20": valor 40 → critical (> high*1.5)', async () => {
      expect(await runWithReferenceRange('10-20 mg/dL', 40)).toBe('critical');
    });

    it('rango "10-20": valor 25 → abnormal (alto pero no crítico)', async () => {
      expect(await runWithReferenceRange('10-20 mg/dL', 25)).toBe('abnormal');
    });

    it('rango "< 20": valor 30 → abnormal', async () => {
      expect(await runWithReferenceRange('< 20', 30)).toBe('abnormal');
    });

    it('rango "> 10": valor 5 → abnormal', async () => {
      expect(await runWithReferenceRange('> 10', 5)).toBe('abnormal');
    });

    it('rango sin formato numérico retorna normal', async () => {
      expect(await runWithReferenceRange('positivo/negativo', 1)).toBe('normal');
    });

    it('valor no numérico retorna normal', async () => {
      service = new LaboratoryIntegrationService({ enableAlerts: false });
      const result = (service as any).determineStatus({
        testCode: 'T',
        value: 'positivo',
        referenceRange: '10-20',
      });
      expect(result).toBe('normal');
    });
  });

  describe('determineStatusFromFhir', () => {
    it('devuelve normal cuando no hay interpretation', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: buildFhirBundle([buildObservation()]),
      });
      jest.spyOn(require('axios'), 'create').mockReturnValue({ get: mockGet, post: jest.fn() });
      const service = new LaboratoryIntegrationService({
        baseUrl: 'http://x',
        format: 'fhir',
        enableAlerts: false,
      });
      const results = await service.importResults('p1');
      expect(results[0].status).toBe('normal');
    });

    it('devuelve normal para códigos desconocidos', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: buildFhirBundle([
          buildObservation({ interpretation: [{ coding: [{ code: 'X' }] }] }),
        ]),
      });
      jest.spyOn(require('axios'), 'create').mockReturnValue({ get: mockGet, post: jest.fn() });
      const service = new LaboratoryIntegrationService({
        baseUrl: 'http://x',
        format: 'fhir',
        enableAlerts: false,
      });
      const results = await service.importResults('p1');
      expect(results[0].status).toBe('normal');
    });
  });

  describe('importFromHl7 con alertas', () => {
    it('genera alerta cuando el resultado dispara shouldAlert', async () => {
      const service = new LaboratoryIntegrationService({
        enableAlerts: true,
        alertThreshold: 'abnormal',
      });
      const alertService = require('../../../src/services/alertService').alertService;
      alertService.createAlert.mockClear();

      // Sobrescribimos determineStatus para forzar 'abnormal'
      jest.spyOn(service as any, 'determineStatus').mockReturnValue('abnormal');

      mapHl7ToFhirObservation.mockReturnValue({
        subject: { reference: 'Patient/p1' },
        code: { text: 'T', coding: [{ code: 'T' }] },
        valueQuantity: { value: 100, unit: 'mg' },
      });

      const result = await service.importFromHl7('MSH|');
      expect(result!.status).toBe('abnormal');
      expect(alertService.createAlert).toHaveBeenCalled();
    });
  });

  describe('importResultsAutomatically edge cases', () => {
    it('retorna stats vacías cuando no se pasan patientIds (undefined)', async () => {
      const service = new LaboratoryIntegrationService({ baseUrl: 'http://x', enableAlerts: false });
      const stats = await service.importResultsAutomatically();
      expect(stats).toEqual({ total: 0, success: 0, errors: 0 });
    });
  });

  describe('saveAsFhirObservations - manejo de errores', () => {
    it('atrapa error de fhirService.createResource silenciosamente', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: buildFhirBundle([buildObservation()]),
      });
      jest.spyOn(require('axios'), 'create').mockReturnValue({ get: mockGet, post: jest.fn() });
      fhirService.createResource.mockRejectedValueOnce(new Error('fhir err'));

      const service = new LaboratoryIntegrationService({
        baseUrl: 'http://x',
        format: 'fhir',
        enableAlerts: false,
      });

      await expect(service.importResults('p1')).resolves.toBeDefined();
    });
  });
});