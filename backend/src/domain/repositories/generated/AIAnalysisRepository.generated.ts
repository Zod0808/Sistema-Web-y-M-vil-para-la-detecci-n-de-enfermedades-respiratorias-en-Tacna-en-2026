// AUTO-GENERATED - DO NOT EDIT MANUALLY
// Generated Repository Interface for AIAnalysisEntity
// Generation date: 2025-10-22T17:57:50.212Z

import { AIAnalysisEntity } from '../../entities/AIAnalysis';

/**
 * Repository interface for AIAnalysis
 * Defines contract for data access (Platform Independent)
 */
export interface AIAnalysisRepository {
  /**
   * Find entity by ID
   */
  findById(id: string): Promise<AIAnalysisEntity | null>;

  /**
   * Find all entities
   */
  findAll(): Promise<AIAnalysisEntity[]>;

  /**
   * Save new entity
   */
  save(entity: AIAnalysisEntity): Promise<AIAnalysisEntity>;

  /**
   * Update existing entity
   */
  update(entity: AIAnalysisEntity): Promise<AIAnalysisEntity>;

  /**
   * Delete entity (soft delete)
   */
  delete(id: string): Promise<boolean>;

  /**
   * Search entities by criteria
   */
  search(query: any): Promise<AIAnalysisEntity[]>;

  /**
   * Count entities matching criteria
   */
  count(query?: any): Promise<number>;
}
