/**
 * Repository Generator - Automatic Repository generation from Domain Entities
 * Part of MDSD improvements - Reduces manual transformation code
 */

import * as fs from 'fs';
import * as path from 'path';

interface EntityConfig {
  name: string;
  fields: Array<{
    name: string;
    type: string;
    isArray?: boolean;
    isObject?: boolean;
  }>;
  hasLocation?: boolean;
  hasSymptoms?: boolean;
}

export class RepositoryGenerator {
  private readonly outputDir: string;

  constructor(outputDir: string = 'src/infrastructure/repositories/generated') {
    this.outputDir = outputDir;
  }

  /**
   * Generate complete repository from entity config
   */
  async generateRepository(config: EntityConfig): Promise<void> {
    const { name } = config;

    this.ensureDirectoryExists(this.outputDir);

    await this.generateMongoRepository(config);
    await this.generateRepositoryInterface(config);

    console.log(`✅ Generated repository for ${name}`);
  }

  /**
   * Generate MongoDB Repository Implementation
   */
  private async generateMongoRepository(config: EntityConfig): Promise<void> {
    const { name, fields } = config;
    
    const content = `// AUTO-GENERATED - DO NOT EDIT MANUALLY
// Generated MongoDB Repository for ${name}Entity
// Generation date: ${new Date().toISOString()}

import { Injectable } from '@nestjs/common';
import { Model, Document } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { ${name}Entity } from '@domain/entities/${name}';
import { ${name}Repository } from '@domain/repositories/${name}Repository';

/**
 * MongoDB Document Interface
 */
interface ${name}Document extends Document {
${fields.map(f => `  ${f.name}: ${this.mapTypeToMongoose(f.type, f.isArray)};`).join('\n')}
  createdAt: Date;
  updatedAt: Date;
}

/**
 * MongoDB Repository Implementation for ${name}
 * Handles all transformations between ${name}Entity (PIM) and ${name}Document (PSM)
 */
@Injectable()
export class Mongo${name}Repository implements ${name}Repository {
  
  constructor(
    @InjectModel('${name}') private readonly model: Model<${name}Document>
  ) {}

  /**
   * Find by ID
   * Transforms: Document (PSM) → Entity (PIM)
   */
  async findById(id: string): Promise<${name}Entity | null> {
    const doc = await this.model.findById(id).exec();
    return doc ? this.toEntity(doc) : null;
  }

  /**
   * Find all
   * Transforms: Document[] (PSM) → Entity[] (PIM)
   */
  async findAll(): Promise<${name}Entity[]> {
    const docs = await this.model.find().exec();
    return docs.map(doc => this.toEntity(doc));
  }

  /**
   * Save entity
   * Transforms: Entity (PIM) → Document (PSM) → Entity (PIM)
   */
  async save(entity: ${name}Entity): Promise<${name}Entity> {
    const doc = new this.model(this.toDocument(entity));
    const saved = await doc.save();
    return this.toEntity(saved);
  }

  /**
   * Update entity
   * Transforms: Entity (PIM) → Document (PSM) → Entity (PIM)
   */
  async update(entity: ${name}Entity): Promise<${name}Entity> {
    const updated = await this.model.findByIdAndUpdate(
      entity.id,
      this.toDocument(entity),
      { new: true, runValidators: true }
    ).exec();
    
    if (!updated) {
      throw new Error(\`${name} not found: \${entity.id}\`);
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
  async search(query: any): Promise<${name}Entity[]> {
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
  private toEntity(doc: ${name}Document): ${name}Entity {
    return new ${name}Entity(
${fields.map(f => this.generateToEntityField(f)).join(',\n')}${fields.length > 0 ? ',' : ''}
      doc.createdAt,
      doc.updatedAt
    );
  }

  /**
   * Transform Entity (PIM) to Document data (PSM)
   * This is a Model-to-Model transformation
   */
  private toDocument(entity: ${name}Entity): Partial<${name}Document> {
    return {
      _id: entity.id,
${fields.map(f => `      ${f.name}: entity.${f.name},`).join('\n')}
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
export const ${name}RepositoryProvider = {
  provide: '${name}Repository',
  useClass: Mongo${name}Repository
};
`;

    const filePath = path.join(this.outputDir, `Mongo${name}Repository.generated.ts`);
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  /**
   * Generate Repository Interface
   */
  private async generateRepositoryInterface(config: EntityConfig): Promise<void> {
    const { name } = config;
    
    const content = `// AUTO-GENERATED - DO NOT EDIT MANUALLY
// Generated Repository Interface for ${name}Entity
// Generation date: ${new Date().toISOString()}

import { ${name}Entity } from '@domain/entities/${name}';

/**
 * Repository interface for ${name}
 * Defines contract for data access (Platform Independent)
 */
export interface ${name}Repository {
  /**
   * Find entity by ID
   */
  findById(id: string): Promise<${name}Entity | null>;

  /**
   * Find all entities
   */
  findAll(): Promise<${name}Entity[]>;

  /**
   * Save new entity
   */
  save(entity: ${name}Entity): Promise<${name}Entity>;

  /**
   * Update existing entity
   */
  update(entity: ${name}Entity): Promise<${name}Entity>;

  /**
   * Delete entity (soft delete)
   */
  delete(id: string): Promise<boolean>;

  /**
   * Search entities by criteria
   */
  search(query: any): Promise<${name}Entity[]>;

  /**
   * Count entities matching criteria
   */
  count(query?: any): Promise<number>;
}
`;

    const interfaceDir = path.join('src/domain/repositories/generated');
    this.ensureDirectoryExists(interfaceDir);
    
    const filePath = path.join(interfaceDir, `${name}Repository.generated.ts`);
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  /**
   * Generate field mapping for toEntity
   */
  private generateToEntityField(field: any): string {
    if (field.isArray && field.isObject) {
      return `      doc.${field.name}.map((item: any) => ({ ...item }))`;
    } else if (field.isObject) {
      return `      doc.${field.name} ? { ...doc.${field.name} } : undefined`;
    } else {
      return `      doc.${field.name}`;
    }
  }

  /**
   * Map TypeScript type to Mongoose type
   */
  private mapTypeToMongoose(type: string, isArray?: boolean): string {
    const mongooseType = {
      'string': 'string',
      'number': 'number',
      'boolean': 'boolean',
      'Date': 'Date',
      'any': 'any'
    }[type] || 'any';

    return isArray ? `${mongooseType}[]` : mongooseType;
  }

  /**
   * Ensure directory exists
   */
  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
}

/**
 * CLI for Repository generation
 */
export async function generateAllRepositories(): Promise<void> {
  const generator = new RepositoryGenerator();

  console.log('🚀 Generating repositories from domain models...\n');

  // User Repository
  await generator.generateRepository({
    name: 'User',
    fields: [
      { name: 'id', type: 'string' },
      { name: 'name', type: 'string' },
      { name: 'email', type: 'string' },
      { name: 'password', type: 'string' },
      { name: 'role', type: 'string' },
      { name: 'avatar', type: 'string' },
      { name: 'isActive', type: 'boolean' },
      { name: 'lastLogin', type: 'Date' },
    ]
  });

  // MedicalHistory Repository
  await generator.generateRepository({
    name: 'MedicalHistory',
    fields: [
      { name: 'id', type: 'string' },
      { name: 'patientId', type: 'string' },
      { name: 'doctorId', type: 'string' },
      { name: 'patientName', type: 'string' },
      { name: 'age', type: 'number' },
      { name: 'diagnosis', type: 'string' },
      { name: 'symptoms', type: 'any', isArray: true, isObject: true },
      { name: 'description', type: 'string' },
      { name: 'date', type: 'Date' },
      { name: 'location', type: 'any', isObject: true },
      { name: 'images', type: 'string', isArray: true },
      { name: 'audioNotes', type: 'string' },
      { name: 'isOffline', type: 'boolean' },
      { name: 'syncStatus', type: 'string' },
    ],
    hasLocation: true,
    hasSymptoms: true
  });

  // AIAnalysis Repository
  await generator.generateRepository({
    name: 'AIAnalysis',
    fields: [
      { name: 'id', type: 'string' },
      { name: 'medicalHistoryId', type: 'string' },
      { name: 'analysisType', type: 'string' },
      { name: 'result', type: 'any', isObject: true },
      { name: 'confidence', type: 'number' },
      { name: 'recommendations', type: 'string', isArray: true },
      { name: 'processedAt', type: 'Date' },
    ]
  });

  console.log('\n✅ All repositories generated successfully!');
  console.log('📁 Output directory: src/infrastructure/repositories/generated/');
  console.log('📋 Remember to register providers in your modules!\n');
}

// Run if executed directly
if (require.main === module) {
  generateAllRepositories().catch(console.error);
}

