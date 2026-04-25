// AUTO-GENERATED - DO NOT EDIT MANUALLY
// Generated from UserEntity
// Generation date: 2025-10-22T17:57:39.608Z

/**
 * User Response DTO
 * Used for API responses
 */
export interface UserResponseDto {
  /** Unique user identifier */
  id: string;
  /** User full name */
  name: string;
  /** User email address */
  email: string;
  /** User role: patient, doctor, admin */
  role: string;
  /** Avatar URL */
  avatar?: string;
  /** Account active status */
  isActive: boolean;
  /** Last login timestamp */
  lastLogin?: Date;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * User Response DTO Mapper
 */
export class UserResponseDtoMapper {
  /**
   * Map from domain entity to response DTO
   */
  static toDto(entity: any): UserResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      email: entity.email,
      role: entity.role,
      avatar: entity.avatar,
      isActive: entity.isActive,
      lastLogin: entity.lastLogin,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  /**
   * Map array of entities to DTOs
   */
  static toDtoArray(entities: any[]): UserResponseDto[] {
    return entities.map(entity => this.toDto(entity));
  }
}
