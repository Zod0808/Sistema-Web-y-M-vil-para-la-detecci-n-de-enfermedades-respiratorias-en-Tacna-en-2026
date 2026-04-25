# 📱 RespiCare Mobile - React Native

[![Mobile CI](https://img.shields.io/github/actions/workflow/status/USER_OR_ORG/REPO/mobile-ci.yml?label=Mobile%20CI)](../../actions/workflows/mobile-ci.yml)


Aplicación móvil completa para el sistema de gestión de enfermedades respiratorias RespiCare Tacna, con integración completa al backend, servicios de IA y funcionalidades offline.

## 🎯 Funcionalidades Implementadas

### ✅ **Funcionalidades Principales (Completas)**

#### 1. **Conexión al Backend** 🔗
- API client completo con autenticación JWT
- Manejo automático de tokens y refresh
- Reintentos automáticos y manejo de errores
- Configuración por ambiente (desarrollo/producción)
- Interceptores para requests/responses

#### 2. **Servicios de IA** 🤖
- Análisis de síntomas con IA avanzada
- Fallback a análisis local cuando no hay conexión
- Múltiples estrategias de análisis (OpenAI, local, híbrido)
- Análisis de tendencias temporales
- Recomendaciones médicas personalizadas
- Clasificación de urgencia automática

#### 3. **Chatbot Médico** 💬
- Asistente médico virtual inteligente
- Análisis de síntomas en tiempo real
- Detección automática de emergencias
- Recomendaciones contextuales
- Interfaz de chat intuitiva
- Sugerencias automáticas

#### 4. **Funcionalidades de Base de Datos** 💾
- Almacenamiento local con AsyncStorage
- Sincronización bidireccional con el backend
- Cola de sincronización para modo offline (historias, citas, alertas)
- Gestión de conflictos de datos (last-write-wins local, prioridad servidor al cachear)
- Backup y recuperación automática

#### 5. **Captura de Datos** 📝
- Formularios optimizados para móvil
- Captura de imágenes con cámara/galería
- Geolocalización automática
- Síntomas predefinidos para selección rápida
- Validación de datos en tiempo real
- Guardado offline automático

#### 6. **Notificaciones** 🔔
- Sistema de notificaciones push
- Notificaciones de emergencia médica
- Recordatorios programados
- Notificaciones de sincronización
- Gestión de notificaciones no leídas
- Alertas de conectividad

#### 7. **Funcionalidad Offline** 📱
- Modo offline completo
- Sincronización automática cuando hay conexión
- Indicadores de estado de conexión
- Cola de sincronización inteligente
- Gestión de datos pendientes
- Recuperación automática

## 🏗️ Arquitectura Técnica

### **Stack Tecnológico:**
- **React Native 0.72.6** - Framework principal
- **TypeScript** - Tipado estático
- **React Navigation 6** - Navegación
- **React Native Paper** - UI Components
- **Zustand** - Estado global
- **React Query** - Gestión de datos
- **AsyncStorage** - Almacenamiento local
- **Axios** - Cliente HTTP
- **NetInfo** - Detección de conectividad

### **Arquitectura de Servicios:**
```
mobile/
├── src/
│   ├── services/
│   │   ├── api.ts                       # Cliente API centralizado
│   │   ├── localStorage.ts              # Almacenamiento local (colas de sync)
│   │   ├── aiService.ts                 # Servicio de IA
│   │   ├── i18nService.ts               # Internacionalización
│   │   ├── telemedicineService.ts       # Telemedicina (citas y llamadas)
│   │   ├── predictiveAnalysisService.ts # Analytics/ML
│   │   ├── arService.ts                 # Realidad aumentada (stub)
│   │   ├── wearablesService.ts          # Wearables (stub seguro)
│   │   ├── analyticsService.ts          # Analíticas (eventos/timings + persistencia)
│   │   └── errorTrackingService.ts      # Errores en producción (handler global)
│   ├── components/
│   │   ├── ChatBot/              # Chatbot médico
│   │   ├── DataCapture/          # Captura de datos
│   │   ├── Notifications/        # Sistema de notificaciones
│   │   └── Offline/              # Funcionalidad offline
│   ├── screens/
│   │   ├── HomeScreen.tsx        # Dashboard principal
│   │   ├── LoginScreen.tsx       # Autenticación
│   │   └── ProfileScreen.tsx     # Perfil de usuario
│   ├── store/
│   │   └── useAppStore.ts        # Estado global (Zustand)
│   ├── types/
│   │   └── index.ts              # Tipos TypeScript
│   ├── config/
│   │   └── environment.ts        # Configuración por ambiente
│   └── navigation/
│       └── AppNavigator.tsx      # Navegación principal
├── __tests__/                    # Tests unitarios y de integración
│   ├── services/                 # Tests de servicios
│   ├── components/               # Tests de componentes
│   ├── integration/              # Tests de integración
│   ├── offline/                  # Tests de modo offline
│   └── sync/                     # Tests de sincronización
├── e2e/                          # Tests E2E con Detox
├── jest.config.js                # Configuración de Jest
├── jest.setup.js                 # Setup global de tests
└── .detoxrc.js                   # Configuración de Detox
```

### **Servicios Base (actualizado)**

- `src/services/api.ts`:
  - Cliente HTTP central con Axios (baseURL, timeout).
  - Interceptores: adjunta token, refresco automático 401, reintentos con backoff.
  - Manejo de errores estandarizado (`ApiResponse` con `success/error/message`).
  - Helpers de autenticación (almacenamiento de tokens/usuario).

- `src/services/localStorage.ts`:
  - Abstracción de AsyncStorage y utilidades “secure-ish” (prefijo `secure_`).
  - Cola de sincronización offline con reintentos y listeners de estado.
  - Caché de datos: usuario, tokens (coordinado con `apiService`), últimas predicciones.
  - Utilidades: tamaño de almacenamiento, settings, clean/reset.

- `src/services/localMLService.ts`:
  - Interfaz lista para inferencia local y fallback sin conexión.
  - Inicialización de modelo local con reglas por defecto y actualización incremental.
  - Análisis local rápido con cálculo de severidad/urgencia y recomendaciones.

## 🔌 Integración con Backend

### **Endpoints Integrados:**
- **Autenticación**: `/api/v1/auth/*`
- **Historias Médicas**: `/api/v1/medical-histories/*`
- **Análisis de Síntomas**: `/api/v1/symptom-analyzer/*`
- **Dashboard**: `/api/v1/dashboard/*`
- **Subida de Archivos**: `/api/v1/upload/*`
- **Exportación**: `/api/v1/export/*`

### **Servicios AI Integrados:**
- **Análisis de Síntomas**: `/api/symptom-analyzer/analyze`
- **Tendencias**: `/api/symptom-analyzer/trends/{patientId}`
- **Recomendaciones**: `/api/symptom-analyzer/recommendations`

## 🚀 Instalación y Configuración

### **Prerrequisitos:**
- Node.js >= 16
- React Native CLI
- Android Studio (para Android)
- Xcode (para iOS)

### **Instalación:**
```bash
# Instalar dependencias
npm install

# iOS (solo en macOS)
cd ios && pod install && cd ..

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# Ejecutar en Android
npm run android

# Ejecutar en iOS
npm run ios
```

### **Variables de Entorno:**
```bash
# API Configuration
API_BASE_URL=http://localhost:3001/api/v1
AI_SERVICE_URL=http://localhost:8000/api/v1

# Authentication
JWT_SECRET=your_jwt_secret_here

# AI Services
OPENAI_API_KEY=your_openai_api_key_here

# Debug
DEBUG_MODE=true
```

## 📱 Características Móviles

### **Optimizaciones para Móvil:**
- **Interfaz táctil** - Botones y controles optimizados
- **Navegación intuitiva** - Bottom tabs y stack navigation
- **Gestos nativos** - Swipe, pull-to-refresh
- **Responsive design** - Adaptable a diferentes pantallas
- **Performance** - Lazy loading y optimizaciones

### **Funcionalidades Offline:**
- **Almacenamiento local** - AsyncStorage con SQLite
- **Sincronización inteligente** - Solo cuando hay conexión
- **Indicadores visuales** - Estado de conexión y sincronización
- **Cola de datos** - Gestión de datos pendientes
- **Recuperación automática** - Reintentos de sincronización

### **Notificaciones Avanzadas:**
- **Push notifications** - Notificaciones remotas
- **Local notifications** - Recordatorios programados
- **Notificaciones de emergencia** - Alertas críticas
- **Badges** - Contadores de notificaciones
- **Categorización** - Diferentes tipos de notificaciones

## 🤖 Servicios de IA

### **Análisis de Síntomas:**
- **Múltiples estrategias**: OpenAI, modelos locales, reglas médicas
- **Fallback automático**: Si falla la IA, usa análisis local
- **Clasificación de urgencia**: Baja, media, alta
- **Recomendaciones personalizadas**: Inmediatas, corto plazo, largo plazo
- **Detección de signos de alerta**: Identificación automática de síntomas graves

### **Chatbot Médico:**
- **Conversación natural**: Procesamiento de lenguaje natural
- **Detección de emergencias**: Identificación automática de situaciones críticas
- **Análisis contextual**: Entiende el contexto de la conversación
- **Sugerencias inteligentes**: Recomendaciones basadas en síntomas
- **Interfaz conversacional**: Chat intuitivo y fácil de usar

## 🔒 Seguridad

### **Medidas Implementadas:**
- **Encriptación local** - Datos sensibles encriptados
- **Autenticación JWT** - Tokens seguros con refresh automático
- **Validación de entrada** - Sanitización de datos
- **Permisos granulares** - Solo permisos necesarios
- **Almacenamiento seguro** - Keychain/Keystore
- **Comunicación HTTPS** - Todas las comunicaciones encriptadas

## 📊 Monitoreo y Analytics

### **Métricas Implementadas:**
- **Rendimiento** - Tiempo de respuesta y uso de memoria
- **Conectividad** - Estado de conexión y sincronización
- **Uso de IA** - Análisis exitosos y fallos
- **Errores** - Tracking de errores y crashes
- **Sincronización** - Datos sincronizados y pendientes

## 🧪 Testing

El proyecto incluye una suite completa de tests que cubre todos los aspectos de la aplicación móvil. Para información detallada, consulta [**__tests__/README.md**](__tests__/README.md).

### **Tipos de Tests Implementados:**

#### **1. Tests Unitarios** ✅
- **Servicios**: `aiService`, `apiService`, `localStorageService`
- **Componentes**: `AIAnalysisScreen`, componentes de UI
- **Ubicación**: `__tests__/services/`, `__tests__/components/`

#### **2. Tests de Integración** ✅
- **Backend Integration**: Comunicación real con el backend
- **Ubicación**: `__tests__/integration/backend-integration.test.ts`

#### **3. Tests de Modo Offline** ✅
- **Almacenamiento local**: Guardado y lectura de datos offline
- **Análisis offline**: Funcionalidad sin conexión a internet
- **Ubicación**: `__tests__/offline/offline-mode.test.ts`

#### **4. Tests de Sincronización** ✅
- **Sincronización bidireccional**: Datos locales ↔ Servidor
- **Cola de sincronización**: Gestión de items pendientes
- **Resolución de conflictos**: Manejo de datos concurrentes
- **Ubicación**: `__tests__/sync/synchronization.test.ts`

#### **5. Tests E2E (End-to-End)** ✅
- **Detox**: Tests en dispositivos reales/emuladores
- **Flujos completos**: Sincronización offline, análisis de síntomas
- **Ubicación**: `e2e/offline-sync.e2e.ts`

### **Ejecutar Tests:**

```bash
# Todos los tests
npm test

# Tests unitarios únicamente
npm run test:unit

# Tests de integración con backend
npm run test:integration

# Tests de modo offline
npm run test:offline

# Tests de sincronización
npm run test:sync

# Tests E2E (requiere Detox configurado)
npm run test:e2e:build    # Build de la app
npm run test:e2e          # Ejecutar tests E2E

# Modo watch (desarrollo)
npm run test:watch

# Reporte de cobertura
npm run test:coverage
```

### **Configuración de Tests:**

- **Jest**: Configurado en `jest.config.js`
- **Setup Global**: Mocks en `jest.setup.js`
- **Detox**: Configurado en `.detoxrc.js`
- **E2E Jest**: Config en `e2e/jest.config.js`

### **Cobertura de Tests:**

- ✅ **Servicios**: Tests unitarios para `apiService` y `localStorageService`
- ✅ **Store**: Tests para acciones críticas de `useAppStore`
- ✅ **Integración**: Tests de comunicación con backend
- ✅ **Offline**: Funcionalidad offline completamente testada
- ✅ **E2E**: Flujos críticos de usuario testeados

### **Documentación de Tests:**

📖 Para más detalles sobre estructura, ejecución y troubleshooting, consulta:
- **[Guía Completa de Tests](__tests__/README.md)** - Documentación detallada de todos los tests

### **Mocks y Configuración:**

Los tests incluyen mocks para:
- `@react-native-async-storage/async-storage` - Almacenamiento local
- `@react-native-community/netinfo` - Estado de conexión
- `react-native-paper` - Componentes UI
- `@react-navigation/native` - Navegación
- `axios` - Peticiones HTTP

## 📈 Roadmap

### ✅ **Funcionalidades Implementadas:**

#### **8. Integración con Wearables** ⌚ ✅
- ✅ Servicio completo de integración con HealthKit (iOS) y Google Fit (Android)
- ✅ Captura de métricas de salud (ritmo cardíaco, oxigenación, pasos, distancia, respiración)
- ✅ Sincronización automática con backend
- ✅ Detección de alertas basadas en umbrales configurables
- ✅ Visualización de métricas en tiempo real
- ✅ Componente `WearableMetricsCard` para mostrar datos
- **Archivos**: `RespiCare-Mobile/services/wearableService.ts`, `RespiCare-Mobile/components/WearableMetricsCard.tsx`

#### **9. Reconocimiento de Voz** 🎤 ✅
- ✅ Servicio de reconocimiento de voz para entrada de texto
- ✅ Integración con chatbot médico
- ✅ Soporte para captura de síntomas por voz
- ✅ Múltiples idiomas soportados
- ✅ Manejo de permisos de micrófono
- **Archivos**: `src/services/voiceRecognitionService.ts`

#### **10. Modo Oscuro** 🌙 ✅
- ✅ Tema oscuro completo con Material Design 3
- ✅ Toggle entre modo claro, oscuro y automático
- ✅ Persistencia de preferencias de tema
- ✅ Integración con sistema de temas de React Native Paper
- ✅ Hook `useTheme` para gestión de temas
- **Archivos**: `src/theme/darkTheme.ts`, `src/hooks/useTheme.ts`

#### **11. Múltiples Idiomas (i18n)** 🌍 ✅
- ✅ Sistema completo de internacionalización
- ✅ Soporte para 5 idiomas: Español, Inglés, Portugués, Francés, Quechua
- ✅ Traducciones completas de toda la interfaz
- ✅ Cambio de idioma en tiempo real
- ✅ Persistencia de preferencias de idioma
- ✅ Hook `useTranslation` para usar traducciones
- **Archivos**: `src/services/i18nService.ts`

#### **12. Machine Learning Local** 🤖 ✅
- ✅ Análisis de síntomas sin conexión a internet
- ✅ Modelo de reglas médicas para diagnóstico local
- ✅ Clasificación de urgencia y severidad
- ✅ Recomendaciones médicas personalizadas
- ✅ Fallback automático cuando no hay conexión
- ✅ Actualización de modelo desde backend
- **Archivos**: `src/services/localMLService.ts`

#### **13. Telemedicina Integrada** 📹 ✅
- ✅ Servicio de videollamadas con médicos
- ✅ Creación y gestión de citas de telemedicina
- ✅ Manejo de permisos de cámara y micrófono
- ✅ Integración con backend para gestión de llamadas
- ✅ Estado de llamadas (scheduled, active, ended)
- ✅ Preparado para integración con servicios de videollamadas (Twilio, Agora, Jitsi)
- **Archivos**: `src/services/telemedicineService.ts`

#### **14. Análisis Predictivo** 📊 ✅
- ✅ Análisis predictivo de síntomas y tendencias
- ✅ Predicción de riesgo de complicaciones
- ✅ Visualizaciones de tendencias de salud
- ✅ Análisis de riesgo con factores identificados
- ✅ Recomendaciones basadas en predicciones
- ✅ Integración con backend de analytics
- ✅ Fallback a análisis local cuando no hay conexión
- **Archivos**: `src/services/predictiveAnalysisService.ts`

#### **15. Realidad Aumentada (AR)** 🥽 ✅
- ✅ Servicio básico de AR para visualización médica
- ✅ Gestión de marcadores AR
- ✅ Escenas AR configurables
- ✅ Preparado para integración con ARKit (iOS) y ARCore (Android)
- ✅ Verificación de disponibilidad de AR en dispositivo
- **Archivos**: `src/services/arService.ts`

### **Próximas Mejoras:**

#### **Mejoras de Integración:**
- [ ] Integrar librerías nativas reales para wearables (expo-health, react-native-health)
- [ ] Integrar servicios de videollamadas reales (Twilio Video, Agora.io, Jitsi)
- [ ] Integrar ARKit/ARCore nativos para realidad aumentada
- [ ] Integrar Speech Recognition nativo (iOS Speech, Android SpeechRecognizer)

#### **Mejoras de Funcionalidad:**
- [ ] Mejorar modelo ML local con TensorFlow Lite
- [ ] Agregar más idiomas al sistema i18n
- [ ] Expandir reglas médicas del modelo local
- [ ] Mejorar visualizaciones de análisis predictivo

## 🔧 Configuración de Desarrollo

### **Scripts Disponibles:**

#### **Desarrollo:**
```bash
npm start          # Metro bundler
npm run android    # Ejecutar en Android
npm run ios        # Ejecutar en iOS
npm run lint       # Linter
```

#### **Testing:**
```bash
npm test                    # Todos los tests
npm run test:unit           # Tests unitarios
npm run test:integration    # Tests de integración
npm run test:offline        # Tests de modo offline
npm run test:sync           # Tests de sincronización
npm run test:e2e            # Tests E2E (Detox)
npm run test:watch          # Modo watch
npm run test:coverage       # Reporte de cobertura
```

#### **Build:**
```bash
npm run build              # Build de producción
npm run test:e2e:build     # Build para tests E2E
```

### **Estructura de Configuración:**
- **Desarrollo**: `http://localhost:3001`
- **Staging**: `https://staging-api.respicare.com`
- **Producción**: `https://api.respicare.com`

## 🤝 Contribución

### **Guías de Desarrollo:**
1. Fork del repositorio
2. Crear feature branch
3. Seguir convenciones de código
4. Escribir tests
5. Crear pull request

### **Convenciones:**
- **Commits** - Conventional Commits
- **Código** - ESLint + Prettier
- **Tests** - Jest + Testing Library + Detox
- **Documentación** - JSDoc + READMEs

### **Estructura de Testing:**
- **Tests Unitarios**: `__tests__/services/`, `__tests__/components/`
- **Tests de Integración**: `__tests__/integration/`
- **Tests Especializados**: `__tests__/offline/`, `__tests__/sync/`
- **Tests E2E**: `e2e/`
- **Documentación**: `__tests__/README.md`

## 📞 Soporte

- **Email** - soporte@respicare.com
- **Documentación** - [docs.respicare.com](https://docs.respicare.com)
- **Issues** - GitHub Issues
- **Discord** - [RespiCare Community](https://discord.gg/respicare)

---

**Desarrollado para RespiCare Tacna - Sistema Integral de Gestión de Enfermedades Respiratorias** 🏥