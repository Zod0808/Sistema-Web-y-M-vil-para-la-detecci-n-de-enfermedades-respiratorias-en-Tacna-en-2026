# Code Generators - RespiCare MDSD

## ⚠️ Estado Actual: Experimental

Los generadores de código están en fase experimental y **actualmente generan código con errores de compilación TypeScript**.

### Problemas Conocidos

#### 1. Rutas de Importación Incorrectas

**Problema:**
```typescript
// Código generado usa:
import { UserEntity } from '@domain/entities/User';

// Pero debería usar:
import { UserEntity } from '../../domain/entities/User';
```

**Causa:** Los generadores usan alias de TypeScript (`@domain/...`) que no se resuelven correctamente en el código generado.

**Solución:** Actualizar los generadores para usar rutas relativas o configurar correctamente los aliases.

---

#### 2. Módulo `class-validator` No Encontrado

**Problema:**
```typescript
// DTOs generados importan:
import { IsNotEmpty, IsEmail, MinLength } from 'class-validator';

// Pero el módulo no está instalado en el contexto de generación
```

**Solución:** 
- Instalar `class-validator` como dependencia
- O remover los decoradores de validación del código generado

---

#### 3. Propiedades Sin Inicializadores

**Problema:**
```typescript
export class UserRequestDto {
  name: string;  // ❌ TS2564: Property has no initializer
  email: string; // ❌ TS2564: Property has no initializer
}
```

**Causa:** TypeScript estricto (`exactOptionalPropertyTypes: true`) requiere inicializadores.

**Solución:**
```typescript
// Opción 1: Hacer propiedades opcionales
export class UserRequestDto {
  name?: string;
  email?: string;
}

// Opción 2: Usar constructor
export class UserRequestDto {
  constructor(
    public name: string,
    public email: string
  ) {}
}

// Opción 3: Valores por defecto
export class UserRequestDto {
  name: string = '';
  email: string = '';
}
```

---

#### 4. Tipos No Encontrados

**Problema:**
```typescript
symptoms: Symptom[];  // ❌ Cannot find name 'Symptom'
location?: Location;  // ❌ Cannot find name 'Location'
```

**Causa:** Los generadores no importan todos los tipos necesarios.

**Solución:** Agregar imports:
```typescript
import { Symptom, Location } from '../../types';
```

---

## 🔧 Cómo Arreglar los Generadores

### dto-generator.ts

```typescript
// Necesita:
1. Usar rutas relativas en lugar de aliases
2. Importar todos los tipos necesarios (Symptom, Location, etc.)
3. Agregar inicializadores o hacer propiedades opcionales
4. Verificar si class-validator está disponible antes de generar decoradores
```

### repository-generator.ts

```typescript
// Necesita:
1. Resolver correctamente las rutas a entidades de dominio
2. Generar imports relativos
3. Verificar que las entidades existan antes de generar
```

---

## 📝 Estado del Workflow CI/CD

**En el workflow de GitHub Actions:**

- ✅ La generación de código se intenta pero no falla el workflow completo
- ⚠️ `continue-on-error: true` permite que otros jobs continúen
- 📦 Los artefactos generados (si existen) se suben para inspección
- 🔍 Los errores se registran pero no bloquean el pipeline

---

## 🎯 Plan de Acción Futuro

### Fase 1: Arreglar Generadores (Prioridad Alta)

1. **Actualizar `dto-generator.ts`:**
   - [ ] Usar rutas relativas
   - [ ] Generar imports correctos
   - [ ] Hacer propiedades opcionales o con valores default
   - [ ] Agregar imports para tipos complejos (Symptom, Location)

2. **Actualizar `repository-generator.ts`:**
   - [ ] Usar rutas relativas para entidades
   - [ ] Generar transformaciones correctas PIM ↔ PSM

3. **Configurar dependencias:**
   - [ ] Instalar `class-validator` si se usa
   - [ ] O remover decoradores de validación

### Fase 2: Validación (Prioridad Media)

1. **Tests unitarios para generadores:**
   - [ ] Test que código generado compile
   - [ ] Test que imports sean correctos
   - [ ] Test que tipos sean encontrados

2. **Validación pre-commit:**
   - [ ] Hook que ejecute generadores
   - [ ] Validar que código compile
   - [ ] No permitir commit si generación falla

### Fase 3: Integración Completa (Futuro)

1. **Automatizar en desarrollo:**
   ```json
   "predev": "npm run generate:all",
   "prebuild": "npm run generate:all"
   ```

2. **Watch mode:**
   ```bash
   npm run generate:watch  # Regenera al cambiar entities
   ```

3. **Documentación:**
   - Guía de cómo usar generadores
   - Ejemplos de código generado
   - Troubleshooting común

---

## 🚀 Cómo Usar (Cuando Funcionen)

```bash
# Generar DTOs
npm run generate:dtos

# Generar Repositories
npm run generate:repositories

# Generar todo
npm run generate:all

# Generar y validar
npm run generate:all && npm run validate:models
```

---

## 📚 Referencias

- [ANALISIS_MDSD_RESPICARE.md](../../../ANALISIS_MDSD_RESPICARE.md) - Análisis completo MDSD
- [MDSD_WORKFLOW_FIXES.md](../../../MDSD_WORKFLOW_FIXES.md) - Correcciones del workflow
- [TypeScript Path Mapping](https://www.typescriptlang.org/docs/handbook/module-resolution.html#path-mapping)
- [class-validator Documentation](https://github.com/typestack/class-validator)

---

**Estado:** 🔴 No funcional - Requiere correcciones  
**Última actualización:** 21 Octubre 2025  
**Responsable:** Equipo de Arquitectura

