import mongoose, { Document, Model, Schema } from 'mongoose';
import { Appointment as AppointmentDTO, AppointmentStatus } from '../types';
import { applyFieldEncryption } from '../utils/encryption';

const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'scheduled',
  'completed',
  'cancelled',
  'rescheduled',
  'no_show',
];

const DEFAULT_REMINDER_MINUTES = 60;

export interface AppointmentDocument extends Omit<AppointmentDTO, '_id'>, Document {
  cancel(reason?: string): Promise<void>;
  markCompleted(notes?: string): Promise<void>;
  reschedule(newDate: Date, durationMinutes?: number, metadata?: Record<string, any>): Promise<void>;
}

export interface AppointmentModel extends Model<AppointmentDocument> {
  isSlotAvailable(doctorId: string, start: Date, end: Date, excludeAppointmentId?: string): Promise<boolean>;
  findByDoctor(doctorId: string, from?: Date, to?: Date): Promise<AppointmentDocument[]>;
  findByPatient(patientId: string, from?: Date, to?: Date): Promise<AppointmentDocument[]>;
  findUpcomingWithin(minutes: number): Promise<AppointmentDocument[]>;
}

const LocationSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['virtual', 'in_person'],
      default: 'in_person',
    },
    description: {
      type: String,
      trim: true,
    },
    meetingLink: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const AppointmentSchema = new Schema<AppointmentDocument, AppointmentModel>(
  {
    patientId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    doctorId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    createdBy: {
      type: String,
      required: true,
      trim: true,
    },
    scheduledAt: {
      type: Date,
      required: true,
      index: true,
    },
    durationMinutes: {
      type: Number,
      default: 30,
      min: [15, 'La duración mínima es 15 minutos'],
      max: [240, 'La duración máxima es 240 minutos'],
    },
    status: {
      type: String,
      enum: APPOINTMENT_STATUSES,
      default: 'scheduled',
      index: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 240,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    location: {
      type: LocationSchema,
      default: undefined,
    },
    reminderMinutesBefore: {
      type: Number,
      default: DEFAULT_REMINDER_MINUTES,
      min: 5,
      max: 24 * 60,
    },
    reminderSentAt: {
      type: Date,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    rescheduledFrom: {
      type: String,
      trim: true,
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Cifrado en reposo para notas y dirección/sala
applyFieldEncryption(AppointmentSchema, [
  'reason',
  'notes',
  'location.address',
  'location.meetingLink',
  'cancellationReason'
]);

AppointmentSchema.index({ doctorId: 1, scheduledAt: 1 });
AppointmentSchema.index({ patientId: 1, scheduledAt: 1 });
AppointmentSchema.index({ status: 1, scheduledAt: 1 });

AppointmentSchema.virtual('endAt').get(function (this: AppointmentDocument) {
  return new Date(this.scheduledAt.getTime() + this.durationMinutes * 60 * 1000);
});

AppointmentSchema.methods.cancel = async function cancel(this: AppointmentDocument, reason?: string) {
  this.status = 'cancelled';
  if (reason) {
    this.cancellationReason = reason;
  }
  this.reminderSentAt = undefined;
  await this.save();
};

AppointmentSchema.methods.markCompleted = async function markCompleted(
  this: AppointmentDocument,
  notes?: string
) {
  this.status = 'completed';
  if (notes) {
    this.notes = `${this.notes ? `${this.notes}\n` : ''}${notes}`;
  }
  this.reminderSentAt = undefined;
  await this.save();
};

AppointmentSchema.methods.reschedule = async function reschedule(
  this: AppointmentDocument,
  newDate: Date,
  durationMinutes?: number,
  metadata?: Record<string, any>
) {
  this.rescheduledFrom = this._id.toString();
  this.scheduledAt = newDate;
  if (durationMinutes) {
    this.durationMinutes = durationMinutes;
  }
  this.status = 'rescheduled';
  if (metadata) {
    this.metadata = {
      ...(this.metadata ?? {}),
      ...metadata,
    };
  }
  this.reminderSentAt = undefined;
  await this.save();
};

AppointmentSchema.statics.isSlotAvailable = async function isSlotAvailable(
  this: AppointmentModel,
  doctorId: string,
  start: Date,
  end: Date,
  excludeAppointmentId?: string
) {
  const match: Record<string, unknown> = {
    doctorId,
    status: { $in: ['scheduled', 'rescheduled'] },
    $expr: {
      $and: [
        { $lt: ['$scheduledAt', end] },
        {
          $gt: [
            { $add: ['$scheduledAt', { $multiply: ['$durationMinutes', 60 * 1000] }] },
            start,
          ],
        },
      ],
    },
  };

  if (excludeAppointmentId) {
    match._id = { $ne: new mongoose.Types.ObjectId(excludeAppointmentId) };
  }

  const conflict = await this.exists(match);
  return !conflict;
};

AppointmentSchema.statics.findByDoctor = function findByDoctor(
  this: AppointmentModel,
  doctorId: string,
  from?: Date,
  to?: Date
) {
  const query: Record<string, unknown> = { doctorId };
  if (from || to) {
    query.scheduledAt = {};
    if (from) {
      (query.scheduledAt as Record<string, unknown>).$gte = from;
    }
    if (to) {
      (query.scheduledAt as Record<string, unknown>).$lte = to;
    }
  }
  return this.find(query).sort({ scheduledAt: 1 }).limit(200).exec();
};

AppointmentSchema.statics.findByPatient = function findByPatient(
  this: AppointmentModel,
  patientId: string,
  from?: Date,
  to?: Date
) {
  const query: Record<string, unknown> = { patientId };
  if (from || to) {
    query.scheduledAt = {};
    if (from) {
      (query.scheduledAt as Record<string, unknown>).$gte = from;
    }
    if (to) {
      (query.scheduledAt as Record<string, unknown>).$lte = to;
    }
  }
  return this.find(query).sort({ scheduledAt: 1 }).limit(200).exec();
};

AppointmentSchema.statics.findUpcomingWithin = function findUpcomingWithin(
  this: AppointmentModel,
  minutes: number
) {
  const now = new Date();
  const limit = new Date(now.getTime() + minutes * 60 * 1000);
  return this.find({
    status: { $in: ['scheduled', 'rescheduled'] },
    scheduledAt: { $gte: now, $lte: limit },
  })
    .sort({ scheduledAt: 1 })
    .exec();
};

export const AppointmentModel: AppointmentModel =
  (mongoose.models.Appointment as AppointmentModel) ??
  mongoose.model<AppointmentDocument, AppointmentModel>('Appointment', AppointmentSchema);

export default AppointmentModel;

