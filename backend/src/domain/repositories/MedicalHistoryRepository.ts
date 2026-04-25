// Repositorio de Historial Médico - Capa de Dominio
import { MedicalHistoryEntity, MedicalHistory, SyncStatus } from '../entities/MedicalHistory';

export interface MedicalHistoryRepository {
  // Operaciones básicas
  findById(id: string): Promise<MedicalHistoryEntity | null>;
  findAll(): Promise<MedicalHistoryEntity[]>;
  save(medicalHistory: MedicalHistoryEntity): Promise<MedicalHistoryEntity>;
  update(medicalHistory: MedicalHistoryEntity): Promise<MedicalHistoryEntity>;
  delete(id: string): Promise<void>;

  // Operaciones específicas de negocio
  findByPatient(patientId: string): Promise<MedicalHistoryEntity[]>;
  findByDoctor(doctorId: string): Promise<MedicalHistoryEntity[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<MedicalHistoryEntity[]>;
  findByLocation(latitude: number, longitude: number, radiusKm: number): Promise<MedicalHistoryEntity[]>;
  
  // Sincronización
  findPendingSync(): Promise<MedicalHistoryEntity[]>;
  findBySyncStatus(status: SyncStatus): Promise<MedicalHistoryEntity[]>;
  findOfflineRecords(): Promise<MedicalHistoryEntity[]>;

  // Búsqueda y filtros
  searchByDiagnosis(diagnosis: string): Promise<MedicalHistoryEntity[]>;
  searchBySymptoms(symptoms: string[]): Promise<MedicalHistoryEntity[]>;
  findUrgentCases(): Promise<MedicalHistoryEntity[]>;

  // Estadísticas
  getStats(): Promise<{
    total: number;
    pendingSync: number;
    synced: number;
    errors: number;
    offline: number;
  }>;

  getTopDiagnoses(limit: number): Promise<Array<{ diagnosis: string; count: number }>>;
  getAgeStats(): Promise<Array<{ ageGroup: string; count: number; avgAge: number }>>;

  // Paginación
  findPaginated(page: number, limit: number, filters?: any): Promise<{
    medicalHistories: MedicalHistoryEntity[];
    total: number;
    pages: number;
  }>;

  // Agregaciones
  getCasesByMonth(): Promise<Array<{ month: string; count: number }>>;
  getCasesByLocation(): Promise<Array<{ location: string; count: number }>>;
}
