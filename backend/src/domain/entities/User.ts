// Entidad de Usuario - Capa de Dominio
export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  avatar?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
  ADMIN = 'admin'
}

export class UserEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly email: string,
    public readonly password: string,
    public readonly role: UserRole,
    public readonly avatar?: string,
    public readonly isActive: boolean = true,
    public readonly lastLogin?: Date,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date()
  ) {}

  // Métodos de negocio
  public isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  public isDoctor(): boolean {
    return this.role === UserRole.DOCTOR;
  }

  public isPatient(): boolean {
    return this.role === UserRole.PATIENT;
  }

  public canAccessMedicalData(): boolean {
    return this.isDoctor() || this.isAdmin();
  }

  public canManageUsers(): boolean {
    return this.isAdmin();
  }

  public updateLastLogin(): UserEntity {
    return new UserEntity(
      this.id,
      this.name,
      this.email,
      this.password,
      this.role,
      this.avatar,
      this.isActive,
      new Date(),
      this.createdAt,
      new Date()
    );
  }

  public deactivate(): UserEntity {
    return new UserEntity(
      this.id,
      this.name,
      this.email,
      this.password,
      this.role,
      this.avatar,
      false,
      this.lastLogin,
      this.createdAt,
      new Date()
    );
  }

  public updateProfile(name: string, avatar?: string): UserEntity {
    return new UserEntity(
      this.id,
      name,
      this.email,
      this.password,
      this.role,
      avatar || this.avatar,
      this.isActive,
      this.lastLogin,
      this.createdAt,
      new Date()
    );
  }

  public changePassword(newPassword: string): UserEntity {
    return new UserEntity(
      this.id,
      this.name,
      this.email,
      newPassword,
      this.role,
      this.avatar,
      this.isActive,
      this.lastLogin,
      this.createdAt,
      new Date()
    );
  }

  // Validaciones de negocio
  public validateEmail(): boolean {
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    return emailRegex.test(this.email);
  }

  public validatePassword(): boolean {
    return this.password.length >= 8;
  }

  public validateName(): boolean {
    return this.name.trim().length > 0 && this.name.length <= 100;
  }

  public isValid(): boolean {
    return this.validateEmail() && this.validatePassword() && this.validateName();
  }
}
