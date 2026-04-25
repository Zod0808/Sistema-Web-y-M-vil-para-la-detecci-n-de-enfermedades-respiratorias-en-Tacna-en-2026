// AUTO-GENERATED - DO NOT EDIT MANUALLY
// Generated from MedicalHistoryEntity
// Generation date: 2025-10-22T17:57:39.610Z

import { Symptom } from '../../../domain/value-objects/Symptom';
import { Location } from '../../../domain/value-objects/Location';

/**
 * MedicalHistory Response DTO
 * Used for API responses
 */
export interface MedicalHistoryResponseDto {
  /** Unique history identifier */
  id: string;
  /** Patient identifier */
  patientId: string;
  /** Doctor identifier */
  doctorId: string;
  /** Patient name */
  patientName: string;
  /** Patient age */
  age: number;
  /** Medical diagnosis */
  diagnosis: string;
  /** List of symptoms */
  symptoms: Symptom[];
  /** Additional description */
  description?: string;
  /** History date */
  date: Date;
  /** Geographic location */
  location?: Location;
  /** Medical images URLs */
  images?: string[];
  /** Audio notes URL */
  audioNotes?: string;
  /** Created offline flag */
  isOffline: boolean;
  /** Sync status: pending, synced, error */
  syncStatus: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * MedicalHistory Response DTO Mapper
 */
export class MedicalHistoryResponseDtoMapper {
  /**
   * Map from domain entity to response DTO
   */
  static toDto(entity: any): MedicalHistoryResponseDto {
    return {
      id: entity.id,
      patientId: entity.patientId,
      doctorId: entity.doctorId,
      patientName: entity.patientName,
      age: entity.age,
      diagnosis: entity.diagnosis,
      symptoms: entity.symptoms,
      description: entity.description,
      date: entity.date,
      location: entity.location,
      images: entity.images,
      audioNotes: entity.audioNotes,
      isOffline: entity.isOffline,
      syncStatus: entity.syncStatus,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  /**
   * Map array of entities to DTOs
   */
  static toDtoArray(entities: any[]): MedicalHistoryResponseDto[] {
    return entities.map(entity => this.toDto(entity));
  }
}
