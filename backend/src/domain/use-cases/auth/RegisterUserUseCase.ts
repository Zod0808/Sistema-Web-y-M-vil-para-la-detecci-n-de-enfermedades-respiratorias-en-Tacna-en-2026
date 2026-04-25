// Caso de Uso: Registrar Usuario - Capa de Dominio
import { UserEntity, UserRole } from '../../entities/User';
import { UserRepository } from '../../repositories/UserRepository';

export interface RegisterUserRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface RegisterUserResponse {
  user: UserEntity;
  token: string;
  refreshToken: string;
}

export class RegisterUserUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(request: RegisterUserRequest): Promise<RegisterUserResponse> {
    // Validar entrada
    this.validateRequest(request);

    // Verificar si el usuario ya existe
    const existingUser = await this.userRepository.findByEmail(request.email);
    if (existingUser) {
      throw new Error('El usuario ya existe con este email');
    }

    // Crear entidad de usuario
    const user = new UserEntity(
      this.generateId(),
      request.name,
      request.email,
      request.password, // La encriptación se hará en la capa de aplicación
      request.role
    );

    // Validar entidad
    if (!user.isValid()) {
      throw new Error('Datos de usuario inválidos');
    }

    // Guardar usuario
    const savedUser = await this.userRepository.save(user);

    // Generar tokens
    const token = this.generateToken(savedUser.id);
    const refreshToken = this.generateRefreshToken(savedUser.id);

    return {
      user: savedUser,
      token,
      refreshToken
    };
  }

  private validateRequest(request: RegisterUserRequest): void {
    if (!request.name || request.name.trim().length === 0) {
      throw new Error('El nombre es requerido');
    }

    if (!request.email || request.email.trim().length === 0) {
      throw new Error('El email es requerido');
    }

    if (!request.password || request.password.length < 8) {
      throw new Error('La contraseña debe tener al menos 8 caracteres');
    }

    if (!Object.values(UserRole).includes(request.role)) {
      throw new Error('Rol de usuario inválido');
    }
  }

  private generateId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateToken(userId: string): string {
    return `token_${userId}_${Date.now()}`;
  }

  private generateRefreshToken(userId: string): string {
    return `refresh_${userId}_${Date.now()}`;
  }
}
