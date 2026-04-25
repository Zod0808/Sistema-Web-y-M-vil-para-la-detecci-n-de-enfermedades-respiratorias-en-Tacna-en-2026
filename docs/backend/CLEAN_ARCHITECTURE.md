# Clean Architecture - RespiCare Backend

Este documento describe la implementación de Clean Architecture en el backend de RespiCare.

## Estructura de Capas

### 1. Capa de Dominio (Domain Layer)
**Ubicación**: `src/domain/`

Esta es la capa más interna y contiene la lógica de negocio pura.

#### Entidades (`entities/`)
- `User.ts` - Entidad de Usuario con métodos de negocio
- `MedicalHistory.ts` - Entidad de Historial Médico con validaciones

#### Value Objects (`value-objects/`)
- `Symptom.ts` - Objeto de valor para síntomas
- `Location.ts` - Objeto de valor para ubicaciones

#### Repositorios (`repositories/`)
- `UserRepository.ts` - Interfaz del repositorio de usuarios
- `MedicalHistoryRepository.ts` - Interfaz del repositorio de historiales médicos

#### Casos de Uso (`use-cases/`)
- `auth/AuthenticateUserUseCase.ts` - Caso de uso para autenticación
- `auth/RegisterUserUseCase.ts` - Caso de uso para registro
- `medical/CreateMedicalHistoryUseCase.ts` - Caso de uso para crear historial
- `medical/GetMedicalHistoryUseCase.ts` - Caso de uso para obtener historial

### 2. Capa de Aplicación (Application Layer)
**Ubicación**: `src/application/`

Contiene la lógica de aplicación y orquesta los casos de uso.

#### Servicios (`services/`)
- `AuthService.ts` - Servicio de autenticación
- `MedicalHistoryService.ts` - Servicio de historiales médicos
- `HashService.ts` - Servicio de hash de contraseñas
- `TokenService.ts` - Servicio de tokens JWT

### 3. Capa de Infraestructura (Infrastructure Layer)
**Ubicación**: `src/infrastructure/`

Implementa las interfaces definidas en el dominio.

#### Repositorios (`repositories/`)
- `MongoUserRepository.ts` - Implementación MongoDB del repositorio de usuarios
- `MongoMedicalHistoryRepository.ts` - Implementación MongoDB del repositorio de historiales

#### Contenedor de Dependencias (`container/`)
- `DependencyContainer.ts` - Contenedor IoC para inyección de dependencias

### 4. Capa de Interfaz (Interface Layer)
**Ubicación**: `src/interface-adapters/`

Maneja la comunicación con el mundo exterior.

#### Controladores (`controllers/`)
- `AuthController.ts` - Controlador de autenticación
- `MedicalHistoryController.ts` - Controlador de historiales médicos

#### DTOs (`dtos/`)
- `ApiResponse.ts` - DTO para respuestas de API
- `LoginRequestDto.ts` - DTO para solicitudes de login
- `RegisterRequestDto.ts` - DTO para solicitudes de registro
- `UserResponseDto.ts` - DTO para respuestas de usuario
- `AuthResponseDto.ts` - DTO para respuestas de autenticación
- `CreateMedicalHistoryRequestDto.ts` - DTO para crear historial
- `MedicalHistoryResponseDto.ts` - DTO para respuestas de historial

#### Rutas (`routes/`)
- `AuthRoutes.ts` - Rutas de autenticación
- `MedicalHistoryRoutes.ts` - Rutas de historiales médicos

## Principios de Clean Architecture

### 1. Independencia de Frameworks
- El código de negocio no depende de Express, MongoDB, etc.
- Las dependencias apuntan hacia adentro

### 2. Testabilidad
- La lógica de negocio puede ser probada sin frameworks
- Fácil inyección de dependencias para testing

### 3. Independencia de UI
- La lógica de negocio no sabe nada sobre HTTP, JSON, etc.
- Fácil cambio de interfaz (REST, GraphQL, CLI, etc.)

### 4. Independencia de Base de Datos
- La lógica de negocio no depende de MongoDB
- Fácil cambio de base de datos

### 5. Independencia de Agentes Externos
- La lógica de negocio no sabe nada sobre el mundo exterior
- Fácil cambio de servicios externos

## Flujo de Datos

```
Request → Controller → Service → Use Case → Repository → Database
                ↓
Response ← DTO ← Entity ← Domain Logic ← Repository ← Database
```

## Cómo Usar

### Desarrollo
```bash
# Ejecutar con Clean Architecture
npm run dev:clean

# Ejecutar versión original
npm run dev
```

### Producción
```bash
# Compilar
npm run build

# Ejecutar con Clean Architecture
npm run start:clean

# Ejecutar versión original
npm start
```

## Beneficios de Clean Architecture

1. **Mantenibilidad**: Código organizado y fácil de mantener
2. **Testabilidad**: Fácil de probar cada capa por separado
3. **Flexibilidad**: Fácil cambio de tecnologías
4. **Escalabilidad**: Fácil agregar nuevas funcionalidades
5. **Legibilidad**: Código más claro y comprensible

## Migración

La implementación actual mantiene compatibilidad con el código existente. Puedes:

1. Usar la nueva arquitectura con `npm run dev:clean`
2. Mantener la versión original con `npm run dev`
3. Migrar gradualmente funcionalidades a Clean Architecture

## Próximos Pasos

1. Migrar más controladores a la nueva arquitectura
2. Agregar más casos de uso
3. Implementar tests unitarios para cada capa
4. Agregar validaciones más robustas
5. Implementar logging estructurado por capas
