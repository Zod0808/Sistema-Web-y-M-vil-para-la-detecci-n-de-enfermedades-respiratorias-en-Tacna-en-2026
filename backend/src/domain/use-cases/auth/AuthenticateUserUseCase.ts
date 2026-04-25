// Caso de Uso: Autenticar Usuario - Capa de Dominio
import { UserEntity, UserRole } from '../../entities/User';
import { UserRepository } from '../../repositories/UserRepository';

export interface AuthenticateUserRequest {
  email: string;
  password: string;
}

export interface AuthenticateUserResponse {
  user: UserEntity;
  token: string;
  refreshToken: string;
}

export class AuthenticateUserUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(request: AuthenticateUserRequest): Promise<AuthenticateUserResponse> {
    // Validar entrada
    if (!request.email || !request.password) {
      throw new Error('Email y contraseña son requeridos');
    }

    // Buscar usuario
    const user = await this.userRepository.findByEmail(request.email);
    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    // Verificar si está activo
    if (!user.isActive) {
      throw new Error('La cuenta está desactivada');
    }

    // Verificar contraseña (esto debería ser manejado por un servicio de hash)
    // Por ahora asumimos que la verificación se hace en la capa de aplicación

    // Actualizar último login
    const updatedUser = user.updateLastLogin();
    await this.userRepository.update(updatedUser);

    // Generar tokens (esto debería ser manejado por un servicio de tokens)
    const token = this.generateToken(user.id);
    const refreshToken = this.generateRefreshToken(user.id);

    return {
      user: updatedUser,
      token,
      refreshToken
    };
  }

  private generateToken(userId: string): string {
    // Implementación simplificada - en la práctica usar JWT
    return `token_${userId}_${Date.now()}`;
  }

  private generateRefreshToken(userId: string): string {
    // Implementación simplificada - en la práctica usar JWT
    return `refresh_${userId}_${Date.now()}`;
  }
}
