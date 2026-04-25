# 🧪 Guía de Configuración de Testing - RespiCare Tacna

Esta guía documenta la configuración completa del sistema de testing para todos los componentes del proyecto.

## 📋 Tabla de Contenidos

1. [Configuración General](#configuración-general)
2. [Backend (Jest)](#backend-jest)
3. [Web (Jest)](#web-jest)
4. [Mobile (Jest)](#mobile-jest)
5. [AI Services (PyTest)](#ai-services-pytest)
6. [Reportes y Cobertura](#reportes-y-cobertura)
7. [CI/CD Integration](#cicd-integration)

---

## Configuración General

### Herramientas Utilizadas

- **Backend**: Jest + ts-jest
- **Web**: Jest + react-scripts
- **Mobile**: Jest + react-native-testing-library
- **AI Services**: PyTest + pytest-cov

### Reportes Generados

Todos los componentes generan:
- **JUnit XML**: Para integración con CI/CD y visualización de resultados
- **Coverage Reports**: JSON, LCOV, HTML, Cobertura (XML)
- **Codecov**: Integración automática para tracking de cobertura

---

## Backend (Jest)

### Configuración

**Archivo**: `backend/jest.config.js`

```javascript
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts', '**/tests/**/*.spec.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json', 'cobertura'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'coverage',
        outputName: 'junit.xml',
        suiteName: 'Backend Tests',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: 'true'
      }
    ]
  ]
};
```

### Scripts NPM

```json
{
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage",
  "test:unit": "jest tests/unit",
  "test:integration": "jest tests/integration",
  "test:e2e": "jest tests/e2e",
  "test:performance": "jest tests/performance",
  "test:security": "jest tests/security"
}
```

### Ejecución

```bash
# Todos los tests
npm test

# Tests con cobertura
npm run test:coverage

# Tests unitarios
npm run test:unit

# Tests de integración
npm run test:integration
```

### Reportes Generados

- `backend/coverage/junit.xml` - Reporte JUnit XML
- `backend/coverage/coverage-final.json` - Cobertura en JSON
- `backend/coverage/lcov.info` - Cobertura en formato LCOV
- `backend/coverage/index.html` - Reporte HTML interactivo

### Umbrales de Cobertura

- **Global**: 80% (branches, functions, lines, statements)
- **CI fallará** si la cobertura está por debajo del umbral

---

## Web (Jest)

### Configuración

**Archivo**: `web/jest.config.js`

```javascript
module.exports = {
  testEnvironment: 'jsdom',
  testMatch: [
    '**/tests/**/*.test.{js,jsx,ts,tsx}',
    '**/__tests__/**/*.{js,jsx,ts,tsx}'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json', 'cobertura'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'coverage',
        outputName: 'junit.xml',
        suiteName: 'Web Tests',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: 'true'
      }
    ]
  ]
};
```

### Scripts NPM

```json
{
  "test": "react-scripts test",
  "test:unit": "react-scripts test --testPathPattern=__tests__ --coverage",
  "test:watch": "react-scripts test --watch",
  "test:coverage": "react-scripts test --coverage --watchAll=false"
}
```

### Ejecución

```bash
# Tests en modo watch
npm test

# Tests unitarios con cobertura
npm run test:unit

# Tests con cobertura (sin watch)
npm run test:coverage
```

### Reportes Generados

- `web/coverage/junit.xml` - Reporte JUnit XML
- `web/coverage/coverage-final.json` - Cobertura en JSON
- `web/coverage/lcov.info` - Cobertura en formato LCOV
- `web/coverage/index.html` - Reporte HTML interactivo

### Umbrales de Cobertura

- **Global**: 70% (branches, functions, lines, statements)

---

## Mobile (Jest)

### Configuración

**Archivo**: `mobile/jest.config.js`

```javascript
module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: [
    '**/__tests__/**/*.(test|spec).(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)'
  ],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json', 'cobertura'],
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 70,
      functions: 70,
      lines: 70
    }
  },
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'coverage',
        outputName: 'junit.xml',
        suiteName: 'Mobile Tests',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: 'true'
      }
    ]
  ]
};
```

### Scripts NPM

```json
{
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage",
  "test:unit": "jest __tests__/",
  "test:integration": "jest __tests__/integration/",
  "test:offline": "jest __tests__/offline/",
  "test:sync": "jest __tests__/sync/",
  "test:performance": "jest __tests__/performance/",
  "test:e2e": "detox test"
}
```

### Ejecución

```bash
# Todos los tests
npm test

# Tests con cobertura
npm run test:coverage

# Tests unitarios
npm run test:unit

# Tests de integración
npm run test:integration

# Tests E2E (Detox)
npm run test:e2e
```

### Reportes Generados

- `mobile/coverage/junit.xml` - Reporte JUnit XML
- `mobile/coverage/coverage-final.json` - Cobertura en JSON
- `mobile/coverage/lcov.info` - Cobertura en formato LCOV
- `mobile/coverage/index.html` - Reporte HTML interactivo

### Umbrales de Cobertura

- **Global**: 70% (statements, branches, functions, lines)

---

## AI Services (PyTest)

### Configuración

**Archivo**: `ai-services/pytest.ini`

```ini
[tool:pytest]
testpaths = tests
python_files = test_*.py *_test.py
python_classes = Test*
python_functions = test_*
addopts = 
    -v
    --tb=short
    --strict-markers
    --strict-config
    --cov=.
    --cov-report=term-missing
    --cov-report=html:htmlcov
    --cov-report=xml:coverage.xml
    --junitxml=junit.xml
    --cov-fail-under=70
    --asyncio-mode=auto
    --maxfail=5
markers =
    unit: Unit tests
    integration: Integration tests
    slow: Slow tests
    ai: AI/ML specific tests
    circuit_breaker: Circuit breaker tests
    repository: Repository pattern tests
    strategy: Strategy pattern tests
    decorator: Decorator pattern tests
    factory: Factory pattern tests
```

### Ejecución

```bash
# Todos los tests
pytest

# Tests con cobertura
pytest --cov=. --cov-report=html

# Tests unitarios
pytest -m unit

# Tests de integración
pytest -m integration

# Tests específicos
pytest tests/ml_models/test_medical_bert.py
```

### Reportes Generados

- `ai-services/junit.xml` - Reporte JUnit XML
- `ai-services/coverage.xml` - Cobertura en formato XML (Cobertura)
- `ai-services/htmlcov/index.html` - Reporte HTML interactivo

### Umbrales de Cobertura

- **Global**: 70% (configurado con `--cov-fail-under=70`)
- **CI fallará** si la cobertura está por debajo del umbral

---

## Reportes y Cobertura

### Formatos de Reporte

#### JUnit XML
- **Formato**: XML estándar JUnit
- **Uso**: Integración con CI/CD, visualización en GitHub Actions
- **Ubicación**: `{component}/coverage/junit.xml` o `{component}/junit.xml`

#### Coverage Reports

1. **JSON** (`coverage-final.json`)
   - Formato estructurado para procesamiento programático
   - Usado por herramientas de análisis

2. **LCOV** (`lcov.info`)
   - Formato estándar para visualización en Codecov
   - Compatible con la mayoría de herramientas de cobertura

3. **HTML** (`index.html`)
   - Reporte interactivo para visualización local
   - Incluye gráficos y detalles por archivo

4. **XML/Cobertura** (`coverage.xml`)
   - Formato Cobertura para integración con SonarQube y otras herramientas
   - Incluye métricas detalladas

### Visualización de Reportes

#### Localmente

```bash
# Backend
cd backend
npm run test:coverage
open coverage/index.html

# Web
cd web
npm run test:coverage
open coverage/index.html

# Mobile
cd mobile
npm run test:coverage
open coverage/index.html

# AI Services
cd ai-services
pytest --cov=. --cov-report=html
open htmlcov/index.html
```

#### En CI/CD

- **GitHub Actions**: Los reportes JUnit XML se publican como artifacts
- **Codecov**: Los reportes LCOV/XML se suben automáticamente
- **Visualización**: Disponible en la pestaña "Actions" de GitHub

---

## CI/CD Integration

### GitHub Actions Workflows

#### Backend Tests
- **Archivo**: `.github/workflows/backend-tests.yml`
- **Reportes**: JUnit XML, Coverage JSON/LCOV
- **Artifacts**: `backend-unit-test-reports`, `backend-integration-test-reports`, `backend-coverage-reports`

#### Web Tests
- **Archivo**: `.github/workflows/web-tests.yml`
- **Reportes**: JUnit XML, Coverage JSON/LCOV
- **Artifacts**: `web-test-reports`, `web-coverage-reports`

#### AI Services Tests
- **Archivo**: `.github/workflows/ai-services-tests.yml`
- **Reportes**: JUnit XML, Coverage XML
- **Artifacts**: `ai-services-test-reports`

### Codecov Integration

Todos los componentes están configurados para subir reportes a Codecov:

```yaml
- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v4
  with:
    files: ./{component}/coverage/lcov.info
    flags: {component-name}
    name: {component-name}-coverage
    fail_ci_if_error: false
```

### Umbrales de Cobertura en CI

| Componente | Umbral Mínimo | Objetivo |
|------------|---------------|----------|
| Backend    | 80%           | 98%      |
| Web        | 70%           | 80%      |
| Mobile     | 70%           | 80%      |
| AI Services| 70%           | 83%      |

**Nota**: Los umbrales mínimos están configurados para que CI falle si no se alcanzan.

---

## Dependencias Requeridas

### Backend

```json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "jest-extended": "^6.0.0",
    "jest-junit": "^16.0.0"
  }
}
```

### Web

```json
{
  "devDependencies": {
    "@testing-library/jest-dom": "^6.1.5",
    "@testing-library/react": "^14.1.2",
    "@testing-library/user-event": "^14.5.1",
    "jest-junit": "^16.0.0"
  }
}
```

### Mobile

```json
{
  "devDependencies": {
    "jest": "^29.2.1",
    "@testing-library/react-native": "^12.1.2",
    "@testing-library/jest-native": "^5.4.3",
    "jest-junit": "^16.0.0"
  }
}
```

### AI Services

```txt
pytest==7.4.3
pytest-asyncio==0.21.1
pytest-cov==4.1.0
pytest-mock==3.12.0
coverage==7.3.2
```

---

## Troubleshooting

### Problema: JUnit XML no se genera

**Solución**:
1. Verificar que `jest-junit` esté instalado: `npm list jest-junit`
2. Verificar la configuración en `jest.config.js`
3. Ejecutar tests con `--coverage` para asegurar que se genere el directorio

### Problema: Coverage XML no se genera (AI Services)

**Solución**:
1. Verificar que `pytest-cov` esté instalado: `pip list | grep pytest-cov`
2. Verificar `pytest.ini` tiene `--cov-report=xml:coverage.xml`
3. Ejecutar: `pytest --cov=. --cov-report=xml`

### Problema: Umbrales de cobertura no se respetan

**Solución**:
1. Verificar `coverageThreshold` en `jest.config.js`
2. Verificar `--cov-fail-under` en `pytest.ini`
3. Ejecutar tests con `--coverage` o `--cov`

### Problema: Reportes no se suben a Codecov

**Solución**:
1. Verificar que el archivo `lcov.info` existe
2. Verificar el workflow de GitHub Actions
3. Verificar permisos del token de Codecov

---

## Próximos Pasos

1. ✅ Configuración Jest (web/mobile/backend)
2. ✅ Configuración PyTest (AI Services)
3. ✅ Tooling de cobertura y reporte (JUnit, coverage.xml)
4. ⏳ Tests unitarios completos
5. ⏳ Tests de integración completos
6. ⏳ Tests E2E completos

---

**Última actualización**: Noviembre 2024  
**Versión**: 1.0.0

