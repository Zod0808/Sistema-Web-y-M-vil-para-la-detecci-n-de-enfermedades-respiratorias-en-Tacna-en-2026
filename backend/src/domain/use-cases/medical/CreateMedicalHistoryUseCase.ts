// Caso de Uso: Crear Historial Médico - Capa de Dominio
import { MedicalHistoryEntity, SyncStatus } from '../../entities/MedicalHistory';
import { MedicalHistoryRepository } from '../../repositories/MedicalHistoryRepository';
import { UserRepository } from '../../repositories/UserRepository';
import { SymptomValueObject, SymptomSeverity, Symptom } from '../../value-objects/Symptom';
import { LocationValueObject } from '../../value-objects/Location';

export interface CreateMedicalHistoryRequest {
  patientId: string;
  doctorId: string;
  patientName: string;
  age: number;
  diagnosis: string;
  symptoms: Array<{
    name: string;
    severity: SymptomSeverity;
    duration: string;
    description?: string;
  }>;
  description?: string;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  images?: string[];
  audioNotes?: string;
  isOffline?: boolean;
}

export interface CreateMedicalHistoryResponse {
  medicalHistory: MedicalHistoryEntity;
}

export class CreateMedicalHistoryUseCase {
  constructor(
    private medicalHistoryRepository: MedicalHistoryRepository,
    private userRepository: UserRepository
  ) {}

  async execute(request: CreateMedicalHistoryRequest): Promise<CreateMedicalHistoryResponse> {
    // Validar entrada
    this.validateRequest(request);

    // Verificar que el doctor existe y está activo
    const doctor = await this.userRepository.findById(request.doctorId);
    if (!doctor || !doctor.isActive) {
      throw new Error('Doctor no encontrado o inactivo');
    }

    // Verificar que el doctor puede crear historiales médicos
    if (!doctor.canAccessMedicalData()) {
      throw new Error('El usuario no tiene permisos para crear historiales médicos');
    }

    // Crear value objects para síntomas
    const symptoms = request.symptoms.map(symptom => {
      const symptomVO = new SymptomValueObject(
        symptom.name,
        symptom.severity,
        symptom.duration,
        symptom.description
      );
      return {
        name: symptomVO.name,
        severity: symptomVO.severity,
        duration: symptomVO.duration,
        description: symptomVO.description
      };
    });

    // Crear value object para ubicación si se proporciona
    let location: LocationValueObject | undefined;
    if (request.location) {
      location = new LocationValueObject(
        request.location.latitude,
        request.location.longitude,
        request.location.address
      );
    }

    // Crear entidad de historial médico
    const medicalHistory = new MedicalHistoryEntity(
      this.generateId(),
      request.patientId,
      request.doctorId,
      request.patientName,
      request.age,
      request.diagnosis,
      symptoms as Symptom[],
      request.description,
      new Date(),
      location,
      request.images,
      request.audioNotes,
      request.isOffline || false,
      request.isOffline ? SyncStatus.PENDING : SyncStatus.SYNCED
    );

    // Validar entidad
    if (!medicalHistory.isValid()) {
      throw new Error('Datos de historial médico inválidos');
    }

    // Guardar historial médico
    const savedMedicalHistory = await this.medicalHistoryRepository.save(medicalHistory);

    return {
      medicalHistory: savedMedicalHistory
    };
  }

  private validateRequest(request: CreateMedicalHistoryRequest): void {
    if (!request.patientId || request.patientId.trim().length === 0) {
      throw new Error('El ID del paciente es requerido');
    }

    if (!request.doctorId || request.doctorId.trim().length === 0) {
      throw new Error('El ID del doctor es requerido');
    }

    if (!request.patientName || request.patientName.trim().length === 0) {
      throw new Error('El nombre del paciente es requerido');
    }

    if (request.age < 0 || request.age > 150) {
      throw new Error('La edad debe estar entre 0 y 150 años');
    }

    if (!request.diagnosis || request.diagnosis.trim().length === 0) {
      throw new Error('El diagnóstico es requerido');
    }

    if (!request.symptoms || request.symptoms.length === 0) {
      throw new Error('Al menos un síntoma es requerido');
    }

    if (request.symptoms.length > 20) {
      throw new Error('No se pueden registrar más de 20 síntomas');
    }
  }

  private generateId(): string {
    return `medical_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
