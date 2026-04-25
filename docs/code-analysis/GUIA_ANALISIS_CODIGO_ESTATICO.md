# 🔍 Guía para Elaborar y Ejecutar Pruebas de Análisis de Código Estático

## 📋 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Requisitos Previos](#requisitos-previos)
3. [Configuración Inicial](#configuración-inicial)
4. [Ejecución de Pruebas](#ejecución-de-pruebas)
5. [Interpretación de Resultados](#interpretación-de-resultados)
6. [Generación de Reportes](#generación-de-reportes)
7. [Integración con CI/CD](#integración-con-cicd)
8. [Solución de Problemas](#solución-de-problemas)
9. [Mejores Prácticas](#mejores-prácticas)

---

## 📖 Introducción

### ¿Qué es el Análisis de Código Estático?

El análisis de código estático es el proceso de examinar el código fuente sin ejecutarlo para identificar:
- **Errores de sintaxis y lógica**
- **Vulnerabilidades de seguridad**
- **Problemas de estilo y formato**
- **Código duplicado**
- **Complejidad excesiva**
- **Violaciones de estándares de codificación**
- **Problemas de tipos y validación**

### Herramientas Utilizadas en RespiCare

| Componente | Herramientas | Propósito |
|------------|--------------|-----------|
| **Backend (TypeScript)** | ESLint, Prettier, TypeScript Compiler | Linting, formato, verificación de tipos |
| **AI Services (Python)** | Pylint, Flake8, Black, mypy, Bandit, pip-audit | Linting, formato, tipos, seguridad |
| **Mobile (React Native)** | ESLint, TypeScript | Linting, verificación de tipos |
| **Web (React)** | ESLint, Prettier | Linting, formato |

---

## 🔧 Requisitos Previos

### Software Necesario

#### Backend (Node.js/TypeScript)
```bash
# Verificar versiones
node --version    # Debe ser >= 18.0.0
npm --version     # Debe ser >= 8.0.0
```

#### AI Services (Python)
```bash
# Verificar versiones
python --version  # Debe ser >= 3.11
pip --version     # Verificar pip está instalado
```

#### Mobile (React Native)
```bash
# Verificar versiones
node --version    # Debe ser >= 16.0.0
npm --version     # Debe ser >= 8.0.0
```

### Instalación de Dependencias

#### Backend
```bash
cd backend
npm install
```

Esto instalará automáticamente:
- ESLint
- Prettier
- TypeScript
- @typescript-eslint/parser
- @typescript-eslint/eslint-plugin

#### AI Services
```bash
cd ai-services
pip install -r requirements-lint.txt
```

Esto instalará:
- Pylint (3.0.3)
- Flake8 (6.1.0)
- Black (23.12.1)
- mypy (1.7.1)
- Bandit (1.7.5)
- pip-audit (2.6.2)

#### Mobile
```bash
cd mobile
npm install
```

Esto instalará:
- ESLint
- @react-native/eslint-config
- @typescript-eslint/parser
- @typescript-eslint/eslint-plugin

---

## ⚙️ Configuración Inicial

### Verificar Archivos de Configuración

#### Backend - ESLint
**Archivo:** `backend/.eslintrc.json`

```json
{
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2020,
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking"
  ],
  "rules": {
    "no-console": "warn",
    "complexity": ["error", 10],
    "max-lines-per-function": ["warn", 50],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "warn"
  }
}
```

#### Backend - Prettier
**Archivo:** `backend/.prettierrc`

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

#### AI Services - Flake8
**Archivo:** `ai-services/.flake8`

```ini
[flake8]
max-line-length = 100
exclude = venv,__pycache__,migrations,models
ignore = E203,E266,E501,W503,F401
max-complexity = 10
```

#### AI Services - Pylint
**Archivo:** `ai-services/.pylintrc`

Verificar que existe y contiene la configuración adecuada.

---

## 🚀 Ejecución de Pruebas

### Backend (TypeScript/Node.js)

#### 1. Análisis Completo (Recomendado)
```bash
cd backend
npm run analyze
```

Este comando ejecuta:
- ESLint (linting)
- TypeScript type-checking
- npm audit (vulnerabilidades)

#### 2. Linting Individual
```bash
# Ejecutar ESLint
npm run lint

# Corregir problemas automáticamente
npm run lint:fix
```

#### 3. Verificación de Tipos
```bash
npm run type-check
```

#### 4. Verificación de Formato
```bash
# Verificar sin modificar
npm run format:check

# Formatear código
npm run format
```

#### 5. Auditoría de Seguridad
```bash
npm run audit

# Corregir automáticamente
npm run audit:fix
```

#### 6. Análisis de Calidad Completo
```bash
npm run code-quality
```

Este comando ejecuta:
- Análisis completo (lint + type-check + audit)
- Tests con cobertura

### AI Services (Python)

#### 1. Análisis Completo (Recomendado)
```bash
cd ai-services
make analyze
```

Este comando ejecuta:
- Pylint (linting)
- Flake8 (linting)
- Black (verificación de formato)
- mypy (verificación de tipos)
- Bandit (seguridad)
- pip-audit (vulnerabilidades)

#### 2. Linting Individual
```bash
# Ejecutar Pylint y Flake8
make lint

# Corregir problemas automáticamente
make lint-fix
```

#### 3. Verificación de Formato
```bash
# Verificar sin modificar
make format-check

# Formatear código
make format
```

#### 4. Verificación de Tipos
```bash
make type-check
```

#### 5. Análisis de Seguridad
```bash
make security-check
```

Este comando ejecuta:
- Bandit (análisis de código)
- pip-audit (vulnerabilidades de dependencias)

#### 6. Comandos Directos (Alternativa)

Si no tienes Make instalado, puedes ejecutar directamente:

```bash
# Pylint
pylint --rcfile=.pylintrc api/ core/ services/ ml_models/

# Flake8
flake8 --config=.flake8 api/ core/ services/ ml_models/

# Black (formatear)
black api/ core/ services/ ml_models/

# Black (verificar)
black --check api/ core/ services/ ml_models/

# mypy (type checking)
mypy api/ core/ services/ ml_models/

# Bandit (seguridad)
bandit -r api/ core/ services/ ml_models/ -ll

# pip-audit (vulnerabilidades)
pip-audit --desc
```

### Mobile (React Native)

#### 1. Linting
```bash
cd mobile
npm run lint
```

#### 2. Tests
```bash
# Tests unitarios
npm run test

# Tests con cobertura
npm run test:coverage
```

#### 3. Auditoría de Seguridad
```bash
# Verificar vulnerabilidades
npm audit

# Intentar corrección automática
npm audit fix

# Ver reporte detallado en JSON
npm audit --json > audit-report.json

# Ver solo vulnerabilidades de alta severidad
npm audit --audit-level=high
```

**Nota:** Si `npm audit fix` no resuelve las vulnerabilidades (especialmente en dependencias transitivas), consulta la sección [Problema 7: Vulnerabilidades en Dependencias Transitivas](#problema-7-vulnerabilidades-en-dependencias-transitivas-npm-audit) más abajo.

### Ejecución desde la Raíz del Proyecto

El proyecto incluye un Makefile en la raíz que permite ejecutar análisis en todos los módulos:

```bash
# Linting en todos los módulos
make lint

# Formatear código en todos los módulos
make format
```

---

## 📊 Interpretación de Resultados

### ESLint (Backend/Mobile/Web)

#### Niveles de Severidad

| Nivel | Descripción | Acción Requerida |
|-------|-------------|------------------|
| **error** | Problema crítico | Debe corregirse antes de commit |
| **warn** | Advertencia | Se recomienda corregir |
| **info** | Informativo | Sugerencia de mejora |

#### Ejemplo de Salida
```
✖ 3 problems (1 error, 2 warnings)

src/services/userService.ts
  15:5  error  'any' type is not allowed  @typescript-eslint/no-explicit-any
  23:10  warn   Unexpected console statement  no-console
  45:3   warn   Function has complexity of 12  complexity
```

**Interpretación:**
- **Línea 15**: Error crítico - usar tipo `any` no está permitido
- **Línea 23**: Advertencia - hay un `console.log` que debería removerse
- **Línea 45**: Advertencia - función muy compleja (debe ser < 10)

### Pylint (AI Services)

#### Sistema de Calificación

Pylint califica el código de 0 a 10:

| Calificación | Estado | Acción |
|--------------|--------|--------|
| 9.0 - 10.0 | ✅ Excelente | Mantener estándar |
| 7.0 - 8.9 | ✅ Bueno | Mejoras menores |
| 5.0 - 6.9 | ⚠️ Regular | Refactorización necesaria |
| < 5.0 | ❌ Malo | Refactorización urgente |

#### Ejemplo de Salida
```
Your code has been rated at 9.2/10

************* Module api.routes.predictions
api/routes/predictions.py:45:0: C0114: Missing module docstring (missing-module-docstring)
api/routes/predictions.py:67:0: C0103: Function name "predict" doesn't conform to snake_case naming style (invalid-name)

------------------------------------------------------------------
Your code has been rated at 9.2/10 (previous run: 9.0/10, +0.2)
```

**Interpretación:**
- Calificación: **9.2/10** ✅ (Excelente)
- **Línea 45**: Falta docstring del módulo
- **Línea 67**: Nombre de función no sigue snake_case

### Flake8 (AI Services)

#### Códigos de Error

| Código | Categoría | Descripción |
|--------|-----------|-------------|
| E | Error | Errores de sintaxis o lógica |
| W | Warning | Advertencias de estilo |
| F | Pyflakes | Errores detectados por Pyflakes |
| C | Complexity | Complejidad ciclomática |

#### Ejemplo de Salida
```
api/routes/predictions.py:45:80: E501 line too long (120 > 100 characters)
api/routes/predictions.py:67:1: F401 'os' imported but unused
services/ml_service.py:123:5: C901 'predict' is too complex (15 > 10)
```

**Interpretación:**
- **Línea 45**: Línea demasiado larga (120 caracteres, máximo 100)
- **Línea 67**: Import no utilizado
- **Línea 123**: Función muy compleja (15, máximo 10)

### Bandit (Seguridad - AI Services)

#### Niveles de Severidad

| Nivel | Descripción | Acción |
|-------|-------------|--------|
| **Critical** | Vulnerabilidad crítica | Corregir inmediatamente |
| **High** | Vulnerabilidad alta | Corregir pronto |
| **Medium** | Vulnerabilidad media | Planificar corrección |
| **Low** | Problema menor | Considerar corrección |

#### Ejemplo de Salida
```
>> Issue: [B101:assert_used] Use of assert detected. The enclosed code will be removed when compiling to optimised byte code.
   Severity: Low   Confidence: High
   Location: services/ml_service.py:123
   122|    def validate_input(self, data):
   123|        assert data is not None, "Data cannot be None"
```

**Interpretación:**
- **Severidad**: Baja
- **Problema**: Uso de `assert` en código de producción
- **Recomendación**: Reemplazar por validación explícita

### TypeScript Compiler (Backend)

#### Ejemplo de Salida
```
src/services/userService.ts(15,5): error TS2322: Type 'string' is not assignable to type 'number'.
src/services/userService.ts(23,10): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
```

**Interpretación:**
- **Línea 15**: Error de tipo - se asigna string donde se espera number
- **Línea 23**: Error de tipo - argumento incorrecto

### mypy (AI Services)

#### Ejemplo de Salida
```
api/routes/predictions.py:45: error: Argument 1 to "predict" has incompatible type "str"; expected "Dict[str, Any]"
api/routes/predictions.py:67: error: Returning Any from function declared to return "Dict[str, float]"
```

**Interpretación:**
- **Línea 45**: Tipo de argumento incompatible
- **Línea 67**: Tipo de retorno incorrecto

---

## 📄 Generación de Reportes

### Backend - Reportes en Formato JSON

```bash
cd backend

# Generar reporte de ESLint en JSON
npx eslint src/**/*.ts --format json -o reports/eslint-report.json

# Generar reporte de TypeScript
npm run type-check 2>&1 | tee reports/tsc-report.txt
```

### AI Services - Reportes Detallados

#### Pylint - Reporte JSON
```bash
cd ai-services
pylint --rcfile=.pylintrc api/ core/ services/ ml_models/ \
  --output-format=json > reports/pylint-report.json
```

#### Flake8 - Reporte HTML
```bash
# Instalar flake8-html si no está instalado
pip install flake8-html

# Generar reporte HTML
flake8 --config=.flake8 api/ core/ services/ ml_models/ \
  --format=html --htmldir=reports/flake8-report
```

#### Bandit - Reporte JSON
```bash
bandit -r api/ core/ services/ ml_models/ \
  -f json -o reports/bandit-report.json
```

#### pip-audit - Reporte de Vulnerabilidades
```bash
pip-audit --desc --format json -o reports/pip-audit-report.json
```

### Script de Generación de Reportes Completo

Crear un script para generar todos los reportes:

**Archivo:** `scripts/generate-static-analysis-reports.sh`

```bash
#!/bin/bash

# Crear directorio de reportes
mkdir -p reports

echo "🔍 Generando reportes de análisis estático..."

# Backend
echo "📊 Analizando Backend..."
cd backend
npx eslint src/**/*.ts --format json -o ../reports/backend-eslint.json 2>/dev/null || true
npm run type-check > ../reports/backend-tsc.txt 2>&1 || true
cd ..

# AI Services
echo "📊 Analizando AI Services..."
cd ai-services
pylint --rcfile=.pylintrc api/ core/ services/ ml_models/ \
  --output-format=json > ../reports/ai-services-pylint.json 2>/dev/null || true
flake8 --config=.flake8 api/ core/ services/ ml_models/ \
  > ../reports/ai-services-flake8.txt 2>&1 || true
bandit -r api/ core/ services/ ml_models/ \
  -f json -o ../reports/ai-services-bandit.json 2>/dev/null || true
pip-audit --format json -o ../reports/ai-services-pip-audit.json 2>/dev/null || true
cd ..

# Mobile
echo "📊 Analizando Mobile..."
cd mobile
npm run lint > ../reports/mobile-eslint.txt 2>&1 || true
cd ..

echo "✅ Reportes generados en el directorio reports/"
```

**Ejecutar:**
```bash
chmod +x scripts/generate-static-analysis-reports.sh
./scripts/generate-static-analysis-reports.sh
```

---

## 🔄 Integración con CI/CD

### GitHub Actions

El proyecto ya incluye integración con GitHub Actions. Ver archivo: `.github/workflows/testing.yml`

#### Ejemplo de Workflow para Análisis Estático

**Archivo:** `.github/workflows/static-analysis.yml`

```yaml
name: Static Code Analysis

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  analyze-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          cd backend
          npm ci
      - name: Run ESLint
        run: |
          cd backend
          npm run lint
      - name: Run Type Check
        run: |
          cd backend
          npm run type-check
      - name: Run Security Audit
        run: |
          cd backend
          npm run audit

  analyze-ai-services:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          cd ai-services
          pip install -r requirements-lint.txt
      - name: Run Pylint
        run: |
          cd ai-services
          pylint --rcfile=.pylintrc api/ core/ services/ ml_models/
      - name: Run Flake8
        run: |
          cd ai-services
          flake8 --config=.flake8 api/ core/ services/ ml_models/
      - name: Run Bandit
        run: |
          cd ai-services
          bandit -r api/ core/ services/ ml_models/ -ll
      - name: Run pip-audit
        run: |
          cd ai-services
          pip-audit --desc
```

### Pre-commit Hooks

#### Instalación de Husky (Backend)

```bash
cd backend
npm install --save-dev husky
npx husky install
npx husky add .husky/pre-commit "npm run lint && npm run type-check"
```

#### Pre-commit Hook Manual

**Archivo:** `.git/hooks/pre-commit`

```bash
#!/bin/bash

echo "🔍 Ejecutando análisis estático antes del commit..."

# Backend
cd backend
if ! npm run lint; then
    echo "❌ ESLint falló. Corrige los errores antes de hacer commit."
    exit 1
fi

if ! npm run type-check; then
    echo "❌ TypeScript type-check falló. Corrige los errores antes de hacer commit."
    exit 1
fi
cd ..

# AI Services
cd ai-services
if ! make format-check; then
    echo "❌ Formato de código incorrecto. Ejecuta 'make format' para corregir."
    exit 1
fi
cd ..

echo "✅ Análisis estático completado exitosamente"
exit 0
```

**Hacer ejecutable:**
```bash
chmod +x .git/hooks/pre-commit
```

---

## 🐛 Solución de Problemas

### Problema 1: ESLint no encuentra archivos

**Síntoma:**
```
Error: No files matching the pattern "src/**/*.ts" were found.
```

**Solución:**
```bash
# Verificar que estás en el directorio correcto
cd backend

# Verificar que los archivos existen
ls -la src/

# Ejecutar con ruta relativa
npx eslint "src/**/*.ts"
```

### Problema 2: Pylint muestra muchos errores

**Síntoma:**
```
Pylint encuentra cientos de errores en archivos existentes.
```

**Solución:**
```bash
# Verificar configuración
cat ai-services/.pylintrc

# Ejecutar solo en archivos específicos primero
pylint --rcfile=.pylintrc api/routes/health.py

# Deshabilitar reglas específicas temporalmente
pylint --rcfile=.pylintrc --disable=missing-docstring api/
```

### Problema 3: Black no formatea código

**Síntoma:**
```
Black no hace cambios en el código.
```

**Solución:**
```bash
# Verificar que Black está instalado
pip show black

# Verificar versión
black --version

# Reinstalar si es necesario
pip install --upgrade black

# Ejecutar con verbose para ver qué está haciendo
black --verbose api/
```

### Problema 4: mypy encuentra errores de tipo

**Síntoma:**
```
mypy encuentra errores de tipo que TypeScript no encuentra.
```

**Solución:**
```bash
# Verificar configuración de mypy
cat ai-services/mypy.ini  # o pyproject.toml

# Ignorar imports faltantes temporalmente
mypy api/ --ignore-missing-imports

# Añadir tipos faltantes gradualmente
# Usar type: ignore para casos específicos
```

### Problema 5: Bandit encuentra falsos positivos

**Síntoma:**
```
Bandit marca código seguro como vulnerable.
```

**Solución:**
```bash
# Usar nivel de seguridad más bajo
bandit -r api/ -ll  # Low and lower

# Excluir archivos específicos
bandit -r api/ --exclude api/tests/

# Usar skip para ignorar tests específicos
bandit -r api/ --skip B101  # Skip assert_used
```

### Problema 6: pip-audit tarda mucho

**Síntoma:**
```
pip-audit tarda mucho tiempo en ejecutarse.
```

**Solución:**
```bash
# Usar cache
pip-audit --cache-dir ~/.cache/pip-audit

# Ejecutar solo en modo descripción (más rápido)
pip-audit --desc

# Ejecutar solo en requirements específicos
pip-audit -r requirements.txt
```

### Problema 7: Vulnerabilidades en Dependencias Transitivas (npm audit)

**Síntoma:**
```
npm audit fix no resuelve las vulnerabilidades automáticamente.
Se reportan vulnerabilidades en dependencias transitivas (dependencias de dependencias).
```

**Ejemplo:**
```
glob  10.3.7 - 11.0.3
Severity: high
12 high severity vulnerabilities
To address all issues, run: npm audit fix
```

**Causa:**
Las vulnerabilidades están en dependencias transitivas (dependencias de dependencias), no en las dependencias directas del proyecto. `npm audit fix` solo puede actualizar dependencias directas.

**Soluciones:**

#### Opción 1: Actualizar Dependencias Principales (Recomendado)

```bash
cd mobile

# Verificar versiones actuales
npm list expo react-native

# Actualizar Expo y React Native a las últimas versiones estables
npm install expo@latest react-native@latest

# Verificar si se resolvieron las vulnerabilidades
npm audit
```

#### Opción 2: Usar npm overrides (npm 8.3+)

Si no puedes actualizar las dependencias principales, puedes forzar versiones seguras usando `overrides`:

**Archivo:** `mobile/package.json`

```json
{
  "overrides": {
    "glob": "^11.0.0"
  }
}
```

Luego:
```bash
rm -rf node_modules package-lock.json
npm install
npm audit
```

#### Opción 3: Usar resolutions (si usas yarn)

Si el proyecto usa Yarn, puedes usar `resolutions`:

**Archivo:** `mobile/package.json`

```json
{
  "resolutions": {
    "glob": "^11.0.0"
  }
}
```

#### Opción 4: Evaluar el Riesgo Real

**IMPORTANTE:** No todas las vulnerabilidades requieren acción inmediata.

**Evaluar el riesgo:**

1. **Leer el advisory:**
   ```bash
   npm audit --json | grep -A 20 "GHSA-5j98-mcp5-4vw2"
   ```

2. **Verificar si la vulnerabilidad afecta tu uso:**
   - La vulnerabilidad de `glob` (GHSA-5j98-mcp5-4vw2) afecta al CLI cuando se usa con `-c/--cmd`
   - Si no usas el CLI de `glob` directamente, el riesgo puede ser bajo
   - Las dependencias transitivas pueden no usar la funcionalidad vulnerable

3. **Verificar si hay parches disponibles:**
   ```bash
   npm audit fix --force
   # ⚠️ CUIDADO: Esto puede romper dependencias
   ```

#### Opción 5: Documentar y Monitorear

Si no puedes resolver inmediatamente, documenta y monitorea:

**Archivo:** `mobile/.npm-audit-exceptions.md`

```markdown
# Excepciones de npm audit

## Vulnerabilidades Documentadas

### glob (GHSA-5j98-mcp5-4vw2)
- **Severidad:** High
- **Fecha detectada:** [Fecha]
- **Razón de excepción:** Dependencia transitiva de Expo. No se usa directamente el CLI vulnerable.
- **Plan de acción:** Actualizar Expo cuando haya versión estable disponible.
- **Revisión:** [Fecha de próxima revisión]
```

#### Opción 6: Usar npm-check-updates

Para actualizar todas las dependencias a las últimas versiones:

```bash
# Instalar npm-check-updates globalmente
npm install -g npm-check-updates

# Ver qué se actualizaría
ncu

# Actualizar package.json
ncu -u

# Instalar nuevas versiones
npm install

# Verificar vulnerabilidades
npm audit
```

#### Verificación Post-Solución

```bash
# Verificar que las vulnerabilidades se resolvieron
npm audit

# Verificar que el proyecto sigue funcionando
npm run lint
npm test

# Si es una app móvil, verificar que compila
npm run android  # o npm run ios
```

#### Caso Específico: Vulnerabilidad de glob en Expo

Para el caso específico de la vulnerabilidad de `glob` en proyectos Expo:

```bash
cd mobile

# 1. Verificar versión actual de Expo
npm list expo

# 2. Verificar si hay actualizaciones disponibles
npm outdated expo

# 3. Si hay actualización, actualizar Expo
npm install expo@latest

# 4. Si Expo está actualizado pero persisten las vulnerabilidades:
#    - Esperar a que Expo actualice sus dependencias
#    - O usar overrides (ver Opción 2)

# 5. Verificar después de actualizar
npm audit
```

**Nota sobre Expo:** Expo actualiza sus dependencias regularmente. Si estás en la última versión de Expo y aún hay vulnerabilidades, es probable que Expo aún no haya actualizado esa dependencia transitiva. En ese caso:

1. **Monitorear:** Revisar regularmente con `npm audit`
2. **Reportar:** Si es crítico, reportar a Expo
3. **Documentar:** Mantener registro de vulnerabilidades conocidas
4. **Mitigar:** Implementar medidas de seguridad adicionales si es necesario

#### Script de Verificación de Seguridad

Crear un script para verificar vulnerabilidades:

**Archivo:** `mobile/scripts/check-security.sh`

```bash
#!/bin/bash

echo "🔒 Verificando vulnerabilidades de seguridad..."

# Ejecutar audit
npm audit

# Guardar resultado
AUDIT_RESULT=$?

if [ $AUDIT_RESULT -ne 0 ]; then
    echo "⚠️ Se encontraron vulnerabilidades"
    echo "📋 Revisa el reporte arriba"
    echo "💡 Opciones:"
    echo "   1. npm audit fix (intentar corrección automática)"
    echo "   2. Actualizar dependencias principales"
    echo "   3. Usar overrides en package.json"
    echo "   4. Documentar excepciones si el riesgo es bajo"
    exit 1
else
    echo "✅ No se encontraron vulnerabilidades"
    exit 0
fi
```

**Ejecutar:**
```bash
chmod +x mobile/scripts/check-security.sh
./mobile/scripts/check-security.sh
```

---

## ✅ Mejores Prácticas

### 1. Ejecutar Análisis Regularmente

```bash
# Antes de cada commit
git add .
npm run lint  # o make lint
git commit -m "mensaje"

# Antes de cada push
npm run analyze  # o make analyze
git push
```

### 2. Corregir Problemas Gradualmente

No intentes corregir todos los problemas de una vez:

```bash
# 1. Corregir errores críticos primero
npm run lint  # Identificar errores

# 2. Corregir automáticamente lo que sea posible
npm run lint:fix

# 3. Corregir manualmente el resto
# Editar archivos uno por uno

# 4. Verificar que todo está bien
npm run analyze
```

### 3. Mantener Configuraciones Actualizadas

```bash
# Backend - Actualizar ESLint
cd backend
npm update eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin

# AI Services - Actualizar herramientas
cd ai-services
pip install --upgrade pylint flake8 black mypy bandit pip-audit
```

### 4. Integrar en el Flujo de Desarrollo

```bash
# Crear alias útiles (en ~/.bashrc o ~/.zshrc)
alias lint-backend='cd backend && npm run lint'
alias lint-ai='cd ai-services && make lint'
alias analyze-all='cd backend && npm run analyze && cd ../ai-services && make analyze'
```

### 5. Documentar Excepciones

Si necesitas ignorar una regla específica:

**ESLint:**
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = getData();
```

**Pylint:**
```python
# pylint: disable=missing-docstring
def internal_function():
    pass
```

**Flake8:**
```python
# noqa: E501
very_long_line_that_exceeds_the_maximum_length_limit = "value"
```

### 6. Revisar Reportes Regularmente

```bash
# Generar reportes semanalmente
./scripts/generate-static-analysis-reports.sh

# Revisar tendencias
# Comparar reportes de diferentes fechas
```

### 7. Configurar Umbrales de Calidad

**Backend - package.json:**
```json
{
  "scripts": {
    "lint:strict": "eslint src/**/*.ts --max-warnings 0",
    "type-check:strict": "tsc --noEmit --strict"
  }
}
```

**AI Services - Makefile:**
```makefile
lint-strict:
	@pylint --rcfile=.pylintrc --fail-under=9.0 api/ core/ services/ ml_models/
```

---

## 📚 Recursos Adicionales

### Documentación Oficial

- [ESLint Documentation](https://eslint.org/docs/latest/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Pylint Documentation](https://pylint.pycqa.org/)
- [Flake8 Documentation](https://flake8.pycqa.org/)
- [Black Documentation](https://black.readthedocs.io/)
- [mypy Documentation](https://mypy.readthedocs.io/)
- [Bandit Documentation](https://bandit.readthedocs.io/)

### Documentación del Proyecto

- [STATIC_CODE_ANALYSIS_SETUP.md](STATIC_CODE_ANALYSIS_SETUP.md) - Configuración detallada
- [STATIC_CODE_ANALYSIS.md](STATIC_CODE_ANALYSIS.md) - Reporte de análisis completo
- [TESTING_STRATEGY.md](../TESTING_STRATEGY.md) - Estrategia de testing

### Comandos de Referencia Rápida

#### Backend
```bash
npm run lint          # Linting
npm run lint:fix      # Corregir automáticamente
npm run format        # Formatear código
npm run format:check  # Verificar formato
npm run type-check    # Verificar tipos
npm run audit         # Auditoría de seguridad
npm run analyze       # Análisis completo
```

#### AI Services
```bash
make lint             # Linting (Pylint + Flake8)
make lint-fix         # Corregir automáticamente
make format           # Formatear con Black
make format-check     # Verificar formato
make type-check       # Verificar tipos (mypy)
make security-check   # Análisis de seguridad
make analyze          # Análisis completo
```

#### Mobile
```bash
npm run lint          # Linting
```

---

## 📝 Checklist de Ejecución

Antes de hacer commit, verifica:

- [ ] **Backend:**
  - [ ] `npm run lint` - Sin errores
  - [ ] `npm run type-check` - Sin errores de tipo
  - [ ] `npm run format:check` - Código formateado
  - [ ] `npm run audit` - Sin vulnerabilidades críticas

- [ ] **AI Services:**
  - [ ] `make lint` - Sin errores críticos
  - [ ] `make format-check` - Código formateado
  - [ ] `make type-check` - Sin errores de tipo
  - [ ] `make security-check` - Sin vulnerabilidades críticas

- [ ] **Mobile:**
  - [ ] `npm run lint` - Sin errores críticos

- [ ] **General:**
  - [ ] Todos los tests pasan
  - [ ] Cobertura de código > 85%
  - [ ] Sin console.log en producción
  - [ ] Sin código comentado innecesario

---

## 🎯 Objetivos de Calidad

### Métricas Objetivo

| Métrica | Objetivo | Actual |
|---------|----------|--------|
| **Pylint Score** | > 9.0 | 9.2 ✅ |
| **ESLint Errors** | 0 | 0 ✅ |
| **TypeScript Errors** | 0 | 0 ✅ |
| **Bandit Critical** | 0 | 0 ✅ |
| **Complejidad Ciclomática** | < 10 | 4.2 ✅ |
| **Duplicación de Código** | < 3% | 1.2% ✅ |

---

**Última actualización:** Enero 2025  
**Mantenido por:** Equipo de Desarrollo RespiCare Tacna  
**Versión:** 1.0

