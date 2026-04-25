// Servicio de Autenticación - Capa de Aplicación
import { UserEntity, UserRole } from '../../domain/entities/User';
import { UserRepository } from '../../domain/repositories/UserRepository';
import { HashService } from './HashService';
import { TokenService } from './TokenService';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface AuthResponse {
  user: UserEntity;
  token: string;
  refreshToken: string;
}

export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private hashService: HashService,
    private tokenService: TokenService
  ) {}

  async login(request: LoginRequest): Promise<AuthResponse> {
    // Buscar usuario
    const user = await this.userRepository.findByEmail(request.email);
    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    // Verificar contraseña
    const isPasswordValid = await this.hashService.compare(request.password, user.password);
    if (!isPasswordValid) {
      throw new Error('Credenciales inválidas');
    }

    // Verificar si está activo
    if (!user.isActive) {
      throw new Error('La cuenta está desactivada');
    }

    // Actualizar último login
    const updatedUser = user.updateLastLogin();
    await this.userRepository.update(updatedUser);

    // Generar tokens
    const token = this.tokenService.generateToken(updatedUser.id);
    const refreshToken = this.tokenService.generateRefreshToken(updatedUser.id);

    return {
      user: updatedUser,
      token,
      refreshToken
    };
  }

  async register(request: RegisterRequest): Promise<AuthResponse> {
    // Verificar si el usuario ya existe
    const existingUser = await this.userRepository.findByEmail(request.email);
    if (existingUser) {
      throw new Error('El usuario ya existe con este email');
    }

    // Encriptar contraseña
    const hashedPassword = await this.hashService.hash(request.password);

    // Crear usuario
    const user = new UserEntity(
      this.generateId(),
      request.name,
      request.email,
      hashedPassword,
      request.role
    );

    // Validar usuario
    if (!user.isValid()) {
      throw new Error('Datos de usuario inválidos');
    }

    // Guardar usuario
    const savedUser = await this.userRepository.save(user);

    // Generar tokens
    const token = this.tokenService.generateToken(savedUser.id);
    const refreshToken = this.tokenService.generateRefreshToken(savedUser.id);

    return {
      user: savedUser,
      token,
      refreshToken
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    // Verificar refresh token
    const payload = this.tokenService.verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new Error('Refresh token inválido');
    }

    // Buscar usuario
    const user = await this.userRepository.findById(payload.userId);
    if (!user || !user.isActive) {
      throw new Error('Usuario no encontrado o inactivo');
    }

    // Generar nuevos tokens
    const newToken = this.tokenService.generateToken(user.id);
    const newRefreshToken = this.tokenService.generateRefreshToken(user.id);

    return {
      user,
      token: newToken,
      refreshToken: newRefreshToken
    };
  }

  async logout(userId: string): Promise<void> {
    // En una implementación real, podrías invalidar el token en una blacklist
    // Por ahora, simplemente registramos el logout
    console.log(`Usuario ${userId} cerró sesión`);
  }

  async getProfile(userId: string): Promise<UserEntity> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    return user;
  }

  async updateProfile(userId: string, name: string, avatar?: string): Promise<UserEntity> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const updatedUser = user.updateProfile(name, avatar);
    return await this.userRepository.update(updatedUser);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Verificar contraseña actual
    const isCurrentPasswordValid = await this.hashService.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new Error('Contraseña actual incorrecta');
    }

    // Encriptar nueva contraseña
    const hashedNewPassword = await this.hashService.hash(newPassword);
    const updatedUser = user.changePassword(hashedNewPassword);
    
    await this.userRepository.update(updatedUser);
  }

  async deactivateAccount(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const deactivatedUser = user.deactivate();
    await this.userRepository.update(deactivatedUser);
  }

  private generateId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
