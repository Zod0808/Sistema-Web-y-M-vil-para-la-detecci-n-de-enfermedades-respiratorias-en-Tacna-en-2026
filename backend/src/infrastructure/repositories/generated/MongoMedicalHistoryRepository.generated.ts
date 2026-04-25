// AUTO-GENERATED - DO NOT EDIT MANUALLY
// Generated MongoDB Repository for MedicalHistoryEntity
// Generation date: 2025-10-22T17:57:50.211Z

import { Injectable } from '@nestjs/common';
import { Model, Document } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { MedicalHistoryEntity } from '@domain/entities/MedicalHistory';
import { MedicalHistoryRepository } from '@domain/repositories/MedicalHistoryRepository';

/**
 * MongoDB Document Interface
 */
interface MedicalHistoryDocument extends Document {
  id: string;
  patientId: string;
  doctorId: string;
  patientName: string;
  age: number;
  diagnosis: string;
  symptoms: any[];
  description: string;
  date: Date;
  location: any;
  images: string[];
  audioNotes: string;
  isOffline: boolean;
  syncStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * MongoDB Repository Implementation for MedicalHistory
 * Handles all transformations between MedicalHistoryEntity (PIM) and MedicalHistoryDocument (PSM)
 */
@Injectable()
export class MongoMedicalHistoryRepository implements MedicalHistoryRepository {
  
  constructor(
    @InjectModel('MedicalHistory') private readonly model: Model<MedicalHistoryDocument>
  ) {}

  /**
   * Find by ID
   * Transforms: Document (PSM) → Entity (PIM)
   */
  async findById(id: string): Promise<MedicalHistoryEntity | null> {
    const doc = await this.model.findById(id).exec();
    return doc ? this.toEntity(doc) : null;
  }

  /**
   * Find all
   * Transforms: Document[] (PSM) → Entity[] (PIM)
   */
  async findAll(): Promise<MedicalHistoryEntity[]> {
    const docs = await this.model.find().exec();
    return docs.map(doc => this.toEntity(doc));
  }

  /**
   * Save entity
   * Transforms: Entity (PIM) → Document (PSM) → Entity (PIM)
   */
  async save(entity: MedicalHistoryEntity): Promise<MedicalHistoryEntity> {
    const doc = new this.model(this.toDocument(entity));
    const saved = await doc.save();
    return this.toEntity(saved);
  }

  /**
   * Update entity
   * Transforms: Entity (PIM) → Document (PSM) → Entity (PIM)
   */
  async update(entity: MedicalHistoryEntity): Promise<MedicalHistoryEntity> {
    const updated = await this.model.findByIdAndUpdate(
      entity.id,
      this.toDocument(entity),
      { new: true, runValidators: true }
    ).exec();
    
    if (!updated) {
      throw new Error(`MedicalHistory not found: ${entity.id}`);
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
  async search(query: any): Promise<MedicalHistoryEntity[]> {
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
  private toEntity(doc: MedicalHistoryDocument): MedicalHistoryEntity {
    return new MedicalHistoryEntity(
      doc.id,
      doc.patientId,
      doc.doctorId,
      doc.patientName,
      doc.age,
      doc.diagnosis,
      doc.symptoms.map((item: any) => ({ ...item })),
      doc.description,
      doc.date,
      doc.location ? { ...doc.location } : undefined,
      doc.images,
      doc.audioNotes,
      doc.isOffline,
      doc.syncStatus,
      doc.createdAt,
      doc.updatedAt
    );
  }

  /**
   * Transform Entity (PIM) to Document data (PSM)
   * This is a Model-to-Model transformation
   */
  private toDocument(entity: MedicalHistoryEntity): Partial<MedicalHistoryDocument> {
    return {
      _id: entity.id,
      id: entity.id,
      patientId: entity.patientId,
      doctorId: entity.doctorId,
      patientName: entity.patientName,
      age: entity.age,
      diagnosis: entity.diagnosis,
      symptoms: entity.symptoms,
      description: entity.description,
      date: entity.date,
      location: entity.location,
      images: entity.images,
      audioNotes: entity.audioNotes,
      isOffline: entity.isOffline,
      syncStatus: entity.syncStatus,
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
export const MedicalHistoryRepositoryProvider = {
  provide: 'MedicalHistoryRepository',
  useClass: MongoMedicalHistoryRepository
};
