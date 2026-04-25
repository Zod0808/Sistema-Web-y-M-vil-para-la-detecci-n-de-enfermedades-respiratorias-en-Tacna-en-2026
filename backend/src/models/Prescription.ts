import mongoose, { Document, Model, Schema } from 'mongoose';
import {
  DrugInteraction,
  Prescription as IPrescription,
  PrescriptionMedication,
  PrescriptionStatus,
} from '../types';
import { applyFieldEncryption } from '../utils/encryption';

const PRESCRIPTION_STATUSES: PrescriptionStatus[] = [
  'draft',
  'pending_validation',
  'active',
  'completed',
  'cancelled',
  'rejected',
];

const MedicationSchema = new Schema<PrescriptionMedication>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    dosage: {
      type: String,
      required: true,
      trim: true,
    },
    form: {
      type: String,
      trim: true,
    },
    frequencyPerDay: {
      type: Number,
      required: true,
      min: [1, 'La frecuencia mínima es 1 vez por día'],
      max: [12, 'La frecuencia máxima es 12 veces por día'],
    },
    durationDays: {
      type: Number,
      required: true,
      min: [1, 'La duración mínima es 1 día'],
      max: [365, 'La duración máxima es 365 días'],
    },
    startDate: {
      type: Date,
    },
    instructions: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    reminderTimes: {
      type: [String],
      default: [],
    },
    smartDosage: {
      recommended: {
        type: String,
        trim: true,
      },
      rationale: {
        type: String,
        trim: true,
      },
    },
  },
  { _id: false }
);

const InteractionSchema = new Schema<DrugInteraction>(
  {
    medicationA: {
      type: String,
      required: true,
      trim: true,
    },
    medicationB: {
      type: String,
      required: true,
      trim: true,
    },
    severity: {
      type: String,
      enum: ['minor', 'moderate', 'major', 'contraindicated'],
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

export interface PrescriptionDocument extends Omit<IPrescription, '_id'>, Document {
  markCompleted(notes?: string): Promise<void>;
  cancel(reason?: string): Promise<void>;
  addValidation(doctorId: string, notes?: string): Promise<void>;
}

export interface PrescriptionModel extends Model<PrescriptionDocument> {
  findByPatient(patientId: string): Promise<PrescriptionDocument[]>;
  findByDoctor(doctorId: string): Promise<PrescriptionDocument[]>;
}

const PrescriptionSchema = new Schema<PrescriptionDocument, PrescriptionModel>(
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
    diagnosis: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    observations: {
      type: String,
      trim: true,
      maxlength: 4000,
    },
    medications: {
      type: [MedicationSchema],
      validate: {
        validator(value: PrescriptionMedication[]) {
          return value.length > 0 && value.length <= 20;
        },
        message: 'Debe incluir entre 1 y 20 medicamentos en la prescripción',
      },
    },
    interactions: {
      type: [InteractionSchema],
      default: [],
    },
    status: {
      type: String,
      enum: PRESCRIPTION_STATUSES,
      default: 'pending_validation',
      index: true,
    },
    validatedBy: {
      type: String,
      trim: true,
    },
    validatedAt: {
      type: Date,
    },
    validationNotes: {
      type: String,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Cifrado en reposo para textos clínicos sensibles
applyFieldEncryption(PrescriptionSchema, [
  'diagnosis',
  'observations',
  'validationNotes'
]);

PrescriptionSchema.index({ patientId: 1, createdAt: -1 });
PrescriptionSchema.index({ doctorId: 1, createdAt: -1 });

PrescriptionSchema.methods.markCompleted = async function markCompleted(this: PrescriptionDocument, notes?: string) {
  this.status = 'completed';
  if (notes) {
    this.validationNotes = `${this.validationNotes ? `${this.validationNotes}\n` : ''}${notes}`;
  }
  await this.save();
};

PrescriptionSchema.methods.cancel = async function cancel(this: PrescriptionDocument, reason?: string) {
  this.status = 'cancelled';
  if (reason) {
    this.validationNotes = `${this.validationNotes ? `${this.validationNotes}\n` : ''}Cancelación: ${reason}`;
  }
  await this.save();
};

PrescriptionSchema.methods.addValidation = async function addValidation(
  this: PrescriptionDocument,
  doctorId: string,
  notes?: string
) {
  this.status = 'active';
  this.validatedBy = doctorId;
  this.validatedAt = new Date();
  if (notes) {
    this.validationNotes = notes;
  }
  await this.save();
};

PrescriptionSchema.statics.findByPatient = function findByPatient(
  this: PrescriptionModel,
  patientId: string
) {
  return this.find({ patientId }).sort({ createdAt: -1 }).limit(200).exec();
};

PrescriptionSchema.statics.findByDoctor = function findByDoctor(
  this: PrescriptionModel,
  doctorId: string
) {
  return this.find({ doctorId }).sort({ createdAt: -1 }).limit(200).exec();
};

export const PrescriptionModel: PrescriptionModel =
  (mongoose.models.Prescription as PrescriptionModel) ??
  mongoose.model<PrescriptionDocument, PrescriptionModel>('Prescription', PrescriptionSchema);

export default PrescriptionModel;

