/**
 * DTO Generator - Automatic DTO generation from Domain Entities
 * Part of MDSD improvements
 */

import * as fs from 'fs';
import * as path from 'path';

interface FieldConfig {
  name: string;
  type: string;
  optional?: boolean;
  exclude?: boolean;
  description?: string;
}

interface DtoConfig {
  entityName: string;
  fields: FieldConfig[];
  generateRequest?: boolean;
  generateResponse?: boolean;
  excludeFromResponse?: string[];
  requiredInRequest?: string[];
}

export class DtoGenerator {
  private readonly outputDir: string;

  constructor(outputDir: string = 'src/interface-adapters/dtos/generated') {
    this.outputDir = outputDir;
  }

  /**
   * Generate DTOs from configuration
   */
  async generateDtos(config: DtoConfig): Promise<void> {
    const { entityName, generateRequest = true, generateResponse = true } = config;

    // Ensure output directory exists
    this.ensureDirectoryExists(this.outputDir);

    if (generateResponse) {
      await this.generateResponseDto(config);
    }

    if (generateRequest) {
      await this.generateRequestDto(config);
    }

    console.log(`✅ Generated DTOs for ${entityName}`);
  }

  /**
   * Generate Response DTO
   */
  private async generateResponseDto(config: DtoConfig): Promise<void> {
    const { entityName, fields, excludeFromResponse = [] } = config;
    
    const filteredFields = fields.filter(f => !excludeFromResponse.includes(f.name));
    
    const content = `// AUTO-GENERATED - DO NOT EDIT MANUALLY
// Generated from ${entityName}Entity
// Generation date: ${new Date().toISOString()}

/**
 * ${entityName} Response DTO
 * Used for API responses
 */
export interface ${entityName}ResponseDto {
${filteredFields.map(f => this.generateFieldDeclaration(f)).join('\n')}
}

/**
 * ${entityName} Response DTO Mapper
 */
export class ${entityName}ResponseDtoMapper {
  /**
   * Map from domain entity to response DTO
   */
  static toDto(entity: any): ${entityName}ResponseDto {
    return {
${filteredFields.map(f => `      ${f.name}: entity.${f.name},`).join('\n')}
    };
  }

  /**
   * Map array of entities to DTOs
   */
  static toDtoArray(entities: any[]): ${entityName}ResponseDto[] {
    return entities.map(entity => this.toDto(entity));
  }
}
`;

    const filePath = path.join(this.outputDir, `${entityName}ResponseDto.generated.ts`);
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  /**
   * Generate Request DTO
   */
  private async generateRequestDto(config: DtoConfig): Promise<void> {
    const { entityName, fields, requiredInRequest = [] } = config;
    
    // Exclude system fields from request
    const requestFields = fields.filter(f => 
      !['id', 'createdAt', 'updatedAt'].includes(f.name)
    );
    
    const content = `// AUTO-GENERATED - DO NOT EDIT MANUALLY
// Generated from ${entityName}Entity
// Generation date: ${new Date().toISOString()}

import { IsString, IsNotEmpty, IsEmail, IsOptional, IsBoolean, IsNumber, MinLength, MaxLength, Min, Max } from 'class-validator';

/**
 * Create ${entityName} Request DTO
 * Used for creating new ${entityName.toLowerCase()} records
 */
export class Create${entityName}RequestDto {
${requestFields.map(f => this.generateRequestField(f, requiredInRequest)).join('\n')}
}

/**
 * Update ${entityName} Request DTO
 * Used for updating existing ${entityName.toLowerCase()} records
 */
export class Update${entityName}RequestDto {
${requestFields.map(f => this.generateRequestField(f, requiredInRequest, true)).join('\n')}
}

/**
 * ${entityName} Request DTO Mapper
 */
export class ${entityName}RequestDtoMapper {
  /**
   * Validate and map from request DTO to domain data
   */
  static toDomainData(dto: Create${entityName}RequestDto): any {
    return {
${requestFields.map(f => `      ${f.name}: dto.${f.name},`).join('\n')}
    };
  }
}
`;

    const filePath = path.join(this.outputDir, `${entityName}RequestDto.generated.ts`);
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  /**
   * Generate field declaration for interface
   */
  private generateFieldDeclaration(field: FieldConfig): string {
    const optional = field.optional ? '?' : '';
    const description = field.description ? `  /** ${field.description} */\n` : '';
    return `${description}  ${field.name}${optional}: ${field.type};`;
  }

  /**
   * Generate field with class-validator decorators
   */
  private generateRequestField(
    field: FieldConfig, 
    required: string[], 
    allOptional: boolean = false
  ): string {
    const isRequired = required.includes(field.name) && !allOptional;
    const decorators: string[] = [];
    
    // Add description if available
    if (field.description) {
      decorators.push(`  /** ${field.description} */`);
    }
    
    // Add validators based on type
    if (field.type === 'string') {
      if (!allOptional && isRequired) {
        decorators.push('  @IsNotEmpty()');
      }
      decorators.push('  @IsString()');
      
      // Special validation for email
      if (field.name === 'email') {
        decorators.push('  @IsEmail()');
      }
      
      // Add length validations if specified
      if (field.name === 'password' && isRequired) {
        decorators.push('  @MinLength(8)');
      }
    } else if (field.type === 'number') {
      decorators.push('  @IsNumber()');
      
      // Special validation for age
      if (field.name === 'age') {
        decorators.push('  @Min(0)');
        decorators.push('  @Max(150)');
      }
    } else if (field.type === 'boolean') {
      decorators.push('  @IsBoolean()');
    }
    
    // Add @IsOptional if not required
    if (allOptional || !isRequired) {
      decorators.push('  @IsOptional()');
    }
    
    const optional = (allOptional || !isRequired) ? '?' : '';
    const fieldDeclaration = `  ${field.name}${optional}: ${field.type};`;
    
    return decorators.length > 0 
      ? decorators.join('\n') + '\n' + fieldDeclaration
      : fieldDeclaration;
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
 * CLI for DTO generation
 */
export async function generateAllDtos(): Promise<void> {
  const generator = new DtoGenerator();

  // User DTOs
  await generator.generateDtos({
    entityName: 'User',
    fields: [
      { name: 'id', type: 'string', description: 'Unique user identifier' },
      { name: 'name', type: 'string', description: 'User full name' },
      { name: 'email', type: 'string', description: 'User email address' },
      { name: 'password', type: 'string', description: 'User password (hashed)' },
      { name: 'role', type: 'string', description: 'User role: patient, doctor, admin' },
      { name: 'avatar', type: 'string', optional: true, description: 'Avatar URL' },
      { name: 'isActive', type: 'boolean', description: 'Account active status' },
      { name: 'lastLogin', type: 'Date', optional: true, description: 'Last login timestamp' },
      { name: 'createdAt', type: 'Date', description: 'Creation timestamp' },
      { name: 'updatedAt', type: 'Date', description: 'Last update timestamp' },
    ],
    excludeFromResponse: ['password'],
    requiredInRequest: ['name', 'email', 'password', 'role'],
  });

  // MedicalHistory DTOs
  await generator.generateDtos({
    entityName: 'MedicalHistory',
    fields: [
      { name: 'id', type: 'string', description: 'Unique history identifier' },
      { name: 'patientId', type: 'string', description: 'Patient identifier' },
      { name: 'doctorId', type: 'string', description: 'Doctor identifier' },
      { name: 'patientName', type: 'string', description: 'Patient name' },
      { name: 'age', type: 'number', description: 'Patient age' },
      { name: 'diagnosis', type: 'string', description: 'Medical diagnosis' },
      { name: 'symptoms', type: 'Symptom[]', description: 'List of symptoms' },
      { name: 'description', type: 'string', optional: true, description: 'Additional description' },
      { name: 'date', type: 'Date', description: 'History date' },
      { name: 'location', type: 'Location', optional: true, description: 'Geographic location' },
      { name: 'images', type: 'string[]', optional: true, description: 'Medical images URLs' },
      { name: 'audioNotes', type: 'string', optional: true, description: 'Audio notes URL' },
      { name: 'isOffline', type: 'boolean', description: 'Created offline flag' },
      { name: 'syncStatus', type: 'string', description: 'Sync status: pending, synced, error' },
      { name: 'createdAt', type: 'Date', description: 'Creation timestamp' },
      { name: 'updatedAt', type: 'Date', description: 'Last update timestamp' },
    ],
    requiredInRequest: ['patientId', 'doctorId', 'patientName', 'age', 'diagnosis', 'symptoms'],
  });

  console.log('\n✅ All DTOs generated successfully!\n');
}

// Run if executed directly
if (require.main === module) {
  generateAllDtos().catch(console.error);
}

