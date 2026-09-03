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
    return this.clone({ syncStatus: SyncStatus.SYNCED });
  }

  public markAsError(): MedicalHistoryEntity {
    return this.clone({ syncStatus: SyncStatus.ERROR });
  }

  public addSymptom(symptom: Symptom): MedicalHistoryEntity {
    if (this.symptoms.length >= 20) {
      throw new Error('No se pueden agregar más de 20 síntomas');
    }

    return this.clone({ symptoms: [...this.symptoms, symptom] });
  }

  public updateDiagnosis(diagnosis: string): MedicalHistoryEntity {
    return this.clone({ diagnosis });
  }

  public addImage(imageUrl: string): MedicalHistoryEntity {
    const images = this.images || [];
    return this.clone({ images: [...images, imageUrl] });
  }

  public setLocation(location: Location): MedicalHistoryEntity {
    return this.clone({ location });
  }

  // Crea una copia con los campos indicados sobrescritos; updatedAt siempre se refresca.
  private clone(overrides: Partial<Omit<MedicalHistory, 'id' | 'createdAt'>>): MedicalHistoryEntity {
    return new MedicalHistoryEntity(
      this.id,
      this.patientId,
      this.doctorId,
      overrides.patientName ?? this.patientName,
      overrides.age ?? this.age,
      overrides.diagnosis ?? this.diagnosis,
      overrides.symptoms ?? this.symptoms,
      overrides.description ?? this.description,
      overrides.date ?? this.date,
      overrides.location ?? this.location,
      overrides.images ?? this.images,
      overrides.audioNotes ?? this.audioNotes,
      overrides.isOffline ?? this.isOffline,
      overrides.syncStatus ?? this.syncStatus,
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
