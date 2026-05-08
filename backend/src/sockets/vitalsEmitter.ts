import { EventEmitter } from 'events';

export interface VitalsReading {
  patientId: string;
  heartRate?: number;
  oxygenSaturation?: number;
  respiratoryRate?: number;
  steps?: number;
  timestamp: string;
}

// Singleton bus: wearableSocketHandler emits here,
// doctorSocketHandler listens here.
export const vitalsEmitter = new EventEmitter();
vitalsEmitter.setMaxListeners(100);
