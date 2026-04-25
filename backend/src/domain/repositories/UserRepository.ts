// Repositorio de Usuario - Capa de Dominio
import { UserEntity, User } from '../entities/User';

export interface UserRepository {
  // Operaciones básicas
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findAll(): Promise<UserEntity[]>;
  save(user: UserEntity): Promise<UserEntity>;
  update(user: UserEntity): Promise<UserEntity>;
  delete(id: string): Promise<void>;

  // Operaciones específicas de negocio
  findActiveUsers(): Promise<UserEntity[]>;
  findByRole(role: string): Promise<UserEntity[]>;
  findUsersByDateRange(startDate: Date, endDate: Date): Promise<UserEntity[]>;
  
  // Estadísticas
  getUserStats(): Promise<{
    total: number;
    active: number;
    byRole: Record<string, { total: number; active: number }>;
  }>;

  // Paginación
  findUsersPaginated(page: number, limit: number): Promise<{
    users: UserEntity[];
    total: number;
    pages: number;
  }>;

  // Búsqueda
  searchUsers(query: string): Promise<UserEntity[]>;
}
