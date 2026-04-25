/**
 * Consent Log Model
 *
 * Modelo para registrar logs de consentimiento de usuarios (GDPR/HIPAA)
 */

import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ConsentLogDocument extends Document {
  userId: string;
  consents: Array<{
    id: string;
    accepted: boolean;
    timestamp: Date;
  }>;
  version: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  revokedAt?: Date;
  revokedReason?: string;
}

interface ConsentLogModel extends Model<ConsentLogDocument> {
  getLatestConsent(userId: string): Promise<ConsentLogDocument | null>;
  revokeConsent(userId: string, reason?: string): Promise<unknown>;
}

const ConsentLogSchema = new Schema<ConsentLogDocument>(
  {
    userId: {
      type: String,
      required: [true, 'El ID del usuario es obligatorio'],
      index: true,
    },
    consents: [
      {
        id: { type: String, required: true },
        accepted: { type: Boolean, required: true },
        timestamp: { type: Date, required: true },
      },
    ],
    version: {
      type: String,
      required: [true, 'La versión del consentimiento es obligatoria'],
      default: '1.0',
    },
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true },
    timestamp: { type: Date, required: true, default: Date.now },
    revokedAt: { type: Date },
    revokedReason: {
      type: String,
      trim: true,
      maxlength: [500, 'La razón de revocación no puede exceder 500 caracteres'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Índices
ConsentLogSchema.index({ userId: 1, timestamp: -1 });
ConsentLogSchema.index({ timestamp: -1 });

ConsentLogSchema.statics.getLatestConsent = function (userId: string) {
  return this.findOne({ userId, revokedAt: { $exists: false } })
    .sort({ timestamp: -1 })
    .exec();
};

ConsentLogSchema.statics.revokeConsent = function (userId: string, reason?: string) {
  return this.updateMany(
    { userId, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date(), revokedReason: reason || 'Revocado por el usuario' } }
  ).exec();
};

export default mongoose.model<ConsentLogDocument, ConsentLogModel>('ConsentLog', ConsentLogSchema);