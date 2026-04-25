// AUTO-GENERATED - DO NOT EDIT MANUALLY
// Generated from MedicalHistoryEntity
// Generation date: 2025-10-22T17:57:39.610Z

import { IsString, IsNotEmpty, IsEmail, IsOptional, IsBoolean, IsNumber, MinLength, MaxLength, Min, Max } from 'class-validator';
import { Symptom } from '../../../domain/value-objects/Symptom';
import { Location } from '../../../domain/value-objects/Location';

/**
 * Create MedicalHistory Request DTO
 * Used for creating new medicalhistory records
 */
export class CreateMedicalHistoryRequestDto {
  /** Patient identifier */
  @IsNotEmpty()
  @IsString()
  patientId!: string;
  /** Doctor identifier */
  @IsNotEmpty()
  @IsString()
  doctorId!: string;
  /** Patient name */
  @IsNotEmpty()
  @IsString()
  patientName!: string;
  /** Patient age */
  @IsNumber()
  @Min(0)
  @Max(150)
  age!: number;
  /** Medical diagnosis */
  @IsNotEmpty()
  @IsString()
  diagnosis!: string;
  /** List of symptoms */
  symptoms!: Symptom[];
  /** Additional description */
  @IsString()
  @IsOptional()
  description?: string;
  /** History date */
  @IsOptional()
  date?: Date;
  /** Geographic location */
  @IsOptional()
  location?: Location;
  /** Medical images URLs */
  @IsOptional()
  images?: string[];
  /** Audio notes URL */
  @IsString()
  @IsOptional()
  audioNotes?: string;
  /** Created offline flag */
  @IsBoolean()
  @IsOptional()
  isOffline?: boolean;
  /** Sync status: pending, synced, error */
  @IsString()
  @IsOptional()
  syncStatus?: string;
}

/**
 * Update MedicalHistory Request DTO
 * Used for updating existing medicalhistory records
 */
export class UpdateMedicalHistoryRequestDto {
  /** Patient identifier */
  @IsString()
  @IsOptional()
  patientId?: string;
  /** Doctor identifier */
  @IsString()
  @IsOptional()
  doctorId?: string;
  /** Patient name */
  @IsString()
  @IsOptional()
  patientName?: string;
  /** Patient age */
  @IsNumber()
  @Min(0)
  @Max(150)
  @IsOptional()
  age?: number;
  /** Medical diagnosis */
  @IsString()
  @IsOptional()
  diagnosis?: string;
  /** List of symptoms */
  @IsOptional()
  symptoms?: Symptom[];
  /** Additional description */
  @IsString()
  @IsOptional()
  description?: string;
  /** History date */
  @IsOptional()
  date?: Date;
  /** Geographic location */
  @IsOptional()
  location?: Location;
  /** Medical images URLs */
  @IsOptional()
  images?: string[];
  /** Audio notes URL */
  @IsString()
  @IsOptional()
  audioNotes?: string;
  /** Created offline flag */
  @IsBoolean()
  @IsOptional()
  isOffline?: boolean;
  /** Sync status: pending, synced, error */
  @IsString()
  @IsOptional()
  syncStatus?: string;
}

/**
 * MedicalHistory Request DTO Mapper
 */
export class MedicalHistoryRequestDtoMapper {
  /**
   * Validate and map from request DTO to domain data
   */
  static toDomainData(dto: CreateMedicalHistoryRequestDto): any {
    return {
      patientId: dto.patientId,
      doctorId: dto.doctorId,
      patientName: dto.patientName,
      age: dto.age,
      diagnosis: dto.diagnosis,
      symptoms: dto.symptoms,
      description: dto.description,
      date: dto.date,
      location: dto.location,
      images: dto.images,
      audioNotes: dto.audioNotes,
      isOffline: dto.isOffline,
      syncStatus: dto.syncStatus,
    };
  }
}
