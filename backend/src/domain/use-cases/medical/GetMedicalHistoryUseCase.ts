// Caso de Uso: Obtener Historial Médico - Capa de Dominio
import { MedicalHistoryEntity } from '../../entities/MedicalHistory';
import { MedicalHistoryRepository } from '../../repositories/MedicalHistoryRepository';
import { UserRepository } from '../../repositories/UserRepository';

export interface GetMedicalHistoryRequest {
  medicalHistoryId: string;
  userId: string;
  userRole: string;
}

export interface GetMedicalHistoryResponse {
  medicalHistory: MedicalHistoryEntity;
}

export class GetMedicalHistoryUseCase {
  constructor(
    private medicalHistoryRepository: MedicalHistoryRepository,
    private userRepository: UserRepository
  ) {}

  async execute(request: GetMedicalHistoryRequest): Promise<GetMedicalHistoryResponse> {
    // Validar entrada
    if (!request.medicalHistoryId || !request.userId) {
      throw new Error('ID de historial médico y usuario son requeridos');
    }

    // Buscar historial médico
    const medicalHistory = await this.medicalHistoryRepository.findById(request.medicalHistoryId);
    if (!medicalHistory) {
      throw new Error('Historial médico no encontrado');
    }

    // Verificar permisos de acceso
    await this.verifyAccess(medicalHistory, request.userId, request.userRole);

    return {
      medicalHistory
    };
  }

  private async verifyAccess(
    medicalHistory: MedicalHistoryEntity, 
    userId: string, 
    userRole: string
  ): Promise<void> {
    // Verificar que el usuario existe
    const user = await this.userRepository.findById(userId);
    if (!user || !user.isActive) {
      throw new Error('Usuario no encontrado o inactivo');
    }

    // Verificar permisos según el rol
    if (userRole === 'admin') {
      // Los administradores pueden acceder a todos los historiales
      return;
    }

    if (userRole === 'doctor') {
      // Los doctores pueden acceder a sus propios historiales
      if (medicalHistory.doctorId === userId) {
        return;
      }
      throw new Error('No tienes permisos para acceder a este historial médico');
    }

    if (userRole === 'patient') {
      // Los pacientes pueden acceder solo a sus propios historiales
      if (medicalHistory.patientId === userId) {
        return;
      }
      throw new Error('No tienes permisos para acceder a este historial médico');
    }

    throw new Error('Rol de usuario no válido');
  }
}
