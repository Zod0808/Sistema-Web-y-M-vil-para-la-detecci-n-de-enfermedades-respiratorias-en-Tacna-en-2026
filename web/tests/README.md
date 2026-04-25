# Documentación de Pruebas - Frontend Web

Este documento describe los resultados de las pruebas implementadas para el frontend web del sistema RespiCare.

## 📊 Resumen de Pruebas

### Estado General
- **Total de Tests**: 40+ (incluyendo E2E)
- **Tests Pasados**: ~95%+
- **Tests Unitarios**: Componentes principales cubiertos
- **Tests E2E**: Flujos críticos implementados
- **Tests de Accesibilidad**: Implementados con jest-axe
- **Tests Responsive**: Implementados para múltiples viewports

### Tipos de Tests
- ✅ **Unitarios**: Tests de componentes React con Jest + React Testing Library
- ✅ **E2E**: Tests end-to-end con Cypress
- ✅ **Accesibilidad**: Tests de accesibilidad (a11y) con jest-axe
- ✅ **Responsive**: Tests de diseño responsive

## 🧪 Tipos de Pruebas Implementadas

### 1. Pruebas Unitarias (`src/components/__tests__/`)

#### **ChatBot.test.js**
- ✅ Renderizado del componente
- ✅ Inicialización de sesión
- ✅ Manejo de mensajes del usuario
- ✅ Manejo de respuestas del bot
- ✅ Extracción de síntomas
- ✅ Manejo de errores de API
- ✅ Estados de carga
- ✅ Accesibilidad (ARIA labels, navegación por teclado)
- ✅ Diseño responsive (mobile, tablet, desktop)

#### **Navbar.test.js**
- ✅ Renderizado del navbar
- ✅ Enlaces de navegación
- ✅ Resaltado de ruta activa
- ✅ Accesibilidad (roles, navegación por teclado)
- ✅ Diseño responsive

#### **SymptomReportForm.test.js**
- ✅ Renderizado del formulario
- ✅ Interacciones del formulario
- ✅ Validación de campos requeridos
- ✅ Envío del formulario
- ✅ Manejo de errores
- ✅ Accesibilidad (labels, checkboxes)

#### **AnalyticsDashboard.test.js**
- ✅ Renderizado del dashboard
- ✅ Carga de datos
- ✅ Manejo de errores de API
- ✅ Accesibilidad

### 2. Pruebas End-to-End (E2E) (`cypress/e2e/`)

#### **chatbot.cy.js**
- ✅ Visualización del chatbot en la página principal
- ✅ Envío de mensajes del usuario
- ✅ Recepción de respuestas del bot
- ✅ Manejo de conversaciones múltiples

#### **navigation.cy.js**
- ✅ Navegación entre páginas
- ✅ Resaltado de ruta activa
- ✅ Navegación de regreso al inicio

#### **symptom-report.cy.js**
- ✅ Apertura del formulario de reporte
- ✅ Llenado y envío del formulario
- ✅ Validación de campos requeridos

### 3. Pruebas de Accesibilidad (`tests/a11y.test.js`)

- ✅ Violaciones de accesibilidad (jest-axe)
- ✅ Jerarquía de encabezados
- ✅ Navegación accesible
- ✅ Etiquetas de formulario
- ✅ Navegación por teclado

### 4. Pruebas de Diseño Responsive (`tests/responsive.test.js`)

- ✅ Renderizado en móvil (375px)
- ✅ Renderizado en tablet (768px)
- ✅ Renderizado en desktop (1920px)
- ✅ Adaptación en breakpoints

## ⚙️ Configuración y Ejecución

### Prerrequisitos
- Node.js 18+
- npm o yarn
- Variables de entorno configuradas

### Instalación de Dependencias

```bash
cd web
npm install
```

### Ejecutar Pruebas

```bash
# Todas las pruebas
npm test

# Pruebas unitarias solamente
npm run test:unit

# Con cobertura
npm run test:coverage

# Modo watch
npm run test:watch

# Tests E2E (requiere Cypress)
npx cypress open  # Modo interactivo
npx cypress run   # Modo headless

# Tests de accesibilidad
npm test -- tests/a11y.test.js

# Tests responsive
npm test -- tests/responsive.test.js
```

### Configuración de Variables de Entorno

Crear un archivo `.env.test` con:

```
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_AI_SERVICES_URL=http://localhost:8000/api/v1
REACT_APP_ENVIRONMENT=test
```

## 📝 Estructura de Pruebas

```
web/
├── src/
│   ├── components/
│   │   └── __tests__/
│   │       ├── ChatBot.test.js
│   │       ├── Navbar.test.js
│   │       ├── SymptomReportForm.test.js
│   │       └── AnalyticsDashboard.test.js
│   └── utils/
│       └── __tests__/
│           └── symptomFormatter.test.js
├── cypress/
│   ├── e2e/
│   │   ├── chatbot.cy.js
│   │   ├── navigation.cy.js
│   │   └── symptom-report.cy.js
│   └── config.js
├── tests/
│   ├── a11y.test.js
│   ├── responsive.test.js
│   └── setup.ts
└── jest.config.js
```

## 🎯 Objetivos de Cobertura

### Objetivo Actual
- **Statements**: 70% (en progreso)
- **Branches**: 70% (en progreso)
- **Functions**: 70% (en progreso)
- **Lines**: 70% (en progreso)

### Estrategia para Mejorar Cobertura
- Añadir más casos de prueba para componentes restantes
- Cubrir todos los métodos de utilidades
- Asegurar que los componentes manejen todos los posibles escenarios de error
- Añadir tests para hooks personalizados

## 📈 Métricas de Rendimiento Esperadas

- **Tiempo de Carga Inicial**: < 2s
- **Lighthouse Score**: > 90
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s

## 🔒 Pruebas de Accesibilidad (WCAG 2.1)

Se han implementado pruebas para cubrir aspectos clave de accesibilidad:
- **Nivel A**: Contraste de colores, navegación por teclado, etiquetas
- **Nivel AA**: Estructura semántica, roles ARIA, navegación
- **Nivel AAA**: (Opcional) Mejoras adicionales

## 🚀 Integración con CI/CD

El workflow de GitHub Actions (`.github/workflows/web-tests.yml`) está configurado para:
- Ejecutar todas las pruebas (unitarias, E2E, accesibilidad) en cada push y pull request
- Generar reportes de cobertura de código
- Asegurar que el código cumpla con los estándares de calidad antes de ser fusionado

## 📚 Recursos Adicionales

- [React Testing Library Documentation](https://testing-library.com/react)
- [Cypress Documentation](https://docs.cypress.io/)
- [jest-axe Documentation](https://github.com/nickcolley/jest-axe)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---
**Última actualización:** Diciembre 2024

