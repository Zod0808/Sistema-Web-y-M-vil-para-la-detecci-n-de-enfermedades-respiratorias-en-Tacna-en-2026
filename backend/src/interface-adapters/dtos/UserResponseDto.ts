// DTO para Respuesta de Usuario - Capa de Interfaz
import { UserEntity, UserRole } from '../../domain/entities/User';

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface UserResponseDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class UserResponseDto {
  static fromEntity(user: UserEntity): UserResponseDto {
    const dto: UserResponseDto = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    if (user.avatar !== undefined) {
      dto.avatar = user.avatar;
    }

    if (user.lastLogin !== undefined) {
      dto.lastLogin = user.lastLogin;
    }

    return dto;
  }

  static fromEntities(users: UserEntity[]): UserResponseDto[] {
    return users.map(user => this.fromEntity(user));
  }
}
