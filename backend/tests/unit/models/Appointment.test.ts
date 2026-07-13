import mongoose from 'mongoose';
import AppointmentModel from '../../../src/models/Appointment';

jest.mock('../../../src/utils/encryption', () => ({
  applyFieldEncryption: (_schema: any) => {},
}));

const buildAppointmentData = (overrides: Partial<Record<string, any>> = {}) => ({
  patientId: new mongoose.Types.ObjectId().toString(),
  doctorId: new mongoose.Types.ObjectId().toString(),
  createdBy: new mongoose.Types.ObjectId().toString(),
  scheduledAt: new Date(Date.now() + 86400000), // Tomorrow
  durationMinutes: 30,
  status: 'scheduled',
  reason: 'Consulta general',
  ...overrides,
});

describe('Appointment model', () => {
  afterEach(async () => {
    await AppointmentModel.deleteMany({});
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
  });

  describe('Validaciones', () => {
    it('crea una cita válida con campos requeridos', async () => {
      const data = buildAppointmentData();
      const appt = await AppointmentModel.create(data);

      expect(appt._id).toBeDefined();
      expect(appt.patientId).toBe(data.patientId);
      expect(appt.doctorId).toBe(data.doctorId);
      expect(appt.status).toBe('scheduled');
    });

    it('falla sin patientId', async () => {
      const data = buildAppointmentData({ patientId: undefined });
      await expect(AppointmentModel.create(data)).rejects.toThrow();
    });

    it('falla sin doctorId', async () => {
      const data = buildAppointmentData({ doctorId: undefined });
      await expect(AppointmentModel.create(data)).rejects.toThrow();
    });

    it('falla sin scheduledAt', async () => {
      const data = buildAppointmentData({ scheduledAt: undefined });
      await expect(AppointmentModel.create(data)).rejects.toThrow();
    });

    // Pre-validate hook backfills createdBy from doctorId (see Appointment.ts:143-145).
    it('defaults createdBy to doctorId when omitted', async () => {
      const data = buildAppointmentData({ createdBy: undefined });
      const doc = await AppointmentModel.create(data);
      expect(doc.createdBy).toBe(doc.doctorId);
    });

    it('falla con durationMinutes menor a 15', async () => {
      const data = buildAppointmentData({ durationMinutes: 10 });
      await expect(AppointmentModel.create(data)).rejects.toThrow();
    });

    it('falla con durationMinutes mayor a 240', async () => {
      const data = buildAppointmentData({ durationMinutes: 300 });
      await expect(AppointmentModel.create(data)).rejects.toThrow();
    });

    it('falla con status inválido', async () => {
      const data = buildAppointmentData({ status: 'invalid_status' });
      await expect(AppointmentModel.create(data)).rejects.toThrow();
    });

    it('usa valores por defecto correctamente', async () => {
      const data = buildAppointmentData();
      const appt = await AppointmentModel.create(data);

      expect(appt.status).toBe('scheduled');
      expect(appt.durationMinutes).toBe(30);
      expect(appt.tags).toEqual([]);
    });
  });

  describe('Virtual endAt', () => {
    it('calcula endAt correctamente', async () => {
      const scheduledAt = new Date(Date.now() + 86400000);
      const appt = await AppointmentModel.create(buildAppointmentData({
        scheduledAt,
        durationMinutes: 60,
      }));

      const expectedEnd = new Date(scheduledAt.getTime() + 60 * 60 * 1000);
      expect((appt as any).endAt.getTime()).toBeCloseTo(expectedEnd.getTime(), -3);
    });
  });

  describe('Instance methods', () => {
    it('cancel cambia el estado a cancelled', async () => {
      const appt = await AppointmentModel.create(buildAppointmentData());
      await appt.cancel('Paciente no disponible');

      expect(appt.status).toBe('cancelled');
      expect(appt.cancellationReason).toBe('Paciente no disponible');
    });

    it('cancel funciona sin razón', async () => {
      const appt = await AppointmentModel.create(buildAppointmentData());
      await appt.cancel();

      expect(appt.status).toBe('cancelled');
    });

    it('markCompleted cambia el estado a completed', async () => {
      const appt = await AppointmentModel.create(buildAppointmentData());
      await appt.markCompleted('Consulta completada exitosamente');

      expect(appt.status).toBe('completed');
    });

    it('reschedule cambia el estado a rescheduled y actualiza la fecha', async () => {
      const appt = await AppointmentModel.create(buildAppointmentData());
      const newDate = new Date(Date.now() + 172800000); // 2 days from now
      await appt.reschedule(newDate, 45);

      expect(appt.status).toBe('rescheduled');
      expect(appt.scheduledAt.getTime()).toBeCloseTo(newDate.getTime(), -3);
      expect(appt.durationMinutes).toBe(45);
    });
  });

  describe('Static methods', () => {
    it('findByDoctor retorna citas del doctor', async () => {
      const doctorId = 'doctor-static-1';
      await AppointmentModel.create(buildAppointmentData({ doctorId }));
      await AppointmentModel.create(buildAppointmentData({ doctorId }));
      await AppointmentModel.create(buildAppointmentData({ doctorId: 'other-doctor' }));

      const results = await AppointmentModel.findByDoctor(doctorId);
      expect(results).toHaveLength(2);
      results.forEach((r) => expect(r.doctorId).toBe(doctorId));
    });

    it('findByPatient retorna citas del paciente', async () => {
      const patientId = 'patient-static-1';
      await AppointmentModel.create(buildAppointmentData({ patientId }));
      await AppointmentModel.create(buildAppointmentData({ patientId: 'other-patient' }));

      const results = await AppointmentModel.findByPatient(patientId);
      expect(results).toHaveLength(1);
      expect(results[0].patientId).toBe(patientId);
    });

    it('findByDoctor con rango de fechas filtra correctamente', async () => {
      const doctorId = 'doctor-date-filter';
      const baseDate = new Date(Date.now() + 86400000);
      await AppointmentModel.create(buildAppointmentData({ doctorId, scheduledAt: baseDate }));

      const from = new Date(Date.now());
      const to = new Date(Date.now() + 2 * 86400000);
      const results = await AppointmentModel.findByDoctor(doctorId, from, to);
      expect(results.length).toBeGreaterThan(0);
    });

    it('findUpcomingWithin retorna citas próximas en el rango de minutos', async () => {
      const soonDate = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
      await AppointmentModel.create(buildAppointmentData({ scheduledAt: soonDate }));

      const results = await AppointmentModel.findUpcomingWithin(30);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('isSlotAvailable retorna true cuando no hay conflicto', async () => {
      const doctorId = 'doctor-slot-1';
      const start = new Date(Date.now() + 86400000);
      const end = new Date(start.getTime() + 60 * 60 * 1000);

      const available = await AppointmentModel.isSlotAvailable(doctorId, start, end);
      expect(available).toBe(true);
    });

    it('isSlotAvailable retorna false cuando hay conflicto', async () => {
      const doctorId = 'doctor-slot-2';
      const start = new Date(Date.now() + 86400000);
      await AppointmentModel.create(buildAppointmentData({
        doctorId,
        scheduledAt: start,
        durationMinutes: 60,
      }));

      const conflictStart = new Date(start.getTime() + 30 * 60 * 1000);
      const conflictEnd = new Date(start.getTime() + 90 * 60 * 1000);

      const available = await AppointmentModel.isSlotAvailable(doctorId, conflictStart, conflictEnd);
      expect(available).toBe(false);
    });
  });
});