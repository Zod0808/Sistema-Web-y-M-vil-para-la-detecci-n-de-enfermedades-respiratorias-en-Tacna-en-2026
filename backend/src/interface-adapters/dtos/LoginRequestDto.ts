// DTO para Solicitud de Login - Capa de Interfaz
export interface LoginRequestDto {
  email: string;
  password: string;
}

export class LoginRequestDtoValidator {
  static validate(dto: LoginRequestDto): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

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
