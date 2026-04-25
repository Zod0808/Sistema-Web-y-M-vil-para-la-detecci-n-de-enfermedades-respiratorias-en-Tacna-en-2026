/**
 * Wearable Data Model
 * Modelo para almacenar datos de wearables (HealthKit/Google Fit)
 */

import mongoose, { Schema, Document } from 'mongoose';
import { applyFieldEncryption } from '../utils/encryption';

export interface IWearableData extends Document {
  patientId: mongoose.Types.ObjectId;
  heartRate?: number; // BPM
  oxygenSaturation?: number; // SpO2 (%)
  steps?: number;
  distance?: number; // metros
  respiratoryRate?: number; // respiraciones por minuto
  sleepHours?: number;
  timestamp: Date;
  source: 'apple_health' | 'google_fit' | 'manual' | 'android_sensor';
  syncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WearableDataSchema: Schema = new Schema(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    heartRate: {
      type: Number,
      min: 0,
      max: 300
    },
    oxygenSaturation: {
      type: Number,
      min: 0,
      max: 100
    },
    steps: {
      type: Number,
      min: 0
    },
    distance: {
      type: Number,
      min: 0
    },
    respiratoryRate: {
      type: Number,
      min: 0,
      max: 100
    },
    sleepHours: {
      type: Number,
      min: 0,
      max: 24
    },
    timestamp: {
      type: Date,
      required: true,
      index: true
    },
    source: {
      type: String,
      enum: ['apple_health', 'google_fit', 'manual', 'android_sensor'],
      required: true
    },
    syncedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Índices para consultas eficientes
WearableDataSchema.index({ patientId: 1, timestamp: -1 });
WearableDataSchema.index({ timestamp: -1 });

// Cifrado en reposo para posibles metadatos sensibles en futuro y protección básica
applyFieldEncryption(WearableDataSchema, [
  // No ciframos métricas numéricas para analítica; solo si se agregan notas/campos libres
]);

const WearableData = mongoose.model<IWearableData>('WearableData', WearableDataSchema);

export default WearableData;
export { WearableData };
