# Tests de Web - RespiCare Tacna

Este directorio contiene todos los tests para el frontend web.

## Estructura

```
web/src/tests/
├── integration/
│   ├── component-integration.test.js    # Tests de integración entre componentes
│   └── user-flows.test.js               # Tests de flujos de usuario completos
├── performance/
│   └── performance.test.js               # Tests de performance y optimización
└── accessibility/
    └── accessibility-advanced.test.js   # Tests avanzados de accesibilidad
```

## Tipos de Tests

### 1. Tests de Integración (`integration/`)

#### `component-integration.test.js`
- Integración entre componentes en escenarios reales
- Interacción entre Home, Dashboard, Analytics
- Integración de tema y idioma
- Manejo de errores entre componentes
- Gestión de estado compartido

#### `user-flows.test.js`
- Flujos completos de usuario
- Análisis de síntomas completo
- Navegación entre páginas
- Personalización de tema e idioma
- Recuperación de errores
- Análisis multi-paso

### 2. Tests de Performance (`performance/`)

#### `performance.test.js`
- Tiempo de renderizado de componentes
- Rendimiento de listas virtualizadas
- Uso de memoria
- Optimización de re-renders
- Lazy loading
- Carga de imágenes
- Impacto en bundle size

### 3. Tests de Accesibilidad (`accessibility/`)

#### `accessibility-advanced.test.js`
- Cumplimiento WCAG 2.1 AA con axe-core
- Navegación por teclado
- Soporte para lectores de pantalla
- Contraste de colores
- Accesibilidad de formularios
- Gestión de foco
- HTML semántico
- Textos alternativos
- Diseño responsive accesible

## Ejecución

### Todos los tests
```bash
cd web
npm test
```

### Tests específicos
```bash
# Tests de integración
npm test -- integration

# Tests de performance
npm test -- performance

# Tests de accesibilidad
npm test -- accessibility
```

### Con cobertura
```bash
npm run test:coverage
```

### En modo watch
```bash
npm run test:watch
```

## Dependencias

### Requeridas
- `@testing-library/react` - Testing de componentes React
- `@testing-library/jest-dom` - Matchers adicionales
- `jest-axe` - Testing de accesibilidad con axe-core
- `axios` - Mocking de llamadas API

### Instalación
```bash
npm install --save-dev jest-axe
```

## Cobertura Objetivo

- **Integración**: 80%+
- **Performance**: Tests críticos cubiertos
- **Accesibilidad**: 100% de componentes principales

## Mejores Prácticas

1. **Tests de Integración**:
   - Probar interacciones reales entre componentes
   - Usar providers completos (ThemeProvider, Router)
   - Mockear solo dependencias externas (API)

2. **Tests de Performance**:
   - Establecer umbrales realistas
   - Medir en condiciones consistentes
   - Considerar variabilidad del sistema

3. **Tests de Accesibilidad**:
   - Ejecutar axe-core en todos los componentes
   - Verificar navegación por teclado
   - Probar con lectores de pantalla cuando sea posible

## Troubleshooting

### Tests de accesibilidad fallan
- Verificar que `jest-axe` esté instalado
- Asegurar que los componentes tengan atributos ARIA apropiados
- Revisar contraste de colores

### Tests de performance inconsistentes
- Ejecutar en ambiente controlado
- Considerar variabilidad del sistema
- Usar promedios para métricas

### Tests de integración lentos
- Optimizar mocks de API
- Usar `waitFor` apropiadamente
- Evitar esperas innecesarias

## Referencias

- [Testing Library](https://testing-library.com/)
- [Jest Axe](https://github.com/nickcolley/jest-axe)
- [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/)
- [Web Performance](https://web.dev/performance/)

