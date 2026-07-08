import { LabService } from '../../../src/services/labService';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../src/models/LabResult', () => {
  const LabResult: any = jest.fn();
  LabResult.findOne = jest.fn();
  LabResult.find = jest.fn();
  LabResult.findById = jest.fn();
  LabResult.findByPatient = jest.fn();
  LabResult.findAbnormal = jest.fn();
  LabResult.findCritical = jest.fn();
  LabResult.getLatestByTestCode = jest.fn();
  return { LabResult };
});

jest.mock('../../../src/services/laboratoryIntegrationService', () => ({
  laboratoryIntegrationService: {
    importResults: jest.fn(),
  },
}));

jest.mock('../../../src/services/alertService', () => ({
  alertService: { createAlert: jest.fn().mockResolvedValue(undefined) },
}));

const { LabResult } = require('../../../src/models/LabResult');
const { laboratoryIntegrationService } = require('../../../src/services/laboratoryIntegrationService');
const { alertService } = require('../../../src/services/alertService');

const buildLabResultDoc = (overrides: Partial<any> = {}) => ({
  _id: { toString: () => 'result-1' },
  patientId: 'patient-1',
  testName: 'Hemoglobina',
  testCode: '718-7',
  value: 14.5,
  unit: 'g/dL',
  status: 'normal',
  date: new Date('2024-06-01'),
  flagged: false,
  referenceRange: { low: 12, high: 17 },
  isAbnormal: jest.fn().mockReturnValue(false),
  markAsReviewed: jest.fn().mockResolvedValue(undefined),
  flagForReview: jest.fn().mockResolvedValue(undefined),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const buildLaboratoryResult = (overrides: Partial<any> = {}) => ({
  patientId: 'patient-1',
  testName: 'Hemoglobina',
  testCode: '718-7',
  value: 14.5,
  unit: 'g/dL',
  status: 'normal',
  date: new Date('2024-06-01'),
  referenceRange: '12 - 17 g/dL',
  ...overrides,
});

// find(...).sort(...).limit(...) chainable helper
const mockFindChain = (results: any[]) => {
  const chain = {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(results),
  };
  LabResult.find.mockReturnValue(chain);
  return chain;
};

describe('LabService', () => {
  let service: LabService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LabService();
  });

  describe('saveResult', () => {
    it('actualiza un resultado existente en la misma ventana temporal', async () => {
      const existing = buildLabResultDoc({ value: 13.0 });
      LabResult.findOne.mockResolvedValue(existing);

      const result = buildLaboratoryResult({ value: 14.5 });
      const saved = await service.saveResult(result);

      expect(LabResult.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ patientId: 'patient-1', testCode: '718-7' })
      );
      expect(existing.save).toHaveBeenCalled();
      expect(existing.value).toBe(14.5);
      expect(saved).toBe(existing);
    });

    it('crea un nuevo resultado y genera alerta si es anormal', async () => {
      LabResult.findOne.mockResolvedValue(null);
      const newDoc: any = buildLabResultDoc({
        status: 'critical',
        isAbnormal: jest.fn().mockReturnValue(true),
      });
      LabResult.mockImplementation(function (this: any) {
        return newDoc;
      });

      const result = buildLaboratoryResult({ status: 'critical' });
      await service.saveResult(result);

      expect(newDoc.save).toHaveBeenCalled();
      expect(alertService.createAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: 'patient-1',
          category: 'laboratory',
          priority: 'high',
        })
      );
    });

    it('crea un nuevo resultado normal sin generar alerta', async () => {
      LabResult.findOne.mockResolvedValue(null);
      const newDoc: any = buildLabResultDoc({ isAbnormal: jest.fn().mockReturnValue(false) });
      LabResult.mockImplementation(function (this: any) {
        return newDoc;
      });

      await service.saveResult(buildLaboratoryResult());

      expect(newDoc.save).toHaveBeenCalled();
      expect(alertService.createAlert).not.toHaveBeenCalled();
    });

    it('lanza AppError si el guardado falla', async () => {
      LabResult.findOne.mockRejectedValue(new Error('db down'));
      await expect(service.saveResult(buildLaboratoryResult())).rejects.toMatchObject({
        statusCode: 500,
      });
    });
  });

  describe('getResults', () => {
    it('aplica todos los filtros disponibles', async () => {
      const results = [buildLabResultDoc()];
      mockFindChain(results);

      const start = new Date('2024-01-01');
      const end = new Date('2024-12-31');
      const out = await service.getResults({
        patientId: 'patient-1',
        testCode: '718-7',
        status: 'abnormal',
        flagged: true,
        laboratoryId: 'lab-1',
        startDate: start,
        endDate: end,
      });

      expect(LabResult.find).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: 'patient-1',
          testCode: '718-7',
          status: 'abnormal',
          flagged: true,
          laboratoryId: 'lab-1',
          date: { $gte: start, $lte: end },
        })
      );
      expect(out).toEqual(results);
    });

    it('lanza AppError cuando la consulta falla', async () => {
      LabResult.find.mockImplementation(() => {
        throw new Error('boom');
      });
      await expect(service.getResults({})).rejects.toMatchObject({ statusCode: 500 });
    });
  });

  describe('consultas por paciente', () => {
    it('getPatientHistory delega en findByPatient', async () => {
      const docs = [buildLabResultDoc()];
      LabResult.findByPatient.mockResolvedValue(docs);
      const out = await service.getPatientHistory('patient-1');
      expect(LabResult.findByPatient).toHaveBeenCalledWith('patient-1', undefined, undefined);
      expect(out).toEqual(docs);
    });

    it('getAbnormalResults delega en findAbnormal', async () => {
      const docs = [buildLabResultDoc({ status: 'abnormal' })];
      LabResult.findAbnormal.mockResolvedValue(docs);
      const out = await service.getAbnormalResults('patient-1');
      expect(out).toEqual(docs);
    });

    it('getCriticalResults delega en findCritical', async () => {
      const docs = [buildLabResultDoc({ status: 'critical' })];
      LabResult.findCritical.mockResolvedValue(docs);
      const out = await service.getCriticalResults('patient-1');
      expect(out).toEqual(docs);
    });

    it('getLatestResult delega en getLatestByTestCode', async () => {
      const doc = buildLabResultDoc();
      LabResult.getLatestByTestCode.mockResolvedValue(doc);
      const out = await service.getLatestResult('patient-1', '718-7');
      expect(LabResult.getLatestByTestCode).toHaveBeenCalledWith('patient-1', '718-7');
      expect(out).toBe(doc);
    });

    it('propaga error como AppError en getPatientHistory', async () => {
      LabResult.findByPatient.mockRejectedValue(new Error('x'));
      await expect(service.getPatientHistory('patient-1')).rejects.toMatchObject({ statusCode: 500 });
    });
  });

  describe('getPatientSummary', () => {
    it('agrega totales por estado, flagged, byTestCode y latestDate', async () => {
      LabResult.findByPatient.mockResolvedValue([
        buildLabResultDoc({ status: 'normal', date: new Date('2024-01-01') }),
        buildLabResultDoc({ status: 'abnormal', flagged: true, date: new Date('2024-03-01') }),
        buildLabResultDoc({ status: 'critical', testCode: 'CRP', date: new Date('2024-06-01') }),
      ]);

      const summary = await service.getPatientSummary('patient-1');

      expect(summary.total).toBe(3);
      expect(summary.normal).toBe(1);
      expect(summary.abnormal).toBe(1);
      expect(summary.critical).toBe(1);
      expect(summary.flagged).toBe(1);
      expect(summary.byTestCode['718-7']).toBe(2);
      expect(summary.byTestCode['CRP']).toBe(1);
      expect(summary.latestDate).toEqual(new Date('2024-06-01'));
    });

    it('lanza AppError si falla', async () => {
      LabResult.findByPatient.mockRejectedValue(new Error('x'));
      await expect(service.getPatientSummary('patient-1')).rejects.toMatchObject({ statusCode: 500 });
    });
  });

  describe('markAsReviewed / flagForReview', () => {
    it('markAsReviewed marca el documento encontrado', async () => {
      const doc = buildLabResultDoc();
      LabResult.findById.mockResolvedValue(doc);
      await service.markAsReviewed('result-1', 'doctor-1');
      expect(doc.markAsReviewed).toHaveBeenCalledWith('doctor-1');
    });

    it('markAsReviewed lanza 404 si no existe', async () => {
      LabResult.findById.mockResolvedValue(null);
      await expect(service.markAsReviewed('nope', 'doctor-1')).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('flagForReview marca el documento con razón', async () => {
      const doc = buildLabResultDoc();
      LabResult.findById.mockResolvedValue(doc);
      await service.flagForReview('result-1', 'valor sospechoso');
      expect(doc.flagForReview).toHaveBeenCalledWith('valor sospechoso');
    });

    it('flagForReview lanza 404 si no existe', async () => {
      LabResult.findById.mockResolvedValue(null);
      await expect(service.flagForReview('nope')).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('importAndSaveResults', () => {
    it('importa, guarda y cuenta errores', async () => {
      laboratoryIntegrationService.importResults.mockResolvedValue([
        buildLaboratoryResult({ testCode: 'A' }),
        buildLaboratoryResult({ testCode: 'B' }),
      ]);
      // primer save OK (existente), segundo lanza error
      const existing = buildLabResultDoc();
      LabResult.findOne
        .mockResolvedValueOnce(existing)
        .mockRejectedValueOnce(new Error('save failed'));

      const out = await service.importAndSaveResults('patient-1');

      expect(laboratoryIntegrationService.importResults).toHaveBeenCalledWith(
        'patient-1',
        undefined,
        undefined
      );
      expect(out.imported).toBe(2);
      expect(out.saved).toBe(1);
      expect(out.errors).toBe(1);
    });

    it('lanza AppError si la importación falla', async () => {
      laboratoryIntegrationService.importResults.mockRejectedValue(new Error('down'));
      await expect(service.importAndSaveResults('patient-1')).rejects.toMatchObject({
        statusCode: 500,
      });
    });
  });

  describe('detectAbnormalValues', () => {
    it('retorna false sin rango de referencia', async () => {
      const doc = buildLabResultDoc({ referenceRange: undefined });
      expect(await service.detectAbnormalValues(doc as any)).toBe(false);
    });

    it('marca critical cuando el valor está muy por debajo del mínimo', async () => {
      const doc = buildLabResultDoc({ value: 5, referenceRange: { low: 12, high: 17 } });
      expect(await service.detectAbnormalValues(doc as any)).toBe(true);
      expect(doc.status).toBe('critical');
    });

    it('marca abnormal cuando el valor supera levemente el máximo', async () => {
      const doc = buildLabResultDoc({ value: 20, referenceRange: { low: 12, high: 17 } });
      expect(await service.detectAbnormalValues(doc as any)).toBe(true);
      expect(doc.status).toBe('abnormal');
    });

    it('marca normal cuando el valor está dentro del rango', async () => {
      const doc = buildLabResultDoc({ value: 14, referenceRange: { low: 12, high: 17 } });
      expect(await service.detectAbnormalValues(doc as any)).toBe(false);
      expect(doc.status).toBe('normal');
    });

    it('retorna false cuando el valor no es numérico', async () => {
      const doc = buildLabResultDoc({ value: 'N/A', referenceRange: { low: 12, high: 17 } });
      expect(await service.detectAbnormalValues(doc as any)).toBe(false);
    });
  });
});