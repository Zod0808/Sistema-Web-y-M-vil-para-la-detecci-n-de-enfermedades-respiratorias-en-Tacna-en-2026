// Contenedor de Dependencias - Capa de Infraestructura
import { UserRepository } from '../../domain/repositories/UserRepository';
import { MedicalHistoryRepository } from '../../domain/repositories/MedicalHistoryRepository';
import { HashService } from '../../application/services/HashService';
import { TokenService } from '../../application/services/TokenService';
import { AuthService } from '../../application/services/AuthService';
import { MedicalHistoryService } from '../../application/services/MedicalHistoryService';
import { AuthController } from '../../interface-adapters/controllers/AuthController';
import { MedicalHistoryController } from '../../interface-adapters/controllers/MedicalHistoryController';

// Implementaciones concretas
import { MongoUserRepository } from '../repositories/MongoUserRepository';
import { MongoMedicalHistoryRepository } from '../repositories/MongoMedicalHistoryRepository';
import { BcryptHashService } from '../../application/services/HashService';
import { JWTTokenService } from '../../application/services/TokenService';

export class DependencyContainer {
  private static instance: DependencyContainer;
  private services: Map<string, any> = new Map();

  private constructor() {
    this.initializeServices();
  }

  static getInstance(): DependencyContainer {
    if (!DependencyContainer.instance) {
      DependencyContainer.instance = new DependencyContainer();
    }
    return DependencyContainer.instance;
  }

  private initializeServices(): void {
    // Repositorios
    this.services.set('UserRepository', new MongoUserRepository());
    this.services.set('MedicalHistoryRepository', new MongoMedicalHistoryRepository());

    // Servicios de infraestructura
    this.services.set('HashService', new BcryptHashService(12));
    this.services.set('TokenService', new JWTTokenService(
      process.env['JWT_SECRET'] || 'default-secret',
      process.env['JWT_REFRESH_SECRET'] || 'default-refresh-secret',
      process.env['JWT_EXPIRE'] || '7d',
      process.env['JWT_REFRESH_EXPIRE'] || '30d'
    ));

    // Servicios de aplicación
    this.services.set('AuthService', new AuthService(
      this.get<UserRepository>('UserRepository'),
      this.get<HashService>('HashService'),
      this.get<TokenService>('TokenService')
    ));

    this.services.set('MedicalHistoryService', new MedicalHistoryService(
      this.get<MedicalHistoryRepository>('MedicalHistoryRepository'),
      this.get<UserRepository>('UserRepository')
    ));

    // Controladores
    this.services.set('AuthController', new AuthController(
      this.get<AuthService>('AuthService')
    ));

    this.services.set('MedicalHistoryController', new MedicalHistoryController(
      this.get<MedicalHistoryService>('MedicalHistoryService')
    ));
  }

  get<T>(serviceName: string): T {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Servicio ${serviceName} no encontrado`);
    }
    return service as T;
  }

  // Métodos de conveniencia para obtener servicios específicos
  getAuthController(): AuthController {
    return this.get<AuthController>('AuthController');
  }

  getMedicalHistoryController(): MedicalHistoryController {
    return this.get<MedicalHistoryController>('MedicalHistoryController');
  }

  getAuthService(): AuthService {
    return this.get<AuthService>('AuthService');
  }

  getMedicalHistoryService(): MedicalHistoryService {
    return this.get<MedicalHistoryService>('MedicalHistoryService');
  }

  getUserRepository(): UserRepository {
    return this.get<UserRepository>('UserRepository');
  }

  getMedicalHistoryRepository(): MedicalHistoryRepository {
    return this.get<MedicalHistoryRepository>('MedicalHistoryRepository');
  }

  getHashService(): HashService {
    return this.get<HashService>('HashService');
  }

  getTokenService(): TokenService {
    return this.get<TokenService>('TokenService');
  }
}
