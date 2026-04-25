# 🗄️ Guía de Tests Específicos de MongoDB - RespiCare Tacna

Esta guía documenta los tests específicos de MongoDB implementados para verificar la integridad, performance y correcto funcionamiento de la base de datos.

---

## 📋 Índice

1. [Introducción](#introducción)
2. [Tests de Validación de Esquemas](#tests-de-validación-de-esquemas)
3. [Tests de Índices](#tests-de-índices)
4. [Tests de Transacciones](#tests-de-transacciones)
5. [Tests de Agregaciones](#tests-de-agregaciones)
6. [Tests de Integridad de Datos](#tests-de-integridad-de-datos)
7. [Tests de Performance de Queries](#tests-de-performance-de-queries)
8. [Ejecución](#ejecución)
9. [Mejores Prácticas](#mejores-prácticas)

---

## Introducción

Los tests específicos de MongoDB verifican aspectos fundamentales de la base de datos que no se cubren en los tests unitarios o de integración estándar:

- **Validación de esquemas**: Verifica que los modelos Mongoose validen correctamente
- **Índices**: Asegura que los índices estén creados y se usen correctamente
- **Transacciones**: Verifica atomicidad y rollback
- **Agregaciones**: Valida pipelines complejos de agregación
- **Integridad**: Verifica consistencia y referencias entre colecciones
- **Performance**: Detecta queries lentas y verifica optimización

### Ubicación de los Tests

Todos los tests están en `backend/tests/database/`:

```
backend/tests/database/
├── schema-validation.test.ts    # Tests de validación de esquemas
├── indexes.test.ts              # Tests de índices
├── transactions.test.ts         # Tests de transacciones
├── aggregations.test.ts         # Tests de agregaciones
├── data-integrity.test.ts       # Tests de integridad de datos
└── query-performance.test.ts    # Tests de performance
```

---

## Tests de Validación de Esquemas

**Archivo**: `backend/tests/database/schema-validation.test.ts`

### Propósito

Verifica que los esquemas de Mongoose validen correctamente:
- Campos requeridos
- Tipos de datos
- Constraints personalizados
- Validaciones de formato (email, regex, etc.)
- Enums
- Longitudes mínimas/máximas

### Tests Incluidos

#### User Schema
- ✅ Requiere campo `name`
- ✅ Requiere campo `email`
- ✅ Requiere campo `password`
- ✅ Valida formato de email
- ✅ Valida longitud mínima de password (8 caracteres)
- ✅ Valida enum de `role` (patient, doctor, admin)
- ✅ Valida longitud máxima de `name` (100 caracteres)
- ✅ Enforce unique email

#### MedicalHistory Schema
- ✅ Requiere `patientId`
- ✅ Requiere `doctorId`
- ✅ Requiere `date`
- ✅ Valida enum de `symptom.severity` (mild, moderate, severe)
- ✅ Valida longitud máxima de `symptom.name` (100 caracteres)

#### Appointment Schema
- ✅ Requiere `patientId`
- ✅ Requiere `doctorId`
- ✅ Requiere `date`
- ✅ Valida enum de `type`

#### Prescription Schema
- ✅ Requiere `patientId`
- ✅ Requiere `doctorId`
- ✅ Requiere array `medications`

#### Alert Schema
- ✅ Requiere `patientId`
- ✅ Requiere `type`
- ✅ Requiere `message`
- ✅ Valida enum de `severity`

### Ejemplo

```typescript
it('should require email field', async () => {
  const userData = {
    name: 'Test User',
    password: 'password123',
    role: 'patient'
  };

  const user = new User(userData);
  await expect(user.save()).rejects.toThrow(/email es obligatorio/i);
});
```

---

## Tests de Índices

**Archivo**: `backend/tests/database/indexes.test.ts`

### Propósito

Verifica que los índices estén correctamente creados y funcionen:
- Índices simples
- Índices compuestos
- Índices de texto
- Índices geoespaciales
- Performance de queries con índices

### Tests Incluidos

#### User Indexes
- ✅ Índice en `email` (único)
- ✅ Uso de índice para queries por email

#### MedicalHistory Indexes
- ✅ Índice en `patientId`
- ✅ Índice en `doctorId`
- ✅ Índice en `date` (descendente)
- ✅ Índice compuesto `patientId + date`
- ✅ Índice compuesto `doctorId + date`
- ✅ Índice de texto para búsqueda
- ✅ Índice geoespacial en `geoLocation` (2dsphere)
- ✅ Uso de índice geoespacial para queries de ubicación

#### Appointment Indexes
- ✅ Índice en `patientId`
- ✅ Índice en `doctorId`
- ✅ Índice en `date`
- ✅ Índice compuesto `doctorId + date`

#### AIAnalysis Indexes
- ✅ Índice en `createdAt` (descendente)
- ✅ Índice compuesto `urgency + confidence`

#### Performance Tests
- ✅ Uso de índice para queries eficientes
- ✅ Comparación de performance con/sin índice

### Ejemplo

```typescript
it('should have index on patientId field', async () => {
  const indexes = await MedicalHistory.collection.getIndexes();
  expect(indexes).toHaveProperty('patientId_1');
});

it('should use patientId index for queries', async () => {
  const explain = await MedicalHistory.find({ patientId })
    .explain('executionStats');
  
  const executionStats = explain[0]?.executionStats;
  expect(executionStats.executionStages.stage).toBe('IXSCAN');
});
```

---

## Tests de Transacciones

**Archivo**: `backend/tests/database/transactions.test.ts`

### Propósito

Verifica que las transacciones funcionen correctamente:
- Atomicidad de operaciones
- Rollback en caso de error
- Transacciones multi-documento
- Aislamiento de transacciones

### Tests Incluidos

#### Basic Transactions
- ✅ Commit exitoso de transacción
- ✅ Rollback en caso de error
- ✅ Reversión de todos los cambios en rollback

#### Multi-Document Transactions
- ✅ Creación atómica de documentos relacionados
- ✅ Rollback de todos los documentos si falla cualquier operación

#### Update Transactions
- ✅ Actualización atómica de múltiples documentos
- ✅ Rollback de actualizaciones si falla cualquier operación

#### Delete Transactions
- ✅ Eliminación atómica de múltiples documentos

#### Transaction Isolation
- ✅ Aislamiento de transacciones concurrentes

### Ejemplo

```typescript
it('should rollback transaction on error', async () => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await User.create([{ /* ... */ }], { session });
    await User.create([{ email: 'duplicate' }], { session }); // Error
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    // Verificar que el primer documento también fue revertido
    const user = await User.findOne({ email: 'test@example.com' });
    expect(user).toBeNull();
  } finally {
    session.endSession();
  }
});
```

---

## Tests de Agregaciones

**Archivo**: `backend/tests/database/aggregations.test.ts`

### Propósito

Verifica que las agregaciones complejas funcionen correctamente:
- Pipeline de agregación
- Agrupaciones
- Operadores de agregación
- Performance de agregaciones

### Tests Incluidos

#### Basic Aggregations
- ✅ Conteo de documentos
- ✅ Agrupación por diagnóstico
- ✅ Cálculo de promedios por grupo

#### Complex Aggregations
- ✅ Join con colección User (`$lookup`)
- ✅ Filtrado y agrupación
- ✅ Cálculo de estadísticas por rango de fechas

#### Appointment Aggregations
- ✅ Agrupación por status
- ✅ Cálculo de estadísticas por paciente

#### Performance Aggregations
- ✅ Uso de índices en agregaciones
- ✅ Tiempo de ejecución razonable

### Ejemplo

```typescript
it('should group by diagnosis', async () => {
  const result = await MedicalHistory.aggregate([
    {
      $group: {
        _id: '$diagnosis',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  expect(result).toHaveLength(3);
  expect(result[0]._id).toBe('Common Cold');
});
```

---

## Tests de Integridad de Datos

**Archivo**: `backend/tests/database/data-integrity.test.ts`

### Propósito

Verifica la integridad de los datos:
- Referencias entre colecciones
- Validación de foreign keys (si aplica)
- Consistencia de datos
- Constraints de integridad

### Tests Incluidos

#### Reference Integrity
- ✅ Mantiene referencias válidas de `patientId` y `doctorId`
- ✅ Maneja referencias inválidas apropiadamente
- ✅ Valida referencias en appointments

#### Data Consistency
- ✅ Mantiene consistencia entre documentos relacionados
- ✅ Mantiene consistencia de timestamps

#### Cascade Operations
- ✅ Maneja documentos huérfanos apropiadamente
- ✅ Mantiene integridad al actualizar referencias

#### Unique Constraints
- ✅ Enforce unique email
- ✅ Permite diferentes emails

#### Required Fields
- ✅ Enforce campos requeridos en MedicalHistory
- ✅ Enforce campos requeridos en Appointment

#### Enum Validation
- ✅ Enforce valores enum en User role
- ✅ Enforce valores enum en Appointment status

### Ejemplo

```typescript
it('should maintain valid patientId reference', async () => {
  const history = await MedicalHistory.create({ /* ... */ });
  
  const savedHistory = await MedicalHistory.findById(history._id)
    .populate('patientId', 'name email');
  
  expect(savedHistory?.patientId).toBeDefined();
  expect((savedHistory?.patientId as any)?.name).toBe('Patient User');
});
```

---

## Tests de Performance de Queries

**Archivo**: `backend/tests/database/query-performance.test.ts`

### Propósito

Verifica el performance de las queries:
- Uso de índices
- Queries lentas
- Explain plans
- Optimización de queries

### Tests Incluidos

#### Index Usage
- ✅ Uso de índice para query por `patientId`
- ✅ Uso de índice compuesto para `patientId + date`
- ✅ Evita collection scan cuando hay índice disponible

#### Query Performance Metrics
- ✅ Completa query indexada rápidamente (<100ms)
- ✅ Tiempo razonable para agregaciones (<500ms)
- ✅ Limita documentos examinados con índice apropiado

#### Slow Query Detection
- ✅ Identifica queries que necesitan optimización
- ✅ Detecta queries sin uso de índice

#### Query Optimization
- ✅ Optimiza query con proyección
- ✅ Optimiza query con limit
- ✅ Optimiza query con orden de sort apropiado

### Ejemplo

```typescript
it('should complete indexed query quickly', async () => {
  const startTime = Date.now();
  
  await MedicalHistory.find({ patientId })
    .sort({ date: -1 })
    .limit(10);
  
  const duration = Date.now() - startTime;
  expect(duration).toBeLessThan(100);
});
```

---

## Ejecución

### Ejecutar Todos los Tests de Base de Datos

```bash
cd backend
npm test -- tests/database
```

### Ejecutar Tests Específicos

```bash
# Tests de validación de esquemas
npm test -- tests/database/schema-validation.test.ts

# Tests de índices
npm test -- tests/database/indexes.test.ts

# Tests de transacciones
npm test -- tests/database/transactions.test.ts

# Tests de agregaciones
npm test -- tests/database/aggregations.test.ts

# Tests de integridad
npm test -- tests/database/data-integrity.test.ts

# Tests de performance
npm test -- tests/database/query-performance.test.ts
```

### Con Cobertura

```bash
npm run test:coverage -- tests/database
```

### Variables de Entorno

Los tests usan la misma configuración que los otros tests:

```env
NODE_ENV=test
MONGODB_URI=mongodb://localhost:27017/respicare-test
```

---

## Mejores Prácticas

### 1. Ejecutar Regularmente

- **En CI/CD**: Ejecutar en cada PR
- **Localmente**: Antes de hacer commit
- **Scheduled**: Ejecutar completo semanalmente

### 2. Monitorear Performance

- Revisar resultados de `query-performance.test.ts`
- Identificar queries lentas
- Optimizar queries que no usan índices

### 3. Validar Esquemas

- Agregar tests cuando se crean nuevos modelos
- Verificar validaciones personalizadas
- Asegurar constraints de integridad

### 4. Verificar Índices

- Agregar tests cuando se crean nuevos índices
- Verificar que los índices se usan en queries
- Monitorear performance de queries indexadas

### 5. Probar Transacciones

- Usar transacciones para operaciones multi-documento
- Verificar rollback en caso de error
- Probar aislamiento de transacciones concurrentes

### 6. Optimizar Agregaciones

- Usar índices en agregaciones cuando sea posible
- Limitar documentos procesados con `$match` temprano
- Proyectar solo campos necesarios

---

## Resumen de Cobertura

| Categoría | Tests | Estado |
|-----------|-------|--------|
| Validación de Esquemas | 20+ | ✅ Completo |
| Índices | 15+ | ✅ Completo |
| Transacciones | 10+ | ✅ Completo |
| Agregaciones | 10+ | ✅ Completo |
| Integridad de Datos | 15+ | ✅ Completo |
| Performance | 10+ | ✅ Completo |
| **Total** | **80+** | ✅ **Completo** |

---

## Recursos Adicionales

- [MongoDB Testing Best Practices](https://docs.mongodb.com/manual/testing/)
- [Mongoose Testing Guide](https://mongoosejs.com/docs/jest.html)
- [MongoDB Indexes](https://docs.mongodb.com/manual/indexes/)
- [MongoDB Transactions](https://docs.mongodb.com/manual/core/transactions/)

---

**Última actualización**: Noviembre 2025

**Mantenedor**: Equipo de Testing RespiCare

