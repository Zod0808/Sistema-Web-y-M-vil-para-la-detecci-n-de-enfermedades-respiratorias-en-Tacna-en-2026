import mongoose from 'mongoose';
import MedicalHistory from '../../../src/models/MedicalHistory';

jest.mock('../../../src/utils/encryption', () => ({
  applyFieldEncryption: (_schema: any) => {},
}));

const buildHistoryData = (overrides: Partial<Record<string, any>> = {}) => ({
  patientId: new mongoose.Types.ObjectId().toString(),
  doctorId: new mongoose.Types.ObjectId().toString(),
  patientName: 'Ana Pérez',
  age: 35,
  diagnosis: 'Asma bronquial',
  date: new Date(),
  symptoms: [
    { name: 'Disnea', severity: 'moderate', duration: '3 días' },
    { name: 'Tos seca', severity: 'mild', duration: '5 días' },
  ],
  ...overrides,
});

describe('MedicalHistory model', () => {
  afterEach(async () => {
    await MedicalHistory.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
  });

  describe('Validaciones de campos requeridos', () => {
    it('crea un historial médico válido', async () => {
      const history = await MedicalHistory.create(buildHistoryData());
      expect(history._id).toBeDefined();
      expect(history.patientName).toBe('Ana Pérez');
      expect(history.diagnosis).toBe('Asma bronquial');
    });

    it('falla sin patientId', async () => {
      await expect(MedicalHistory.create(buildHistoryData({ patientId: undefined }))).rejects.toThrow();
    });

    it('falla sin doctorId', async () => {
      await expect(MedicalHistory.create(buildHistoryData({ doctorId: undefined }))).rejects.toThrow();
    });

    // patientName is denormalised from User and now optional (schema comment at MedicalHistory.ts:63-66).
    it('permite crear sin patientName', async () => {
      const h = await MedicalHistory.create(buildHistoryData({ patientName: undefined }));
      expect(h.patientName).toBeUndefined();
    });

    it('falla sin diagnosis', async () => {
      await expect(MedicalHistory.create(buildHistoryData({ diagnosis: undefined }))).rejects.toThrow();
    });

    // age is denormalised from User and optional.
    it('permite crear sin age', async () => {
      const h = await MedicalHistory.create(buildHistoryData({ age: undefined }));
      expect(h.age).toBeUndefined();
    });

    it('falla con age negativa', async () => {
      await expect(MedicalHistory.create(buildHistoryData({ age: -1 }))).rejects.toThrow();
    });

    it('falla con age mayor a 150', async () => {
      await expect(MedicalHistory.create(buildHistoryData({ age: 151 }))).rejects.toThrow();
    });

    it('falla si patientName excede 100 caracteres', async () => {
      const longName = 'A'.repeat(101);
      await expect(MedicalHistory.create(buildHistoryData({ patientName: longName }))).rejects.toThrow();
    });

    it('falla si diagnosis excede 200 caracteres', async () => {
      const longDiagnosis = 'A'.repeat(201);
      await expect(MedicalHistory.create(buildHistoryData({ diagnosis: longDiagnosis }))).rejects.toThrow();
    });
  });

  describe('Validaciones de síntomas', () => {
    it('falla si symptom.name falta', async () => {
      await expect(MedicalHistory.create(buildHistoryData({
        symptoms: [{ severity: 'mild', duration: '1 día' }]
      }))).rejects.toThrow();
    });

    it('falla si symptom.severity es inválida', async () => {
      await expect(MedicalHistory.create(buildHistoryData({
        symptoms: [{ name: 'Tos', severity: 'extreme', duration: '1 día' }]
      }))).rejects.toThrow();
    });

    it('falla si symptom.duration falta', async () => {
      await expect(MedicalHistory.create(buildHistoryData({
        symptoms: [{ name: 'Tos', severity: 'mild' }]
      }))).rejects.toThrow();
    });

    it('acepta symptoms con todos los valores válidos de severity', async () => {
      for (const severity of ['mild', 'moderate', 'severe']) {
        const history = await MedicalHistory.create(buildHistoryData({
          symptoms: [{ name: 'Disnea', severity, duration: '1 día' }]
        }));
        expect(history.symptoms[0].severity).toBe(severity);
        await MedicalHistory.deleteMany({});
      }
    });
  });

  describe('Métodos estáticos', () => {
    it('findByPatient retorna historiales del paciente', async () => {
      const patientId = new mongoose.Types.ObjectId().toString();
      await MedicalHistory.create(buildHistoryData({ patientId }));
      await MedicalHistory.create(buildHistoryData({ patientId }));
      await MedicalHistory.create(buildHistoryData()); // otro paciente

      const results = await MedicalHistory.findByPatient(patientId);
      expect(results.length).toBe(2);
      expect(results.every(h => h.patientId === patientId)).toBe(true);
    });

    it('findByDoctor retorna historiales del doctor', async () => {
      const doctorId = new mongoose.Types.ObjectId().toString();
      await MedicalHistory.create(buildHistoryData({ doctorId }));
      await MedicalHistory.create(buildHistoryData()); // otro doctor

      const results = await MedicalHistory.findByDoctor(doctorId);
      expect(results.length).toBe(1);
    });

    it('findByDateRange retorna historiales en el rango de fechas', async () => {
      const jan = new Date('2024-01-15');
      const jun = new Date('2024-06-15');
      await MedicalHistory.create(buildHistoryData({ date: jan }));
      await MedicalHistory.create(buildHistoryData({ date: jun }));

      const start = new Date('2024-04-01');
      const end = new Date('2024-12-31');
      const results = await MedicalHistory.findByDateRange(start, end);
      expect(results.length).toBe(1);
    });

    it('getStats retorna totales numéricos', async () => {
      await MedicalHistory.create(buildHistoryData());
      const stats = await MedicalHistory.getStats();

      expect(typeof stats.total).toBe('number');
      expect(typeof stats.pendingSync).toBe('number');
      expect(typeof stats.synced).toBe('number');
    });

    it('getTopDiagnoses retorna diagnósticos más frecuentes', async () => {
      await MedicalHistory.create(buildHistoryData({ diagnosis: 'Asma bronquial' }));
      await MedicalHistory.create(buildHistoryData({ diagnosis: 'Asma bronquial' }));
      await MedicalHistory.create(buildHistoryData({ diagnosis: 'EPOC' }));

      const top = await MedicalHistory.getTopDiagnoses(5);
      expect(Array.isArray(top)).toBe(true);
      expect(top.length).toBeGreaterThan(0);
      expect(top[0]).toHaveProperty('_id');
      expect(top[0]).toHaveProperty('count');
    });
  });

  describe('toJSON', () => {
    it('excluye __v del output JSON', async () => {
      const history = await MedicalHistory.create(buildHistoryData());
      const json = history.toJSON();
      expect(json).not.toHaveProperty('__v');
    });
  });
});