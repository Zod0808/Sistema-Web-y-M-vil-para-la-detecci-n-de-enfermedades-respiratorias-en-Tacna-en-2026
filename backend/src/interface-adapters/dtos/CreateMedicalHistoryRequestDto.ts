// DTO para Solicitud de Crear Historial Médico - Capa de Interfaz
import { SymptomSeverity } from '../../domain/value-objects/Symptom';

export interface CreateMedicalHistoryRequestDto {
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

export class CreateMedicalHistoryRequestDtoValidator {
  static validate(dto: CreateMedicalHistoryRequestDto): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!dto.patientId || dto.patientId.trim().length === 0) {
      errors.push('El ID del paciente es requerido');
    }

    if (!dto.doctorId || dto.doctorId.trim().length === 0) {
      errors.push('El ID del doctor es requerido');
    }

    if (!dto.patientName || dto.patientName.trim().length === 0) {
      errors.push('El nombre del paciente es requerido');
    } else if (dto.patientName.length > 100) {
      errors.push('El nombre del paciente no puede exceder 100 caracteres');
    }

    if (dto.age < 0 || dto.age > 150) {
      errors.push('La edad debe estar entre 0 y 150 años');
    }

    if (!dto.diagnosis || dto.diagnosis.trim().length === 0) {
      errors.push('El diagnóstico es requerido');
    } else if (dto.diagnosis.length > 200) {
      errors.push('El diagnóstico no puede exceder 200 caracteres');
    }

    if (!dto.symptoms || dto.symptoms.length === 0) {
      errors.push('Al menos un síntoma es requerido');
    } else if (dto.symptoms.length > 20) {
      errors.push('No se pueden registrar más de 20 síntomas');
    } else {
      dto.symptoms.forEach((symptom, index) => {
        if (!symptom.name || symptom.name.trim().length === 0) {
          errors.push(`El nombre del síntoma ${index + 1} es requerido`);
        } else if (symptom.name.length > 100) {
          errors.push(`El nombre del síntoma ${index + 1} no puede exceder 100 caracteres`);
        }

        if (!symptom.severity || !Object.values(SymptomSeverity).includes(symptom.severity)) {
          errors.push(`La severidad del síntoma ${index + 1} debe ser mild, moderate o severe`);
        }

        if (!symptom.duration || symptom.duration.trim().length === 0) {
          errors.push(`La duración del síntoma ${index + 1} es requerida`);
        }

        if (symptom.description && symptom.description.length > 500) {
          errors.push(`La descripción del síntoma ${index + 1} no puede exceder 500 caracteres`);
        }
      });
    }

    if (dto.description && dto.description.length > 1000) {
      errors.push('La descripción no puede exceder 1000 caracteres');
    }

    if (dto.location) {
      if (dto.location.latitude < -90 || dto.location.latitude > 90) {
        errors.push('La latitud debe estar entre -90 y 90');
      }

      if (dto.location.longitude < -180 || dto.location.longitude > 180) {
        errors.push('La longitud debe estar entre -180 y 180');
      }

      if (!dto.location.address || dto.location.address.trim().length === 0) {
        errors.push('La dirección es requerida cuando se proporciona ubicación');
      } else if (dto.location.address.length > 200) {
        errors.push('La dirección no puede exceder 200 caracteres');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
