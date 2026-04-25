# 🧬 Guía de Mutation Testing - RespiCare Tacna

Esta guía explica cómo usar mutation testing para verificar la calidad de tus tests en el proyecto RespiCare.

---

## 📋 Índice

1. [Introducción](#introducción)
2. [¿Qué es Mutation Testing?](#qué-es-mutation-testing)
3. [Configuración](#configuración)
4. [Backend (Stryker)](#backend-stryker)
5. [AI Services (MutPy)](#ai-services-mutpy)
6. [Interpretación de Resultados](#interpretación-de-resultados)
7. [Mejores Prácticas](#mejores-prácticas)
8. [Troubleshooting](#troubleshooting)
9. [Recursos Adicionales](#recursos-adicionales)

---

## Introducción

### ¿Qué es Mutation Testing?

**Mutation Testing** es una técnica de testing que evalúa la calidad de tus tests introduciendo pequeños cambios (mutaciones) en tu código y verificando si tus tests detectan estos cambios.

**Concepto clave:**
- Si tus tests **detectan** la mutación → Test es **bueno** ✅
- Si tus tests **NO detectan** la mutación → Test es **insuficiente** ❌

**Ejemplo:**

```typescript
// Código original
function add(a: number, b: number): number {
  return a + b;
}

// Mutación: cambiar + por -
function add(a: number, b: number): number {
  return a - b;  // Mutación
}

// Test
test('add should return sum', () => {
  expect(add(2, 3)).toBe(5);  // ✅ Detecta la mutación (falla)
});
```

Si el test pasa con la mutación, significa que el test no es suficientemente robusto.

### ¿Por qué usar Mutation Testing?

1. **Encuentra tests débiles**: Identifica tests que no verifican realmente el comportamiento
2. **Mejora la calidad**: Fuerza a escribir tests más completos y robustos
3. **Mide efectividad**: Proporciona una métrica real de la calidad de tus tests
4. **Complementa cobertura**: La cobertura de código solo mide qué código se ejecuta, no qué tan bien se prueba

### Métricas de Mutation Testing

- **Mutation Score**: Porcentaje de mutaciones detectadas (0-100%)
  - **80%+**: Excelente ✅
  - **60-79%**: Bueno ⚠️
  - **<60%**: Necesita mejora ❌

- **Mutantes vivos**: Mutaciones que no fueron detectadas (tests débiles)
- **Mutantes muertos**: Mutaciones que fueron detectadas (tests buenos)

---

## Configuración

### Prerrequisitos

#### Backend (Node.js/TypeScript)

```bash
# Instalar Stryker y plugins
cd backend
npm install --save-dev @stryker-mutator/core @stryker-mutator/jest-runner @stryker-mutator/typescript-checker
```

#### AI Services (Python)

```bash
# Instalar MutPy
cd ai-services
pip install mutpy
```

### Archivos de Configuración

- **Backend**: `backend/tests/mutation/stryker.config.js`
- **AI Services**: `ai-services/tests/mutation/mutpy.config.py`

---

## Backend (Stryker)

### Configuración

El archivo `backend/tests/mutation/stryker.config.js` contiene la configuración completa de Stryker.

#### Características Principales

- **Test Runner**: Jest
- **Coverage Analysis**: Por test
- **TypeScript Checker**: Verifica tipos después de mutaciones
- **Reporters**: HTML, texto, progreso, dashboard
- **Thresholds**: 
  - Alto: 80%
  - Bajo: 60%

### Ejecución

#### Ejecución Básica

```bash
cd backend
npm run test:mutation
```

#### Dry Run (Verificar Configuración)

```bash
npm run test:mutation:dry
```

#### Ejecución Incremental (Solo Archivos Cambiados)

```bash
npm run test:mutation:incremental
```

#### Ejecución con Opciones Específicas

```bash
# Solo mutar un archivo específico
npx stryker run --mutate src/services/userService.ts

# Cambiar threshold
npx stryker run --thresholds.high=90

# Modo verbose
npx stryker run --logLevel=debug
```

### Tipos de Mutaciones

Stryker aplica los siguientes tipos de mutaciones:

#### 1. Arithmetic Operators (AOR)
```typescript
// Original
const result = a + b;

// Mutaciones
const result = a - b;  // + → -
const result = a * b;  // + → *
const result = a / b;  // + → /
```

#### 2. Relational Operators (ROR)
```typescript
// Original
if (a < b) { }

// Mutaciones
if (a <= b) { }  // < → <=
if (a > b) { }   // < → >
if (a >= b) { }  // < → >=
if (a == b) { }  // < → ==
```

#### 3. Logical Operators (LOR)
```typescript
// Original
if (a && b) { }

// Mutaciones
if (a || b) { }  // && → ||
```

#### 4. Conditional Operators (COR)
```typescript
// Original
const result = condition ? a : b;

// Mutaciones
const result = condition ? b : a;  // Intercambiar valores
const result = !condition ? a : b;  // Negar condición
```

#### 5. Statement Deletion (SDL)
```typescript
// Original
function test() {
  const a = 1;
  const b = 2;
  return a + b;
}

// Mutación: eliminar una línea
function test() {
  const a = 1;
  // const b = 2;  // Eliminado
  return a + b;  // Error: b no definido
}
```

#### 6. Block Statement (BLS)
```typescript
// Original
if (condition) {
  doSomething();
}

// Mutación: eliminar bloque
if (condition) {
  // Bloque vacío
}
```

### Exclusión de Mutaciones

Algunas mutaciones pueden generar falsos positivos. Puedes excluirlas en la configuración:

```javascript
mutator: {
  excludedMutations: [
    'StringLiteral',      // Cambios en strings literales
    'TemplateLiteral',    // Cambios en template strings
    'BooleanLiteral',     // Cambios en booleanos
    'ObjectLiteral',      // Cambios en objetos literales
    'ArrayLiteral',      // Cambios en arrays literales
  ],
}
```

### Interpretación de Resultados

#### Reporte HTML

Stryker genera un reporte HTML interactivo en `.stryker-tmp/reports/mutation/mutation.html`.

**Secciones del Reporte:**

1. **Dashboard**: Resumen general
   - Mutation Score
   - Mutantes vivos/muertos
   - Tiempo de ejecución

2. **Files**: Archivos mutados
   - Score por archivo
   - Mutantes por archivo
   - Enlaces a detalles

3. **Mutants**: Lista de mutantes
   - Estado (Killed/Survived/Timeout/Error)
   - Ubicación (archivo, línea)
   - Tipo de mutación
   - Test que lo mató (si aplica)

#### Ejemplo de Salida

```
Mutation testing complete! (123.45s)

Killed:       45
Survived:      5
Timeout:       2
Error:         1
No coverage:   0
Ignored:       0

Mutation score: 89.58% (45/50)
```

#### Mutantes Vivos (Survived)

Los mutantes vivos indican tests débiles. Ejemplo:

```typescript
// Código original
function calculateDiscount(price: number, discount: number): number {
  return price * (1 - discount);
}

// Mutación: cambiar * por +
function calculateDiscount(price: number, discount: number): number {
  return price + (1 - discount);  // Mutación
}

// Test (débil)
test('calculateDiscount returns a number', () => {
  const result = calculateDiscount(100, 0.1);
  expect(typeof result).toBe('number');  // ❌ No detecta la mutación
});

// Test mejorado
test('calculateDiscount calculates correctly', () => {
  expect(calculateDiscount(100, 0.1)).toBe(90);  // ✅ Detecta la mutación
});
```

---

## AI Services (MutPy)

### Configuración

El archivo `ai-services/tests/mutation/mutpy.config.py` contiene la configuración de MutPy.

#### Características Principales

- **Target Modules**: `api`, `core`, `services`, `ml_models`
- **Test Directory**: `tests`
- **Operators**: AOR, ROR, LCR, CRP, SDL, SIR
- **Processes**: 2 (paralelo)
- **Threshold**: 70%

### Ejecución

#### Ejecución Básica

```bash
cd ai-services
mutpy api core services ml_models --target tests --unit-test tests
```

#### Con Configuración Personalizada

```bash
# Usar archivo de configuración
python -m mutpy --config tests/mutation/mutpy.config.py

# Especificar operadores
mutpy api --target tests --operators AOR ROR

# Modo verbose
mutpy api --target tests --verbose
```

#### Con Pytest

```bash
# MutPy puede integrarse con pytest
pytest tests/ --mutpy --mutpy-config tests/mutation/mutpy.config.py
```

### Tipos de Mutaciones (Python)

#### 1. Arithmetic Operator Replacement (AOR)

```python
# Original
result = a + b

# Mutaciones
result = a - b   # + → -
result = a * b   # + → *
result = a / b   # + → /
result = a % b   # + → %
result = a ** b  # + → **
```

#### 2. Relational Operator Replacement (ROR)

```python
# Original
if a < b:
    pass

# Mutaciones
if a <= b:  # < → <=
if a > b:   # < → >
if a >= b:  # < → >=
if a == b:  # < → ==
if a != b:  # < !=
```

#### 3. Logical Connector Replacement (LCR)

```python
# Original
if a and b:
    pass

# Mutaciones
if a or b:   # and → or
```

#### 4. Constant Replacement (CRP)

```python
# Original
if value == 0:
    pass

# Mutaciones
if value == 1:   # 0 → 1
if value == -1:  # 0 → -1

# Original
if condition == True:
    pass

# Mutación
if condition == False:  # True → False
```

#### 5. Statement Deletion (SDL)

```python
# Original
def test():
    a = 1
    b = 2
    return a + b

# Mutación: eliminar statement
def test():
    a = 1
    # b = 2  # Eliminado
    return a + b  # Error: b no definido
```

#### 6. Statement Insertion (SIR)

```python
# Original
def test():
    return value

# Mutación: insertar statement
def test():
    pass  # Insertado
    return value
```

### Interpretación de Resultados

#### Salida de Consola

```
[*] Start mutation process:
   - targets: api
   - tests: tests
[*] 10 tests passed:
   - test_api_health
   - test_api_endpoints
   ...
[*] Mutation score [15.38s]: 85.71%
   - all: 14
   - killed: 12
   - survived: 2
   - errors: 0
   - timeouts: 0
```

#### Reporte HTML

MutPy genera un reporte HTML en `mutation-reports/html/index.html`.

**Contenido del Reporte:**

1. **Summary**: Resumen general
   - Mutation Score
   - Total de mutantes
   - Mutantes matados/supervivientes

2. **Details**: Detalles por módulo
   - Archivos mutados
   - Mutantes por archivo
   - Estado de cada mutante

3. **Survived Mutants**: Mutantes que sobrevivieron
   - Ubicación
   - Tipo de mutación
   - Razón de supervivencia

---

## Interpretación de Resultados

### Métricas Clave

#### Mutation Score

```
Mutation Score = (Killed Mutants / Total Mutants) × 100%
```

**Interpretación:**

- **90-100%**: Excelente ✅
  - Tests muy robustos
  - Alta confianza en la calidad

- **80-89%**: Muy bueno ✅
  - Tests sólidos
  - Algunas áreas pueden mejorar

- **70-79%**: Bueno ⚠️
  - Tests aceptables
  - Revisar mutantes supervivientes

- **60-69%**: Regular ⚠️
  - Tests necesitan mejoras
  - Agregar más casos de prueba

- **<60%**: Necesita trabajo ❌
  - Tests insuficientes
  - Revisar estrategia de testing

### Análisis de Mutantes Supervivientes

#### Identificar Patrones

1. **Agrupar por tipo de mutación**
   - ¿Qué tipos de mutaciones sobreviven más?
   - Ejemplo: Si muchas mutaciones aritméticas sobreviven → Tests no verifican cálculos

2. **Agrupar por archivo**
   - ¿Qué archivos tienen más mutantes supervivientes?
   - Priorizar mejoras en esos archivos

3. **Agrupar por función**
   - ¿Qué funciones tienen tests débiles?
   - Agregar tests específicos

#### Ejemplo de Análisis

```typescript
// Archivo: src/services/calculationService.ts
// Mutantes supervivientes: 5/10

// Función: calculateTotal
// Mutantes supervivientes: 3/5
// Tipo: Arithmetic operators (+, -, *, /)

// Conclusión: Tests no verifican cálculos correctamente
// Acción: Agregar tests con valores específicos esperados
```

### Mejora de Tests Basada en Mutantes

#### Paso 1: Identificar Mutante Superviviente

```typescript
// Código original
function validateAge(age: number): boolean {
  return age >= 18;
}

// Mutación: >= → >
function validateAge(age: number): boolean {
  return age > 18;  // Mutación
}

// Test actual (débil)
test('validateAge returns boolean', () => {
  expect(typeof validateAge(20)).toBe('boolean');  // ❌ No detecta
});
```

#### Paso 2: Mejorar el Test

```typescript
// Test mejorado
test('validateAge validates correctly', () => {
  expect(validateAge(18)).toBe(true);   // ✅ Límite exacto
  expect(validateAge(17)).toBe(false);  // ✅ Un año menos
  expect(validateAge(19)).toBe(true);   // ✅ Un año más
});
```

#### Paso 3: Verificar que Detecta la Mutación

```bash
# Re-ejecutar mutation testing
npm run test:mutation

# Verificar que el mutante ahora está "killed"
```

---

## Mejores Prácticas

### 1. Ejecutar Regularmente

- **En CI/CD**: Ejecutar en cada PR (puede ser lento, considerar incremental)
- **Localmente**: Antes de hacer commit
- **Scheduled**: Ejecutar completo semanalmente

### 2. Priorizar Archivos Críticos

```javascript
// En stryker.config.js
mutate: [
  'src/services/**/*.ts',      // Lógica de negocio
  'src/controllers/**/*.ts',   // Endpoints
  // Excluir utilidades menos críticas
  '!src/utils/helpers.ts',
],
```

### 3. Usar Thresholds Apropiados

```javascript
thresholds: {
  high: 80,   // Objetivo para código crítico
  low: 60,    // Mínimo aceptable
  break: null, // No romper build (solo advertencia)
},
```

### 4. Excluir Falsos Positivos

```javascript
mutator: {
  excludedMutations: [
    'StringLiteral',    // Cambios en strings literales
    'BooleanLiteral',   // Cambios en booleanos
  ],
}
```

### 5. Usar Coverage Analysis

```javascript
coverageAnalysis: 'perTest',  // Analizar cobertura por test
```

Esto ayuda a identificar qué tests cubren qué código.

### 6. Integrar con CI/CD

```yaml
# .github/workflows/mutation-testing.yml
- name: Run Mutation Tests
  run: |
    cd backend
    npm run test:mutation
  continue-on-error: true  # No romper build
```

### 7. Documentar Decisiones

Si decides ignorar un mutante superviviente, documenta por qué:

```typescript
// Este mutante se ignora porque:
// - El cambio de + a - es aceptable en este contexto
// - El test verifica el comportamiento correcto
// - La mutación no representa un bug real
```

---

## Troubleshooting

### Problemas Comunes

#### 1. "Too many mutants" (Demasiados mutantes)

**Solución:**
```javascript
// Limitar archivos mutados
mutate: [
  'src/services/**/*.ts',  // Solo servicios críticos
],

// O limitar número de mutantes
maxConcurrentTestRunners: 1,  // Reducir concurrencia
```

#### 2. "Tests timeout" (Tests se agotan)

**Solución:**
```javascript
timeoutMS: 20000,        // Aumentar timeout
timeoutFactor: 3,        // Aumentar factor
```

#### 3. "TypeScript errors after mutation"

**Solución:**
```javascript
checkers: ['typescript'],  // Habilitar TypeScript checker
tsconfigFile: 'tsconfig.json',
```

#### 4. "Low mutation score" (Score bajo)

**Solución:**
- Revisar mutantes supervivientes
- Agregar más casos de prueba
- Verificar valores esperados específicos
- Agregar tests de límites (boundary testing)

#### 5. "MutPy no encuentra tests"

**Solución:**
```bash
# Verificar estructura de tests
pytest --collect-only

# Especificar directorio de tests explícitamente
mutpy api --target tests --unit-test tests
```

#### 6. "MutPy muy lento"

**Solución:**
```python
# Reducir procesos
'processes': 1,

# Limitar módulos
'target': ['api'],  # Solo API, no todos los módulos
```

### Debugging

#### Habilitar Logs Detallados

```bash
# Stryker
npx stryker run --logLevel=debug

# MutPy
mutpy api --target tests --verbose
```

#### Verificar Configuración

```bash
# Stryker dry run
npm run test:mutation:dry

# Verificar archivos que se mutarán
npx stryker run --dry-run
```

---

## Recursos Adicionales

### Documentación Oficial

- **Stryker**: https://stryker-mutator.io/docs/stryker-js/getting-started
- **MutPy**: https://github.com/mutpy/mutpy

### Artículos y Tutoriales

- **Mutation Testing Explained**: https://martinfowler.com/articles/mutation-testing.html
- **Stryker Handbook**: https://stryker-mutator.io/docs/stryker-js/introduction

### Herramientas Relacionadas

- **PIT (Java)**: Mutation testing para Java
- **Cosmic Ray (Python)**: Alternativa a MutPy
- **Mull (C/C++)**: Mutation testing para C/C++

### Métricas Relacionadas

- **Code Coverage**: Qué código se ejecuta
- **Branch Coverage**: Qué ramas se ejecutan
- **Mutation Score**: Qué tan bien se prueba el código

---

## 📝 Notas Finales

### Ventajas de Mutation Testing

1. **Encuentra tests débiles**: Identifica tests que no verifican realmente el comportamiento
2. **Mejora la calidad**: Fuerza a escribir tests más completos
3. **Métrica real**: Proporciona una medida real de la calidad de tests
4. **Complementa cobertura**: Va más allá de la cobertura de código

### Limitaciones

1. **Tiempo de ejecución**: Puede ser lento en proyectos grandes
2. **Falsos positivos**: Algunas mutaciones pueden no representar bugs reales
3. **Configuración**: Requiere configuración cuidadosa para evitar ruido

### Recomendaciones

- **Empezar pequeño**: Ejecutar en módulos críticos primero
- **Incremental**: Usar ejecución incremental para cambios recientes
- **Scheduled**: Ejecutar completo semanalmente, no en cada commit
- **Thresholds**: Establecer thresholds realistas (70-80%)
- **Documentar**: Documentar decisiones sobre mutantes ignorados

---

**Última actualización**: Noviembre 2025

**Mantenedor**: Equipo de Testing RespiCare

