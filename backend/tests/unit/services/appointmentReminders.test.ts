import appointmentService from '../../../src/services/appointmentService';
import AppointmentModel from '../../../src/models/Appointment';
import { alertService } from '../../../src/services/alertService';

jest.mock('../../../src/models/Appointment', () => ({
  __esModule: true,
  default: {
    findUpcomingWithin: jest.fn(),
  },
}));

jest.mock('../../../src/services/alertService', () => ({
  alertService: {
    scheduleFollowUpAlert: jest.fn(),
    scheduleMedicationReminder: jest.fn(),
  },
}));

const appointmentModelMock = AppointmentModel as jest.Mocked<typeof AppointmentModel>;
const alertServiceMock = alertService as jest.Mocked<typeof alertService>;

const buildAppointment = (overrides: Partial<any> = {}) => ({
  _id: 'appointment-1',
  patientId: 'patient-1',
  doctorId: 'doctor-1',
  scheduledAt: new Date(Date.now() + 45 * 60 * 1000),
  durationMinutes: 30,
  reminderMinutesBefore: 30,
  reminderSentAt: undefined,
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('appointmentService - reminders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('programa recordatorios para citas próximas', async () => {
    const appointment = buildAppointment();
    appointmentModelMock.findUpcomingWithin.mockResolvedValue([appointment] as any);

    const processed = await appointmentService.processUpcomingReminders();

    expect(alertServiceMock.scheduleFollowUpAlert).toHaveBeenCalledTimes(1);
    expect(appointment.save).toHaveBeenCalled();
    expect(processed).toBe(1);
  });

  it('omite recordatorios ya programados previamente', async () => {
    const appointment = buildAppointment();
    const reminderDate = new Date(
      appointment.scheduledAt.getTime() - appointment.reminderMinutesBefore * 60 * 1000
    );
    appointment.reminderSentAt = new Date(reminderDate);
    appointmentModelMock.findUpcomingWithin.mockResolvedValue([appointment] as any);

    const processed = await appointmentService.processUpcomingReminders();

    expect(alertServiceMock.scheduleFollowUpAlert).not.toHaveBeenCalled();
    expect(appointment.save).not.toHaveBeenCalled();
    expect(processed).toBe(0);
  });
});

