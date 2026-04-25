# Documento de Versionamiento del Sistema
## Sistema de Gestión de Enfermedades Respiratorias

**Fecha de generación:** 2026-04-17  
**Rama activa:** `2026-03-24-z8s6`  
**Total de commits registrados:** 164  
**Rango de versiones:** 1.0 → 1.0.17.17.2

---

## Índice

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Historial de Versiones](#2-historial-de-versiones)
3. [Cambios No Confirmados (Working Tree)](#3-cambios-no-confirmados-working-tree)
4. [Mapa del Sistema por Componente](#4-mapa-del-sistema-por-componente)

---

## 1. Resumen Ejecutivo

El sistema de gestión de enfermedades respiratorias ha evolucionado desde una base inicial en septiembre de 2025 hasta una plataforma integral que abarca cinco componentes principales:

| Componente | Descripción |
|---|---|
| **Backend** | API REST en Node.js/TypeScript con MongoDB y Redis |
| **AI Services** | Microservicio Python con ML, análisis de tos y diagnóstico |
| **Frontend Web** | Aplicación React con visualizaciones avanzadas |
| **Mobile** | Aplicación mobile (Ionic/Capacitor) para pacientes |
| **Infraestructura** | Docker, CI/CD, GitOps con ArgoCD, OpenTelemetry |

---

## 2. Historial de Versiones

### Versión 1.0 — Commit Inicial
**Fecha:** 2025-09-10  
**Commit:** `2366d373`  
**Qué se hizo:** Creación del repositorio con la estructura base del proyecto.  
**Parte del sistema:** Todo el sistema (scaffolding inicial).

---

### Versiones 1.0.3 – 1.0.5 — Backend Base
**Fechas:** 2025-09-29 al 2025-09-30  
**Commits:** `072a1a3f`, `a377ef32`, `0c3817ec`

| Versión | Qué se implementó | Parte del sistema |
|---|---|---|
| 1.0.3 | Configuración inicial de rutas y controladores | Backend |
| 1.0.4 | Modelos de base de datos y conexiones MongoDB | Backend |
| 1.0.5 | Servicios de negocio base y middleware de autenticación | Backend |

**Por qué:** Establecer la capa de servidor y persistencia de datos para soportar el resto del sistema.

---

### Versión 1.0.6 — Frontend Web
**Fecha:** 2025-10-02  
**Commit:** `a9a6d330`  
**Qué se implementó:** Interfaz web inicial con React, vistas de dashboard y autenticación de usuarios.  
**Por qué:** Proveer interfaz gráfica para médicos y administradores del sistema.  
**Parte del sistema:** Frontend Web.

---

### Versión 1.0.7 — AI Services
**Fecha:** 2025-10-06  
**Commit:** `f9f43209`  
**Qué se implementó:** Microservicio de inteligencia artificial con modelos de machine learning para diagnóstico de enfermedades respiratorias.  
**Por qué:** Automatizar el apoyo diagnóstico mediante análisis de síntomas con IA.  
**Parte del sistema:** AI Services (Python/FastAPI).

---

### Versiones 1.0.8 – 1.0.8.1 — Pruebas Unitarias
**Fechas:** 2025-10-06 al 2025-10-07  
**Commits:** `237ce287`, `e850930f`  
**Qué se implementó:** Suite inicial de pruebas unitarias para backend y AI services.  
**Por qué:** Garantizar la calidad y correctitud de los componentes implementados.  
**Parte del sistema:** Testing (Backend + AI Services).

---

### Versiones 1.0.9 – 1.0.9.10 — Modelo de Software y Workflows
**Fechas:** 2025-10-20 al 2025-10-24  
**Commits:** `b59ca91e` → `3e1d4614`

| Versión | Qué se implementó / arregló |
|---|---|
| 1.0.9 | Modelo de software, diagramas de arquitectura |
| 1.0.9.2 – 1.0.9.3 | Workflows de CI/CD para modelos ML |
| 1.0.9.4 – 1.0.9.10 | Correcciones y ajustes de pipelines |

**Por qué:** Formalizar el modelo de software y automatizar el despliegue con GitHub Actions.  
**Parte del sistema:** Infraestructura / CI-CD / Documentación.

---

### Versión 1.0.10 — Docker
**Fecha:** 2025-10-26  
**Commits:** `99b07fce` → `31bd245b`  
**Qué se implementó:** Contenerización completa del sistema con Docker y Docker Compose.  
**Por qué:** Estandarizar los entornos de desarrollo y producción para evitar inconsistencias.  
**Parte del sistema:** Infraestructura (Docker).

---

### Versiones 1.0.11 – 1.0.11.7 — ML con Explicabilidad y Metodologías Ágiles
**Fechas:** 2025-10-26 al 2025-11-03  
**Commits:** `f6f96853` → `2ecbdf91`

| Versión | Qué se implementó |
|---|---|
| 1.0.11 | Sistema ML con Explicabilidad (SHAP/LIME) |
| 1.0.11.1 – 1.0.11.3 | Correcciones TypeScript strict para CI/CD |
| 1.0.11.4 | Documentación de metodología ágil (Scrum) |
| 1.0.11.5 | Ajustes de integración backend/AI |
| 1.0.11.6 | Redes Neuronales para diagnóstico |
| 1.0.11.7 | Integración de NN a Backend y Frontend |

**Por qué:** Aumentar la transparencia del modelo con explicabilidad y cumplir con el marco metodológico del proyecto (Scrum).  
**Parte del sistema:** AI Services + Backend + Frontend Web + Documentación.

---

### Versiones 1.0.12 – 1.0.12.17 — RoadMap, Testing, Analytics y Mobile
**Fechas:** 2025-11-03 al 2025-11-16  
**Commits:** `958b7529` → `974e53b8`

| Versión | Qué se implementó | Parte del sistema |
|---|---|---|
| 1.0.12 – 1.0.12.1 | RoadMap del proyecto definido | Documentación |
| 1.0.12.2 – 1.0.12.3 | Mejoras generales del sistema | Backend |
| 1.0.12.4 | Pruebas TDD (Test-Driven Development) | Testing |
| 1.0.12.5 – 1.0.12.6 | Fix de workflows CI/CD | Infraestructura |
| 1.0.12.7 – 1.0.12.7.2 | Tests mobile (Jest) | Mobile |
| 1.0.12.8 – 1.0.12.9 | Optimización y Performance del sistema | Backend + AI Services |
| 1.0.12.10 | Analytics y Business Intelligence inicial | Backend + Web |
| 1.0.12.11 | Pruebas de AI Services | Testing (AI) |
| 1.0.12.12 | Dashboard SHAP para explicabilidad ML | Frontend Web |
| 1.0.12.13 | Fix frontend web (correcciones UI) | Frontend Web |
| 1.0.12.14 | Análisis de código estático (ESLint/SonarQube) | CI/CD |
| 1.0.12.14.1 | Analytics y Business Intelligence completo | Backend + Web |
| 1.0.12.15 – 1.0.12.15.7 | Fundamentos Mobile (Arquitectura, UX/UI, Voz, Offline-first, Engagement, Observabilidad) | Mobile |
| 1.0.12.16 | Mejora de documentación del proyecto | Documentación |
| 1.0.12.17 | Funcionalidades Avanzadas ML (NLP, clasificadores) | AI Services |

**Por qué:** Cubrir el roadmap completo del proyecto incorporando calidad, observabilidad, analytics y la aplicación mobile.

---

### Versiones 1.0.13 – 1.0.13.10 — AI Services Completo y Seguridad Avanzada Backend
**Fechas:** 2025-11-16  
**Commits:** `d7af3257` → `6e3eb346`

| Versión | Qué se implementó | Parte del sistema |
|---|---|---|
| 1.0.13 – 1.0.13.2 | Nuevos ROADMAPS y actualización de planificación | Documentación |
| 1.0.13.3 | Calidad y Rendimiento de AI Services | AI Services |
| 1.0.13.4 | Avances ML/NLP completo | AI Services |
| 1.0.13.5 | AI Service completo (endpoints estabilizados) | AI Services |
| 1.0.13.6 | ML completo (modelos entrenados integrados) | AI Services |
| 1.0.13.6.1 | Fix documentación AI Service | Documentación |
| 1.0.13.7 | Mobile Experiencia y Funciones Avanzadas | Mobile |
| 1.0.13.8 | Actualización del ROADMAP | Documentación |
| 1.0.13.9 | Seguridad Avanzada Backend (JWT refresh, rate limiting, auditoría) | Backend |
| 1.0.13.10 | Mejoras en Mobile (UX, notificaciones) | Mobile |

**Por qué:** Completar los modelos ML, fortalecer la seguridad del backend y mejorar la experiencia de usuario mobile.

---

### Versiones 1.0.14 – 1.0.14.9 — Seguridad, UX/UI, DevOps, Testing Completo
**Fechas:** 2025-11-16 al 2025-11-18  
**Commits:** `387e3de6` → `7ee558a9`

| Versión | Qué se implementó | Parte del sistema |
|---|---|---|
| 1.0.14 – 1.0.14.1 | Mejora del ROADMAP principal | Documentación |
| 1.0.14.2 | Analytics/ML Inicial Web (gráficas interactivas) | Frontend Web |
| 1.0.14.3 | Seguridad Avanzada Completa (OWASP, HTTPS, CSP) | Backend + Infraestructura |
| 1.0.14.4 | UX/UI Completo (diseño responsive, accesibilidad) | Frontend Web + Mobile |
| 1.0.14.5 – 1.0.14.5.1 | DevOps y Deployment Completo (pipelines multi-env) | Infraestructura |
| 1.0.14.6 | ML Avanzado Completo (ensemble, validación cruzada) | AI Services |
| 1.0.14.7 | Documentación Completa (API docs, arquitectura) | Documentación |
| 1.0.14.8 | Pruebas Unitarias (suite completa) | Testing |
| 1.0.14.8.1 | Pruebas de Integración | Testing |
| 1.0.14.8.2 | Performance Tests (k6, carga) | Testing |
| 1.0.14.8.3 | Security Tests (OWASP ZAP) | Testing |
| 1.0.14.8.4 | Tests Casos Especiales (edge cases) | Testing |
| 1.0.14.8.5 – 1.0.14.8.5.8 | Fixes múltiples de Workflows (backend, web, mobile) | CI/CD |
| 1.0.14.9.0 | Mobile código estático (análisis ESLint mobile) | Mobile / CI/CD |

**Por qué:** Alcanzar calidad de producción cubriendo seguridad OWASP, testing exhaustivo y pipelines robustos.

---

### Versiones 1.0.15 – 1.0.15.4 — Mobile y AI Service Mejorado
**Fechas:** 2025-11-20 al 2025-11-22  
**Commits:** `eaebb368` → `dacb0c76`

| Versión | Qué se implementó | Parte del sistema |
|---|---|---|
| 1.0.15 | Mobile y AI Service mejorado (rendimiento, nuevos endpoints) | Mobile + AI Services |
| 1.0.15.1 | Documentación mejorada de AI Services (Swagger, ejemplos) | Documentación |
| 1.0.15.2 | Mejora de la app mobile (UI/UX refinada) | Mobile |
| 1.0.15.3 | Despliegue de la app mobile (APK y builds) | Mobile / Infraestructura |
| 1.0.15.4 | Documentación actualizada del sistema completo | Documentación |

**Por qué:** Preparar la app mobile para distribución y completar la documentación técnica.

---

### Versiones 1.0.16 – 1.0.16.14 — Escalabilidad, Arquitectura e Integraciones Externas
**Fechas:** 2025-11-22 al 2025-11-28  
**Commits:** `0d97b787` → `8b3d7dd6`

| Versión | Qué se implementó | Parte del sistema |
|---|---|---|
| 1.0.16 | Escalabilidad & Arquitectura (microservicios, load balancing) | Backend + Infraestructura |
| 1.0.16.1 | Documentación y Capacitación (guías de usuario) | Documentación |
| 1.0.16.2 | Actualización de design mobile y nuevos endpoints API | Mobile + Backend |
| 1.0.16.3 | Mejora web y endpoints nuevos (laboratorios, referidos) | Frontend Web + Backend |
| 1.0.16.4 | AI Services mejorados (precisión de modelos) | AI Services |
| 1.0.16.5 | APK generado para distribución | Mobile |
| 1.0.16.6 | Actualización y organización de la documentación | Documentación |
| 1.0.16.7 | Nuevas funciones para el backend (SMS, alertas, métricas) | Backend |
| 1.0.16.8 | Mejora de la app mobile e integraciones del backend | Mobile + Backend |
| 1.0.16.9 | Mejora AI Services: aceptación de imágenes y audio | AI Services |
| 1.0.16.10 | Fix Workflows (correcciones pipelines CI/CD) | CI/CD |
| 1.0.16.10.1 | Fix IA Services + Fix Web & Mobile | AI Services + Web + Mobile |
| 1.0.16.10.2 | Fix código estático web | Frontend Web |
| 1.0.16.10.3 – 1.0.16.10.3.3 | Fix Docker build and push AI Services | Infraestructura |
| 1.0.16.10.4 | Fix Micro-Services (correcciones inter-servicio) | Backend |
| 1.0.16.11 | Correcciones de la base de datos y funciones del sistema | Backend (MongoDB) |
| 1.0.16.12 | Correcciones del roadmap | Documentación |
| 1.0.16.13 | Fase 8: Integración con Sistemas Externos (FHIR, laboratorios) | Backend (Integraciones) |
| 1.0.16.14 | Fundamentos Scripts iniciales (seed, migraciones) | Backend (Scripts) |

**Por qué:** Escalar el sistema para soportar múltiples usuarios e integrar con sistemas hospitalarios externos (estándar FHIR).

---

### Versiones 1.0.17 – 1.0.17.17.2 — Fase Final: Testing Avanzado, Observabilidad e Infraestructura
**Fechas:** 2025-11-28 al 2025-12-04  
**Commits:** `aa0aa6c5` → `167bfc66`

| Versión | Qué se implementó | Parte del sistema |
|---|---|---|
| 1.0.17 | Nuevas funciones y mejoras del sistema – Fase casi final | Sistema completo |
| 1.0.17.1 | Migración de Pruebas Unitarias de Mobile | Testing (Mobile) |
| 1.0.17.2 – 1.0.17.2.1 | Testing de Carga y Estrés Avanzado (k6 scenarios) | Testing |
| 1.0.17.3 | Testing de Seguridad Continuo (SAST/DAST automatizado) | Testing / CI/CD |
| 1.0.17.4 | Mutation Testing (calidad de tests con Stryker) | Testing |
| 1.0.17.5 | Tests específicos de MongoDB (transacciones, índices) | Testing (Backend) |
| 1.0.17.6 | Observabilidad Avanzada – OpenTelemetry (trazas, métricas, logs) | Infraestructura |
| 1.0.17.7 | Chaos Engineering (resiliencia del sistema) | Infraestructura / Testing |
| 1.0.17.8 | Pendientes – Funcionalidades Mobile (geolocalización, biometría) | Mobile |
| 1.0.17.9 | Sistema de Referidos (Referrals) completo | Backend + Frontend |
| 1.0.17.10 | Sistema de Consentimientos Informados (GDPR/HIPAA) | Backend + Frontend |
| 1.0.17.11 | Pendientes – Integraciones Mobile (SQLite, notificaciones nativas) | Mobile |
| 1.0.17.12 | Visualizaciones Avanzadas Web (charts interactivos, heatmaps) | Frontend Web |
| 1.0.17.13 | Pendientes – Infraestructura (Kubernetes manifests, HPA) | Infraestructura |
| 1.0.17.14 | GitOps con ArgoCD (despliegue declarativo automático) | Infraestructura |
| 1.0.17.15 | Feature Flags y Progressive Delivery (LaunchDarkly/custom) | Backend + Infraestructura |
| 1.0.17.16 – 1.0.17.16.1 | Fix Nuevos Workflows ZAP (DAST con OWASP ZAP en CI) | CI/CD |
| 1.0.17.17 – 1.0.17.17.2 | Fix AI Services (corrección de endpoints y modelos) | AI Services |

**Por qué:** Completar la fase final del sistema con alta disponibilidad, seguridad continua, observabilidad full-stack y despliegue automatizado GitOps.

---

### Revisión de Código — 2026-03-24
**Fecha:** 2026-03-24  
**Commits:** `1248c1e1`, `d618ee3a`

| Commit | Qué se hizo | Parte del sistema |
|---|---|---|
| `1248c1e1` | Revisión de Código general (refactoring y correcciones) | Sistema completo |
| `d618ee3a` | Actualización de `coverage.xml`: cobertura sube de 17.89% a 49.37% (líneas cubiertas: 2701 → 4297) | AI Services / CI |

**Por qué:** Mejorar la calidad del código y actualizar las métricas de cobertura de pruebas para reflejar el estado real del sistema.

---

## 3. Cambios No Confirmados (Working Tree)

Los siguientes cambios están presentes en el repositorio local pero **aún no han sido commiteados**. Representan la versión `1.0.17.17.2+` en desarrollo.

### 3.1 Backend — Modificaciones

| Archivo | Tipo | Descripción |
|---|---|---|
| `backend/src/index.ts` | Modificado | Nuevas rutas y middleware registrados |
| `backend/src/config/redisClient.ts` | Modificado | Configuración Redis ajustada |
| `backend/src/controllers/alertController.ts` | Modificado | Mejoras en controlador de alertas |
| `backend/src/controllers/medicalHistoryController.ts` | Modificado | Ajustes historial médico |
| `backend/src/controllers/smsMetricsController.ts` | Modificado | Métricas SMS refinadas |
| `backend/src/jobs/labImportJobs.ts` | Modificado | Jobs de importación de laboratorio |
| `backend/src/jobs/mlMetricsJobs.ts` | Modificado | Jobs de métricas ML corregidos |
| `backend/src/metrics/percentileMetrics.ts` | Modificado | Cálculo de percentiles de rendimiento |
| `backend/src/models/ConsentLog.ts` | Modificado (+63 líneas) | Modelo de log de consentimientos ampliado |
| `backend/src/models/MLExperiment.ts` | Modificado (+21 líneas) | Modelo de experimentos ML extendido |
| `backend/src/monitoring/mongodbMonitoring.ts` | Modificado | Monitoreo de MongoDB ajustado |
| `backend/src/routes/biRoutes.ts` | Modificado (+324 líneas) | Rutas Business Intelligence ampliadas significativamente |
| `backend/src/routes/labRoutes.ts` | Modificado (+54 líneas) | Nuevas rutas de laboratorio |
| `backend/src/routes/consentRoutes.ts` | Modificado | Rutas de consentimiento refinadas |
| `backend/src/routes/mlOrchestrationRoutes.ts` | Modificado | Rutas de orquestación ML |
| `backend/src/routes/referralRoutes.ts` | Modificado | Rutas de referidos ajustadas |
| `backend/src/routes/smsRoutes.ts` | Modificado | Rutas SMS ajustadas |
| `backend/src/services/alertService.ts` | Modificado | Servicio de alertas mejorado |
| `backend/src/services/ambulanceService.ts` | Modificado | Servicio de ambulancias ajustado |
| `backend/src/services/analyticsService.ts` | Modificado | Analytics con nuevas métricas |
| `backend/src/services/biConnectorService.ts` | Modificado | Conector BI actualizado |
| `backend/src/services/consentService.ts` | Modificado | Servicio de consentimientos |
| `backend/src/services/drugIntegrationService.ts` | Modificado | Integración de medicamentos |
| `backend/src/services/emergencyMedicalInfoService.ts` | Modificado | Info médica de emergencia |
| `backend/src/services/emergencyService.ts` | Modificado | Servicio de emergencias |
| `backend/src/services/featureFlagService.ts` | Modificado | Feature flags del sistema |
| `backend/src/services/fhirService.ts` | Modificado | Integración FHIR (estándar HL7) |
| `backend/src/services/hospitalCommunicationService.ts` | Modificado | Comunicación inter-hospitales |
| `backend/src/services/labService.ts` | Modificado | Servicio de laboratorio |
| `backend/src/services/laboratoryIntegrationService.ts` | Modificado | Integración con laboratorios externos |
| `backend/src/services/metricAlertService.ts` | Modificado | Alertas basadas en métricas |
| `backend/src/services/referralService.ts` | Modificado | Servicio de referidos |
| `backend/src/services/smsService.ts` | Modificado | Servicio SMS |
| `backend/src/types/index.ts` | Modificado | Tipos TypeScript actualizados |
| `backend/tsconfig.json` | Modificado | Configuración TypeScript |
| `backend/src/scripts/seed-complete-system.js` | Modificado (~1742 líneas) | Script de seed masivo reestructurado |

### 3.2 AI Services — Modificaciones

| Archivo | Tipo | Descripción |
|---|---|---|
| `ai-services/main.py` | Modificado | Mejoras en rutas y manejo de errores de la API |
| `ai-services/services/cough_analysis_service.py` | Modificado | Servicio de análisis de tos refinado |

### 3.3 Mobile — Cambios

**Archivos eliminados (migración de arquitectura):**
- `mobile/.detoxrc.js` — Configuración Detox (E2E tests legacy)
- `mobile/.eslintrc.js` — ESLint legacy
- `mobile/App.tsx` — Componente raíz legacy
- `mobile/__mocks__/axios.ts` — Mock legacy
- `mobile/__tests__/MLAdvancedResultsScreen.test.tsx` — Test legacy
- `mobile/__tests__/components/` — Varios tests de componentes legacy

**Nuevos archivos (nueva arquitectura `medical-app`):**

| Archivo | Descripción |
|---|---|
| `mobile/medical-app/components/tabs/emergency-view.tsx` | Vista de emergencias |
| `mobile/medical-app/components/tabs/lab-results-view.tsx` | Vista de resultados de laboratorio |
| `mobile/medical-app/components/tabs/prescriptions-view.tsx` | Vista de prescripciones |
| `mobile/medical-app/components/tabs/referrals-view.tsx` | Vista de referidos |
| `mobile/medical-app/hooks/useBiometricAuth.ts` | Hook autenticación biométrica |
| `mobile/medical-app/hooks/useCapacitorApp.ts` | Hook integración Capacitor |
| `mobile/medical-app/hooks/useGeolocation.ts` | Hook geolocalización |
| `mobile/medical-app/lib/api/services/emergencyService.ts` | API cliente emergencias |
| `mobile/medical-app/lib/api/services/labService.ts` | API cliente laboratorio |
| `mobile/medical-app/lib/api/services/prescriptionService.ts` | API cliente prescripciones |
| `mobile/medical-app/lib/api/services/referralService.ts` | API cliente referidos |
| `mobile/medical-app/lib/services/nativeStorage.ts` | Almacenamiento nativo |
| `mobile/medical-app/lib/services/notificationService.ts` | Servicio de notificaciones |
| `mobile/medical-app/lib/services/sqliteDatabase.ts` | Base de datos SQLite local |
| `mobile/medical-app/.env.example` / `.env.production` / `.env.staging` | Entornos de configuración |

### 3.4 Testing — Nuevos archivos

| Área | Archivos nuevos |
|---|---|
| Backend Unit Tests | `backend/tests/unit/services/` (oauth2, referral, report, smsMetrics, smsRateLimiter, smsService) |
| Backend Unit Tests | `backend/tests/unit/utils/` (AppError, anonymization, asyncHandler, encryption, localizedErrors, symptomSeverityCalculator) |
| Web E2E (Cypress) | `web/cypress/e2e/` (admin, cross-browser, emergency, medical-history, profile, visual-regression, wearables) |
| Web Accessibility | `web/src/tests/accessibility/` (charts, chatbot, components, forms, keyboard-navigation, navbar, screen-reader) |
| Web Performance | `web/src/tests/performance/render.perf.test.js` |
| Web Visual | `web/src/tests/visual/` |
| Docs | `docs/diagrams/` (casos de uso, clases, paquetes en PlantUML) |
| Docs | `docs/testing/CATALOGO_PRUEBAS.md` |
| Docs | `docs/taller-deconstruccion-estrategica.md` |

### 3.5 Docker e Infraestructura — Modificaciones

| Archivo | Descripción |
|---|---|
| `docker-compose.yml` | Configuración principal actualizada |
| `docker-compose.dev.yml` | Entorno de desarrollo ajustado |
| `docker-compose.prod.yml` | Entorno de producción ajustado |
| `.gitignore` | Exclusiones actualizadas |
| `README.md` | Documentación principal actualizada |

### 3.6 Documentación

| Archivo | Descripción |
|---|---|
| `Documentation/FD03-EPIS-Informe SRS de Proyecto.docx` | SRS actualizado (tamaño aumentó de 814KB a 2.2MB) |

---

## 4. Mapa del Sistema por Componente

### Backend (`backend/`)
- **Tecnología:** Node.js, TypeScript, Express, MongoDB, Redis
- **Evolución:** 1.0.3 (base) → 1.0.16.13 (integraciones externas FHIR) → 1.0.17.10 (consentimientos)
- **Módulos clave:** Alertas, Ambulancias, Analytics, BI, Consentimientos, Emergencias, Feature Flags, FHIR, Laboratorio, ML Orquestación, Referidos, SMS

### AI Services (`ai-services/`)
- **Tecnología:** Python, FastAPI, scikit-learn, TensorFlow
- **Evolución:** 1.0.7 (base) → 1.0.13.6 (ML completo) → 1.0.16.9 (imágenes y audio) → 1.0.17.17 (fix final)
- **Módulos clave:** Análisis de tos, Diagnóstico respiratorio, NLP, SHAP Explicabilidad

### Frontend Web (`web/`)
- **Tecnología:** React, TypeScript, Cypress
- **Evolución:** 1.0.6 (base) → 1.0.12.12 (Dashboard SHAP) → 1.0.14.4 (UX/UI completo) → 1.0.17.12 (visualizaciones avanzadas)
- **Módulos clave:** Dashboard, Analytics, Gestión médica, Visualizaciones

### Mobile (`mobile/`)
- **Tecnología:** Ionic/Capacitor, React/TypeScript
- **Evolución:** 1.0.12.15 (fundamentos) → 1.0.15.3 (APK) → 1.0.17.8 (biometría, geolocalización)
- **Módulos clave:** Emergencias, Laboratorio, Prescripciones, Referidos, Biometría, Almacenamiento offline

### Infraestructura / DevOps
- **Tecnología:** Docker, GitHub Actions, ArgoCD, OpenTelemetry, k6
- **Evolución:** 1.0.10 (Docker) → 1.0.14.5 (DevOps completo) → 1.0.17.6 (OpenTelemetry) → 1.0.17.14 (GitOps/ArgoCD)
- **Capacidades:** CI/CD multi-rama, SAST/DAST, Chaos Engineering, Feature Flags, Despliegue progresivo

---

*Documento generado automáticamente el 2026-04-17 basado en el historial de git (164 commits) y el estado actual del working tree.*