// AUTO-GENERATED - DO NOT EDIT MANUALLY
// Generated MongoDB Repository for AIAnalysisEntity
// Generation date: 2025-10-22T17:57:50.211Z

import { Injectable } from '@nestjs/common';
import { Model, Document } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { AIAnalysisEntity } from '@domain/entities/AIAnalysis';
import { AIAnalysisRepository } from '@domain/repositories/AIAnalysisRepository';

/**
 * MongoDB Document Interface
 */
interface AIAnalysisDocument extends Document {
  id: string;
  medicalHistoryId: string;
  analysisType: string;
  result: any;
  confidence: number;
  recommendations: string[];
  processedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * MongoDB Repository Implementation for AIAnalysis
 * Handles all transformations between AIAnalysisEntity (PIM) and AIAnalysisDocument (PSM)
 */
@Injectable()
export class MongoAIAnalysisRepository implements AIAnalysisRepository {
  
  constructor(
    @InjectModel('AIAnalysis') private readonly model: Model<AIAnalysisDocument>
  ) {}

  /**
   * Find by ID
   * Transforms: Document (PSM) → Entity (PIM)
   */
  async findById(id: string): Promise<AIAnalysisEntity | null> {
    const doc = await this.model.findById(id).exec();
    return doc ? this.toEntity(doc) : null;
  }

  /**
   * Find all
   * Transforms: Document[] (PSM) → Entity[] (PIM)
   */
  async findAll(): Promise<AIAnalysisEntity[]> {
    const docs = await this.model.find().exec();
    return docs.map(doc => this.toEntity(doc));
  }

  /**
   * Save entity
   * Transforms: Entity (PIM) → Document (PSM) → Entity (PIM)
   */
  async save(entity: AIAnalysisEntity): Promise<AIAnalysisEntity> {
    const doc = new this.model(this.toDocument(entity));
    const saved = await doc.save();
    return this.toEntity(saved);
  }

  /**
   * Update entity
   * Transforms: Entity (PIM) → Document (PSM) → Entity (PIM)
   */
  async update(entity: AIAnalysisEntity): Promise<AIAnalysisEntity> {
    const updated = await this.model.findByIdAndUpdate(
      entity.id,
      this.toDocument(entity),
      { new: true, runValidators: true }
    ).exec();
    
    if (!updated) {
      throw new Error(`AIAnalysis not found: ${entity.id}`);
    }
    
    return this.toEntity(updated);
  }

  /**
   * Delete entity (soft delete)
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { new: true }
    ).exec();
    
    return result !== null;
  }

  /**
   * Search entities
   */
  async search(query: any): Promise<AIAnalysisEntity[]> {
    const docs = await this.model.find(query).exec();
    return docs.map(doc => this.toEntity(doc));
  }

  /**
   * Count entities
   */
  async count(query: any = {}): Promise<number> {
    return this.model.countDocuments(query).exec();
  }

  /**
   * Transform Document (PSM) to Entity (PIM)
   * This is a Model-to-Model transformation
   */
  private toEntity(doc: AIAnalysisDocument): AIAnalysisEntity {
    return new AIAnalysisEntity(
      doc.id,
      doc.medicalHistoryId,
      doc.analysisType,
      doc.result ? { ...doc.result } : undefined,
      doc.confidence,
      doc.recommendations,
      doc.processedAt,
      doc.createdAt,
      doc.updatedAt
    );
  }

  /**
   * Transform Entity (PIM) to Document data (PSM)
   * This is a Model-to-Model transformation
   */
  private toDocument(entity: AIAnalysisEntity): Partial<AIAnalysisDocument> {
    return {
      _id: entity.id,
      id: entity.id,
      medicalHistoryId: entity.medicalHistoryId,
      analysisType: entity.analysisType,
      result: entity.result,
      confidence: entity.confidence,
      recommendations: entity.recommendations,
      processedAt: entity.processedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };
  }

  /**
   * Helper: Map complex types (Value Objects, nested objects)
   */
  private mapComplexType(data: any, fieldName: string): any {
    if (!data) return data;
    
    // Handle arrays
    if (Array.isArray(data)) {
      return data.map(item => this.mapComplexType(item, fieldName));
    }
    
    // Handle objects (Value Objects)
    if (typeof data === 'object' && data.constructor !== Date) {
      return { ...data };
    }
    
    return data;
  }
}

/**
 * Export for module registration
 */
export const AIAnalysisRepositoryProvider = {
  provide: 'AIAnalysisRepository',
  useClass: MongoAIAnalysisRepository
};
