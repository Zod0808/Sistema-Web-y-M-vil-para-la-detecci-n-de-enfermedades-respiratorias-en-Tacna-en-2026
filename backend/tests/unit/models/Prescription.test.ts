import mongoose from 'mongoose';
import PrescriptionModel from '../../../src/models/Prescription';

jest.mock('../../../src/utils/encryption', () => ({
  applyFieldEncryption: (_schema: any) => {},
}));

const buildMedication = (overrides: Partial<Record<string, any>> = {}) => ({
  name: 'Salbutamol',
  dosage: '100mcg',
  frequencyPerDay: 3,
  durationDays: 14,
  instructions: 'Inhalar según necesidad',
  ...overrides,
});

const buildPrescriptionData = (overrides: Partial<Record<string, any>> = {}) => ({
  patientId: new mongoose.Types.ObjectId().toString(),
  doctorId: new mongoose.Types.ObjectId().toString(),
  createdBy: new mongoose.Types.ObjectId().toString(),
  diagnosis: 'Asma bronquial moderada',
  medications: [buildMedication()],
  status: 'active',
  ...overrides,
});

describe('Prescription model', () => {
  afterEach(async () => {
    await PrescriptionModel.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
  });

  describe('Validaciones', () => {
    it('crea una prescripción válida', async () => {
      const prescription = await PrescriptionModel.create(buildPrescriptionData());
      expect(prescription._id).toBeDefined();
      expect(prescription.status).toBe('active');
      expect(prescription.medications.length).toBe(1);
    });

    it('falla sin patientId', async () => {
      await expect(PrescriptionModel.create(buildPrescriptionData({ patientId: undefined }))).rejects.toThrow();
    });

    it('falla sin doctorId', async () => {
      await expect(PrescriptionModel.create(buildPrescriptionData({ doctorId: undefined }))).rejects.toThrow();
    });

    // createdBy falls back to doctorId (see Prescription.ts pre-validate hook),
    // so both must be absent for the "required" validator to actually trigger.
    it('falla sin createdBy ni doctorId', async () => {
      await expect(
        PrescriptionModel.create(buildPrescriptionData({ createdBy: undefined, doctorId: undefined }))
      ).rejects.toThrow();
    });

    it('asigna createdBy desde doctorId cuando falta createdBy', async () => {
      const data = buildPrescriptionData({ createdBy: undefined });
      const prescription = await PrescriptionModel.create(data);
      expect(prescription.createdBy).toBe(data.doctorId);
    });

    it('falla sin medications', async () => {
      await expect(PrescriptionModel.create(buildPrescriptionData({ medications: [] }))).rejects.toThrow();
    });

    it('falla con más de 20 medicamentos', async () => {
      const medications = Array.from({ length: 21 }, (_, i) => buildMedication({ name: `Med${i}` }));
      await expect(PrescriptionModel.create(buildPrescriptionData({ medications }))).rejects.toThrow();
    });

    it('falla con status inválido', async () => {
      await expect(PrescriptionModel.create(buildPrescriptionData({ status: 'unknown' }))).rejects.toThrow();
    });

    it('falla cuando frecuencia del medicamento es menor a 1', async () => {
      const data = buildPrescriptionData({
        medications: [buildMedication({ frequencyPerDay: 0 })]
      });
      await expect(PrescriptionModel.create(data)).rejects.toThrow();
    });

    it('falla cuando duración del medicamento es menor a 1 día', async () => {
      const data = buildPrescriptionData({
        medications: [buildMedication({ durationDays: 0 })]
      });
      await expect(PrescriptionModel.create(data)).rejects.toThrow();
    });

    it('falla cuando duración del medicamento excede 365 días', async () => {
      const data = buildPrescriptionData({
        medications: [buildMedication({ durationDays: 366 })]
      });
      await expect(PrescriptionModel.create(data)).rejects.toThrow();
    });
  });

  describe('Métodos de instancia', () => {
    it('markCompleted cambia status a completed', async () => {
      const prescription = await PrescriptionModel.create(buildPrescriptionData());
      await prescription.markCompleted('Tratamiento finalizado');

      const updated = await PrescriptionModel.findById(prescription._id);
      expect(updated?.status).toBe('completed');
    });

    it('cancel cambia status a cancelled', async () => {
      const prescription = await PrescriptionModel.create(buildPrescriptionData());
      await prescription.cancel('Cambio de tratamiento');

      const updated = await PrescriptionModel.findById(prescription._id);
      expect(updated?.status).toBe('cancelled');
    });

    it('addValidation registra la validación del doctor', async () => {
      const prescription = await PrescriptionModel.create(
        buildPrescriptionData({ status: 'pending_validation' })
      );
      const validatorId = new mongoose.Types.ObjectId().toString();
      await prescription.addValidation(validatorId, 'Prescripción validada');

      const updated = await PrescriptionModel.findById(prescription._id);
      expect(updated?.validatedBy).toBeDefined();
    });
  });

  describe('Métodos estáticos', () => {
    it('findByPatient retorna prescripciones del paciente', async () => {
      const patientId = new mongoose.Types.ObjectId().toString();
      await PrescriptionModel.create(buildPrescriptionData({ patientId }));
      await PrescriptionModel.create(buildPrescriptionData({ patientId }));
      await PrescriptionModel.create(buildPrescriptionData()); // otro paciente

      const results = await PrescriptionModel.findByPatient(patientId);
      expect(results.length).toBe(2);
      expect(results.every(p => p.patientId === patientId)).toBe(true);
    });

    it('findByDoctor retorna prescripciones del doctor', async () => {
      const doctorId = new mongoose.Types.ObjectId().toString();
      await PrescriptionModel.create(buildPrescriptionData({ doctorId }));
      await PrescriptionModel.create(buildPrescriptionData()); // otro doctor

      const results = await PrescriptionModel.findByDoctor(doctorId);
      expect(results.length).toBe(1);
    });
  });

  describe('Interacciones medicamentosas', () => {
    it('registra interacciones entre medicamentos', async () => {
      const prescription = await PrescriptionModel.create(
        buildPrescriptionData({
          medications: [buildMedication({ name: 'Warfarina' }), buildMedication({ name: 'Aspirina' })],
          interactions: [{
            medicationA: 'Warfarina',
            medicationB: 'Aspirina',
            severity: 'major',
            description: 'Aumenta el riesgo de sangrado',
          }],
        })
      );

      expect(prescription.interactions.length).toBe(1);
      expect(prescription.interactions[0].severity).toBe('major');
    });

    it('falla con severity de interacción inválida', async () => {
      await expect(PrescriptionModel.create(buildPrescriptionData({
        interactions: [{
          medicationA: 'MedA',
          medicationB: 'MedB',
          severity: 'extreme',
        }]
      }))).rejects.toThrow();
    });
  });
});