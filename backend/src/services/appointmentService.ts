/**
 * Appointment Service
 * Gestiona el ciclo de vida de las citas médicas, disponibilidad y recordatorios
 */

import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import AppointmentModel, { AppointmentDocument } from '../models/Appointment';
import { alertService } from './alertService';
import { AppointmentStatus } from '../types';

type CreateAppointmentPayload = {
  patientId: string;
  doctorId: string;
  createdBy: string;
  scheduledAt: Date;
  durationMinutes?: number;
  reason?: string;
  notes?: string;
  location?: {
    type?: 'virtual' | 'in_person';
    description?: string;
    meetingLink?: string;
    address?: string;
  };
  reminderMinutesBefore?: number;
  tags?: string[];
  metadata?: Record<string, any>;
};

type UpdateAppointmentPayload = Partial<
  Pick<
    CreateAppointmentPayload,
    'reason' | 'notes' | 'location' | 'durationMinutes' | 'reminderMinutesBefore' | 'tags' | 'metadata'
  >
>;

type ReschedulePayload = {
  scheduledAt: Date;
  durationMinutes?: number;
  metadata?: Record<string, any>;
};

type AvailabilityQuery = {
  start: Date;
  end: Date;
  slotMinutes?: number;
};

const UPCOMING_REMINDER_MINUTES = 60;

class AppointmentService {
  private async ensureAvailability(
    doctorId: string,
    scheduledAt: Date,
    durationMinutes: number,
    excludeId?: string
  ) {
    const end = new Date(scheduledAt.getTime() + durationMinutes * 60 * 1000);
    const available = await AppointmentModel.isSlotAvailable(doctorId, scheduledAt, end, excludeId);
    if (!available) {
      throw new AppError('El horario seleccionado no está disponible para el doctor', 409);
    }
  }

  private async scheduleReminder(appointment: AppointmentDocument) {
    try {
      const reminderMinutes = appointment.reminderMinutesBefore ?? 60;
      const reminderAt = new Date(appointment.scheduledAt.getTime() - reminderMinutes * 60 * 1000);
      if (reminderAt.getTime() <= Date.now()) {
        return;
      }

      await alertService.scheduleFollowUpAlert({
        userId: appointment.patientId,
        doctorId: appointment.doctorId,
        followUpDate: reminderAt,
        reason: `Recordatorio de cita médica (${reminderMinutes} min antes)`,
        preferredChannel: ['push', 'in_app'],
        patientId: appointment.patientId,
      });

      appointment.reminderSentAt = reminderAt;
      await appointment.save();
    } catch (error) {
      logger.warn('No se pudo programar recordatorio de cita', {
        appointmentId: appointment._id?.toString(),
        error,
      });
    }
  }

  async createAppointment(payload: CreateAppointmentPayload): Promise<AppointmentDocument> {
    const durationMinutes = payload.durationMinutes ?? 30;

    await this.ensureAvailability(payload.doctorId, payload.scheduledAt, durationMinutes);

    const appointment = await AppointmentModel.create({
      ...payload,
      durationMinutes,
      status: 'scheduled',
    });

    await this.scheduleReminder(appointment);

    return appointment;
  }

  async getAppointmentById(appointmentId: string): Promise<AppointmentDocument | null> {
    return AppointmentModel.findById(appointmentId).exec();
  }

  async listAppointments(params: {
    doctorId?: string;
    patientId?: string;
    status?: AppointmentStatus[];
    from?: Date;
    to?: Date;
  }): Promise<AppointmentDocument[]> {
    const query: Record<string, unknown> = {};

    if (params.doctorId) {
      query.doctorId = params.doctorId;
    }
    if (params.patientId) {
      query.patientId = params.patientId;
    }
    if (params.status?.length) {
      query.status = { $in: params.status };
    }
    if (params.from || params.to) {
      query.scheduledAt = {};
      if (params.from) {
        (query.scheduledAt as Record<string, unknown>).$gte = params.from;
      }
      if (params.to) {
        (query.scheduledAt as Record<string, unknown>).$lte = params.to;
      }
    }

    return AppointmentModel.find(query).sort({ scheduledAt: 1 }).limit(200).exec();
  }

  async updateAppointment(appointmentId: string, payload: UpdateAppointmentPayload): Promise<AppointmentDocument> {
    const appointment = await AppointmentModel.findById(appointmentId);
    if (!appointment) {
      throw new AppError('La cita médica no existe', 404);
    }
    if (payload.durationMinutes && payload.durationMinutes !== appointment.durationMinutes) {
      await this.ensureAvailability(appointment.doctorId, appointment.scheduledAt, payload.durationMinutes, appointmentId);
      appointment.durationMinutes = payload.durationMinutes;
    }

    if (payload.reason !== undefined) {
      appointment.reason = payload.reason;
    }
    if (payload.notes !== undefined) {
      appointment.notes = payload.notes;
    }
    if (payload.location !== undefined) {
      appointment.location = payload.location as any;
    }
    if (payload.reminderMinutesBefore !== undefined) {
      appointment.reminderMinutesBefore = payload.reminderMinutesBefore;
    }
    if (payload.tags !== undefined) {
      appointment.tags = payload.tags;
    }
    if (payload.metadata) {
      appointment.metadata = {
        ...(appointment.metadata ?? {}),
        ...payload.metadata,
      };
    }

    await appointment.save();
    await this.scheduleReminder(appointment);
    return appointment;
  }

  async cancelAppointment(appointmentId: string, reason?: string): Promise<AppointmentDocument> {
    const appointment = await AppointmentModel.findById(appointmentId);
    if (!appointment) {
      throw new AppError('La cita médica no existe', 404);
    }
    await appointment.cancel(reason);
    return appointment;
  }

  async completeAppointment(appointmentId: string, notes?: string): Promise<AppointmentDocument> {
    const appointment = await AppointmentModel.findById(appointmentId);
    if (!appointment) {
      throw new AppError('La cita médica no existe', 404);
    }
    await appointment.markCompleted(notes);
    return appointment;
  }

  async rescheduleAppointment(appointmentId: string, payload: ReschedulePayload): Promise<AppointmentDocument> {
    const appointment = await AppointmentModel.findById(appointmentId);
    if (!appointment) {
      throw new AppError('La cita médica no existe', 404);
    }

    const durationMinutes = payload.durationMinutes ?? appointment.durationMinutes;
    await this.ensureAvailability(appointment.doctorId, payload.scheduledAt, durationMinutes, appointmentId);

    await appointment.reschedule(payload.scheduledAt, payload.durationMinutes, payload.metadata);
    await this.scheduleReminder(appointment);
    return appointment;
  }

  async getDoctorAvailability(
    doctorId: string,
    { start, end, slotMinutes = 30 }: AvailabilityQuery
  ): Promise<
    Array<{
      start: Date;
      end: Date;
      available: boolean;
    }>
  > {
    if (slotMinutes < 15 || slotMinutes > 240) {
      throw new AppError('El intervalo debe estar entre 15 y 240 minutos', 400);
    }

    const appointments = await AppointmentModel.findByDoctor(doctorId, start, end);
    const slots: Array<{ start: Date; end: Date; available: boolean }> = [];

    for (let current = new Date(start); current < end; current = new Date(current.getTime() + slotMinutes * 60 * 1000)) {
      const slotEnd = new Date(current.getTime() + slotMinutes * 60 * 1000);
      if (slotEnd > end) {
        break;
      }

      const conflict = appointments.some((appointment) => {
        const appointmentEnd = new Date(appointment.scheduledAt.getTime() + appointment.durationMinutes * 60 * 1000);
        return appointment.status !== 'cancelled' && appointment.status !== 'no_show'
          ? appointment.scheduledAt < slotEnd && appointmentEnd > current
          : false;
      });

      slots.push({
        start: new Date(current),
        end: slotEnd,
        available: !conflict,
      });
    }

    return slots;
  }

  async getUpcomingAppointments(minutes: number = UPCOMING_REMINDER_MINUTES): Promise<AppointmentDocument[]> {
    return AppointmentModel.findUpcomingWithin(minutes);
  }

  async processUpcomingReminders(minutes: number = UPCOMING_REMINDER_MINUTES): Promise<number> {
    const appointments = await this.getUpcomingAppointments(minutes);
    let processed = 0;
    for (const appointment of appointments) {
      const reminderMinutes = appointment.reminderMinutesBefore ?? minutes;
      const reminderAt = new Date(appointment.scheduledAt.getTime() - reminderMinutes * 60 * 1000);

      if (reminderAt.getTime() <= Date.now()) {
        continue;
      }

      if (!appointment.reminderSentAt || appointment.reminderSentAt.getTime() !== reminderAt.getTime()) {
        try {
          await alertService.scheduleFollowUpAlert({
            userId: appointment.patientId,
            doctorId: appointment.doctorId,
            followUpDate: reminderAt,
            reason: `Recordatorio de cita médica (${reminderMinutes} min antes)`,
            preferredChannel: ['push', 'in_app'],
            patientId: appointment.patientId,
          });
          appointment.reminderSentAt = reminderAt;
          await appointment.save();
          processed += 1;
        } catch (error) {
          logger.warn('No se pudo reprogramar recordatorio de cita desde job', {
            appointmentId: appointment._id?.toString(),
            error,
          });
        }
      }
    }
    return processed;
  }
}

export const appointmentService = new AppointmentService();

export default appointmentService;

