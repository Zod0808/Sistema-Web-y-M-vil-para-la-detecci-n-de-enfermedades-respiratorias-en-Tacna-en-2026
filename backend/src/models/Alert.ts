import mongoose, { Document, Model, Schema } from 'mongoose';
import {
  Alert as IAlert,
  AlertCategory,
  AlertChannel,
  AlertPriority,
  AlertStatus,
} from '../types';
import { applyFieldEncryption } from '../utils/encryption';

const ALERT_CHANNELS: AlertChannel[] = ['in_app', 'push', 'email', 'sms'];
const ALERT_PRIORITIES: AlertPriority[] = ['low', 'medium', 'high', 'critical'];
const ALERT_STATUSES: AlertStatus[] = [
  'pending',
  'scheduled',
  'sent',
  'delivered',
  'failed',
  'acknowledged',
  'expired',
];
const ALERT_CATEGORIES: AlertCategory[] = [
  'critical_symptom',
  'medication_reminder',
  'follow_up',
  'doctor_notification',
  'system',
  'emergency',
  'consent',
  'laboratory',
  'referral',
  'ai_analysis',
];

const PRIORITY_WEIGHTS: Record<AlertPriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export interface AlertDocument extends Omit<IAlert, '_id'>, Document {
  priorityWeight: number;
  markAsDispatched(): Promise<void>;
  markAsFailed(error: string): Promise<void>;
  markAsAcknowledged(): Promise<void>;
  isDue(referenceDate?: Date): boolean;
}

export interface AlertModel extends Model<AlertDocument> {
  findDueAlerts(limit?: number): Promise<AlertDocument[]>;
  getDashboardMetrics(): Promise<{
    byStatus: Array<{ _id: AlertStatus; count: number }>;
    byCategory: Array<{ _id: AlertCategory; count: number }>;
    byPriority: Array<{ _id: AlertPriority; count: number }>;
    pendingForToday: number;
    criticalOpen: number;
  }>;
}

const AlertTriggerSchema = new Schema(
  {
    source: {
      type: String,
      enum: ['symptom_analysis', 'medication_schedule', 'follow_up_rule', 'manual', 'system', 'doctor_portal', 'emergency_service', 'referral', 'consent', 'laboratory', 'ai_analysis_review'],
      required: true,
      trim: true,
    },
    referenceId: {
      type: String,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  { _id: false }
);

const AlertSchema = new Schema<AlertDocument, AlertModel>(
  {
    userId: {
      type: String,
      required: [true, 'El usuario objetivo es obligatorio'],
      trim: true,
      index: true,
    },
    patientId: {
      type: String,
      trim: true,
      index: true,
    },
    doctorId: {
      type: String,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'El título de la alerta es obligatorio'],
      trim: true,
      maxlength: [140, 'El título no puede exceder 140 caracteres'],
    },
    message: {
      type: String,
      required: [true, 'El mensaje de la alerta es obligatorio'],
      trim: true,
      maxlength: [2000, 'El mensaje no puede exceder 2000 caracteres'],
    },
    category: {
      type: String,
      enum: ALERT_CATEGORIES,
      required: true,
      index: true,
    },
    channels: {
      type: [String],
      enum: ALERT_CHANNELS,
      default: ['push', 'in_app'],
      validate: {
        validator: (value: string[]) => value.length > 0,
        message: 'Debe especificar al menos un canal de notificación',
      },
    },
    priority: {
      type: String,
      enum: ALERT_PRIORITIES,
      default: 'medium',
      index: true,
    },
    status: {
      type: String,
      enum: ALERT_STATUSES,
      default: 'pending',
      index: true,
    },
    trigger: {
      type: AlertTriggerSchema,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    tags: {
      type: [String],
      default: [],
    },
    scheduledAt: {
      type: Date,
      index: true,
    },
    dispatchedAt: {
      type: Date,
    },
    acknowledgedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    retries: {
      type: Number,
      default: 0,
      min: [0, 'El número de reintentos no puede ser negativo'],
    },
    lastError: {
      type: String,
      trim: true,
    },
    priorityWeight: {
      type: Number,
      default: PRIORITY_WEIGHTS.medium,
      min: 1,
      max: 5,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Cifrado en reposo para contenidos de alerta
applyFieldEncryption(AlertSchema, [
  'title',
  'message',
  'lastError'
]);

AlertSchema.index({ status: 1, scheduledAt: 1, priorityWeight: -1 });
AlertSchema.index({ category: 1, status: 1 });
AlertSchema.index({ createdAt: -1 });
AlertSchema.index({ tags: 1 });

// `type`/`severity` are legacy top-level input fields (pre-dating
// category/priority). They aren't persisted paths, so under Mongoose's
// default strict mode `new Alert({ type, severity, ... })` would silently
// drop them before the pre-validate hook below ever saw them. Declaring them
// as virtuals makes the constructor route them through these setters instead
// of discarding them.
AlertSchema.virtual('type')
  .get(function (this: any) {
    return this._legacyType;
  })
  .set(function (this: any, value: string) {
    this._legacyType = value;
  });
AlertSchema.virtual('severity')
  .get(function (this: any) {
    return this._legacySeverity;
  })
  .set(function (this: any, value: string) {
    this._legacySeverity = value;
  });

AlertSchema.pre<AlertDocument>('validate', function fillLegacyFields(next) {
  const self = this as any;
  if (!self.userId && self.patientId) {
    self.userId = self.patientId;
  }
  if (!self.title && self.message) {
    self.title = String(self.message).slice(0, 140);
  }
  if (!self.category) {
    const legacyType = self._legacyType;
    if (typeof legacyType === 'string' && ALERT_CATEGORIES.includes(legacyType as AlertCategory)) {
      self.category = legacyType;
    } else if (legacyType === 'medication') {
      self.category = 'medication_reminder';
    } else if (legacyType === 'symptom') {
      self.category = 'critical_symptom';
    }
  }
  // `priority` always carries its schema default by the time this hook runs,
  // so `!self.priority` can never detect "not explicitly set" here; an
  // explicit legacy `severity` always takes precedence over that default.
  if (self._legacySeverity) {
    const severityToPriority: Record<string, AlertPriority> = {
      low: 'low',
      medium: 'medium',
      high: 'high',
      critical: 'critical',
      invalid: self._legacySeverity,
    };
    self.priority = severityToPriority[self._legacySeverity] ?? self._legacySeverity;
  }
  next();
});

AlertSchema.pre<AlertDocument>('save', function assignPriorityWeight(next) {
  this.priorityWeight = PRIORITY_WEIGHTS[this.priority] ?? PRIORITY_WEIGHTS.medium;
  if (!this.scheduledAt && (this.status === 'scheduled' || this.status === 'pending')) {
    this.scheduledAt = new Date();
  }
  next();
});

AlertSchema.methods.isDue = function isDue(this: AlertDocument, referenceDate: Date = new Date()): boolean {
  if (
    this.status === 'failed' ||
    this.status === 'delivered' ||
    this.status === 'acknowledged' ||
    this.status === 'expired' ||
    this.status === 'sent'
  ) {
    return false;
  }

  if (this.expiresAt && this.expiresAt < referenceDate) {
    return false;
  }

  if (!this.scheduledAt) {
    return true;
  }

  return this.scheduledAt <= referenceDate;
};

AlertSchema.methods.markAsDispatched = async function markAsDispatched(this: AlertDocument): Promise<void> {
  this.status = 'delivered';
  this.dispatchedAt = new Date();
  this.lastError = undefined;
  await this.save();
};

AlertSchema.methods.markAsFailed = async function markAsFailed(this: AlertDocument, error: string): Promise<void> {
  this.status = 'failed';
  this.retries += 1;
  this.lastError = error;
  await this.save();
};

AlertSchema.methods.markAsAcknowledged = async function markAsAcknowledged(this: AlertDocument): Promise<void> {
  this.status = 'acknowledged';
  this.acknowledgedAt = new Date();
  await this.save();
};

AlertSchema.statics.findDueAlerts = function findDueAlerts(this: AlertModel, limit: number = 50): Promise<AlertDocument[]> {
  const now = new Date();
  return this.find({
    status: { $in: ['pending', 'scheduled'] },
    $and: [
      {
        $or: [{ scheduledAt: { $exists: false } }, { scheduledAt: { $lte: now } }],
      },
      {
        $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }],
      },
    ],
  })
    .sort({ priorityWeight: -1, scheduledAt: 1, createdAt: 1 })
    .limit(limit)
    .exec();
};

AlertSchema.statics.getDashboardMetrics = async function getDashboardMetrics(this: AlertModel) {
  const [byStatus, byCategory, byPriority, pendingForToday, criticalOpen] = await Promise.all([
    this.aggregate<{ _id: AlertStatus; count: number }>([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    this.aggregate<{ _id: AlertCategory; count: number }>([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
    this.aggregate<{ _id: AlertPriority; count: number }>([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]),
    this.countDocuments({
      status: { $in: ['pending', 'scheduled'] },
      scheduledAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lte: new Date(new Date().setHours(23, 59, 59, 999)),
      },
    }),
    this.countDocuments({
      status: { $in: ['pending', 'scheduled'] },
      priority: 'critical',
    }),
  ]);

  return {
    byStatus,
    byCategory,
    byPriority,
    pendingForToday,
    criticalOpen,
  };
};

export const AlertModel: AlertModel =
  (mongoose.models.Alert as AlertModel) ??
  mongoose.model<AlertDocument, AlertModel>('Alert', AlertSchema);

export default AlertModel;

