// Entidad de Historial Médico - Capa de Dominio
import { Symptom } from '../value-objects/Symptom';
import { Location } from '../value-objects/Location';

export interface MedicalHistory {
  id: string;
  patientId: string;
  doctorId: string;
  patientName: string;
  age: number;
  diagnosis: string;
  symptoms: Symptom[];
  description?: string;
  date: Date;
  location?: Location;
  images?: string[];
  audioNotes?: string;
  isOffline: boolean;
  syncStatus: SyncStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum SyncStatus {
  PENDING = 'pending',
  SYNCED = 'synced',
  ERROR = 'error'
}

export class MedicalHistoryEntity {
  constructor(
    public readonly id: string,
    public readonly patientId: string,
    public readonly doctorId: string,
    public readonly patientName: string,
    public readonly age: number,
    public readonly diagnosis: string,
    public readonly symptoms: Symptom[],
    public readonly description?: string,
    public readonly date: Date = new Date(),
    public readonly location?: Location,
    public readonly images?: string[],
    public readonly audioNotes?: string,
    public readonly isOffline: boolean = false,
    public readonly syncStatus: SyncStatus = SyncStatus.PENDING,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date()
  ) {}

  // Métodos de negocio
  public isUrgent(): boolean {
    return this.symptoms.some(symptom => symptom.severity === 'severe');
  }

  public hasLocation(): boolean {
    return this.location !== undefined;
  }

  public isSynced(): boolean {
    return this.syncStatus === SyncStatus.SYNCED;
  }

  public needsSync(): boolean {
    return this.syncStatus === SyncStatus.PENDING || this.syncStatus === SyncStatus.ERROR;
  }

  public canBeEdited(): boolean {
    return this.syncStatus !== SyncStatus.SYNCED || this.isOffline;
  }

  public markAsSynced(): MedicalHistoryEntity {
    return new MedicalHistoryEntity(
      this.id,
      this.patientId,
      this.doctorId,
      this.patientName,
      this.age,
      this.diagnosis,
      this.symptoms,
      this.description,
      this.date,
      this.location,
      this.images,
      this.audioNotes,
      this.isOffline,
      SyncStatus.SYNCED,
      this.createdAt,
      new Date()
    );
  }

  public markAsError(): MedicalHistoryEntity {
    return new MedicalHistoryEntity(
      this.id,
      this.patientId,
      this.doctorId,
      this.patientName,
      this.age,
      this.diagnosis,
      this.symptoms,
      this.description,
      this.date,
      this.location,
      this.images,
      this.audioNotes,
      this.isOffline,
      SyncStatus.ERROR,
      this.createdAt,
      new Date()
    );
  }

  public addSymptom(symptom: Symptom): MedicalHistoryEntity {
    if (this.symptoms.length >= 20) {
      throw new Error('No se pueden agregar más de 20 síntomas');
    }
    
    return new MedicalHistoryEntity(
      this.id,
      this.patientId,
      this.doctorId,
      this.patientName,
      this.age,
      this.diagnosis,
      [...this.symptoms, symptom],
      this.description,
      this.date,
      this.location,
      this.images,
      this.audioNotes,
      this.isOffline,
      this.syncStatus,
      this.createdAt,
      new Date()
    );
  }

  public updateDiagnosis(diagnosis: string): MedicalHistoryEntity {
    return new MedicalHistoryEntity(
      this.id,
      this.patientId,
      this.doctorId,
      this.patientName,
      this.age,
      diagnosis,
      this.symptoms,
      this.description,
      this.date,
      this.location,
      this.images,
      this.audioNotes,
      this.isOffline,
      this.syncStatus,
      this.createdAt,
      new Date()
    );
  }

  public addImage(imageUrl: string): MedicalHistoryEntity {
    const images = this.images || [];
    return new MedicalHistoryEntity(
      this.id,
      this.patientId,
      this.doctorId,
      this.patientName,
      this.age,
      this.diagnosis,
      this.symptoms,
      this.description,
      this.date,
      this.location,
      [...images, imageUrl],
      this.audioNotes,
      this.isOffline,
      this.syncStatus,
      this.createdAt,
      new Date()
    );
  }

  public setLocation(location: Location): MedicalHistoryEntity {
    return new MedicalHistoryEntity(
      this.id,
      this.patientId,
      this.doctorId,
      this.patientName,
      this.age,
      this.diagnosis,
      this.symptoms,
      this.description,
      this.date,
      location,
      this.images,
      this.audioNotes,
      this.isOffline,
      this.syncStatus,
      this.createdAt,
      new Date()
    );
  }

  // Validaciones de negocio
  public validateAge(): boolean {
    return this.age >= 0 && this.age <= 150;
  }

  public validateDiagnosis(): boolean {
    return this.diagnosis.trim().length > 0 && this.diagnosis.length <= 200;
  }

  public validatePatientName(): boolean {
    return this.patientName.trim().length > 0 && this.patientName.length <= 100;
  }

  public validateDescription(): boolean {
    return !this.description || this.description.length <= 1000;
  }

  public isValid(): boolean {
    return this.validateAge() && 
           this.validateDiagnosis() && 
           this.validatePatientName() && 
           this.validateDescription() &&
           this.symptoms.length <= 20;
  }
}
