import mongoose, { Schema, Document, Model } from 'mongoose';

export interface AuditLogDocument extends Document {
  userId?: string;
  method: string;
  route: string;
  statusCode: number;
  ip: string;
  userAgent?: string;
  payloadHash?: string;
  redactedPayload?: Record<string, unknown>;
  createdAt: Date;
}

const AuditLogSchema = new Schema<AuditLogDocument>({
  userId: { type: String, index: true },
  method: { type: String, required: true },
  route: { type: String, required: true, index: true },
  statusCode: { type: Number, required: true },
  ip: { type: String, required: true },
  userAgent: { type: String },
  payloadHash: { type: String },
  redactedPayload: { type: Object },
  createdAt: { type: Date, default: Date.now }
});

AuditLogSchema.index({ createdAt: -1 });

export const AuditLog: Model<AuditLogDocument> =
  mongoose.models.AuditLog || mongoose.model<AuditLogDocument>('AuditLog', AuditLogSchema);


