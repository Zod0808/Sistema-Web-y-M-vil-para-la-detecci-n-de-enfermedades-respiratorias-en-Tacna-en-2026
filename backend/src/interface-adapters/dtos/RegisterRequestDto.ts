// DTO para Solicitud de Registro - Capa de Interfaz
import { UserRole } from '../../domain/entities/User';

export interface RegisterRequestDto {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export class RegisterRequestDtoValidator {
  static validate(dto: RegisterRequestDto): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!dto.name || dto.name.trim().length === 0) {
      errors.push('El nombre es requerido');
    } else if (dto.name.length > 100) {
      errors.push('El nombre no puede exceder 100 caracteres');
    }

    if (!dto.email || dto.email.trim().length === 0) {
      errors.push('El email es requerido');
    } else if (!this.isValidEmail(dto.email)) {
      errors.push('El email no tiene un formato válido');
    }

    if (!dto.password || dto.password.length === 0) {
      errors.push('La contraseña es requerida');
    } else if (dto.password.length < 8) {
      errors.push('La contraseña debe tener al menos 8 caracteres');
    }

    if (!dto.role || !Object.values(UserRole).includes(dto.role)) {
      errors.push('El rol debe ser patient, doctor o admin');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    return emailRegex.test(email);
  }
}
