// Servicio de Historial Médico - Capa de Aplicación
import { MedicalHistoryEntity } from '../../domain/entities/MedicalHistory';
import { MedicalHistoryRepository } from '../../domain/repositories/MedicalHistoryRepository';
import { UserRepository } from '../../domain/repositories/UserRepository';
import { CreateMedicalHistoryUseCase } from '../../domain/use-cases/medical/CreateMedicalHistoryUseCase';
import { GetMedicalHistoryUseCase } from '../../domain/use-cases/medical/GetMedicalHistoryUseCase';
import { SymptomSeverity } from '../../domain/value-objects/Symptom';

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

export interface GetMedicalHistoryRequest {
  medicalHistoryId: string;
  userId: string;
  userRole: string;
}

export interface MedicalHistoryResponse {
  medicalHistory: MedicalHistoryEntity;
}

export interface MedicalHistoryListResponse {
  medicalHistories: MedicalHistoryEntity[];
  total: number;
  pages: number;
}

export class MedicalHistoryService {
  constructor(
    private medicalHistoryRepository: MedicalHistoryRepository,
    private userRepository: UserRepository
  ) {}

  async createMedicalHistory(request: CreateMedicalHistoryRequest): Promise<MedicalHistoryResponse> {
    const useCase = new CreateMedicalHistoryUseCase(
      this.medicalHistoryRepository,
      this.userRepository
    );

    return await useCase.execute(request);
  }

  async getMedicalHistory(request: GetMedicalHistoryRequest): Promise<MedicalHistoryResponse> {
    const useCase = new GetMedicalHistoryUseCase(
      this.medicalHistoryRepository,
      this.userRepository
    );

    return await useCase.execute(request);
  }

  async getMedicalHistoriesByPatient(
    patientId: string, 
    userId: string, 
    userRole: string,
    page: number = 1,
    limit: number = 10
  ): Promise<MedicalHistoryListResponse> {
    // Verificar permisos
    if (userRole === 'patient' && patientId !== userId) {
      throw new Error('No tienes permisos para ver estos historiales médicos');
    }

    const medicalHistories = await this.medicalHistoryRepository.findByPatient(patientId);
    const total = medicalHistories.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedHistories = medicalHistories.slice(startIndex, endIndex);

    return {
      medicalHistories: paginatedHistories,
      total,
      pages: Math.ceil(total / limit)
    };
  }

  async getMedicalHistoriesByDoctor(
    doctorId: string,
    userId: string,
    userRole: string,
    page: number = 1,
    limit: number = 10
  ): Promise<MedicalHistoryListResponse> {
    // Verificar permisos
    if (userRole === 'doctor' && doctorId !== userId) {
      throw new Error('No tienes permisos para ver estos historiales médicos');
    }

    const medicalHistories = await this.medicalHistoryRepository.findByDoctor(doctorId);
    const total = medicalHistories.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedHistories = medicalHistories.slice(startIndex, endIndex);

    return {
      medicalHistories: paginatedHistories,
      total,
      pages: Math.ceil(total / limit)
    };
  }

  async getAllMedicalHistories(
    userRole: string,
    page: number = 1,
    limit: number = 10,
    filters?: any
  ): Promise<MedicalHistoryListResponse> {
    // Solo administradores pueden ver todos los historiales
    if (userRole !== 'admin') {
      throw new Error('No tienes permisos para ver todos los historiales médicos');
    }

    const result = await this.medicalHistoryRepository.findPaginated(page, limit, filters);
    return {
      medicalHistories: result.medicalHistories,
      total: result.total,
      pages: result.pages
    };
  }

  async searchMedicalHistories(
    query: string,
    userId: string,
    userRole: string,
    page: number = 1,
    limit: number = 10
  ): Promise<MedicalHistoryListResponse> {
    let medicalHistories: MedicalHistoryEntity[] = [];

    if (userRole === 'admin') {
      // Los administradores pueden buscar en todos los historiales
      medicalHistories = await this.medicalHistoryRepository.searchByDiagnosis(query);
    } else if (userRole === 'doctor') {
      // Los doctores pueden buscar en sus propios historiales
      const doctorHistories = await this.medicalHistoryRepository.findByDoctor(userId);
      medicalHistories = doctorHistories.filter(history => 
        history.diagnosis.toLowerCase().includes(query.toLowerCase()) ||
        history.patientName.toLowerCase().includes(query.toLowerCase())
      );
    } else if (userRole === 'patient') {
      // Los pacientes pueden buscar en sus propios historiales
      const patientHistories = await this.medicalHistoryRepository.findByPatient(userId);
      medicalHistories = patientHistories.filter(history => 
        history.diagnosis.toLowerCase().includes(query.toLowerCase())
      );
    }

    const total = medicalHistories.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedHistories = medicalHistories.slice(startIndex, endIndex);

    return {
      medicalHistories: paginatedHistories,
      total,
      pages: Math.ceil(total / limit)
    };
  }

  async getUrgentCases(userId: string, userRole: string): Promise<MedicalHistoryEntity[]> {
    // Solo doctores y administradores pueden ver casos urgentes
    if (userRole !== 'doctor' && userRole !== 'admin') {
      throw new Error('No tienes permisos para ver casos urgentes');
    }

    let medicalHistories: MedicalHistoryEntity[] = [];

    if (userRole === 'admin') {
      medicalHistories = await this.medicalHistoryRepository.findUrgentCases();
    } else {
      const doctorHistories = await this.medicalHistoryRepository.findByDoctor(userId);
      medicalHistories = doctorHistories.filter(history => history.isUrgent());
    }

    return medicalHistories;
  }

  async getPendingSyncRecords(userRole: string): Promise<MedicalHistoryEntity[]> {
    // Solo administradores pueden ver registros pendientes de sincronización
    if (userRole !== 'admin') {
      throw new Error('No tienes permisos para ver registros pendientes de sincronización');
    }

    return await this.medicalHistoryRepository.findPendingSync();
  }

  async syncMedicalHistory(medicalHistoryId: string): Promise<MedicalHistoryEntity> {
    const medicalHistory = await this.medicalHistoryRepository.findById(medicalHistoryId);
    if (!medicalHistory) {
      throw new Error('Historial médico no encontrado');
    }

    const syncedMedicalHistory = medicalHistory.markAsSynced();
    return await this.medicalHistoryRepository.update(syncedMedicalHistory);
  }

  async getStatistics(userRole: string): Promise<any> {
    // Solo administradores pueden ver estadísticas globales
    if (userRole !== 'admin') {
      throw new Error('No tienes permisos para ver estadísticas');
    }

    const stats = await this.medicalHistoryRepository.getStats();
    const topDiagnoses = await this.medicalHistoryRepository.getTopDiagnoses(10);
    const ageStats = await this.medicalHistoryRepository.getAgeStats();

    return {
      ...stats,
      topDiagnoses,
      ageStats
    };
  }
}
