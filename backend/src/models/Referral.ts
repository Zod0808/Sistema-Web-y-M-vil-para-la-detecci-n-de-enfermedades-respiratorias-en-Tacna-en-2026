import mongoose, { Document, Model, Schema } from 'mongoose';
import { applyFieldEncryption } from '../utils/encryption';

export type ReferralStatus = 
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type ReferralPriority = 'low' | 'medium' | 'high' | 'urgent';

export type ReferralType = 
  | 'consultation'
  | 'specialist'
  | 'diagnostic'
  | 'treatment'
  | 'follow_up'
  | 'emergency';

const REFERRAL_STATUSES: ReferralStatus[] = [
  'pending',
  'accepted',
  'rejected',
  'in_progress',
  'completed',
  'cancelled',
];

const REFERRAL_PRIORITIES: ReferralPriority[] = ['low', 'medium', 'high', 'urgent'];

const REFERRAL_TYPES: ReferralType[] = [
  'consultation',
  'specialist',
  'diagnostic',
  'treatment',
  'follow_up',
  'emergency',
];

export interface ReferralDocument extends Document {
  patientId: string;
  patientName: string;
  referringDoctorId: string;
  referringDoctorName: string;
  referredToDoctorId?: string;
  referredToDoctorName?: string;
  referredToSpecialty?: string;
  referralType: ReferralType;
  priority: ReferralPriority;
  status: ReferralStatus;
  reason: string;
  clinicalNotes?: string;
  requestedDate?: Date;
  acceptedDate?: Date;
  completedDate?: Date;
  appointmentId?: string;
  medicalHistoryId?: string;
  attachments?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  accept(referredToDoctorId: string, notes?: string): Promise<void>;
  reject(reason: string): Promise<void>;
  complete(notes?: string): Promise<void>;
  cancel(reason?: string): Promise<void>;
}

export interface ReferralModel extends Model<ReferralDocument> {
  findByPatient(patientId: string, status?: ReferralStatus): Promise<ReferralDocument[]>;
  findByReferringDoctor(doctorId: string, status?: ReferralStatus): Promise<ReferralDocument[]>;
  findByReferredDoctor(doctorId: string, status?: ReferralStatus): Promise<ReferralDocument[]>;
  findPending(): Promise<ReferralDocument[]>;
  findOverdue(): Promise<ReferralDocument[]>;
}

const ReferralSchema = new Schema<ReferralDocument, ReferralModel>(
  {
    patientId: {
      type: String,
      required: [true, 'El ID del paciente es obligatorio'],
      index: true,
      trim: true,
    },
    patientName: {
      type: String,
      required: [true, 'El nombre del paciente es obligatorio'],
      trim: true,
    },
    referringDoctorId: {
      type: String,
      required: [true, 'El ID del doctor que refiere es obligatorio'],
      index: true,
      trim: true,
    },
    referringDoctorName: {
      type: String,
      required: [true, 'El nombre del doctor que refiere es obligatorio'],
      trim: true,
    },
    referredToDoctorId: {
      type: String,
      index: true,
      trim: true,
    },
    referredToDoctorName: {
      type: String,
      trim: true,
    },
    referredToSpecialty: {
      type: String,
      trim: true,
      index: true,
    },
    referralType: {
      type: String,
      enum: REFERRAL_TYPES,
      required: [true, 'El tipo de referido es obligatorio'],
      index: true,
    },
    priority: {
      type: String,
      enum: REFERRAL_PRIORITIES,
      default: 'medium',
      index: true,
    },
    status: {
      type: String,
      enum: REFERRAL_STATUSES,
      default: 'pending',
      index: true,
    },
    reason: {
      type: String,
      required: [true, 'La razón del referido es obligatoria'],
      trim: true,
      maxlength: [1000, 'La razón no puede exceder 1000 caracteres'],
    },
    clinicalNotes: {
      type: String,
      trim: true,
      maxlength: [5000, 'Las notas clínicas no pueden exceder 5000 caracteres'],
    },
    requestedDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    acceptedDate: {
      type: Date,
    },
    completedDate: {
      type: Date,
    },
    appointmentId: {
      type: String,
      trim: true,
      index: true,
    },
    medicalHistoryId: {
      type: String,
      trim: true,
      index: true,
    },
    attachments: {
      type: [String],
      default: [],
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret._id = ret._id.toString();
        return ret;
      },
    },
  }
);

// Indexes
ReferralSchema.index({ patientId: 1, status: 1 });
ReferralSchema.index({ referringDoctorId: 1, status: 1 });
ReferralSchema.index({ referredToDoctorId: 1, status: 1 });
ReferralSchema.index({ referralType: 1, status: 1 });
ReferralSchema.index({ priority: 1, status: 1 });
ReferralSchema.index({ requestedDate: 1 });
ReferralSchema.index({ createdAt: -1 });

// Methods
ReferralSchema.methods.accept = async function(
  referredToDoctorId: string,
  notes?: string
): Promise<void> {
  if (this.status !== 'pending') {
    throw new Error('Solo se pueden aceptar referidos pendientes');
  }
  
  this.status = 'accepted';
  this.referredToDoctorId = referredToDoctorId;
  this.acceptedDate = new Date();
  if (notes) {
    this.clinicalNotes = (this.clinicalNotes || '') + '\n\nAceptado: ' + notes;
  }
  await this.save();
};

ReferralSchema.methods.reject = async function(reason: string): Promise<void> {
  if (this.status !== 'pending') {
    throw new Error('Solo se pueden rechazar referidos pendientes');
  }
  
  this.status = 'rejected';
  this.clinicalNotes = (this.clinicalNotes || '') + '\n\nRechazado: ' + reason;
  await this.save();
};

ReferralSchema.methods.complete = async function(notes?: string): Promise<void> {
  if (this.status !== 'accepted' && this.status !== 'in_progress') {
    throw new Error('Solo se pueden completar referidos aceptados o en progreso');
  }
  
  this.status = 'completed';
  this.completedDate = new Date();
  if (notes) {
    this.clinicalNotes = (this.clinicalNotes || '') + '\n\nCompletado: ' + notes;
  }
  await this.save();
};

ReferralSchema.methods.cancel = async function(reason?: string): Promise<void> {
  if (this.status === 'completed' || this.status === 'cancelled') {
    throw new Error('No se puede cancelar un referido completado o ya cancelado');
  }
  
  this.status = 'cancelled';
  if (reason) {
    this.clinicalNotes = (this.clinicalNotes || '') + '\n\nCancelado: ' + reason;
  }
  await this.save();
};

// Static methods
ReferralSchema.statics.findByPatient = async function(
  patientId: string,
  status?: ReferralStatus
): Promise<ReferralDocument[]> {
  const query: any = { patientId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ createdAt: -1 });
};

ReferralSchema.statics.findByReferringDoctor = async function(
  doctorId: string,
  status?: ReferralStatus
): Promise<ReferralDocument[]> {
  const query: any = { referringDoctorId: doctorId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ createdAt: -1 });
};

ReferralSchema.statics.findByReferredDoctor = async function(
  doctorId: string,
  status?: ReferralStatus
): Promise<ReferralDocument[]> {
  const query: any = { referredToDoctorId: doctorId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ createdAt: -1 });
};

ReferralSchema.statics.findPending = async function(): Promise<ReferralDocument[]> {
  return this.find({ status: 'pending' }).sort({ priority: -1, createdAt: 1 });
};

ReferralSchema.statics.findOverdue = async function(): Promise<ReferralDocument[]> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  return this.find({
    status: { $in: ['pending', 'accepted'] },
    requestedDate: { $lt: sevenDaysAgo },
  }).sort({ priority: -1, requestedDate: 1 });
};

const ReferralModel = mongoose.model<ReferralDocument, ReferralModel>('Referral', ReferralSchema);

export default ReferralModel;

