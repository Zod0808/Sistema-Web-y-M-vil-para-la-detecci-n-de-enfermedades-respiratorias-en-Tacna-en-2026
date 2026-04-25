// AUTO-GENERATED - DO NOT EDIT MANUALLY
// Generated MongoDB Repository for UserEntity
// Generation date: 2025-10-22T17:57:50.209Z

import { Injectable } from '@nestjs/common';
import { Model, Document } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { UserEntity } from '@domain/entities/User';
import { UserRepository } from '@domain/repositories/UserRepository';

/**
 * MongoDB Document Interface
 */
interface UserDocument extends Document {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  avatar: string;
  isActive: boolean;
  lastLogin: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * MongoDB Repository Implementation for User
 * Handles all transformations between UserEntity (PIM) and UserDocument (PSM)
 */
@Injectable()
export class MongoUserRepository implements UserRepository {
  
  constructor(
    @InjectModel('User') private readonly model: Model<UserDocument>
  ) {}

  /**
   * Find by ID
   * Transforms: Document (PSM) → Entity (PIM)
   */
  async findById(id: string): Promise<UserEntity | null> {
    const doc = await this.model.findById(id).exec();
    return doc ? this.toEntity(doc) : null;
  }

  /**
   * Find all
   * Transforms: Document[] (PSM) → Entity[] (PIM)
   */
  async findAll(): Promise<UserEntity[]> {
    const docs = await this.model.find().exec();
    return docs.map(doc => this.toEntity(doc));
  }

  /**
   * Save entity
   * Transforms: Entity (PIM) → Document (PSM) → Entity (PIM)
   */
  async save(entity: UserEntity): Promise<UserEntity> {
    const doc = new this.model(this.toDocument(entity));
    const saved = await doc.save();
    return this.toEntity(saved);
  }

  /**
   * Update entity
   * Transforms: Entity (PIM) → Document (PSM) → Entity (PIM)
   */
  async update(entity: UserEntity): Promise<UserEntity> {
    const updated = await this.model.findByIdAndUpdate(
      entity.id,
      this.toDocument(entity),
      { new: true, runValidators: true }
    ).exec();
    
    if (!updated) {
      throw new Error(`User not found: ${entity.id}`);
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
  async search(query: any): Promise<UserEntity[]> {
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
  private toEntity(doc: UserDocument): UserEntity {
    return new UserEntity(
      doc.id,
      doc.name,
      doc.email,
      doc.password,
      doc.role,
      doc.avatar,
      doc.isActive,
      doc.lastLogin,
      doc.createdAt,
      doc.updatedAt
    );
  }

  /**
   * Transform Entity (PIM) to Document data (PSM)
   * This is a Model-to-Model transformation
   */
  private toDocument(entity: UserEntity): Partial<UserDocument> {
    return {
      _id: entity.id,
      id: entity.id,
      name: entity.name,
      email: entity.email,
      password: entity.password,
      role: entity.role,
      avatar: entity.avatar,
      isActive: entity.isActive,
      lastLogin: entity.lastLogin,
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
export const UserRepositoryProvider = {
  provide: 'UserRepository',
  useClass: MongoUserRepository
};
