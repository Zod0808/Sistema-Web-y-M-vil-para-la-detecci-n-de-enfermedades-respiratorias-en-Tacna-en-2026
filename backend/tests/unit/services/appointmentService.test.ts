import { appointmentService } from '../../../src/services/appointmentService';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../src/models/Appointment', () => ({
  __esModule: true,
  default: {
    isSlotAvailable: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    findByDoctor: jest.fn(),
    findUpcomingWithin: jest.fn(),
  },
}));

jest.mock('../../../src/services/alertService', () => ({
  alertService: {
    scheduleFollowUpAlert: jest.fn().mockResolvedValue(undefined),
  },
}));

const AppointmentModel = require('../../../src/models/Appointment').default;
const { alertService } = require('../../../src/services/alertService');

const buildAppointment = (overrides: Partial<any> = {}): any => ({
  _id: 'appt-1',
  patientId: 'patient-1',
  doctorId: 'doctor-1',
  scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
  durationMinutes: 30,
  status: 'scheduled',
  reminderMinutesBefore: 60,
  reminderSentAt: undefined,
  cancel: jest.fn().mockResolvedValue(undefined),
  markCompleted: jest.fn().mockResolvedValue(undefined),
  reschedule: jest.fn().mockResolvedValue(undefined),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('appointmentService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createAppointment', () => {
    it('crea cita cuando el horario está disponible', async () => {
      const appointment = buildAppointment();
      AppointmentModel.isSlotAvailable.mockResolvedValue(true);
      AppointmentModel.create.mockResolvedValue(appointment);

      const result = await appointmentService.createAppointment({
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        createdBy: 'doctor-1',
        scheduledAt: appointment.scheduledAt,
      });

      expect(AppointmentModel.isSlotAvailable).toHaveBeenCalled();
      expect(AppointmentModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'scheduled', durationMinutes: 30 })
      );
      expect(result).toBe(appointment);
    });

    it('usa durationMinutes default de 30 cuando no se especifica', async () => {
      const appointment = buildAppointment();
      AppointmentModel.isSlotAvailable.mockResolvedValue(true);
      AppointmentModel.create.mockResolvedValue(appointment);

      await appointmentService.createAppointment({
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        createdBy: 'doctor-1',
        scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      });

      expect(AppointmentModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ durationMinutes: 30 })
      );
    });

    it('lanza 409 cuando el horario no está disponible', async () => {
      AppointmentModel.isSlotAvailable.mockResolvedValue(false);

      await expect(
        appointmentService.createAppointment({
          patientId: 'patient-1',
          doctorId: 'doctor-1',
          createdBy: 'doctor-1',
          scheduledAt: new Date(),
        })
      ).rejects.toMatchObject({ statusCode: 409 });

      expect(AppointmentModel.create).not.toHaveBeenCalled();
    });

    it('programa recordatorio tras crear la cita', async () => {
      const futureTime = new Date(Date.now() + 3 * 60 * 60 * 1000);
      const appointment = buildAppointment({ scheduledAt: futureTime });
      AppointmentModel.isSlotAvailable.mockResolvedValue(true);
      AppointmentModel.create.mockResolvedValue(appointment);

      await appointmentService.createAppointment({
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        createdBy: 'doctor-1',
        scheduledAt: futureTime,
      });

      expect(alertService.scheduleFollowUpAlert).toHaveBeenCalled();
    });

    it('no falla si scheduleReminder lanza error', async () => {
      const appointment = buildAppointment();
      AppointmentModel.isSlotAvailable.mockResolvedValue(true);
      AppointmentModel.create.mockResolvedValue(appointment);
      alertService.scheduleFollowUpAlert.mockRejectedValue(new Error('Alert error'));

      const result = await appointmentService.createAppointment({
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        createdBy: 'doctor-1',
        scheduledAt: appointment.scheduledAt,
      });

      expect(result).toBe(appointment);
    });
  });

  describe('getAppointmentById', () => {
    it('retorna la cita encontrada', async () => {
      const appointment = buildAppointment();
      AppointmentModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(appointment) });

      const result = await appointmentService.getAppointmentById('appt-1');

      expect(AppointmentModel.findById).toHaveBeenCalledWith('appt-1');
      expect(result).toBe(appointment);
    });

    it('retorna null cuando no existe', async () => {
      AppointmentModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      const result = await appointmentService.getAppointmentById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('listAppointments', () => {
    it('lista todas las citas sin filtros', async () => {
      const appointments = [buildAppointment()];
      AppointmentModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(appointments),
      });

      const result = await appointmentService.listAppointments({});

      expect(AppointmentModel.find).toHaveBeenCalledWith({});
      expect(result).toBe(appointments);
    });

    it('filtra por doctorId', async () => {
      AppointmentModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      await appointmentService.listAppointments({ doctorId: 'doctor-1' });

      expect(AppointmentModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ doctorId: 'doctor-1' })
      );
    });

    it('filtra por patientId y status', async () => {
      AppointmentModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      await appointmentService.listAppointments({
        patientId: 'patient-1',
        status: ['scheduled', 'completed'],
      });

      expect(AppointmentModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: 'patient-1',
          status: { $in: ['scheduled', 'completed'] },
        })
      );
    });

    it('filtra por rango de fechas', async () => {
      const from = new Date('2026-01-01');
      const to = new Date('2026-04-01');
      AppointmentModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      await appointmentService.listAppointments({ from, to });

      expect(AppointmentModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduledAt: { $gte: from, $lte: to },
        })
      );
    });
  });

  describe('cancelAppointment', () => {
    it('cancela la cita correctamente', async () => {
      const appointment = buildAppointment();
      AppointmentModel.findById.mockResolvedValue(appointment);

      const result = await appointmentService.cancelAppointment('appt-1', 'Paciente canceló');

      expect(appointment.cancel).toHaveBeenCalledWith('Paciente canceló');
      expect(result).toBe(appointment);
    });

    it('lanza 404 cuando la cita no existe', async () => {
      AppointmentModel.findById.mockResolvedValue(null);

      await expect(
        appointmentService.cancelAppointment('nonexistent')
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('completeAppointment', () => {
    it('completa la cita correctamente', async () => {
      const appointment = buildAppointment();
      AppointmentModel.findById.mockResolvedValue(appointment);

      const result = await appointmentService.completeAppointment('appt-1', 'Consulta finalizada');

      expect(appointment.markCompleted).toHaveBeenCalledWith('Consulta finalizada');
      expect(result).toBe(appointment);
    });

    it('lanza 404 cuando la cita no existe', async () => {
      AppointmentModel.findById.mockResolvedValue(null);

      await expect(
        appointmentService.completeAppointment('nonexistent')
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('rescheduleAppointment', () => {
    it('reprograma la cita cuando el nuevo horario está disponible', async () => {
      const appointment = buildAppointment();
      AppointmentModel.findById.mockResolvedValue(appointment);
      AppointmentModel.isSlotAvailable.mockResolvedValue(true);

      const newDate = new Date(Date.now() + 4 * 60 * 60 * 1000);
      const result = await appointmentService.rescheduleAppointment('appt-1', {
        scheduledAt: newDate,
      });

      expect(AppointmentModel.isSlotAvailable).toHaveBeenCalled();
      expect(appointment.reschedule).toHaveBeenCalledWith(newDate, undefined, undefined);
      expect(result).toBe(appointment);
    });

    it('lanza 409 cuando el nuevo horario no está disponible', async () => {
      const appointment = buildAppointment();
      AppointmentModel.findById.mockResolvedValue(appointment);
      AppointmentModel.isSlotAvailable.mockResolvedValue(false);

      await expect(
        appointmentService.rescheduleAppointment('appt-1', { scheduledAt: new Date() })
      ).rejects.toMatchObject({ statusCode: 409 });

      expect(appointment.reschedule).not.toHaveBeenCalled();
    });

    it('lanza 404 cuando la cita no existe', async () => {
      AppointmentModel.findById.mockResolvedValue(null);

      await expect(
        appointmentService.rescheduleAppointment('nonexistent', { scheduledAt: new Date() })
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('getDoctorAvailability', () => {
    it('retorna slots con disponibilidad correcta', async () => {
      const start = new Date('2026-04-15T09:00:00Z');
      const end = new Date('2026-04-15T11:00:00Z');
      AppointmentModel.findByDoctor.mockResolvedValue([]);

      const slots = await appointmentService.getDoctorAvailability('doctor-1', { start, end, slotMinutes: 30 });

      expect(slots).toHaveLength(4); // 4 slots of 30 min in 2 hours
      slots.forEach(slot => expect(slot.available).toBe(true));
    });

    it('marca slot como no disponible cuando hay conflicto', async () => {
      const start = new Date('2026-04-15T09:00:00Z');
      const end = new Date('2026-04-15T11:00:00Z');
      const conflictingAppointment = {
        scheduledAt: new Date('2026-04-15T09:00:00Z'),
        durationMinutes: 30,
        status: 'scheduled',
      };
      AppointmentModel.findByDoctor.mockResolvedValue([conflictingAppointment]);

      const slots = await appointmentService.getDoctorAvailability('doctor-1', { start, end, slotMinutes: 30 });

      expect(slots[0].available).toBe(false);
      expect(slots[1].available).toBe(true);
    });

    it('lanza 400 cuando slotMinutes es menor a 15', async () => {
      await expect(
        appointmentService.getDoctorAvailability('doctor-1', {
          start: new Date(),
          end: new Date(Date.now() + 60 * 60 * 1000),
          slotMinutes: 10,
        })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('lanza 400 cuando slotMinutes es mayor a 240', async () => {
      await expect(
        appointmentService.getDoctorAvailability('doctor-1', {
          start: new Date(),
          end: new Date(Date.now() + 60 * 60 * 1000),
          slotMinutes: 300,
        })
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('processUpcomingReminders', () => {
    it('procesa 0 recordatorios cuando no hay citas próximas', async () => {
      AppointmentModel.findUpcomingWithin.mockResolvedValue([]);

      const count = await appointmentService.processUpcomingReminders();

      expect(count).toBe(0);
    });

    it('procesa recordatorios de citas próximas', async () => {
      const futureScheduledAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min from now
      const reminderAt = new Date(futureScheduledAt.getTime() - 15 * 60 * 1000); // 15 min before
      const appointment = buildAppointment({
        scheduledAt: futureScheduledAt,
        reminderMinutesBefore: 15,
        reminderSentAt: undefined,
      });
      AppointmentModel.findUpcomingWithin.mockResolvedValue([appointment]);

      const count = await appointmentService.processUpcomingReminders();

      expect(alertService.scheduleFollowUpAlert).toHaveBeenCalled();
      expect(count).toBe(1);
    });

    it('no reprocesa citas con recordatorio ya enviado', async () => {
      const futureScheduledAt = new Date(Date.now() + 30 * 60 * 1000);
      const reminderMinutesBefore = 15;
      const reminderAt = new Date(futureScheduledAt.getTime() - reminderMinutesBefore * 60 * 1000);
      const appointment = buildAppointment({
        scheduledAt: futureScheduledAt,
        reminderMinutesBefore,
        reminderSentAt: reminderAt, // already sent
      });
      AppointmentModel.findUpcomingWithin.mockResolvedValue([appointment]);

      const count = await appointmentService.processUpcomingReminders();

      expect(alertService.scheduleFollowUpAlert).not.toHaveBeenCalled();
      expect(count).toBe(0);
    });

    it('continúa procesando aunque falle uno', async () => {
      const futureScheduledAt = new Date(Date.now() + 30 * 60 * 1000);
      const appt1 = buildAppointment({ _id: 'appt-1', scheduledAt: futureScheduledAt, reminderMinutesBefore: 15 });
      const appt2 = buildAppointment({ _id: 'appt-2', scheduledAt: futureScheduledAt, reminderMinutesBefore: 15 });
      AppointmentModel.findUpcomingWithin.mockResolvedValue([appt1, appt2]);
      alertService.scheduleFollowUpAlert
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValueOnce(undefined);

      const count = await appointmentService.processUpcomingReminders();

      expect(count).toBe(1);
    });
  });
});