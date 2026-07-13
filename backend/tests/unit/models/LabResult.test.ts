import mongoose from 'mongoose';
import { LabResult as LabResultModel } from '../../../src/models/LabResult';

jest.mock('../../../src/utils/encryption', () => ({
  applyFieldEncryption: (_schema: any) => {},
}));

const buildLabData = (overrides: Partial<Record<string, any>> = {}) => ({
  patientId: new mongoose.Types.ObjectId().toString(),
  testName: 'Hemoglobina',
  testCode: '718-7',         // LOINC code
  value: 14.5,
  unit: 'g/dL',
  status: 'normal',
  date: new Date(),
  referenceRange: { low: 12, high: 17, text: '12-17 g/dL' },
  ...overrides,
});

describe('LabResult model', () => {
  afterEach(async () => {
    await LabResultModel.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
  });

  describe('Validaciones', () => {
    it('crea un resultado de laboratorio válido', async () => {
      const result = await LabResultModel.create(buildLabData());
      expect(result._id).toBeDefined();
      expect(result.testName).toBe('Hemoglobina');
      expect(result.status).toBe('normal');
    });

    it('falla sin patientId', async () => {
      await expect(LabResultModel.create(buildLabData({ patientId: undefined }))).rejects.toThrow();
    });

    it('falla sin testName', async () => {
      await expect(LabResultModel.create(buildLabData({ testName: undefined }))).rejects.toThrow();
    });

    // testCode, value, unit are optional now (bulk import allows lightweight results);
    // presence checks moved to service-layer validation where needed.
    it('permite crear sin testCode', async () => {
      const doc = await LabResultModel.create(buildLabData({ testCode: undefined }));
      expect(doc.testCode).toBeUndefined();
    });

    it('permite crear sin value', async () => {
      const doc = await LabResultModel.create(buildLabData({ value: undefined }));
      expect(doc.value).toBeUndefined();
    });

    it('permite crear sin unit', async () => {
      const doc = await LabResultModel.create(buildLabData({ unit: undefined }));
      expect(doc.unit).toBeUndefined();
    });

    it('falla con status inválido', async () => {
      await expect(LabResultModel.create(buildLabData({ status: 'unknown' }))).rejects.toThrow();
    });
  });

  describe('Métodos de instancia', () => {
    it('isAbnormal retorna false para resultado normal', async () => {
      const result = await LabResultModel.create(buildLabData({ status: 'normal' }));
      expect(result.isAbnormal()).toBe(false);
    });

    it('isAbnormal retorna true para resultado anormal', async () => {
      const result = await LabResultModel.create(buildLabData({ status: 'abnormal' }));
      expect(result.isAbnormal()).toBe(true);
    });

    it('isAbnormal retorna true para resultado crítico', async () => {
      const result = await LabResultModel.create(buildLabData({ status: 'critical' }));
      expect(result.isAbnormal()).toBe(true);
    });

    it('isCritical retorna true solo para resultado crítico', async () => {
      const critical = await LabResultModel.create(buildLabData({ status: 'critical' }));
      const abnormal = await LabResultModel.create(buildLabData({ status: 'abnormal' }));

      expect(critical.isCritical()).toBe(true);
      expect(abnormal.isCritical()).toBe(false);
    });

    it('markAsReviewed asigna reviewedBy y reviewedAt', async () => {
      const result = await LabResultModel.create(buildLabData());
      const doctorId = new mongoose.Types.ObjectId().toString();

      await result.markAsReviewed(doctorId);

      const updated = await LabResultModel.findById(result._id);
      expect(updated?.reviewedBy).toBe(doctorId);
      expect(updated?.reviewedAt).toBeDefined();
    });

    it('flagForReview activa el flag del resultado', async () => {
      const result = await LabResultModel.create(buildLabData({ flagged: false }));
      await result.flagForReview('Requiere atención inmediata');

      const updated = await LabResultModel.findById(result._id);
      expect(updated?.flagged).toBe(true);
    });
  });

  describe('Métodos estáticos', () => {
    it('findByPatient retorna resultados del paciente', async () => {
      const patientId = new mongoose.Types.ObjectId().toString();
      await LabResultModel.create(buildLabData({ patientId }));
      await LabResultModel.create(buildLabData({ patientId }));
      await LabResultModel.create(buildLabData()); // otro paciente

      const results = await LabResultModel.findByPatient(patientId);
      expect(results.length).toBe(2);
    });

    it('findByPatient filtra por rango de fechas', async () => {
      const patientId = new mongoose.Types.ObjectId().toString();
      const old = new Date('2023-01-01');
      const recent = new Date();
      await LabResultModel.create(buildLabData({ patientId, date: old }));
      await LabResultModel.create(buildLabData({ patientId, date: recent }));

      const start = new Date('2024-01-01');
      const results = await LabResultModel.findByPatient(patientId, start);
      expect(results.length).toBe(1);
    });

    it('findAbnormal retorna solo resultados anormales y críticos', async () => {
      const patientId = new mongoose.Types.ObjectId().toString();
      await LabResultModel.create(buildLabData({ patientId, status: 'normal' }));
      await LabResultModel.create(buildLabData({ patientId, status: 'abnormal' }));
      await LabResultModel.create(buildLabData({ patientId, status: 'critical' }));

      const abnormal = await LabResultModel.findAbnormal(patientId);
      expect(abnormal.length).toBe(2);
      expect(abnormal.every(r => r.status !== 'normal')).toBe(true);
    });

    it('findCritical retorna solo resultados críticos', async () => {
      const patientId = new mongoose.Types.ObjectId().toString();
      await LabResultModel.create(buildLabData({ patientId, status: 'normal' }));
      await LabResultModel.create(buildLabData({ patientId, status: 'critical' }));

      const critical = await LabResultModel.findCritical(patientId);
      expect(critical.length).toBe(1);
      expect(critical[0].status).toBe('critical');
    });

    it('findByTestCode retorna resultados por código LOINC', async () => {
      const patientId = new mongoose.Types.ObjectId().toString();
      await LabResultModel.create(buildLabData({ patientId, testCode: '718-7' }));
      await LabResultModel.create(buildLabData({ patientId, testCode: '2160-0' }));

      const results = await LabResultModel.findByTestCode('718-7');
      expect(results.every(r => r.testCode === '718-7')).toBe(true);
    });

    it('getLatestByTestCode retorna el resultado más reciente', async () => {
      const patientId = new mongoose.Types.ObjectId().toString();
      await LabResultModel.create(buildLabData({ patientId, testCode: '718-7', date: new Date('2024-01-01') }));
      await LabResultModel.create(buildLabData({ patientId, testCode: '718-7', date: new Date('2024-06-01') }));

      const latest = await LabResultModel.getLatestByTestCode(patientId, '718-7');
      expect(latest).not.toBeNull();
      expect(latest!.date.toISOString().startsWith('2024-06')).toBe(true);
    });
  });
});