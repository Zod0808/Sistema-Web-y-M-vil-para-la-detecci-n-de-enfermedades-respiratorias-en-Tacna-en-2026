# 📱 Roadmap Mobile (React Native) - RespiCare Tacna

## Visión
Aplicación móvil offline-first para pacientes y médicos, con IA, telemedicina, alertas y sincronización confiable.

## Fase M1: Fundamentos y UX
- ✅ Arquitectura y estado global (Zustand por slices)
- ✅ Servicios base (api, localStorage, i18n, telemedicina, predictivo, AR, voz)
- ✅ Navegación (tabs + stack), theming (light/dark/auto)
- ✅ Onboarding i18n (ES/EN) con flag persistente
- ✅ Microinteracciones y feedback visual (snackbars, banners, chips)

## Fase M2: Funcionalidad Clínica
- ✅ Historias médicas (listado, detalle, estados de sync)
- ✅ Citas médicas (crear/reprogramar/cancelar, detalle, reintento, recordatorios)
- ✅ Alertas (ACK offline, caché, fallback sin red)
- ✅ Análisis predictivo (riesgo + recomendaciones) con fallback local
- ✅ Wearables (FC, pasos, SpO₂) vía stub seguro
 - ✅ Vista médico: lista de pacientes resumida, búsqueda rápida y acceso a prescripciones/reportes desde móvil

## Fase M3: Offline/Sync y Calidad
- ✅ Cola de operaciones (historias/citas/alertas) con reintento y estados (pending/synced/error)
- ✅ Indicadores “Offline” en headers de pantallas críticas
- ✅ Tests de integración offline/sync (historias, citas)
- ✅ CI móvil con cobertura mínima (70%) y artefactos
 - ✅ Optimización básica de rendimiento: listas largas afinadas (`FlatList` con windowing) y reducción de tamaño de imágenes capturadas

## Fase M4: Experiencia y Funciones Avanzadas
- ⏳ Tutoriales interactivos primera vez (tour guiado)
- ✅ Calendario de citas mejorado (selector nativo/DateTimePicker)
- ✅ Historial de análisis de síntomas y visualización SHAP simple
- ✅ Compartir reportes desde mobile (share sheet con enlaces a reportes firmados para WhatsApp/Email, accesible desde vista de médicos)
- ✅ AR ejercicios asistidos (pantalla `ARTrainingScreen` con modos respiración/inhalador y rutina guiada; ampliaciones futuras pendientes)

## Fase M5: Funcionalidades Adicionales Médico-Paciente
- ✅ Telemedicina básica: botón “Iniciar consulta” en detalle de cita que abre sala de videollamada (Jitsi) usando token del backend
- ✅ Chat directo médico-paciente (pantalla `DirectChatScreen`, accesible desde panel médico)
- ✅ Captura y adjunto de fotos de síntomas en `DataCaptureScreen` (cámara/galería, guardado en historias médicas)

## Calidad y Métricas
- Unit/Integration/E2E (Detox) orientados a offline/sync
- Cobertura objetivo ≥70% (CI falla si <70%)
- Performance: arranque <2s, consumo batería optimizado (en progreso); pruebas de rendimiento básicas (`npm run test:performance`)

## Hitos
- Mobile v1: Fundamentos + Citas/Alertas/Análisis + Offline
- Mobile v2: UX avanzada (tutoriales, calendario, historial análisis) + compartir PDF
- Mobile v3: AR extendido + optimizaciones performance/batería

## 🗺️ Roadmap Mobile - RespiCare Tacna

### 📋 Estado Actual de la App Móvil

- ✅ App móvil funcional (React Native / Expo o equivalente)
- ✅ Análisis de síntomas con ML integrado con backend
- ✅ Sincronización offline básica
- ✅ Notificaciones push
- ✅ Integración con backend y servicios de IA
- ✅ Integración inicial con wearables (HealthKit / Google Fit)

---

## 🎯 Objetivo General

Convertir la app móvil en el canal principal de interacción para pacientes (y en una segunda etapa médicos), con:

- Experiencia **rápida, moderna y segura**, centrada en el paciente.
- Soporte **offline-first** robusto y sincronización confiable.
- Funcionalidades avanzadas: **telemedicina, voz, AR, análisis predictivo, recomendaciones personalizadas**.
- Integración completa con backend, AI Services y sistemas externos.

---

## 🕐 Fase 1: Fundamentos Mobile y Arquitectura (0–1 mes)

**Prioridad: ALTA** | **Estado: En progreso**

### 1.1 Arquitectura y Estado Global

- ✅ Revisar y estabilizar `useAppStore` (slices claros por dominio: usuario, síntomas, citas, configuración).
- ✅ Unificar manejo de estado de red: `online/offline/sincronizando`.
- ✅ Definir contratos de tipos en `mobile/src/types`:
  - ✅ Modelos de dominio (Paciente, Doctor, Cita, Alerta, Prescripción).
  - ✅ DTOs alineados con respuestas del backend.
- ✅ Documentar la arquitectura de carpetas (pantallas, componentes, servicios, store).

### 1.2 Servicios Base

- ✅ `apiService` móvil:
  - ✅ Cliente HTTP centralizado (baseURL, interceptores, reintentos).
  - ✅ Manejo consistente de errores y mensajes al usuario.
- ✅ `localStorageService`:
  - ✅ Abstracción para AsyncStorage/secure storage.
  - ✅ Caché de datos importantes (usuario, token, últimas predicciones).
- ✅ `localMLService`:
  - ✅ Interfaz definida para futuras inferencias locales (aunque inicialmente use remoto).

### 1.3 Testing y Calidad Inicial

- ✅ Revisar y actualizar configuración de Jest (`mobile/jest.config.js`, `mobile/jest.setup.js`).
- ✅ Añadir tests unitarios básicos para:
  - ✅ `useAppStore` (acciones críticas).
  - ✅ `apiService` (manejo de éxito/error).
  - ✅ `localStorageService`.
- ✅ Integrar scripts mobile en CI (jobs de lint + tests).

---

## 🕑 Fase 2: UX/UI Base y Navegación (1–2 meses)

**Prioridad: ALTA** | **Estado: En planificación**

### 2.1 Rediseño de Pantallas Principales

- ✅ Home / Dashboard del paciente:
  - ✅ Vista rápida de síntomas/analíticas recientes y alertas (sección “Alertas” con top 3).
  - ✅ Citas próximas: tarjeta implementada con feature flag (`enableAppointmentsCard`) y fallback seguro.
- ✅ Analizador de síntomas:
  - ✅ Flujo claro de selección de síntomas y acción de análisis.
  - ✅ Visualización del resultado (urgencia, diagnósticos, recomendaciones, progreso).
- ✅ Historial médico / resultados:
  - ✅ Listado con búsqueda y chips de síntomas, estado de sincronización.
  - ✅ Detalle en modal con datos clave y acciones (cerrar/eliminar).

### 2.2 Navegación y Flujo

- ✅ Definir navegación por tabs (`Inicio`, `Capturar`, `Historial`, `IA`, `Alertas`, `Citas`, `Perfil`).
- ✅ Flujo de navegación stack entre pantallas de detalle (`AlertDetail`, `AppointmentDetail`, `ReportDetail` placeholder).
- ✅ Manejo consistente del back navigation (stack headers de React Navigation + tabs persistentes).

### 2.3 Theming y Modo Oscuro

- ✅ Implementar sistema de temas.
- ✅ Tema claro por defecto.
- ✅ `darkTheme` definido y aplicado (Paper Provider + hook `useTheme`).
- ✅ Agregar toggle de modo oscuro en ajustes/perfil (`Claro` / `Oscuro` / `Auto`).
- ✅ Persistir la preferencia de tema en almacenamiento local (via `useAppStore` + persist).

---

## 🕒 Fase 3: Funcionalidades Avanzadas (2–4 meses)

**Prioridad: MEDIA** | **Estado: En planificación**

### 3.1 Telemedicina (`telemedicineService.ts`)

- ✅ Integrar gestión de citas médicas en mobile:
  - ✅ Listado de citas próximas y pasadas (`AppointmentsScreen`).
  - ✅ Creación/cancelación/reprogramación de citas (acciones básicas y demo).
  - ✅ Recordatorios in-app para citas próximas (< 60 min) vía notificaciones internas.
- ✅ Flujo básico de teleconsulta:
  - ✅ Pantalla de detalle de cita con botón “Iniciar consulta” (mock de videollamada).
  - ✅ Integración inicial (stub) con proveedor de video vía `telemedicineService` (`startCall`/`getCallToken`).

🔼 Mejoras Futuras (Telemedicina)
- [ ] Integrar selector de fecha/hora (DateTimePicker) para reprogramación precisa de citas.

### 3.2 Análisis Predictivo (`predictiveAnalysisService.ts`)

- ✅ Consumir endpoints de analytics/ML relevantes para el usuario móvil.
- ✅ Riesgo personalizado (overallRisk) con recomendaciones principales.
- ✅ Tendencias de síntomas a lo largo del tiempo (UI básica en Home: lista de tendencias)
- ✅ Mostrar insights en el dashboard:
  - ✅ Tarjeta de riesgo con chip (Low/Medium/High) y recomendaciones.
  - ✅ Mensaje con fecha/hora de generación (contexto temporal).

### 3.3 Realidad Aumentada (`arService.ts`)

- ✅ Definir caso de uso inicial (MVP):
  - ✅ Ejercicios respiratorios guiados y uso de inhaladores (selección por modo).
- ✅ Prototipo AR:
  - ✅ Pantalla `ARTrainingScreen` con overlay simulado (placeholder AR).
  - ✅ Guías paso a paso con progreso y estados (Iniciar/Detener).
  - ✅ Integrado con `arService` (start/stop session, loadScene, markers básicos).

---

## 🕓 Fase 4: Voz e Internacionalización (3–5 meses)

**Prioridad: MEDIA** | **Estado: En planificación**

### 4.1 Reconocimiento de Voz (`voiceRecognitionService.ts`)

- ✅ Input de síntomas por voz:
  - ✅ Conversión speech-to-text integrada en `DataCaptureScreen` (botón “Dictar síntomas”).
  - ✅ Manejo de errores (permiso, fallos) y cancelación.
- ✅ Comandos básicos por voz (Home):
  - ✅ “abrir/ver citas” → navega a `Appointments`.
  - ✅ “ver alertas” → navega a `Alerts`.
  - ✅ “analizar/ia” → navega a `AI`.

### 4.2 Internacionalización (`i18nService.ts`)

- ✅ Infraestructura i18n mobile (servicio + hook `useTranslation`).
- ✅ Soporte mínimo para ES y EN (extensible a PT/FR/QU).
- ✅ Carga centralizada de strings (estructura de namespaces en servicio).
- ✅ Selector de idioma en ajustes/perfil (chips ES/EN) con persistencia.
- ✅ Aplicar i18n en pantallas clave (`ProfileScreen`, `DataCaptureScreen`, `HomeScreen`).

---

## 🕔 Fase 5: Offline-first y Sincronización (4–6 meses)

**Prioridad: ALTA** | **Estado: En planificación**

### 5.1 Estrategia Offline y Colas de Operaciones

- ✅ Diseñar estrategia de almacenamiento local por dominio:
  - ✅ Síntomas enviados (cache de `symptomAnalyses`), respuestas de modelos.
  - ✅ Citas (cache local `appointments_cache`) y alertas (`alerts_cache`).
- ✅ Implementar colas de acciones offline (en `localStorageService`):
  - ✅ Guardar operaciones sin red:
    - ✅ Crear/Reprogramar/Cancelar citas (cola `appointment` con operaciones `CREATE/RESCHEDULE/CANCEL`).
    - ✅ Acknowledge de alertas (cola `alert` con operación `ACK`).
  - ✅ Reintentar automáticamente al volver online (listener NetInfo + `syncPendingData`).

### 5.2 Manejo de Conflictos y Feedback al Usuario

- ✅ Reglas de resolución de conflictos:
  - ✅ Último cambio gana a nivel local; al sincronizar desde servidor se prioriza servidor para cachear estados.
  - ✅ Si un item agota reintentos, se marca como `error` en cache.
- ✅ Estados visibles en UI (`MedicalHistoryScreen`):
  - ✅ Chips por historia: “Pendiente” / “Sincronizado” / “Error” con iconos y colores.
  - ✅ Banner con conteo de pendientes/errores y botón “Reintentar” (llama a `retrySyncNow`).

### 5.3 Testing de Modo Offline

- ✅ Tests de integración mobile para:
  - ✅ Uso en modo offline (lectura de datos cacheados).
  - ✅ Reconexión y sincronización automática.
  - ✅ Manejo de errores de red recurrentes (marca `error` tras reintentos).

---

## 🕕 Fase 6: UX Avanzada, Personalización y Engagement (6–8 meses)

**Prioridad: MEDIA** | **Estado: En planificación**

### 6.1 Onboarding y Microinteracciones

- ✅ Onboarding interactivo:
  - ✅ Pantalla de onboarding con 3 slides (`OnboardingScreen`): síntomas, citas, alertas/recomendaciones.
  - ✅ Flag persistente `onboarding_completed` en `AsyncStorage` y presentación condicional en `AppNavigator`.
  - ✅ Textos internacionalizados (ES/EN) y placeholders en PT/FR/QU.
- ✅ Microinteracciones:
  - ✅ Animaciones sutiles (escala) al enviar síntomas (`DataCaptureScreen`) y al reprogramar/cancelar (`AppointmentsScreen`).
  - ✅ Feedback visual claro: `Snackbar` y `Alert` en acciones clave; banners/chips de estado para offline/sync/error en listas.

### 6.2 Personalización y Recomendaciones

- ✅ Perfil de salud avanzado:
  - ✅ Datos relevantes (edad, diagnóstico base, factores de riesgo) editables en `ProfileScreen` y persistidos en `useAppStore.healthProfile`.
  - ✅ Preferencias (recordatorios, frecuencia de notificaciones) conmutables y persistidas en el store.
- ✅ Recomendaciones inteligentes:
  - ✅ Sección “Recomendaciones personalizadas” en `HomeScreen` combinando perfil (factores y preferencias) con el riesgo del análisis predictivo.
  - ✅ Consejos preventivos y seguimiento sugerido según riesgo (alto/medio/bajo) y factores (Asma/EPOC).
  - ✅ Integración con analytics/ML del backend vía `predictiveAnalysisService.getPredictiveAnalysis` (con fallback local si no hay red/datos).

### 6.3 Integración con Wearables

- ✅ Ampliar integración con HealthKit / Google Fit (stub inicial):
  - ✅ Servicio `wearablesService` con API estable y fallback/mock (FC, pasos, SpO₂, última sync, proveedor).
  - ✅ Lectura de métricas relevantes (FC, pasos y SpO₂ si disponible) mediante `getMetricsSummary()`.
  - ✅ Visualización resumida en el dashboard móvil (`HomeScreen` sección “Wearables”) con botón de “Actualizar”.

---

## 🕖 Fase 7: Observabilidad, Métricas y Releases Mobile (8–10 meses)

**Prioridad: MEDIA** | **Estado: En planificación**

### 7.1 Métricas de Uso y Rendimiento

- ✅ Instrumentar eventos clave:
  - ✅ Uso del analizador de síntomas (`symptoms.submit`, tiempo `symptoms.submit_to_store_ms`).
  - ✅ Creación/gestión de citas (crear, reprogramar, cancelar, reintento de sync).
  - ✅ Uso de modo offline (cambios de red) y AR (abrir pantalla, iniciar/detener, cambio de modo), Voz (inicio, resultado, error, stop).
  - ✅ Analizar tiempos de carga inicial del Home (`home.initial_load_ms`).
  - ✅ Servicio `analyticsService` con `logEvent` y `logTiming` (stub listo para conectar a proveedor real).

### 7.2 Manejo de Errores en Producción

- ✅ Integrar herramienta de tracking (stub compatible con Sentry):
  - ✅ `errorTrackingService` con `init`, `captureException`, `captureMessage`, `setUser` y `setGlobalHandler`.
  - ✅ Manejador global de errores JS instalado desde `AppNavigator` (entornos dev/prod).
- ✅ Flujo de triage básico:
  - ✅ Clasificación por severidad (`info`, `warning`, `error`, `fatal`) por reglas simples (network/timeout → warning, NPEs → fatal).
  - ✅ Contadores persistidos por tipo de error para estimar frecuencia (base para priorización).
  - ✅ Señalización en consola y listo para conectar a proveedor (Sentry/Amplitude/etc.).

### 7.3 Estrategia de Releases

- ✅ Definir canales de distribución:
  - ✅ Canal Beta (Testers internos/QA) con builds etiquetadas y feature flags conservadores.
  - ✅ Canal Producción con control gradual (rollout por porcentajes cuando la tienda lo permita).
- ✅ Checklist de release mobile:
  - ✅ Tests automatizados pasando (CI mobile con lint + tests + cobertura mínima).
  - ✅ Validación manual mínima de flujos críticos ( smoke test ):
    - Inicio de sesión y selección de idioma/tema.
    - Captura y guardado de historia médica (online/offline).
    - Lista y gestión de citas (crear/reprogramar/cancelar) y reintento.
    - Alertas: carga, ACK y fallback a caché sin red.
    - Dashboard: análisis predictivo visible y sección Wearables cargando.
    - ARTraining: cambio de modo, iniciar/detener y completar rutina.
    - Voz: iniciar dictado y parseo básico.
  - ✅ Verificación de i18n en Home, Profile y DataCapture.
  - ✅ Revisión de analíticas (eventos clave están registrando en consola y persistencia local).
  - ✅ Revisión de tracking de errores (handler global activo; counters registran).
  - ✅ CI opcional de artefacto “beta”: workflow `mobile-beta.yml` que empaqueta el directorio `mobile` como ZIP al pushear tags `beta-*` o `mobile-beta-*` para distribución a testers.

---

## 📊 Métricas de Éxito Mobile

- [ ] Tiempo de arranque inicial < 3 s en dispositivos promedio.
- [ ] Tasa de crash < 1 %.
- [ ] Uso offline en al menos 30 % de las sesiones sin pérdida de datos.
- [ ] Tiempo promedio de flujo de síntomas (inicio → resultado) < 2 min.
- [ ] Satisfacción de usuarios móviles > 4.5/5 (encuestas o ratings).

---

## 🔄 Notas y Coordinación con Roadmap General

1. Las fases mobile deben alinearse con:
   - Fase 7 (Alertas, Citas, Prescripciones) del roadmap general.
   - Fase 8 (Integraciones externas) para telemedicina y datos clínicos.
   - Fase 11 (UX/UI) para mantener consistencia visual con la web.
2. Algunas fases pueden ejecutarse en paralelo con backend/AI Services (ej.: telemedicina, analytics).
3. Cualquier nueva funcionalidad mobile debe:
   - Mantener el enfoque en experiencia del paciente.
   - Respetar requisitos de seguridad y privacidad definidos en Fase 10 (Seguridad Avanzada).


