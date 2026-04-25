import mongoose from 'mongoose';
import ReferralModel from '../../../src/models/Referral';

jest.mock('../../../src/utils/encryption', () => ({
  applyFieldEncryption: (_schema: any) => {},
}));

const buildReferralData = (overrides: Partial<Record<string, any>> = {}) => ({
  patientId: new mongoose.Types.ObjectId().toString(),
  patientName: 'Juan Paciente',
  referringDoctorId: new mongoose.Types.ObjectId().toString(),
  referringDoctorName: 'Dra. García',
  referralType: 'specialist',
  priority: 'medium',
  reason: 'Evaluación por neumólogo para seguimiento de EPOC',
  ...overrides,
});

describe('Referral model', () => {
  afterEach(async () => {
    await ReferralModel.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
  });

  describe('Validaciones', () => {
    it('crea un referido válido con los campos requeridos', async () => {
      const referral = await ReferralModel.create(buildReferralData());
      expect(referral._id).toBeDefined();
      expect(referral.status).toBe('pending');
      expect(referral.priority).toBe('medium');
    });

    it('falla sin patientId', async () => {
      await expect(ReferralModel.create(buildReferralData({ patientId: undefined }))).rejects.toThrow();
    });

    it('falla sin referringDoctorId', async () => {
      await expect(ReferralModel.create(buildReferralData({ referringDoctorId: undefined }))).rejects.toThrow();
    });

    it('falla sin reason', async () => {
      await expect(ReferralModel.create(buildReferralData({ reason: undefined }))).rejects.toThrow();
    });

    it('falla con referralType inválido', async () => {
      await expect(ReferralModel.create(buildReferralData({ referralType: 'invalid_type' }))).rejects.toThrow();
    });

    it('falla con priority inválida', async () => {
      await expect(ReferralModel.create(buildReferralData({ priority: 'super_urgent' }))).rejects.toThrow();
    });

    it('falla con status inválido', async () => {
      await expect(ReferralModel.create(buildReferralData({ status: 'unknown' }))).rejects.toThrow();
    });
  });

  describe('Valores por defecto', () => {
    it('asigna status pending por defecto', async () => {
      const referral = await ReferralModel.create(buildReferralData());
      expect(referral.status).toBe('pending');
    });

    it('asigna requestedDate por defecto a ahora', async () => {
      const before = new Date();
      const referral = await ReferralModel.create(buildReferralData());
      expect(referral.requestedDate).toBeDefined();
      expect(referral.requestedDate!.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
    });
  });

  describe('Métodos de instancia', () => {
    it('accept cambia status a accepted y asigna doctor', async () => {
      const referral = await ReferralModel.create(buildReferralData());
      const doctorId = new mongoose.Types.ObjectId().toString();

      await referral.accept(doctorId, 'Acepto el caso');

      const updated = await ReferralModel.findById(referral._id);
      expect(updated?.status).toBe('accepted');
      expect(updated?.referredToDoctorId).toBe(doctorId);
      expect(updated?.acceptedDate).toBeDefined();
    });

    it('reject cambia status a rejected', async () => {
      const referral = await ReferralModel.create(buildReferralData());
      await referral.reject('Sin disponibilidad');

      const updated = await ReferralModel.findById(referral._id);
      expect(updated?.status).toBe('rejected');
    });

    it('complete cambia status a completed', async () => {
      const referral = await ReferralModel.create(buildReferralData({ status: 'in_progress' }));
      await referral.complete('Consulta realizada con éxito');

      const updated = await ReferralModel.findById(referral._id);
      expect(updated?.status).toBe('completed');
      expect(updated?.completedDate).toBeDefined();
    });

    it('cancel cambia status a cancelled', async () => {
      const referral = await ReferralModel.create(buildReferralData());
      await referral.cancel('Paciente no se presentó');

      const updated = await ReferralModel.findById(referral._id);
      expect(updated?.status).toBe('cancelled');
    });
  });

  describe('Métodos estáticos', () => {
    it('findByPatient retorna referidos del paciente', async () => {
      const patientId = new mongoose.Types.ObjectId().toString();
      await ReferralModel.create(buildReferralData({ patientId }));
      await ReferralModel.create(buildReferralData({ patientId }));
      await ReferralModel.create(buildReferralData()); // otro paciente

      const results = await ReferralModel.findByPatient(patientId);
      expect(results.length).toBe(2);
      expect(results.every(r => r.patientId === patientId)).toBe(true);
    });

    it('findByPatient filtra por status si se proporciona', async () => {
      const patientId = new mongoose.Types.ObjectId().toString();
      await ReferralModel.create(buildReferralData({ patientId, status: 'pending' }));
      await ReferralModel.create(buildReferralData({ patientId, status: 'accepted' }));

      const pending = await ReferralModel.findByPatient(patientId, 'pending');
      expect(pending.length).toBe(1);
      expect(pending[0].status).toBe('pending');
    });

    it('findByReferringDoctor retorna referidos del doctor', async () => {
      const doctorId = new mongoose.Types.ObjectId().toString();
      await ReferralModel.create(buildReferralData({ referringDoctorId: doctorId }));
      await ReferralModel.create(buildReferralData()); // otro doctor

      const results = await ReferralModel.findByReferringDoctor(doctorId);
      expect(results.length).toBe(1);
    });

    it('findPending retorna solo referidos pendientes', async () => {
      await ReferralModel.create(buildReferralData({ status: 'pending' }));
      await ReferralModel.create(buildReferralData({ status: 'accepted' }));

      const pending = await ReferralModel.findPending();
      expect(pending.every(r => r.status === 'pending')).toBe(true);
    });
  });
});