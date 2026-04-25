// AUTO-GENERATED - DO NOT EDIT MANUALLY
// Generated Repository Interface for MedicalHistoryEntity
// Generation date: 2025-10-22T17:57:50.211Z

import { MedicalHistoryEntity } from '../../entities/MedicalHistory';

/**
 * Repository interface for MedicalHistory
 * Defines contract for data access (Platform Independent)
 */
export interface MedicalHistoryRepository {
  /**
   * Find entity by ID
   */
  findById(id: string): Promise<MedicalHistoryEntity | null>;

  /**
   * Find all entities
   */
  findAll(): Promise<MedicalHistoryEntity[]>;

  /**
   * Save new entity
   */
  save(entity: MedicalHistoryEntity): Promise<MedicalHistoryEntity>;

  /**
   * Update existing entity
   */
  update(entity: MedicalHistoryEntity): Promise<MedicalHistoryEntity>;

  /**
   * Delete entity (soft delete)
   */
  delete(id: string): Promise<boolean>;

  /**
   * Search entities by criteria
   */
  search(query: any): Promise<MedicalHistoryEntity[]>;

  /**
   * Count entities matching criteria
   */
  count(query?: any): Promise<number>;
}
