# 📱 Tests Mobile - RespiCare Tacna

Este directorio contiene todos los tests para la aplicación móvil RespiCare (Next.js/Capacitor).

## 📋 Estructura de Tests

```
mobile/
├── __tests__/
│   ├── components/          # Tests unitarios de componentes React Native
│   │   └── symptomAnalyzer.test.tsx
│   ├── services/            # Tests unitarios de servicios
│   │   ├── aiService.test.ts
│   │   ├── apiService.test.ts
│   │   └── localStorageService.test.ts
│   ├── integration/         # Tests de integración con backend
│   │   └── backend-integration.test.ts
│   ├── offline/             # Tests de modo offline
│   │   └── offline-mode.test.ts
│   └── sync/                # Tests de sincronización
│       └── synchronization.test.ts
├── e2e/                     # Tests E2E con Detox
│   └── offline-sync.e2e.ts
├── jest.config.js           # Configuración de Jest
├── jest.setup.js            # Setup global de Jest
└── .detoxrc.js              # Configuración de Detox
```

## 🧪 Tipos de Tests

### 1. Tests Unitarios

Prueban componentes y servicios de forma aislada.

**Ejecutar:**
```bash
npm test                    # Todos los tests
npm run test:unit           # Solo tests unitarios
npm run test:watch          # Modo watch
npm run test:coverage       # Con cobertura de código
```

### 2. Tests de Integración

Verifican la comunicación real con el backend (requiere backend corriendo).

**Ejecutar:**
```bash
npm run test:integration

# Para saltar tests de integración:
SKIP_BACKEND_TESTS=true npm run test:integration
```

### 3. Tests de Modo Offline

Validan funcionalidad cuando no hay conexión a internet.

**Ejecutar:**
```bash
npm run test:offline
```

### 4. Tests de Sincronización

Verifican la sincronización bidireccional de datos.

**Ejecutar:**
```bash
npm run test:sync
```

### 5. Tests E2E (End-to-End)

Pruebas completas en dispositivos reales/emuladores usando Detox.

**Prerequisitos:**
- Instalar Detox CLI: `npm install -g detox-cli`
- Configurar emulador/dispositivo
- Build de la aplicación

**Ejecutar:**
```bash
npm run test:e2e:build      # Build de la app
npm run test:e2e             # Ejecutar tests E2E
```

## 📊 Cobertura de Tests

### Servicios Cubiertos ✅
- ✅ `aiService` - Análisis de síntomas, tendencias, recomendaciones
- ✅ `apiService` - Autenticación, CRUD, manejo de errores
- ✅ `localStorageService` - Almacenamiento offline, sincronización

### Componentes Cubiertos ✅
- ✅ `AIAnalysisScreen` - Análisis de síntomas con IA

### Flujos E2E Cubiertos ✅
- ✅ Guardado offline de datos
- ✅ Sincronización automática
- ✅ Análisis offline
- ✅ Transición online/offline
- ✅ Manejo de errores de sincronización

## 🎯 Métricas Objetivo

- **Cobertura de código:** >70%
- **Tests unitarios:** 100+ tests
- **Tests de integración:** 10+ tests
- **Tests E2E:** 5+ flujos críticos
- **Tests offline:** 10+ tests

## 🔧 Configuración

### Variables de Entorno para Tests

Crear archivo `.env.test`:
```bash
API_BASE_URL=http://localhost:3001/api/v1
SKIP_BACKEND_TESTS=false
```

### Mocks Incluidos

- `@react-native-async-storage/async-storage` - Almacenamiento local
- `@react-native-community/netinfo` - Estado de conexión
- `react-native-paper` - Componentes UI
- `@react-navigation/native` - Navegación

## 🐛 Troubleshooting

### Tests fallan con errores de módulos nativos

Ejecutar:
```bash
npm run jest --clearCache
```

### Tests E2E no encuentran dispositivo

Verificar configuración en `.detoxrc.js` y listar dispositivos disponibles:
```bash
detox devices
```

### Tests de integración fallan

Verificar que el backend esté corriendo en `http://localhost:3001` o ajustar `API_BASE_URL`.

## 📝 Agregar Nuevos Tests

1. **Test unitario de servicio:**
   - Crear archivo en `__tests__/services/`
   - Mockear dependencias externas
   - Testear métodos públicos

2. **Test de componente:**
   - Crear archivo en `__tests__/components/`
   - Usar `@testing-library/react-native`
   - Testear renderizado e interacciones

3. **Test E2E:**
   - Crear archivo en `e2e/` con extensión `.e2e.ts`
   - Usar selectores con `testID` en componentes
   - Testear flujos completos de usuario

## 📚 Documentación Adicional

### Documentación del Proyecto
- **[README Principal de Mobile](../README.md)** - Documentación completa de la app móvil
- **[PROJECT_ROADMAP.md](../../PROJECT_ROADMAP.md)** - Roadmap completo del proyecto (Sección 5.4: Testing Mobile)
- **[README Principal del Proyecto](../../README.md)** - Documentación general del proyecto

### Documentación de Testing
- **[TESTING_STRATEGY.md](../../docs/testing/TESTING_STRATEGY.md)** - Estrategia general de testing
- **[backend/tests/README.md](../../backend/tests/README.md)** - Tests del backend
- **[web/tests/README.md](../../web/tests/README.md)** - Tests del frontend web

### Documentación de Optimización
- **[PERFORMANCE_OPTIMIZATION.md](../docs/PERFORMANCE_OPTIMIZATION.md)** - Guía completa de optimización de performance mobile

### Recursos Externos
- [Guía de Testing React Native](https://reactnative.dev/docs/testing-overview)
- [Testing Library para React Native](https://callstack.github.io/react-native-testing-library/)
- [Documentación de Detox](https://wix.github.io/Detox/docs/introduction/getting-started)

### Estructura de Archivos Relacionados

```
mobile/
├── README.md                    # ← Documentación principal de mobile
├── __tests__/
│   ├── README.md                # ← Este archivo (guía de tests)
│   ├── services/                # Tests de servicios
│   ├── components/              # Tests de componentes
│   ├── integration/             # Tests de integración
│   ├── offline/                 # Tests de modo offline
│   └── sync/                    # Tests de sincronización
├── e2e/                         # Tests E2E
├── jest.config.js               # Configuración de Jest
├── jest.setup.js                # Setup global
└── .detoxrc.js                  # Configuración de Detox
```

---

**Última actualización:** Diciembre 2024

