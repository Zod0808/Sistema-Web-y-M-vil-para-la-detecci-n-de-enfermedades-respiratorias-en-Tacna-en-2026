// AUTO-GENERATED - DO NOT EDIT MANUALLY
// Generated from UserEntity
// Generation date: 2025-10-22T17:57:39.609Z

import { IsString, IsNotEmpty, IsEmail, IsOptional, IsBoolean, IsNumber, MinLength, MaxLength, Min, Max } from 'class-validator';

/**
 * Create User Request DTO
 * Used for creating new user records
 */
export class CreateUserRequestDto {
  /** User full name */
  @IsNotEmpty()
  @IsString()
  name!: string;
  /** User email address */
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email!: string;
  /** User password (hashed) */
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password!: string;
  /** User role: patient, doctor, admin */
  @IsNotEmpty()
  @IsString()
  role!: string;
  /** Avatar URL */
  @IsString()
  @IsOptional()
  avatar?: string;
  /** Account active status */
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
  /** Last login timestamp */
  @IsOptional()
  lastLogin?: Date;
}

/**
 * Update User Request DTO
 * Used for updating existing user records
 */
export class UpdateUserRequestDto {
  /** User full name */
  @IsString()
  @IsOptional()
  name?: string;
  /** User email address */
  @IsString()
  @IsEmail()
  @IsOptional()
  email?: string;
  /** User password (hashed) */
  @IsString()
  @IsOptional()
  password?: string;
  /** User role: patient, doctor, admin */
  @IsString()
  @IsOptional()
  role?: string;
  /** Avatar URL */
  @IsString()
  @IsOptional()
  avatar?: string;
  /** Account active status */
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
  /** Last login timestamp */
  @IsOptional()
  lastLogin?: Date;
}

/**
 * User Request DTO Mapper
 */
export class UserRequestDtoMapper {
  /**
   * Validate and map from request DTO to domain data
   */
  static toDomainData(dto: CreateUserRequestDto): any {
    return {
      name: dto.name,
      email: dto.email,
      password: dto.password,
      role: dto.role,
      avatar: dto.avatar,
      isActive: dto.isActive,
      lastLogin: dto.lastLogin,
    };
  }
}
