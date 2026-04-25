import mongoose, { Document, Model, Schema } from 'mongoose';
import { applyFieldEncryption } from '../utils/encryption';

export type ConsentStatus = 
  | 'draft'
  | 'pending_signature'
  | 'signed'
  | 'revoked'
  | 'expired';

export type ConsentType = 
  | 'procedure'
  | 'treatment'
  | 'surgery'
  | 'research'
  | 'data_sharing'
  | 'photography'
  | 'video_recording'
  | 'other';

const CONSENT_STATUSES: ConsentStatus[] = [
  'draft',
  'pending_signature',
  'signed',
  'revoked',
  'expired',
];

const CONSENT_TYPES: ConsentType[] = [
  'procedure',
  'treatment',
  'surgery',
  'research',
  'data_sharing',
  'photography',
  'video_recording',
  'other',
];

export interface ElectronicSignature {
  signerId: string;
  signerName: string;
  signerRole: 'patient' | 'doctor' | 'witness' | 'guardian';
  signatureData: string; // Base64 encoded signature image or hash
  signatureMethod: 'digital' | 'biometric' | 'click_to_sign' | 'typed';
  signedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  certificateHash?: string; // Hash del certificado digital si aplica
}

export interface InformedConsentDocument extends Document {
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  consentType: ConsentType;
  title: string;
  description: string;
  procedureDetails?: string;
  risks?: string[];
  benefits?: string[];
  alternatives?: string[];
  status: ConsentStatus;
  version: string;
  language: string;
  
  // Firma electrónica
  signatures: ElectronicSignature[];
  patientSignature?: ElectronicSignature;
  doctorSignature?: ElectronicSignature;
  witnessSignature?: ElectronicSignature;
  guardianSignature?: ElectronicSignature;
  
  // Fechas
  presentedAt?: Date;
  signedAt?: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  revokedReason?: string;
  
  // Relaciones
  appointmentId?: string;
  medicalHistoryId?: string;
  procedureId?: string;
  
  // Metadata
  attachments?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  addSignature(signature: Omit<ElectronicSignature, 'signedAt'>): Promise<void>;
  revoke(reason: string, revokedBy: string): Promise<void>;
  isSigned(): boolean;
  isExpired(): boolean;
  canBeSigned(): boolean;
}

export interface InformedConsentModel extends Model<InformedConsentDocument> {
  findByPatient(patientId: string, status?: ConsentStatus): Promise<InformedConsentDocument[]>;
  findByDoctor(doctorId: string, status?: ConsentStatus): Promise<InformedConsentDocument[]>;
  findPendingSignatures(patientId?: string): Promise<InformedConsentDocument[]>;
  findExpired(): Promise<InformedConsentDocument[]>;
  findSignedByPatient(patientId: string): Promise<InformedConsentDocument[]>;
}

const ElectronicSignatureSchema = new Schema(
  {
    signerId: {
      type: String,
      required: true,
      trim: true,
    },
    signerName: {
      type: String,
      required: true,
      trim: true,
    },
    signerRole: {
      type: String,
      enum: ['patient', 'doctor', 'witness', 'guardian'],
      required: true,
    },
    signatureData: {
      type: String,
      required: true,
    },
    signatureMethod: {
      type: String,
      enum: ['digital', 'biometric', 'click_to_sign', 'typed'],
      required: true,
    },
    signedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    certificateHash: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const InformedConsentSchema = new Schema<InformedConsentDocument, InformedConsentModel>(
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
    doctorId: {
      type: String,
      required: [true, 'El ID del doctor es obligatorio'],
      index: true,
      trim: true,
    },
    doctorName: {
      type: String,
      required: [true, 'El nombre del doctor es obligatorio'],
      trim: true,
    },
    consentType: {
      type: String,
      enum: CONSENT_TYPES,
      required: [true, 'El tipo de consentimiento es obligatorio'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'El título es obligatorio'],
      trim: true,
      maxlength: [200, 'El título no puede exceder 200 caracteres'],
    },
    description: {
      type: String,
      required: [true, 'La descripción es obligatoria'],
      trim: true,
      maxlength: [5000, 'La descripción no puede exceder 5000 caracteres'],
    },
    procedureDetails: {
      type: String,
      trim: true,
      maxlength: [10000, 'Los detalles del procedimiento no pueden exceder 10000 caracteres'],
    },
    risks: {
      type: [String],
      default: [],
    },
    benefits: {
      type: [String],
      default: [],
    },
    alternatives: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: CONSENT_STATUSES,
      default: 'draft',
      index: true,
    },
    version: {
      type: String,
      required: true,
      default: '1.0',
    },
    language: {
      type: String,
      default: 'es',
      trim: true,
    },
    signatures: {
      type: [ElectronicSignatureSchema],
      default: [],
    },
    patientSignature: {
      type: ElectronicSignatureSchema,
    },
    doctorSignature: {
      type: ElectronicSignatureSchema,
    },
    witnessSignature: {
      type: ElectronicSignatureSchema,
    },
    guardianSignature: {
      type: ElectronicSignatureSchema,
    },
    presentedAt: {
      type: Date,
      index: true,
    },
    signedAt: {
      type: Date,
      index: true,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    revokedAt: {
      type: Date,
    },
    revokedReason: {
      type: String,
      trim: true,
      maxlength: [1000, 'La razón de revocación no puede exceder 1000 caracteres'],
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
    procedureId: {
      type: String,
      trim: true,
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
InformedConsentSchema.index({ patientId: 1, status: 1 });
InformedConsentSchema.index({ doctorId: 1, status: 1 });
InformedConsentSchema.index({ consentType: 1, status: 1 });
InformedConsentSchema.index({ signedAt: -1 });
InformedConsentSchema.index({ expiresAt: 1 });
InformedConsentSchema.index({ createdAt: -1 });

// Methods
InformedConsentSchema.methods.addSignature = async function(
  signature: Omit<ElectronicSignature, 'signedAt'>
): Promise<void> {
  const fullSignature: ElectronicSignature = {
    ...signature,
    signedAt: new Date(),
  };

  this.signatures.push(fullSignature);

  // Asignar a campo específico según el rol
  if (signature.signerRole === 'patient') {
    this.patientSignature = fullSignature;
    this.status = 'signed';
    this.signedAt = new Date();
  } else if (signature.signerRole === 'doctor') {
    this.doctorSignature = fullSignature;
  } else if (signature.signerRole === 'witness') {
    this.witnessSignature = fullSignature;
  } else if (signature.signerRole === 'guardian') {
    this.guardianSignature = fullSignature;
  }

  await this.save();
};

InformedConsentSchema.methods.revoke = async function(
  reason: string,
  revokedBy: string
): Promise<void> {
  if (this.status === 'revoked') {
    throw new Error('El consentimiento ya está revocado');
  }

  this.status = 'revoked';
  this.revokedAt = new Date();
  this.revokedReason = reason;
  this.metadata = {
    ...this.metadata,
    revokedBy,
    revokedAt: new Date(),
  };

  await this.save();
};

InformedConsentSchema.methods.isSigned = function(): boolean {
  return this.status === 'signed' && !!this.patientSignature;
};

InformedConsentSchema.methods.isExpired = function(): boolean {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

InformedConsentSchema.methods.canBeSigned = function(): boolean {
  return this.status === 'pending_signature' && !this.isExpired() && !this.isSigned();
};

// Static methods
InformedConsentSchema.statics.findByPatient = async function(
  patientId: string,
  status?: ConsentStatus
): Promise<InformedConsentDocument[]> {
  const query: any = { patientId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ createdAt: -1 });
};

InformedConsentSchema.statics.findByDoctor = async function(
  doctorId: string,
  status?: ConsentStatus
): Promise<InformedConsentDocument[]> {
  const query: any = { doctorId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ createdAt: -1 });
};

InformedConsentSchema.statics.findPendingSignatures = async function(
  patientId?: string
): Promise<InformedConsentDocument[]> {
  const query: any = { status: 'pending_signature' };
  if (patientId) {
    query.patientId = patientId;
  }
  return this.find(query).sort({ createdAt: 1 });
};

InformedConsentSchema.statics.findExpired = async function(): Promise<InformedConsentDocument[]> {
  return this.find({
    status: { $in: ['pending_signature', 'signed'] },
    expiresAt: { $lt: new Date() },
  });
};

InformedConsentSchema.statics.findSignedByPatient = async function(
  patientId: string
): Promise<InformedConsentDocument[]> {
  return this.find({
    patientId,
    status: 'signed',
  }).sort({ signedAt: -1 });
};

// Cifrado de campos sensibles
applyFieldEncryption(InformedConsentSchema, [
  'description',
  'procedureDetails',
  'revokedReason',
]);

const InformedConsentModel = mongoose.model<InformedConsentDocument, InformedConsentModel>(
  'InformedConsent',
  InformedConsentSchema
);

export default InformedConsentModel;

