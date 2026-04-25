import mongoose, { Schema, Document, Model } from 'mongoose';
import { applyFieldEncryption } from '../utils/encryption';

/**
 * Modelo para resultados de laboratorio
 * Almacena resultados de exámenes de laboratorio con soporte para alertas y análisis
 */

export interface ILabResult {
  patientId: string;
  testName: string;
  testCode: string; // LOINC code
  value: string | number;
  unit: string;
  referenceRange?: {
    low?: number;
    high?: number;
    text?: string;
  };
  status: 'normal' | 'abnormal' | 'critical';
  date: Date;
  laboratoryId?: string;
  laboratoryName?: string;
  orderId?: string; // ID de la orden de laboratorio
  notes?: string;
  flagged?: boolean; // Si requiere atención médica
  reviewedBy?: string; // ID del médico que revisó
  reviewedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface LabResultDocument extends Omit<ILabResult, '_id'>, Document {
  _id: mongoose.Types.ObjectId;
  isAbnormal(): boolean;
  isCritical(): boolean;
  markAsReviewed(doctorId: string): Promise<void>;
  flagForReview(reason?: string): Promise<void>;
}

export interface LabResultModel extends Model<LabResultDocument> {
  findByPatient(patientId: string, startDate?: Date, endDate?: Date): Promise<LabResultDocument[]>;
  findAbnormal(patientId: string, startDate?: Date, endDate?: Date): Promise<LabResultDocument[]>;
  findCritical(patientId: string, startDate?: Date, endDate?: Date): Promise<LabResultDocument[]>;
  findByTestCode(testCode: string, patientId?: string): Promise<LabResultDocument[]>;
  getLatestByTestCode(patientId: string, testCode: string): Promise<LabResultDocument | null>;
}

const LabResultSchema = new Schema<LabResultDocument, LabResultModel>(
  {
    patientId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    testName: {
      type: String,
      required: true,
      trim: true,
    },
    testCode: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    value: {
      type: Schema.Types.Mixed, // Puede ser string o number
      required: true,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    referenceRange: {
      low: Number,
      high: Number,
      text: String,
    },
    status: {
      type: String,
      enum: ['normal', 'abnormal', 'critical'],
      required: true,
      default: 'normal',
      index: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    laboratoryId: {
      type: String,
      trim: true,
      index: true,
    },
    laboratoryName: {
      type: String,
      trim: true,
    },
    orderId: {
      type: String,
      trim: true,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    flagged: {
      type: Boolean,
      default: false,
      index: true,
    },
    reviewedBy: {
      type: String,
      trim: true,
    },
    reviewedAt: {
      type: Date,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

// Índices compuestos para búsquedas eficientes
LabResultSchema.index({ patientId: 1, date: -1 });
LabResultSchema.index({ patientId: 1, testCode: 1, date: -1 });
LabResultSchema.index({ patientId: 1, status: 1, date: -1 });
LabResultSchema.index({ flagged: 1, reviewedBy: 1 });

// Cifrado de campos sensibles
applyFieldEncryption(LabResultSchema, ['notes']);

// Métodos de instancia
LabResultSchema.methods.isAbnormal = function (): boolean {
  return this.status === 'abnormal' || this.status === 'critical';
};

LabResultSchema.methods.isCritical = function (): boolean {
  return this.status === 'critical';
};

LabResultSchema.methods.markAsReviewed = async function (doctorId: string): Promise<void> {
  this.reviewedBy = doctorId;
  this.reviewedAt = new Date();
  this.flagged = false;
  await this.save();
};

LabResultSchema.methods.flagForReview = async function (reason?: string): Promise<void> {
  this.flagged = true;
  if (reason) {
    this.notes = this.notes ? `${this.notes}\n[Flagged: ${reason}]` : `[Flagged: ${reason}]`;
  }
  await this.save();
};

// Métodos estáticos
LabResultSchema.statics.findByPatient = async function (
  patientId: string,
  startDate?: Date,
  endDate?: Date,
): Promise<LabResultDocument[]> {
  const query: any = { patientId };
  
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = startDate;
    if (endDate) query.date.$lte = endDate;
  }

  return this.find(query).sort({ date: -1 });
};

LabResultSchema.statics.findAbnormal = async function (
  patientId: string,
  startDate?: Date,
  endDate?: Date,
): Promise<LabResultDocument[]> {
  const query: any = {
    patientId,
    status: { $in: ['abnormal', 'critical'] },
  };

  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = startDate;
    if (endDate) query.date.$lte = endDate;
  }

  return this.find(query).sort({ date: -1 });
};

LabResultSchema.statics.findCritical = async function (
  patientId: string,
  startDate?: Date,
  endDate?: Date,
): Promise<LabResultDocument[]> {
  const query: any = {
    patientId,
    status: 'critical',
  };

  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = startDate;
    if (endDate) query.date.$lte = endDate;
  }

  return this.find(query).sort({ date: -1 });
};

LabResultSchema.statics.findByTestCode = async function (
  testCode: string,
  patientId?: string,
): Promise<LabResultDocument[]> {
  const query: any = { testCode };
  if (patientId) {
    query.patientId = patientId;
  }
  return this.find(query).sort({ date: -1 });
};

LabResultSchema.statics.getLatestByTestCode = async function (
  patientId: string,
  testCode: string,
): Promise<LabResultDocument | null> {
  return this.findOne({ patientId, testCode }).sort({ date: -1 });
};

export const LabResult = mongoose.model<LabResultDocument, LabResultModel>('LabResult', LabResultSchema);

