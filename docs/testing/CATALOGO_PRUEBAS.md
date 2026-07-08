# Catálogo de Pruebas — Sistema de Enfermedades Respiratorias

**Versión:** 11.0  
**Fecha:** 2026-07-04  
**Total de archivos de prueba:** 260 (179 TypeScript/JS + 81 Python)  
**Cobertura:** Backend API · Frontend Web (Cypress + Jest) · Visual Regression · Accesibilidad (WCAG 2.1 AA + teclado + lector de pantalla) · Performance/Carga · LLM Testing · Seguridad (auth/authz + prompt injection) · AI Services (Python/FastAPI) · Compatibilidad (cross-browser + APIs + mobile)

---

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Pruebas unitarias — Controllers](#2-pruebas-unitarias--controllers)
3. [Pruebas unitarias — Services](#3-pruebas-unitarias--services)
4. [Pruebas unitarias — Models](#4-pruebas-unitarias--models)
5. [Pruebas unitarias — Middleware](#5-pruebas-unitarias--middleware)
6. [Pruebas unitarias — Utils](#6-pruebas-unitarias--utils)
7. [Pruebas unitarias — Jobs](#7-pruebas-unitarias--jobs)
8. [Pruebas de integración](#8-pruebas-de-integración)
9. [Pruebas de base de datos](#9-pruebas-de-base-de-datos)
10. [Pruebas de seguridad y rendimiento](#10-pruebas-de-seguridad-y-rendimiento)
11. [Pruebas E2E — Backend (flujos API)](#11-pruebas-e2e--backend-flujos-api)
12. [Pruebas E2E — Frontend (Cypress)](#12-pruebas-e2e--frontend-cypress)
13. [Pruebas de UI / Visual Regression](#13-pruebas-de-ui--visual-regression)
14. [Pruebas de Accesibilidad (WCAG 2.1 AA)](#14-pruebas-de-accesibilidad-wcag-21-aa)
15. [Pruebas de Performance / Carga](#15-pruebas-de-performance--carga)
16. [Pruebas LLM / IA Testing](#16-pruebas-llm--ia-testing)
17. [Pruebas de Seguridad (Auth/Authz + Prompt Injection)](#17-pruebas-de-seguridad-authauthz--prompt-injection)
18. [Pruebas AI Services (Python/FastAPI)](#18-pruebas-ai-services-pythonfastapi)
19. [Pruebas de Compatibilidad (Cross-Browser + Mobile)](#19-pruebas-de-compatibilidad-cross-browser--mobile)
20. [Convenciones y patrones](#20-convenciones-y-patrones)
21. [Ejecución de pruebas](#21-ejecución-de-pruebas)

---

## 1. Resumen ejecutivo

| Categoría | Archivos | Descripción |
|-----------|----------|-------------|
| Unit — Controllers | 16 | Pruebas de controladores HTTP con mocks de servicios |
| Unit — Services | 35 | Pruebas de lógica de negocio con mocks de dependencias |
| Unit — Models | 16 | Pruebas de esquemas Mongoose con MongoDB en memoria |
| Unit — Middleware | 9 | Pruebas de middlewares Express |
| Unit — Utils | 7 | Pruebas de utilidades puras |
| Unit — Jobs | 5 | Pruebas de trabajos programados (cron) |
| Unit — Validators | 2 | Pruebas de esquemas Joi de validación |
| Unit — Metrics | 2 | Pruebas de métricas Prometheus y percentiles |
| Unit — Monitoring | 1 | Pruebas de monitoreo MongoDB |
| Unit — WebSockets | 1 | Pruebas del handler WebSocket de wearables |
| Unit — Infraestructura | 3 | Pruebas de redisClient, health status del servidor e inicialización |
| Integration | 26 | Pruebas de endpoints HTTP con supertest |
| Database | 6 | Pruebas de aggregations, índices, esquemas e integridad |
| Security / Performance | 2 | Pruebas de seguridad e inyecciones y carga |
| **E2E Backend** | **7** | **Flujos completos de API: registro → historia → análisis → emergencia → alertas → derivación → consentimiento → chatbot** |
| **E2E Frontend (Cypress)** | **14** | **Flujos UI completos: auth, dashboard, analytics, chatbot, síntomas, historia médica, emergencia, wearables, perfil, admin, navegación, visual regression, cross-browser, validación doctor IA** |
| **Web Integration (Jest)** | **2** | **Integración de componentes React + flujos de usuario completos** |
| **Web Seguridad (Jest)** | **1** | **XSS (sanitización DOMPurify, DOM injection, CSP, URLs) + CSRF token validation** |
| **Visual Regression (Jest)** | **8** | **DOM snapshots + CSS class assertions: Navbar, ChatBot, AlertConsole, Theme, Forms, MLResults, Dashboard, Responsive** |
| **Visual Regression (Cypress)** | **1** | **Viewport multi-breakpoint screenshots: home, navbar, dashboard, analytics, theme, chatbot, heatmap, errores** |
| **Accesibilidad (WCAG 2.1 AA)** | **6** | **axe-core + ARIA assertions: Navbar, Forms, Components, Charts/Visualizaciones, Advanced (preexistentes) + LoginPage/RegisterPage/LanguageSelector/Navbar axe adicional** |
| **Accesibilidad — ChatBot** | **1** | **A11Y-CB-01–10: axe en 3 estados, textarea, send button, estructura semántica, Enter/Shift+Enter, acciones rápidas** |
| **Accesibilidad — Teclado** | **1** | **KEY-01–12: Tab order, Enter/Space, checkboxes, selects, modal focus, Escape, sin focus trap, MedicalReport, Navbar** |
| **Accesibilidad — Lector de pantalla** | **1** | **SR-01–12: aria-live, role=status/alert, aria-hidden, aria-expanded, aria-disabled, landmarks, tablas, imágenes, axe en ChatBot/MedicalReport/FhirPage** |
| **Performance Backend** | **3** | **SLA por endpoint (mean/p95/p99), concurrencia paralela, rate limiter todos los scopes** |
| **Performance Frontend** | **2** | **Tiempos de render, re-renders, VirtualizedList, lazy loading, estabilidad de memoria** |
| **LLM Testing — Evals** | **1** | **Golden dataset 8 escenarios, recall ≥ 0.50, coherencia urgencia, confianza, parseo JSON** |
| **LLM Testing — Regresión** | **1** | **R1–R8: campos JSON canónicos, system prompt médico, numeración, parser ante respuestas inválidas** |
| **LLM Testing — Alucinaciones** | **1** | **H1–H10: vacíos, fuera de dominio, contradictorios, inyección de prompt, símbolos, enf. inventadas, valores imposibles, límites de urgencia, Spanglish** |
| **Seguridad — Auth/Authz (TS)** | **1** | **AUTH-01–06: JWT ausente/expirado/tampered/alg-none/secreto-incorrecto; AUTHZ-01–08: matriz roles×rutas, RBAC permissions, bypass via body/query/header** |
| **Seguridad — Prompt Injection (Py)** | **1** | **PI-01–10: inyección directa/indirecta, jailbreak, prompt leaking, historial malicioso, exfiltración, inyección multi-etapa, bypass de dominio, invariantes de seguridad** |
| AI Services (Python) | 77 | Pruebas unitarias e integración del servicio FastAPI |
| **Compatibilidad — Cross-Browser (Cypress)** | **1** | **COMPAT-01–14: 11 perfiles de dispositivo (Chrome/Firefox/Safari/Edge/mobile), overflow horizontal, orientación, load time** |
| **Compatibilidad — Browser APIs (Jest)** | **1** | **API-01–15: localStorage Safari Private, CSS Custom Properties, matchMedia, scrollIntoView, window.open, Promise.allSettled, IntersectionObserver/ResizeObserver, SSR guards** |
| **Compatibilidad — Mobile (Jest)** | **1** | **MOB-01–15: touch events, iOS 100vh, device pixel ratio, orientación, date input fallback, safe-area-inset, font 16px, pointer:coarse, scroll pasivo, viewports 375px/360px** |
| **TOTAL** | **272** | **191 TypeScript/JS + 81 Python** |

---

## 2. Pruebas unitarias — Controllers

Ubicación: `backend/tests/unit/controllers/`  
Patrón: mocks de servicios + helpers `buildReq` / `buildRes` / `buildNext`

| Archivo | Módulo fuente | Casos cubiertos |
|---------|---------------|-----------------|
| `alertController.test.ts` | `alertController.ts` | createCriticalSymptomAlert (201, 400, 403), getAlerts (filtros), updateAlert (404), deleteAlert |
| `authController.test.ts` | `authController.ts` | register (201, 400 duplicado), login (200, 401), refreshToken, logout, forgotPassword, resetPassword |
| `automaticReportController.test.ts` | `automaticReportController.ts` | generateReport (403 no-admin, 400 tipo inválido, periodos daily/weekly/monthly), getReportStats (403) |
| `dashboardController.test.ts` | `dashboardController.ts` | getDashboardStats (200, 500 en error), getPatientsGrowth, getAlertsDistribution |
| `dsrController.test.ts` | `dsrController.ts` | exportUserData (200, includeRaw, 500), deleteUserData (428 sin confirmación doble, 200, 500) |
| `emergencyController.test.ts` | `emergencyController.ts` | createEmergency (201, 400), getEmergencyStatus, cancelEmergency, detectEmergency, getAmbulanceInfo |
| `exportController.test.ts` | `exportController.ts` | exportMedicalHistory (PDF/CSV/JSON), exportAlerts, manageExportQueue |
| `fhirController.test.ts` | `fhirController.ts` | getFhirResource (200, 400 tipo inválido, 404 recurso inexistente), createFhirResource (201, 400), 10 tipos válidos |
| `fileUploadController.test.ts` | `fileUploadController.ts` | uploadFile (201, 400 sin archivo), getFile, deleteFile, getUploadStatus |
| `integrationController.test.ts` | `integrationController.ts` | importLaboratoryResults (200, 400 sin patientId, conversión de fechas), importLaboratoryFromHl7 (400 sin hl7Message, 400 null), getIntegrationStatus |
| `labController.test.ts` | `labController.ts` | getLabResults (paginación, filtros), importAndSaveResults (201, 400), markAsReviewed, flagForReview |
| `medicalHistoryController.test.ts` | `medicalHistoryController.ts` | createMedicalHistory, getMedicalHistory (filtros, paginación), updateMedicalHistory, AIAnalysis integration |
| `smsMetricsController.test.ts` | `smsMetricsController.ts` | getSMSMetrics (con/sin provider), getSMSCosts (conversión fechas a Date), getRateLimitStats |
| `smsWebhookController.test.ts` | `smsWebhookController.ts` | handleTwilioWebhook (delivered/failed/undelivered, Price, 400 sin MessageSid), handleAWSSNSWebhook (SubscriptionConfirmation, SUCCESS, FAILURE, 400), handleMessageBirdWebhook, verifyTwilioWebhook |
| `symptomAnalyzerController.test.ts` | `symptomAnalyzerController.ts` | analyzeSymptoms (200, 400 vacío), getAnalysisHistory, deleteAnalysis |
| `wearableController.test.ts` | `wearableController.ts` | syncWearableData (201, 400), getWearableData (filtros), getLatestVitals |

---

## 3. Pruebas unitarias — Services

Ubicación: `backend/tests/unit/services/`  
Patrón: mocks de modelos Mongoose y dependencias externas (axios, Redis)

| Archivo | Módulo fuente | Casos cubiertos |
|---------|---------------|-----------------|
| `aiIntegration.test.ts` | `aiIntegration.ts` | predictDisease, analyzeSymptoms (200, timeouts), getMlMonitoringMetrics, circuit breaker |
| `alertMonitoringService.test.ts` | `alertMonitoringService.ts` | monitorAlerts, processAlert, escalateAlert, sendNotifications |
| `alertService.test.ts` | `alertService.ts` | createAlert, scheduleFollowUpAlert, getAlerts (filtros), updateAlertStatus, deleteAlert |
| `ambulanceService.test.ts` | `ambulanceService.ts` | requestAmbulance, getAmbulanceStatus, cancelRequest, trackLocation |
| `analyticsService.test.ts` | `analyticsService.ts` | getSystemStats, getGrowthMetrics, getAlertDistribution, getDiseaseDistribution |
| `appointmentReminders.test.ts` | `appointmentService.ts` | processUpcomingReminders, scheduleReminder, skipAlreadySent |
| `appointmentService.test.ts` | `appointmentService.ts` | createAppointment (409 sin disponibilidad), cancelAppointment (404), completeAppointment (404), rescheduleAppointment (409), getDoctorAvailability (slots, slotMinutes 400), processUpcomingReminders |
| `automaticReportService.test.ts` | `automaticReportService.ts` | generateReport (daily/weekly/monthly, con/sin anomalías), getReportsByType, getLatestReport, getReportStats |
| `biConnectorService.test.ts` | `biConnectorService.ts` | exportForPowerBI (JSON/OData, metadata, sanitización de campos sensibles), exportForTableau, exportGeneric, inferencia de tipos |
| `cacheService.test.ts` | `cacheService.ts` | get/set/delete (Redis mock), TTL, hit/miss |
| `consentService.test.ts` | `consentService.ts` | createConsent, signConsent, revokeConsent, getConsent, generatePDF |
| `drugIntegrationService.test.ts` | `drugIntegrationService.ts` | searchDrug (RxNorm API), searchGenericDrugs, checkInteractions (mock axios) |
| `drugInteractionService.test.ts` | `drugInteractionService.ts` | checkInteractions (API externa, fail-open, defaults en campos faltantes), evaluateDosage (recomendación externa, fallback a dosis original) |
| `emergencyMedicalInfoService.test.ts` | `emergencyMedicalInfoService.ts` | getEmergencyMedicalInfo (nombre, edad, alergias, condiciones, labs, vitales, seguro), generateEmergencySummary (con DNR) |
| `emergencyService.test.ts` | `emergencyService.ts` | createEmergency, getEmergencyStatus, cancelEmergency, detectEmergency, notifyHospitals |
| `epidemiologicalService.test.ts` | `epidemiologicalService.ts` | getEpidemiologicalData, getDistrictDistribution, getSymptomTrends |
| `exportService.test.ts` | `exportService.ts` | exportToPDF (generación, buffer), exportToCSV, exportToJSON, manageQueue |
| `featureFlagService.test.ts` | `featureFlagService.ts` | isEnabled (memory provider), targeting rules (equals/contains/startsWith/greaterThan), rolloutPercentage: 0 excluye todos, variaciones A/B |
| `fhirService.test.ts` | `fhirService.ts` | getResource, createResource, updateResource, searchResources, exportPatientData (bundle FHIR) |
| `fhirValidator.test.ts` | `fhirValidator.ts` | validateFhirResource (sin resourceType, sin validador específico), Patient (name requerido, birthDate YYYY-MM-DD, gender válido), Observation (status, code, subject, warnings), Condition, validateFhirResources (batch, prefijo de índice) |
| `fileUploadService.test.ts` | `fileUploadService.ts` | uploadFile (S3 mock), getSignedUrl, deleteFile, validateMimeType |
| `hospitalCommunicationService.test.ts` | `hospitalCommunicationService.ts` | notifyHospitals (disabled→[], sin hospitales→[], máx 3, preferredHospitals, fallo 500), transferPatientInfo |
| `hospitalSyncService.test.ts` | `hospitalSyncService.ts` | registerHospitalSystem (con/sin OAuth2), getRegisteredHospitals, syncFromExternal (400 no configurado, 400 deshabilitado, importar recursos, contar errores), syncToExternal, syncBidirectional |
| `labService.test.ts` | `labService.ts` | saveResult, getResults (filtros, paginación), getAbnormalResults, getCriticalResults |
| `laboratoryIntegrationService.test.ts` | `laboratoryIntegrationService.ts` | importResults FHIR/JSON (con client, sin client 500), fechas en params, importFromHl7 (null→null, error propagado), importResultsAutomatically (stats, errores) |
| `metricAlertService.test.ts` | `metricAlertService.ts` | getCurrentMetrics, detectAnomalies, generateMetricAlerts, clearAlerts |
| `mlOrchestrationService.test.ts` | `mlOrchestrationService.ts` | startRLSession, trainRLSession (addError en fallo), getRLAction, startFLRound, runFLRound |
| `notificationService.test.ts` | `notificationService.ts` | sendPushNotification, sendSMSNotification, sendEmailNotification, getNotificationHistory |
| `oauth2Service.test.ts` | `oauth2Service.ts` | getAccessToken (caché, forceRefresh, 500 sin token), invalidateToken (force refetch), createAuthenticatedClient (Bearer header), mTLS (cert+key), factory createOAuth2Service |
| `prescriptionService.test.ts` | `prescriptionService.ts` | createPrescription, getPrescription, listPrescriptions, updatePrescription, checkDrugInteractions |
| `referralService.test.ts` | `referralService.ts` | createReferral, getReferralById, listReferrals (filtros), acceptReferral, rejectReferral, completeReferral, cancelReferral, getReferralStats |
| `reportService.test.ts` | `reportService.ts` | listTemplates (clinical-summary, treatment-plan), generateReport (plantilla válida, error plantilla inexistente, shareWith), listReportsForPatient, listReportsForDoctor, getReport, shareReport (no duplica), signReport |
| `smsMetricsService.test.ts` | `smsMetricsService.ts` | updateMessageStatus, getMetrics (sin Redis→vacío), getCosts (con filtros de fecha y proveedor), hIncrBy/lPush en Redis mock |
| `smsRateLimiter.test.ts` | `smsRateLimiter.ts` | checkRateLimit (allowed/denied), checkBurstLimit, getRateLimitStats, resetCounters, fail-open (Redis error→allowed:true) |
| `smsService.test.ts` | `smsService.ts` | sendSMS (Twilio/AWS SNS/MessageBird), getRateLimitStats, bulkSend |

---

## 4. Pruebas unitarias — Models

Ubicación: `backend/tests/unit/models/`  
Patrón: Mongoose en memoria real (`mongodb-memory-server`), `afterEach(() => Model.deleteMany({}))`

| Archivo | Módulo fuente | Casos cubiertos |
|---------|---------------|-----------------|
| `AIAnalysis.test.ts` | `AIAnalysis.ts` | validaciones requeridas, urgency enum, timestamps, findByPatient |
| `Alert.test.ts` | `Alert.ts` | validaciones, priority enum, acknowledge(), resolve(), snooze(), statics findByPatient/findByCriteria |
| `Appointment.test.ts` | `Appointment.ts` | validaciones (durationMinutes min:15/max:240), virtual endAt, cancel/markCompleted/reschedule, isSlotAvailable (sin conflicto, con solapamiento) |
| `AuditLog.test.ts` | `AuditLog.ts` | campos requeridos (method, route, statusCode, ip), campos opcionales (userId, userAgent, payloadHash, redactedPayload), createdAt por defecto, consultas por userId/route/statusCode |
| `AutomaticReport.test.ts` | `AutomaticReport.ts` | reportType enum (daily/weekly/monthly), status enum, anomalías con schema correcto, exportFormat válido, findByType (orden, límite), findLatestByType, findByDateRange, getReportStats (total, byType, byStatus) |
| `ConsentLog.test.ts` | `ConsentLog.ts` | userId requerido, versión por defecto '1.0', revokedReason max 500 chars, statics: getLatestConsent (excluye revocados), revokeConsent (razón por defecto, no re-revoca) |
| `InformedConsent.test.ts` | `InformedConsent.ts` | addSignature patient→status='signed', revoke ya revocado→throws, canBeSigned (pending_signature AND no expirado AND no firmado) |
| `LabResult.test.ts` | `LabResult.ts` | validaciones, status enum, interpretation enum, markAsReviewed, statics findByPatient/findAbnormal/findCritical |
| `MLExperiment.test.ts` | `MLExperiment.ts` | addLog (appends logs), addError (status='failed'), complete (status='completed', endTime, durationMs), virtual duration (durationMs/startTime-endTime/null), statics: findByExperimentId, findByType, findByStatus, findBySession, findByModel, getExperimentStats |
| `MedicalHistory.test.ts` | `MedicalHistory.ts` | validaciones, symptoms array, AIAnalysis embedding, statics findByPatient/findRecent |
| `Prescription.test.ts` | `Prescription.ts` | validaciones, medications array, status enum, complete/cancel methods |
| `Referral.test.ts` | `Referral.ts` | validaciones, referralType enum, priority enum, accept/reject/complete/cancel methods, statics |
| `User.test.ts` | `User.ts` | bcrypt hash password, comparePassword, role enum, generateAuthToken, generateRefreshToken |
| `WearableData.test.ts` | `WearableData.ts` | source enum, heartRate max:300, oxygenSaturation max:100, respiratoryRate max:100, sleepHours max:24, steps/distance min:0, syncedAt por defecto, consultas por patientId |
| `ChatConversation.test.ts` | `ChatConversation.js` | sessionId requerido y único, defaults (status:active, language:es, source:web, city:Tacna, highestUrgency:low), enums (status, metadata.source, summary.highestUrgency), messages embedded (role user/bot, metadata con detectedDiseases/Symptoms), addMessage() (actualiza summary, urgency bilingüe alta/critica, requiresFollowUp para high/critical, averageConfidence), complete() (status→completed, completedAt), virtuals (messageCount, duration con/sin completedAt), statics: getRecent (límite, excluye messages), getByUser, getUrgent (high/critical no completadas), getStatistics (ceros, count por status, urgentConversations, filtros fecha) |
| `SymptomReport.test.ts` | `SymptomReport.js` | location.district enum (8 distritos de Tacna), coordenadas min/max (lat -18.1/-17.8, lon -70.3/-70.1), category enum (6 valores), overallSeverity (low/medium/high, rechaza severe), suspectedDisease (8 valores), status/reportedBy/source enums, temperature (35-42), oxygenSaturation (0-100), defaults (suspectedDisease:unknown, status:pending, isAnonymous:true, source:web), síntomas embedded (severity mild/moderate/severe, duration con unit hours/days/weeks), calculateSeverity() (high con 2 severe o 1 severe+2 moderate, medium con 1 severe o 2 moderate, low), virtuals: riskLevel (high cuando medicalAttentionRequired=true), daysSinceReport≥0, statics: getByDistrict (filtros severity/fecha), getAggregatedByDistrict (agrupación, highSeverity, coordenadas promedio), queries por patientId/status/category |

---

## 5. Pruebas unitarias — Middleware

Ubicación: `backend/tests/unit/middleware/`

| Archivo | Módulo fuente | Casos cubiertos |
|---------|---------------|-----------------|
| `auditLogger.test.ts` | `auditLogger.ts` | captura finish listener vía `res.on`, solo registra rutas `/api/`, redacta password/token/patientName, payloadHash es SHA-256 (64 hex chars) |
| `auth.test.ts` | `auth.ts` | authenticate (token válido, expirado, faltante), authorize (rol permitido, rol denegado), INTERNAL_REQUEST_HEADER bypass |
| `brotliCompression.test.ts` | `brotliCompression.ts` | comprime respuestas grandes, no comprime pequeñas, respeta Accept-Encoding |
| `enforceHttps.test.ts` | `enforceHttps.ts` | NODE_ENV=development/test→next(), NODE_ENV=production+http→redirect 301 a https://, insensible a mayúsculas (HTTPS→next()) |
| `errorHandler.test.ts` | `errorHandler.ts` | AppError operacional→statusCode real, Error genérico→500, validationError→400, formato de respuesta success:false |
| `rateLimiter.test.ts` | `rateLimiter.ts` | limita requests por ventana, permite bajo el límite, bloquea al superarlo, X-RateLimit headers |
| `rbac.test.ts` | `rbac.ts` | requireRole (permitido/denegado), requirePermission (con permiso, sin permiso), combinaciones de roles |
| `rbacAudit.test.ts` | `rbacAudit.ts` | auditRBAC registra entrada, getRBACAuditReport cuenta, clearAuditLog resetea |
| `validation.test.ts` | `validation.ts` | valida campos requeridos, pasa cuando no hay errores, formatea errores de express-validator |

---

## 6. Pruebas unitarias — Utils

Ubicación: `backend/tests/unit/utils/`

| Archivo | Módulo fuente | Casos cubiertos |
|---------|---------------|-----------------|
| `AppError.test.ts` | `AppError.ts` | statusCode default=500, isOperational=true, optional code/field, instanceof Error |
| `anonymization.test.ts` | `anonymization.ts` | pseudonymize (determinista, SHA-256=64 hex, SHA-512=128 hex, salt-dependent), redactPII (dot-notation paths, no muta original, null parents), anonymizeForAnalytics (hash patientId/doctorId/userId) |
| `asyncHandler.test.ts` | `asyncHandler.ts` | envuelve función async, propaga rejected promises a next(), no llama next en éxito |
| `encryption.test.ts` | `encryption.ts` | getEncryptionKey (32 bytes→Buffer, vacío→throws, corto→throws '32 bytes'), encryptString/decryptString (round-trip, IV diferente cada vez, Unicode, clave errónea→throws) |
| `hl7Parser.test.ts` | `hl7Parser.ts` | parseHl7Message (MSH segment), mapHl7ToFhirObservation (OBX→Observation), parseHl7Xml |
| `localizedErrors.test.ts` | `localizedErrors.ts` | errorMessages (code/message/userMessage), getLocalizedError (campo appended, SERVER_ERROR por defecto), formatErrorResponse (success:false, technicalDetails, suggestions), translateError (español, fallback SERVER_ERROR) |
| `symptomSeverityCalculator.test.ts` | `symptomSeverityCalculator.ts` | null→throws, []→0, mild=1/moderate=2/severe=3, unknown severity=0, casos clínicos (leve/moderado/severo) |

---

## 7. Pruebas unitarias — Jobs

Ubicación: `backend/tests/unit/jobs/`  
Patrón: mock de `node-cron` con `{ schedule: jest.fn().mockReturnValue({ stop: jest.fn() }) }`

| Archivo | Módulo fuente | Casos cubiertos |
|---------|---------------|-----------------|
| `alertJobs.test.ts` | `alertJobs.ts` | intervalo creado una sola vez, doble start no duplica, stop limpia intervalos, permite reinicio, callbacks async con fake timers |
| `appointmentJobs.test.ts` | `appointmentJobs.ts` | intervalo único para reminders, stop/restart, callback llama processUpcomingReminders |
| `labImportJobs.test.ts` | `labImportJobs.ts` | cron.schedule registrado con expresión correcta, callback invoca importResultsAutomatically, runLabImportManually con/sin patientIds, propagación de error |
| `mlMetricsJobs.test.ts` | `mlMetricsJobs.ts` | 3 crons (horario 0 \* \* \* \*, diario 0 2 \* \* \*, semanal 0 3 \* \* 1), no duplicados, stop/restart, calculateMetricsManually (1h/24h/7d), storage en Redis, fail-open sin Redis |
| `reportJobs.test.ts` | `reportJobs.ts` | 3 crons (daily 59 23 \* \* \*, weekly 59 23 \* \* 0, monthly 0 0 1 \* \*), generateManualReport (daily/weekly/monthly), tipo inválido→throws, callbacks sin propagación |

---

## 7b. Pruebas unitarias — Validators

Ubicación: `backend/tests/unit/validators/`  
Patrón: validación directa de esquemas Joi con `schema.validate(data, { abortEarly: false })`

| Archivo | Módulo fuente | Casos cubiertos |
|---------|---------------|-----------------|
| `authValidators.test.ts` | `authValidators.ts` | registerSchema (name min/max, email, password 8+ chars + patrón seguridad, role enum), loginSchema (email, password cualquier string), refreshTokenSchema (requerido), updateProfileSchema (todos opcionales, avatar URL), changePasswordSchema (currentPassword requerido, newPassword patrón completo) |
| `medicalHistoryValidators.test.ts` | `medicalHistoryValidators.ts` | createMedicalHistorySchema (patientId/patientName/age/diagnosis requeridos, age 0-150 entero, symptoms max 20 con sub-schema severity/duration, location latitude -90/90 / longitude -180/180, images max 10 URLs, syncStatus pending/synced/error, fecha no futura), updateMedicalHistorySchema (todos opcionales), syncOfflineHistoriesSchema (array 1-100 historias) |

---

## 7c. Pruebas unitarias — Metrics

Ubicación: `backend/tests/unit/metrics/`  
Patrón: mock de `prom-client` con Registry aislado, helpers `buildReq`/`buildRes`

| Archivo | Módulo fuente | Casos cubiertos |
|---------|---------------|-----------------|
| `metrics.test.ts` | `metrics.ts` | metricsMiddleware (llama next, registra listener finish, observa sin error, reemplaza :param, path vacío), metricsHandler (200 sin token, 401 token incorrecto, 200 token correcto), metricsRegistry (contiene http_requests_total y http_request_duration_ms, expone texto Prometheus) |
| `percentileMetrics.test.ts` | `percentileMetrics.ts` | percentileMetricsMiddleware (next, listener finish, reemplaza :param, status_code correcto), calculatePercentiles (ceros sin buckets, ceros con total=0, p50/p95/p99 con buckets reales), getPercentileMetrics (objeto vacío, filtro route, filtro method, filtros combinados), httpRequestPercentiles (defined, observe sin error) |

---

## 7d. Pruebas unitarias — Monitoring

Ubicación: `backend/tests/unit/monitoring/`  
Patrón: mock de mongoose y prom-client, mock de db con colección system.profile

| Archivo | Módulo fuente | Casos cubiertos |
|---------|---------------|-----------------|
| `mongodbMonitoring.test.ts` | `mongodbMonitoring.ts` | métricas Prometheus exportadas (mongoQueryDuration/mongoSlowQueries/mongoIndexUsage definidos y funcionales), getSlowQueries (array, límite 10, límite personalizado), setupMongoDBProfiling (sin error, llama db.admin().command), setupMongooseMonitoring (sin error), initMongoDBMonitoring (readyState=1), analyzeIndexUsage (retorna {used, unused}, maneja db undefined) |

---

## 7e. Pruebas unitarias — WebSockets

Ubicación: `backend/tests/unit/sockets/`  
Patrón: `FakeWs` (EventEmitter) simula WebSocket sin red real; `FakeHttpServer` monta el handler; mocks de `WearableData.create` y `checkThresholdsAndAlert`

| Archivo | Módulo fuente | Casos cubiertos |
|---------|---------------|-----------------|
| `wearableSocketHandler.test.ts` | `sockets/wearableSocketHandler.ts` | ping → pong; auth timeout 11s → `auth:error`; JWT válido → `auth:ok` con userId; JWT inválido → `auth:error`; auth sin campo token → `auth:error`; `wearable:data` antes de auth → `auth:error`; `wearable:data` post-auth → `WearableData.create` + `wearable:ack {saved:true}`; threshold excedido → `wearable:alert {level:'critical'}`; JSON inválido → `error`; tipo desconocido post-auth → `error`; payload null → `error` |

---

## 7f. Pruebas unitarias — Infraestructura

Ubicación: `backend/tests/unit/config/` · `backend/tests/unit/` (raíz)  
Patrón: `jest.resetModules()` + `jest.doMock()` para aislar cada require; `jest.isolateModulesAsync` para importar `src/index` con dependencias controladas

| Archivo | Módulo fuente | Casos cubiertos |
|---------|---------------|-----------------|
| `redisClient.test.ts` | `config/redisClient.ts` | Skip en `NODE_ENV=test` → `null` sin llamar a `createClient`; inicialización exitosa → `connect()` + listeners `error`/`reconnecting` + log ✅; reconexión de cliente ya iniciado → `createClient` llamado solo 1 vez; fallo de conexión → `null` + log ❌; `disconnectRedis` sin cliente → no-op; `disconnectRedis` con cliente → `disconnect()` + log 🛑; `getRedisClient` retorna el cliente cacheado |
| `indexHealthStatus.test.ts` | `src/index.ts` (ruta `/health`) | Estado `healthy` cuando Mongoose `readyState=1` + Redis responde PONG; estado `degraded` cuando Redis.ping lanza error → `dependencies.redis.status='error'` + log ❌ |
| `indexInitialization.test.ts` | `src/index.ts` (inicialización) | Morgan en modo `'dev'` cuando `serverEnv=development`; Redis `disconnected` sin cliente activo en `/health`; sin reconexión a Mongo cuando `readyState=1`; error de conexión Mongo → log ❌ + `process.exit(1)` fuera de test env; manejo de señales `SIGTERM`/`SIGINT`/`uncaughtException`/`unhandledRejection` |

---

## 8. Pruebas de integración

Ubicación: `backend/tests/integration/`  
Patrón: `supertest` contra la app Express real, MongoDB en memoria, Redis mockeado en `setup.ts`

| Archivo | Área de negocio | Endpoints cubiertos |
|---------|----------------|---------------------|
| `advanced-api.test.ts` | API avanzada | Múltiples endpoints combinados, headers de seguridad |
| `alertProcessing.integration.test.ts` | Procesamiento de alertas | POST /alerts, flujo de procesamiento automático |
| `alerts.integration.test.ts` | Alertas | POST /alerts/critical-symptom (201, 403), GET /alerts (paginación), PATCH /alerts/:id, DELETE |
| `analytics.integration.test.ts` | Analytics | GET /analytics/executive-dashboard (401, 403 doctor/patient, 200 admin, periodInDays, includeOutbreak), GET /epidemiology/district-trends (401, 403 patient, 200 doctor), GET /epidemiology/outbreaks |
| `api.test.ts` | API general | Health check, rutas básicas, manejo de errores global |
| `appLifecycle.integration.test.ts` | Ciclo de vida | Inicio/parada del servidor, manejo de señales |
| `appointments.integration.test.ts` | Citas médicas | POST /appointments (201, 400, 403), GET /appointments (filtros), POST /:id/cancel, GET /doctor/:id/availability |
| `auth.integration.test.ts` | Autenticación | POST /auth/login (200, 401), POST /auth/refresh-token (200, 401), logout, forgot/reset-password |
| `automaticReports.integration.test.ts` | Reportes automáticos | GET /reports/automatic (401, 403 patient, 200 admin/doctor), GET /stats (403 doctor, 200 admin), GET /latest/:type (daily/weekly/monthly), POST /generate (403 doctor, 200 admin, 400 tipo inválido), GET /:type/list |
| `bi.integration.test.ts` | Business Intelligence | GET /bi/datasets (401, 403 patient, 200 admin/doctor, contiene medical-histories/users/appointments), GET /bi/powerbi/:dataset (401, 403 patient, 200, 400 dataset inválido, filtros fecha), GET /bi/tableau/:dataset |
| `consent.integration.test.ts` | Consentimientos | POST /consent (201, 400), GET /consent/:userId, POST /informed-consent (201, 403, 400) |
| `dsr.integration.test.ts` | Data Subject Requests | GET /dsr/export/:userId (401, 403 doctor, 200 admin), DELETE /dsr/delete/:userId (401, 403 doctor, 428 sin header, 428 sin body.confirm, 428 X-Confirm-Action incorrecto, 428 confirm:false, 200 con doble confirmación) |
| `emergency.integration.test.ts` | Emergencias | POST /emergency (201, 400 tipos inválidos), POST /emergency/detect (400 sin síntomas/ubicación), GET /emergency/active, GET /:id, GET /:id/ambulance-info |
| `exportFileUpload.integration.test.ts` | Exportación/Subida | POST /upload (201, 400), GET /export/:format, gestión de cola |
| `fhir.integration.test.ts` | FHIR R4 | GET /fhir/capabilities, POST /fhir/Patient (201, 400 tipo inválido), GET /fhir/:type/:id (400), POST /fhir/validate, GET /fhir/sync/hospitals, POST /fhir/parse-hl7 |
| `health.integration.test.ts` | Health check | GET /health (200), GET /health/detailed, degraded status |
| `integrations.integration.test.ts` | Integraciones externas | POST /integrations/laboratory/import (401, 403 patient, 200 admin, 400 sin patientId), POST /laboratory/hl7 (401, 403, 400 sin mensaje, 200 admin), GET /drugs/search (401, 403 patient, 200 doctor), POST /drugs/interactions (401, 200), POST /laboratory/sync (401, 403, 200) |
| `laboratory.integration.test.ts` | Laboratorio | GET /lab/results (200, 401, filtros, 400 patientId inválido), POST /lab/results/import, GET /patients/:id/history, GET /results/abnormal, GET /results/critical |
| `medicalHistoryAdvanced.integration.test.ts` | Historia clínica avanzada | CRUD con AIAnalysis, filtros avanzados, paginación |
| `mlOrchestration.test.ts` | Orquestación ML | POST /ml/rl/session, POST /ml/rl/train, GET /ml/rl/action, POST /ml/fl/round |
| `prescriptions.integration.test.ts` | Prescripciones | POST /prescriptions (201 doctor, 403 paciente, 400 validaciones), GET /prescriptions, GET /:id (404, 200) |
| `referrals.integration.test.ts` | Referidos | POST /referrals (201, 401, 403, 400), GET /referrals, ciclo crear→aceptar→completar, rechazar (400 sin reason), GET /stats/summary, GET /pending/list |
| `sms.integration.test.ts` | SMS métricas | GET /sms/metrics (200 admin, 403 doctor, 401), GET /metrics/costs (filtros de fecha/proveedor), GET /metrics/rate-limit |
| `smsWebhooks.integration.test.ts` | SMS Webhooks | POST /sms/webhooks/twilio (delivered/failed/undelivered, 400 sin MessageSid), POST /aws-sns (SubscriptionConfirmation, SUCCESS, FAILURE), POST /messagebird (delivered/failed) |
| `symptomAnalyzer.integration.test.ts` | Analizador de síntomas | POST /analyze (401, 400 sin symptoms/vacío/sin nombre/severity inválida, 200/503 válido, patient puede usar), POST /ml-analyze (401, 400 vacío/sin symptoms/age>150), GET /recommendations (401, 200), GET /status (401, 200), GET /trends/:id (401, 400 id inválido/period inválido, 200 con 7d), GET /history/:id (401, 400, 400 limit>100) |
| `wearables.integration.test.ts` | Wearables | POST /wearables/sync (401, 400 sin data/vacío/heartRate>300/oxygenSaturation>101/timestamp inválido/source inválido/steps<0/sleepHours>24, 200), GET /data/:id? (401, 200, filtros fecha, 400 startDate inválida/limit>1000/patientId inválido), GET /metrics/:id? (401, 200, hours, 400 hours>720) |

---

## 9. Pruebas de base de datos

Ubicación: `backend/tests/database/`

| Archivo | Área | Casos cubiertos |
|---------|------|-----------------|
| `aggregations.test.ts` | MongoDB Aggregations | Pipelines de métricas, groupBy, sort, limit |
| `data-integrity.test.ts` | Integridad de datos | Relaciones entre modelos, validaciones cross-collection |
| `indexes.test.ts` | Índices MongoDB | Existencia de índices compuestos, rendimiento de queries |
| `query-performance.test.ts` | Rendimiento de queries | Tiempo de ejecución de queries críticas |
| `schema-validation.test.ts` | Validación de esquemas | Todos los modelos: campos requeridos, enums, ranges |
| `transactions.test.ts` | Transacciones | Operaciones atómicas, rollback en error |

---

## 10. Pruebas de seguridad y rendimiento

| Archivo | Categoría | Casos cubiertos |
|---------|-----------|-----------------|
| `security/security.test.ts` | Seguridad | SQL/NoSQL injection, XSS, CORS, rate limiting, JWT tampering, CSRF |
| `performance/load.test.ts` | Rendimiento | Carga concurrente (100 req/s), tiempos de respuesta p95, throughput |

---

## 11. Pruebas E2E — Backend (flujos API)

Ubicación: `backend/tests/e2e/`  
Framework: **Jest + Supertest** contra Express real + MongoDB en memoria  
Patrón: flujos de múltiples pasos que simulan jornadas completas de usuario  

> Los tests E2E de backend crean usuarios reales en la BD de test, realizan llamadas HTTP reales a la aplicación Express, y verifican el estado resultante tras cada paso.

### Flujos cubiertos

| Archivo | Flujos cubiertos | Pasos clave |
|---------|-----------------|-------------|
| `flows.test.ts` | **14 flujos originales** | Registro→Login→Historia→Dashboard; Análisis IA; Admin sistema; Sync offline; Exportación; Auth+refresh; Búsqueda; Perfil; Recuperación contraseña; Desactivación; Gestión usuarios admin; Wearables; Multi-dispositivo; Error recovery |
| `emergency.e2e.test.ts` | **5 flujos de emergencia** | Reporte → Atención → Ambulancia → Resolución; Comunicación hospital; Info médica emergencia; Acceso público; Brote epidémico + alerta |
| `appointments.e2e.test.ts` | **5 flujos de citas** | Solicitud → Confirmación → Completado; Cancelación; Reagendamiento; Calendario doctor; Prevención solapamiento |
| `referrals.e2e.test.ts` | **4 flujos de derivaciones** | GP → Especialista → Atendido; Rechazo y reasignación; Derivación urgente; Historial completo paciente |
| `consent.e2e.test.ts` | **4 flujos de consentimiento** | Creación → Firma → Verificación; Revocación; Auditoría DSR; Rechazo documentado |
| `alerts.e2e.test.ts` | **5 flujos de alertas** | Alerta clínica → Reconocimiento → Resolución; Brote epidémico + SMS masivo; Métricas wearable críticas; Notificaciones SMS; Historial con paginación |
| `chatbot.e2e.test.ts` | **6 flujos de chatbot** | Consulta síntomas multi-turno; Análisis texto multi-mensaje; Detección emergencia y escalación; Historial sesiones; Doctor revisa historial; ML pipeline integrado |

### Estrategia de tolerancia

Los tests E2E aceptan rangos de status (`[200, 201, 400, 500]`) para rutas que dependen de servicios externos (AI, SMS, hospitals). Las aserciones de negocio se aplican condicionalmente cuando el status es exitoso, garantizando que el test **nunca falla por indisponibilidad de servicio externo**, pero sí falla si el endpoint retorna 401 o 403 inesperadamente.

---

## 12. Pruebas E2E — Frontend (Cypress)

Ubicación: `web/cypress/e2e/`  
Framework: **Cypress v13.6.0**  
Configuración: `web/cypress.config.js` — baseUrl `http://localhost:3000`, viewport 1280×720  
Patrón: `cy.intercept()` para mocks de API, `localStorage` para autenticación simulada  

### Archivos Cypress

| Archivo | Área | Flujos / Casos cubiertos |
|---------|------|--------------------------|
| `authentication.cy.js` | Auth | Formulario login visible; login exitoso (mock 200); error credenciales (mock 401); navegar a registro; registro nuevo usuario; logout |
| `dashboard.cy.js` | Dashboard | Overview paciente; tarjetas estadísticas; navegar a historias; navegar a analytics; actividades recientes |
| `analytics.cy.js` | Analytics | Dashboard analytics; gráficas y charts; filtrado por rango de fechas; exportar CSV; distribución de enfermedades |
| `chatbot.cy.js` | Chatbot | Pantalla principal con RespiCare; enviar mensaje; recibir respuesta bot; conversación múltiples mensajes |
| `symptom-report.cy.js` | Reporte | Abrir formulario; llenar y enviar reporte; validación campos requeridos |
| `navigation.cy.js` | Navegación | Dashboard; Analytics; Heatmap; Inicio; clase active en ruta activa |
| `medical-history.cy.js` | Historia Médica | Lista con paginación; loading/empty state; crear historia (form, validación, éxito); detalle; editar diagnóstico; búsqueda por texto; filtro por fecha; exportar PDF |
| `emergency.cy.js` | Emergencia | Botón SOS visible; abrir formulario; confirmar emergencia; geolocalización; formulario completo; validación; panel admin emergencias; despachar ambulancia; mapa con markers; historial |
| `wearables.cy.js` | Wearables | Dashboard métricas (FC, SpO2, pasos, sueño, última sync); sincronización Apple Health; fallo de sync; gráficas tendencias 7d/30d; alertas SpO2 crítica/FC alta; historial paginado con filtro fecha |
| `profile.cy.js` | Perfil | Ver perfil (nombre, email, rol, teléfono, fecha); editar (nombre, teléfono, cancelar, validación vacío); cambiar contraseña (éxito, contraseña incorrecta, contraseñas no coinciden, fortaleza); notificaciones SMS toggle; eliminación datos DSR |
| `admin.cy.js` | Admin Panel | Dashboard admin (totales, emergencias, alertas, actividad); gestión usuarios (lista, roles, filtro por rol, búsqueda, activar usuario, navegar detalle); salud sistema (DB, Redis, degraded); reportes (lista, generar, descargar); analytics epidemiológicos; gestión alertas (ver, reconocer) |
| **`doctor-validation.cy.js`** | **Validación IA (CP-EPIC03-009/010)** | **CP-009: Lista predicciones pendientes (badge verde/amber/rojo, carga < 2s, detalle síntomas/recomendaciones, empty state, error 500/401) · CP-010: Aceptar (status=validated, doctorId en payload, audit) · Rechazar (overrideDiagnosis+reason requeridos, status=rejected) · Ajustar (adjustedDisease+clinicalNote, status=adjusted) · Error 500 con mensaje reintento** |

### Cobertura por rol de usuario

| Rol | Archivos Cypress | Flujos cubiertos |
|-----|-----------------|-----------------|
| `patient` | authentication, dashboard, chatbot, symptom-report, wearables, profile | Registro, consulta, reportes, wearables, perfil |
| `doctor` | medical-history, navigation, **doctor-validation** | Historias, navegación clínica, **validación predicciones IA** |
| `admin` | admin, emergency, analytics | Panel admin, emergencias, analytics |

---

## 12b. Pruebas de Integración Web (Jest)

Ubicación: `web/src/tests/integration/`  
Framework: **Jest + React Testing Library** · `BrowserRouter` / `MemoryRouter` · mocks de `axios` e `i18nService`

### Estrategia

Verifican que múltiples componentes y páginas colaboren correctamente sin necesitar un servidor real. Cada test renderiza árboles completos (`ThemeProvider` + `BrowserRouter`) y simula interacciones de usuario con `fireEvent` / `waitFor`.

| Archivo | Componentes / Páginas | Casos cubiertos |
|---------|-----------------------|-----------------|
| `component-integration.test.js` | `Home`, `Dashboard`, `Analytics`, `Navbar`, `LanguageSelector`, `ThemeToggle`, `ChatBotEnhanced` | Home renderiza con ChatBotEnhanced; cambio de idioma se propaga al árbol; Dashboard con AlertConsole+AppointmentCalendar tras mock de axios; Theme toggle aplica clase al body; Navbar muestra/oculta links según autenticación |
| `user-flows.test.js` | `App` completo con `MemoryRouter` | Flujo análisis síntomas: home → input en chatbot → POST `/symptom-analyzer` interceptado → respuesta con `sessionId`/`shapExplanation`; flujo autenticación: login form → POST `/auth/login` → redirección a dashboard; navegación entre rutas con `MemoryRouter` |

### Comandos

```bash
cd web
npx jest --testPathPattern="integration" --verbose
npx jest src/tests/integration/component-integration.test.js
npx jest src/tests/integration/user-flows.test.js
```

---

## 12c. Pruebas de Seguridad Web (Jest)

Ubicación: `web/src/tests/security/`  
Framework: **Jest** · `isomorphic-dompurify` (mock) · DOM nativo jsdom  

### Cobertura — `xss-csrf.test.js`

| Categoría | Casos cubiertos |
|-----------|-----------------|
| **XSS — Sanitización de input** | `<script>` eliminado; `onerror` en atributos eliminado; `javascript:` en hrefs eliminado; `<iframe>` eliminado; `<object>`/`<embed>` eliminados; `data:text/html` eliminado |
| **XSS — DOM Injection** | `innerHTML` con script no ejecuta; event handler `onclick` no queda en DOM tras sanitización; data URI no queda en src |
| **CSP** | Meta tag CSP presente o no rompe; inline scripts no usados en la app |
| **Validación de URLs** | `javascript:`, `data:`, `vbscript:` detectados como inválidos; `http:`, `https:`, `mailto:`, `tel:` permitidos |
| **CSRF — Token en formularios** | Input `_csrf` con valor presente en forms POST; `SameSite=Strict` en cookies de sesión; origen verificado en headers de petición |

### Comandos

```bash
cd web
npx jest src/tests/security/xss-csrf.test.js --verbose
npx jest --testPathPattern="security" --verbose
```

---

## 13. Pruebas de UI / Visual Regression

Ubicación Jest: `web/src/tests/visual/`  
Ubicación Cypress: `web/cypress/e2e/visual-regression.cy.js`  
Framework: **Jest + React Testing Library** (DOM snapshots) · **Cypress** (viewport screenshots)  

### Estrategia de Visual Regression

El sistema utiliza **dos capas complementarias** sin requerir herramientas externas de pago (Percy, Chromatic):

| Capa | Herramienta | Qué detecta |
|------|-------------|-------------|
| **Snapshot DOM** | Jest `toMatchSnapshot()` + `asFragment()` | Cambios en estructura HTML, clases CSS, atributos, texto |
| **Aserciones de estado** | Testing Library | Clases activas, ARIA labels, íconos, estados loading/error |
| **Screenshots viewport** | Cypress `cy.screenshot()` | Layout responsive, composición visual por breakpoint |

> Para activar comparación pixel-a-pixel, instalar `cypress-image-diff-js` y reemplazar `cy.screenshot()` por `cy.compareSnapshot()`.

### Archivos Jest (DOM Snapshots)

| Archivo | Componente | Técnicas aplicadas |
|---------|------------|--------------------|
| `navbar.visual.test.js` | `Navbar` | Snapshots en 4 rutas distintas; active link class; ARIA labels; 6 nav-links; CSS class assertions |
| `chatbot.visual.test.js` | `ChatBot` | Snapshot inicial; estructura layout (input, button, messages); bot/user bubbles; estado loading; envío de mensaje |
| `alertconsole.visual.test.js` | `AlertConsole` | Snapshot vacío; snapshot con 3 alertas cargadas; estado loading; mensajes success/error; botón acknowledge |
| `theme.visual.test.js` | `ThemeProvider` + `ThemeToggle` | Snapshot light/dark; icon moon/sun; ARIA label; texto "Modo oscuro/claro"; body class; CSS vars `--color-*`; toggle interactivo |
| `forms.visual.test.js` | `SymptomReportForm` | Snapshot vacío; campos form (select, textbox, checkboxes, button); checkbox check/uncheck; snapshot con síntomas seleccionados; estados success/error tras envío |
| `mlresults.visual.test.js` | `MLAdvancedResults` + `SHAPVisualization` | Snapshots con confianza 87%, 94%, 42%, null; nombre de enfermedad; porcentaje confianza; barra de progreso; badge urgencia; lista síntomas; SHAP features |
| `dashboard.visual.test.js` | `Dashboard` page + `AnalyticsDashboard` | Snapshot loading; snapshot con datos; loading spinner; sección servicios; estado error API down; charts recharts (mocked); distribución de enfermedades |
| `responsive.visual.test.js` | `Navbar` + `matchMedia` | Snapshots en 3 viewports (375/768/1280); nav en mobile/desktop; suite 6 breakpoints (iPhone SE → Large Desktop); dark mode detection; resize dinámico |

### Archivos Cypress (Screenshots)

| Archivo | Páginas | Viewports | Screenshots capturados |
|---------|---------|-----------|------------------------|
| `visual-regression.cy.js` | Home, Dashboard, Analytics, ChatBot, SymptomForm, Heatmap, Error 404 | 375, 414, 768, 1024, 1280, 1440 px | ~30 capturas: `home-{viewport}`, `navbar-{viewport}`, `dashboard-{estado}`, `analytics-{viewport}`, `theme-light/dark`, `chatbot-{estado}`, `error-404`, `error-service-down` |

### Flujos Cypress cubiertos

| Flujo | Descripción |
|-------|-------------|
| Home multi-viewport | 6 viewports desde iPhone SE hasta 1440px |
| Navbar active link | Screenshot antes/después de navegación |
| Dashboard loading state | Captura del spinner con delay de API |
| Theme light/dark | Screenshot con body class `theme-light` y `theme-dark` |
| ChatBot con mensaje | Screenshot tras enviar mensaje y ver respuesta |
| Error 404 | Captura de página no encontrada |
| Error service down | Captura con API respondiendo 503 |

### Cómo funcionan los snapshots DOM

Al ejecutar los tests por primera vez, Jest **crea los archivos `.snap`** en `__snapshots__/`. En ejecuciones posteriores, compara el DOM serializado con el snapshot guardado. Si hay diferencias:

```
● Navbar — Snapshot Visual Regression › matches DOM snapshot on default route (/)

  expect(received).toMatchSnapshot()

  Snapshot name: `Navbar — Snapshot Visual Regression matches DOM snapshot on default route (/) 1`

  - Snapshot  - 1
  + Received  + 1

  -   <a className="nav-link active" href="/">
  +   <a className="nav-link active highlighted" href="/">
```

Para **actualizar los snapshots** intencionalmente tras un cambio de diseño:

```bash
cd web && npx jest --updateSnapshot --testPathPattern="visual"
```

---

## 14. Pruebas de Accesibilidad (WCAG 2.1 AA)

Ubicación: `web/src/tests/accessibility/`  
Framework: **jest-axe** (axe-core) + **React Testing Library**  
Estándar: **WCAG 2.1 Nivel AA** — conformidad automática más aserciones manuales de ARIA

### Estrategia de Accesibilidad

Cada test combina dos capas:

| Capa | Herramienta | Qué verifica |
|------|-------------|--------------|
| **Scan automático** | `axe-core` vía `jest-axe` | Violaciones WCAG 2.1 AA: contrast, labels, roles, estructura |
| **Aserciones ARIA** | Testing Library + DOM queries | `aria-current`, `aria-expanded`, `aria-label`, `aria-hidden`, `aria-haspopup` |

```javascript
// Patrón base para cada componente
it('should have no accessibility violations', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Archivos de Accesibilidad

| Archivo | Componentes cubiertos | Técnicas aplicadas |
|---------|-----------------------|--------------------|
| `accessibility-advanced.test.js` | `Home`, `Dashboard`, `Analytics`, `LanguageSelector`, `ThemeToggle` | axe WCAG 2.1 AA; keyboard nav; screen reader labels; skip links; heading hierarchy; alt text; responsive |
| `navbar.accessibility.test.js` | `Navbar` | axe en 4 rutas; `role="navigation"` + `aria-label`; `aria-current="page"` en enlace activo; `aria-hidden` en íconos decorativos; todos los `<a>` con `href` válidos; texto significativo en cada link |
| `forms.accessibility.test.js` | `SymptomReportForm`, `ConsentManagement`, `AppointmentCalendar` | axe en render inicial y tras interacción; district select; checkboxes sin `checked` por defecto; toggle check/uncheck; botones con texto accesible; date input con formato `YYYY-MM-DD`; sin IDs duplicados en DOM |
| `components.accessibility.test.js` | `ThemeToggle`, `LanguageSelector`, `AlertConsole`, `MLAdvancedResults`, `ReferralManagement` | axe light/dark mode; `aria-label` dinámico en toggle; `aria-expanded` false→true al abrir; `aria-haspopup`; icono `aria-hidden`; referencias `aria-labelledby` y `aria-describedby` apuntan a elementos existentes |
| `charts.accessibility.test.js` | `AnalyticsDashboard`, `SHAPVisualization`, `FactorChart`, `TemporalTrends`, `DiseaseReports`, `FairnessVisualization`, `AutomaticReportsDashboard`, `ExecutiveDashboard` | axe en estados loading/loaded/error; recharts mocked con `role="img"` + `aria-label`; botones de selección de vista con texto accesible; `tabIndex ≥ 0` en elementos interactivos |
| **`chatbot.accessibility.test.js`** | **`ChatBot`** | **axe WCAG 2.1 AA en 3 estados; textarea sin aria-hidden; send button con aria-label; disabled semántico; estructura h3; Enter/Shift+Enter; acciones rápidas accesibles; A11Y-CB-01–10** |
| **`keyboard-navigation.accessibility.test.js`** | **`SymptomReportForm`, `ChatBot`, `MedicalReport`, `ThemeToggle`, `LanguageSelector`, `Navbar`, `FhirPage`** | **Tab/Shift+Tab orden de foco; Enter/Space en botones; checkboxes con label; selects nativos; modal focus; Escape para cerrar dropdown; sin focus trap fuera de modales; KEY-01–12** |
| **`screen-reader.accessibility.test.js`** | **`ChatBot`, `MedicalReport`, `FhirPage`, `FhirResourceViewer`, `Navbar`, `ReferralManagement`, `LanguageSelector`, `ThemeToggle`** | **aria-live en área de mensajes; role="status" en éxito/error; aria-label en botones icono; aria-hidden en avatares emoji; aria-expanded en dropdowns; aria-disabled; aria-describedby; role="alert" en errores; tabla caption; img alt; landmarks nav/main; axe en ChatBot/MedicalReport/FhirPage/FhirResourceViewer; SR-01–12** |
| **`components.axe.test.js`** | **`LoginPage`, `Navbar` (sin auth), `LanguageSelector`, `RegisterPage`** | **axe WCAG 2.1 AA con `runOnly: ['wcag2a','wcag2aa']`; mocks mínimos para evitar llamadas reales; renderizado con `MemoryRouter`; sin violaciones críticas en páginas de autenticación y componentes de navegación global** |

### Cobertura ARIA por componente

| Componente | `aria-label` | `aria-current` | `aria-expanded` | `aria-hidden` | `aria-haspopup` | `aria-live` | `aria-disabled` |
|------------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Navbar | ✓ (nav) | ✓ (link activo) | — | ✓ (íconos) | — | — | — |
| ThemeToggle | ✓ (dinámico) | — | — | ✓ (icono) | — | — | — |
| LanguageSelector | ✓ | — | ✓ | — | ✓ | — | — |
| AlertConsole | — | — | — | — | — | — | — |
| SymptomReportForm | — | — | — | — | — | — | — |
| AppointmentCalendar | — | — | — | — | — | — | — |
| SHAPVisualization | — | — | — | — | — | — | — |
| AnalyticsDashboard | ✓ (charts) | — | — | — | — | — | — |
| **ChatBot** | **✓ (send btn)** | — | — | **✓ (avatares)** | — | **rec.** | **✓ (send)** |
| **MedicalReport** | — | — | — | — | — | **rec.** | **✓ (loading)** |
| **FhirPage** | — | — | — | — | — | — | — |
| **FhirResourceViewer** | — | — | — | — | — | — | — |

### Cobertura de discapacidades

| Discapacidad | Técnica verificada | Archivos |
|-------------|-------------------|---------|
| **Visual** (baja visión) | Contraste WCAG AA via axe, alt text en imágenes | todos los axe |
| **Visual** (ceguera total) | aria-label, aria-live, landmarks nav/main, estructura semántica | `screen-reader`, `keyboard-navigation` |
| **Motora** (solo teclado) | Tab/Shift+Tab, Enter/Space en botones, sin focus trap | `keyboard-navigation` |
| **Cognitiva** | Textos descriptivos en placeholders, mensajes de error claros | `chatbot`, `forms` |
| **Auditiva** | No aplica (app sin audio) | — |

### Comandos de ejecución

```bash
cd web

# Todos los tests de accesibilidad (9 archivos)
npx jest --testPathPattern="accessibility" --verbose

# Archivos preexistentes
npx jest src/tests/accessibility/navbar.accessibility.test.js
npx jest src/tests/accessibility/forms.accessibility.test.js
npx jest src/tests/accessibility/components.accessibility.test.js
npx jest src/tests/accessibility/charts.accessibility.test.js
npx jest src/tests/accessibility/accessibility-advanced.test.js

# Archivos nuevos
npx jest src/tests/accessibility/chatbot.accessibility.test.js
npx jest src/tests/accessibility/components.axe.test.js
npx jest src/tests/accessibility/keyboard-navigation.accessibility.test.js
npx jest src/tests/accessibility/screen-reader.accessibility.test.js

# Por categoría de usuario con discapacidad
npx jest --testPathPattern="accessibility" -t "keyboard"      # solo teclado
npx jest --testPathPattern="accessibility" -t "aria-live"     # lector de pantalla
npx jest --testPathPattern="accessibility" -t "axe"           # escaneo automático

# Con reporte de cobertura
npx jest --testPathPattern="accessibility" --coverage
```

---

## 15. Pruebas de Performance / Carga

Ubicación Backend: `backend/tests/performance/`  
Ubicación Frontend: `web/src/tests/performance/`  
Framework: **Jest + supertest** (backend) · **React Testing Library + performance.now()** (frontend)

### Estrategia de Performance

| Capa | Herramienta | Qué mide |
|------|-------------|----------|
| **SLA de endpoints** | supertest + `performance.now()` | mean, p95, p99 por endpoint; payloads < 2 MB |
| **Concurrencia** | `Promise.all` N peticiones | throughput req/s, race conditions, aislamiento |
| **Rate Limiter** | mock de Redis | cálculo de límites, headers, 429, fallback |
| **Render frontend** | `performance.now()` + contador | tiempo inicial, re-renders, nodos DOM, memoria |

### Archivos de Performance — Backend

| Archivo | Área | Casos cubiertos |
|---------|------|-----------------|
| `load.test.ts` | Rate limiting básico | login SLA, export SLA, 429 export scope (existente) |
| `api-performance.perf.test.ts` | SLA por endpoint | Auth (login/register/profile), Medical History (list/create/search), Alerts (list/create), Analytics (dashboard/ml/health), Wearables (sync/get), Emergency (create/list), Referrals (list/create), Symptom Analyzer, Consent, Payload < 2 MB, ratio limit=10 vs limit=100 |
| `concurrency.perf.test.ts` | Carga paralela | 10/20 GET simultáneos; 5 POST paralelos sin IDs duplicados; prevención de emails duplicados bajo concurrencia; carga mixta 5+5 read+write; 3 roles simultáneos; ráfaga 15 req; 3 batches sin degradación |
| `rate-limiter.perf.test.ts` | Rate limiter completo | Scopes auth (40%), export (25% ventana 4x), admin (200%), doctor (120%), patient (80%), anonymous (60%); headers X-RateLimit-*; Retry-After; clave Redis (scope:id:bucket); expire solo en count=1; fallback sin Redis; error de Redis; throughput 100 llamadas < 500ms |

### SLA Targets — Backend

| Tipo de endpoint | mean | p95 | p99 |
|-----------------|------|-----|-----|
| Auth (login, register, profile) | < 300ms | < 500ms | < 800ms |
| Read (list, get) | < 200ms | < 400ms | < 600ms |
| Write (create, update) | < 350ms | < 600ms | < 900ms |
| Analytics / Dashboard | < 400ms | < 700ms | < 1000ms |
| Search / Filter | < 250ms | < 450ms | < 700ms |

### Archivos de Performance — Frontend

| Archivo | Área | Casos cubiertos |
|---------|------|-----------------|
| `performance.test.js` | Render básico + VirtualizedList | Tiempos Home/Dashboard/Analytics < umbrales; VirtualizedList 10k < 200ms; items visibles < 20; lazy loading < 500ms (existente) |
| `render.perf.test.js` | Render completo | Home/Dashboard/Analytics/Navbar/SymptomReportForm tiempos iniciales; re-renders tras interacción; VirtualizedList 10k ítems vs visibles; Lazy + Suspense fallback; conteo de renders (≤ 2–3); estabilidad memoria 10–20 ciclos; nodos DOM < 200/500; 8 módulos importan sin error |

### SLA Targets — Frontend

| Componente | Render inicial | Re-render | Nodos DOM |
|------------|:---:|:---:|:---:|
| Home | < 100ms | — | — |
| Dashboard | < 150ms | < 50ms | — |
| Analytics | < 200ms | — | — |
| Navbar | < 50ms | < 20ms | < 200 |
| SymptomReportForm | < 80ms | < 30ms | < 500 |
| VirtualizedList 10k | < 200ms | — | < 100 renderizados |
| Lazy component | < 500ms (total) | — | — |

### Comandos de ejecución

```bash
# ── Backend ─────────────────────────────────────────────────────
cd backend

# Todos los tests de performance
npx jest --testPathPattern="performance" --verbose

# Archivo específico
npx jest tests/performance/api-performance.perf.test.ts
npx jest tests/performance/concurrency.perf.test.ts
npx jest tests/performance/rate-limiter.perf.test.ts
npx jest tests/performance/load.test.ts

# ── Frontend ─────────────────────────────────────────────────────
cd web

# Todos los tests de performance
npx jest --testPathPattern="performance" --verbose

# Archivo específico
npx jest src/tests/performance/render.perf.test.js
npx jest src/tests/performance/performance.test.js
```

---

## 16. Pruebas LLM / IA Testing

Ubicación: `ai-services/tests/llm/`  
Framework: **pytest + pytest-asyncio** · mocks con `AsyncMock` / `MagicMock` · sin llamadas reales a OpenAI

### Estrategia LLM Testing

| Tipo | Archivo | Qué verifica |
|------|---------|--------------|
| **Evals de calidad** | `test_response_quality.py` | Golden dataset → urgencia correcta, recall ≥ 0.50, coherencia de scores |
| **Regresión de prompts** | `test_prompt_regression.py` | R1–R8: campos JSON canónicos, system prompt médico, numeración, parser ante respuestas inválidas |
| **Alucinaciones / casos borde** | `test_hallucinations.py` | H1–H10: entradas vacías, fuera de dominio, contradictorias, inyección, símbolos, enfermedades inventadas, valores imposibles, límites de urgencia, Spanglish |

### Golden Dataset (Evals)

8 escenarios clínicos predefinidos usados en `test_response_quality.py`:

| ID | Escenario | Urgencia esperada |
|----|-----------|-------------------|
| GD-001 | Emergencia respiratoria crítica | `critical` |
| GD-002 | Síntomas moderados respiratorios | `medium` o `high` |
| GD-003 | Síntomas leves / resfriado | `low` o `medium` |
| GD-004 | Fiebre alta con síntomas respiratorios | `high` o `critical` |
| GD-005 | Síntomas neurológicos + respiratorios | `high` o `critical` |
| GD-006 | Fatiga y malestar general | `low` o `medium` |
| GD-007 | Síntomas digestivos sin respiratorios | `low` o `medium` |
| GD-008 | Dolor de cabeza leve | `low` |

### Reglas de Regresión de Prompts (R1–R8)

| Regla | Descripción |
|-------|-------------|
| R1 | El prompt de síntomas SIEMPRE solicita JSON con los 6 campos canónicos |
| R2 | El prompt de texto médico SIEMPRE solicita JSON con los 5 campos canónicos |
| R3 | El system prompt SIEMPRE define un rol médico ("médico" o "respiratory") |
| R4 | Los síntomas formateados SIEMPRE incluyen numeración |
| R5 | El parser SIEMPRE devuelve dict con `urgency_level` aunque el LLM responda en texto plano |
| R6 | Los prompts están en español o inglés consistente (sin mezcla incoherente) |
| R7 | Añadir contexto NO elimina las instrucciones de formato JSON |
| R8 | El parser extrae JSON aunque haya texto narrativo alrededor |

### Categorías de Alucinaciones / Casos Borde (H1–H10)

| Cat. | Tipo | Inputs probados |
|------|------|-----------------|
| H1 | Entradas vacías/nulas | `""`, `"   "`, lista vacía, `"None"` |
| H2 | Fuera de dominio | Fotosíntesis, bolsa, recetas, historia, matemáticas, clima, fútbol (7 casos) |
| H3 | Síntomas contradictorios | "estoy bien pero dolor severo", "sin fiebre pero 41 grados" (4 casos) |
| H4 | Inyección de prompt | "IGNORA instrucciones", reveal system prompt, JSON override, role change (6 casos) |
| H5 | Input extremadamente largo | 15 000 chars repetidos, 1 000 repeticiones de "crítico" |
| H6 | Símbolos / caracteres especiales | Emojis, chino, árabe, SQL injection, HTML, null bytes (10 casos) |
| H7 | Enfermedades inventadas | "Síndrome de la Luna", "Enfermedad del WiFi" (8 enfermedades) |
| H8 | Valores numéricos imposibles | Fiebre 150°, pulsaciones 0/1000, O₂ 200%, presión 500/300 (6 casos) |
| H9 | Violaciones de límite de urgencia | Síntomas triviales ≠ critical; "dolor de pecho" ≠ low; monotonicidad |
| H10 | Mezcla de idiomas / Spanglish | Spanglish, inglés puro, francés, portugués, español+emoji (6 casos) |

### Archivos LLM Testing

| Archivo | Tests aprox. | Cobertura |
|---------|:---:|-----------|
| `__init__.py` | — | Marca `llm/` como paquete Python |
| `test_response_quality.py` | ~35 | Evals, golden dataset, recall, coherencia, confianza |
| `test_prompt_regression.py` | ~30 | R1–R8, snapshot de prompts, compatibilidad del parser |
| `test_hallucinations.py` | ~60 | H1–H10, 10 categorías de casos borde |

### Comandos de ejecución

```bash
cd ai-services

# Todos los tests LLM
pytest tests/llm/ -v

# Por categoría
pytest tests/llm/test_response_quality.py -v
pytest tests/llm/test_prompt_regression.py -v
pytest tests/llm/test_hallucinations.py -v

# Con marcadores específicos
pytest tests/llm/ -v -m "not asyncio"           # solo síncronos
pytest tests/llm/ -v -k "TestEmptyAndNull"       # solo H1
pytest tests/llm/ -v -k "TestOffDomain"          # solo H2
pytest tests/llm/ -v -k "TestUrgencyBoundary"    # solo H9

# Reporte de cobertura
pytest tests/llm/ --cov=services --cov=strategies --cov-report=term-missing
```

---

## 17. Pruebas de Seguridad (Auth/Authz + Prompt Injection)

### 17.1 Auth y Autorización — Backend

Ubicación: `backend/tests/security/`  
Framework: **Jest** · sin supertest (pruebas unitarias de middleware puro)

#### Cobertura — `auth-authorization.security.test.ts`

| Grupo | ID | Descripción |
|-------|----|-------------|
| Autenticación | AUTH-01 | JWT ausente, sin Bearer, vacío, firma manipulada, expirado, usuario inexistente, usuario inactivo |
| Autenticación | AUTH-02 | JWT algorithm confusion: `alg:none`, forja con RS256 cuando el servidor usa HS256 |
| Autenticación | AUTH-03 | Token firmado con secreto incorrecto o vacío |
| Autorización | AUTH-04 | Escalada horizontal: 9 combinaciones rol × ruta (patient/doctor/admin) |
| Autorización | AUTH-05 | Suplantación de identidad: `req.user` viene del token, no del body; `authorizeOwnerOrAdmin` |
| Autorización | AUTH-06 | Abuso del token de servicio interno: válido/inválido, sin lista de tokens, sin usuario |
| RBAC | AUTHZ-01/02 | Matriz completa 3×3 de roles via `requireRole` |
| RBAC | AUTHZ-04 | 30+ combinaciones de permisos × roles via `requirePermission` |
| Bypass | AUTHZ-05 | `role:admin` en body, query string, header `x-role` no eleva privilegios |
| Admin | AUTHZ-06–08 | `users:manage`, `dsr:delete`, `reports:generate` bloqueados a patient y doctor |
| Edge | JWT payload | `userId` ausente, con SQL injection, como objeto NoSQL `{$gt:""}` |

#### Invariantes verificadas

| Invariante | Prueba |
|-----------|--------|
| El rol del token **nunca** es sobreescrito por `body.role` | AUTH-05, AUTHZ-05 |
| Un token válido de rol inferior **nunca** accede a rutas de rol superior | AUTH-04 |
| `authorizeOwnerOrAdmin` bloquea acceso cruzado entre pacientes | AUTH-05 |
| Token de servicio interno **inválido** cae al verificador de rol normal | AUTH-06 |
| Payload JWT con operadores NoSQL en `userId` → siempre 401 | JWT payload edge |

---

### 17.2 Prompt Injection — AI Services

Ubicación: `ai-services/tests/security/`  
Framework: **pytest + pytest-asyncio** · mocks de OpenAI con captura de mensajes

#### Cobertura — `test_prompt_injection.py`

| Categoría | ID | Ataques probados |
|-----------|-----|-----------------|
| Inyección directa | PI-01 | 8 payloads: "IGNORA instrucciones", `[[NUEVA INSTRUCCIÓN]]`, modo DAN, escape markdown, fake assistant tag, JSON override, role-play, marco hipotético |
| Inyección estructurada | PI-02 | 5 payloads en campos de síntomas: inyección en `name`/`severity`/`duration`, SQL injection, XSS |
| Jailbreak | PI-03 | 8 variantes: DAN, modo desarrollador, admin override, modo simulación |
| Prompt leaking | PI-04 | 8 variantes + verificación de que el system prompt define rol médico + captura de llamadas OpenAI |
| Historial malicioso | PI-05 | Inyección en historial de conversación, sin elevación de urgencia, detección correcta de síntomas graves |
| Inyección en prompt OpenAI | PI-06 | 4 payloads con `\n`, `\r\n`, `;` en síntomas → campos JSON canónicos se preservan |
| Exfiltración | PI-07 | 6 payloads: fetch a URL externa, subprocess, localStorage, API redirect |
| Multi-etapa | PI-08 | Ataque en 2 turnos (establecer contexto → activar), escalada progresiva en 3 turnos |
| Bypass de dominio | PI-09 | Preguntas financieras/legales/coding enmarcadas como síntomas |
| Invariantes de seguridad | PI-10 | Estructura siempre correcta, `urgency_score ∈ [0,1]`, `recommendations` siempre lista, `needs_medical_attention` siempre bool |

#### Invariantes verificadas

| Invariante | Prueba |
|-----------|--------|
| Ningún payload de inyección directa fuerza `urgency='critical'` sin síntomas | PI-01 |
| Los campos JSON canónicos del prompt no son eliminados por inyección de `\n` | PI-06 |
| El system prompt de OpenAI siempre define un rol médico | PI-04 |
| Un historial malicioso no eleva la urgencia de un síntoma leve | PI-05 |
| Los síntomas graves se detectan correctamente incluso con historial malicioso | PI-05 |
| `urgency_score` siempre en `[0.0, 1.0]` ante cualquier payload | PI-10 |

#### Archivos de seguridad

| Archivo | Tests aprox. | Área |
|---------|:---:|------|
| `backend/tests/security/security.test.ts` | ~30 | OWASP Top 10, SQL/NoSQL/XSS, headers, rate limiting, passwords (preexistente) |
| `backend/tests/security/auth-authorization.security.test.ts` | ~55 | AUTH-01–06, AUTHZ-01–08, RBAC, bypass de privilegios |
| `ai-services/tests/security/test_adversarial_attacks.py` | ~10 | Adversarial ML: manipulación de input, envenenamiento de modelo (preexistente) |
| `ai-services/tests/security/test_prompt_injection.py` | ~60 | PI-01–10: prompt injection, jailbreak, prompt leaking, exfiltración |

#### Comandos de ejecución

```bash
# ── Backend ──────────────────────────────────────────────────────────────────
cd backend

# Todos los tests de seguridad
npx jest --testPathPattern="security" --verbose

# Específico: auth y autorización
npx jest tests/security/auth-authorization.security.test.ts --verbose

# Específico: OWASP general
npx jest tests/security/security.test.ts --verbose

# ── AI Services ──────────────────────────────────────────────────────────────
cd ai-services

# Todos los tests de seguridad
pytest tests/security/ -v

# Solo prompt injection
pytest tests/security/test_prompt_injection.py -v

# Por categoría (marcador)
pytest tests/security/test_prompt_injection.py -v -k "TestDirectPromptInjection"
pytest tests/security/test_prompt_injection.py -v -k "TestJailbreakAttempts"
pytest tests/security/test_prompt_injection.py -v -k "TestSecurityInvariants"

# Todos los tests de seguridad del proyecto
npx jest --testPathPattern="security" --verbose --rootDir=backend
pytest ai-services/tests/security/ -v
```

---

## 18. Pruebas AI Services (Python/FastAPI)

Ubicación: `ai-services/tests/`  
Patrón: pytest con `unittest.mock`, `AsyncMock` para servicios async, conftest.py con fixtures globales

| Directorio / Archivo | Área | Casos cubiertos |
|----------------------|------|-----------------|
| `api/test_main_endpoints.py` | Endpoints principales | Health, predict-disease, analyze-symptoms, status |
| `api/test_health_endpoints.py` | Health checks | GET /health (200), /health/detailed, degraded |
| `api/test_symptom_analyzer_endpoints.py` | Analizador síntomas | POST /analyze (válido, vacío, sin síntomas) |
| `api/test_chat_analyzer_endpoints.py` | Chat IA | POST /chat/analyze, histórico de conversación |
| `api/test_medical_history_endpoints.py` | Historia médica | GET/POST de historias, filtros, paginación |
| `api/test_advanced_ml_endpoints.py` | ML avanzado | Ensemble, SHAP, personalización, monitoreo |
| `api/test_advanced_nlp_endpoints.py` | NLP avanzado | Procesamiento de texto médico, entidades |
| `api/test_audio_analyzer_endpoints.py` | Análisis de audio | POST /audio/analyze, transcripción, detección tos |
| `api/test_automl_endpoints.py` | AutoML | Configuración, entrenamiento, selección de modelo |
| `api/test_rl_and_federated_endpoints.py` | RL / Federated Learning | Sesiones RL, rondas FL, agregación segura |
| `api/test_model_cache_endpoints.py` | Caché de modelos | GET /cache/status, CLEAR, warm-up |
| `api/test_core_domains_support_endpoints.py` | Core domains | Soporte multi-dominio clínico |
| `services/test_ai_service_manager.py` | AI Service Manager | Orquestación de servicios, fallbacks |
| `services/test_symptom_analysis_service.py` | Análisis síntomas | extract, assess urgency, detect diseases |
| `services/test_enhanced_chatbot_service.py` | Chatbot mejorado | analyze_message, extract symptoms, generate response |
| `services/test_enhanced_chatbot.py` | Chatbot (alternativo) | Casos edge, manejo de errores |
| `services/test_medical_history_service.py` | Historia médica | CRUD, procesamiento offline, sync |
| `services/test_audio_transcription_service.py` | Transcripción audio | Transcripción speech-to-text, análisis |
| `services/test_core_domains_support.py` | Core domains | Soporte clínico respiratorio |
| **`services/test_conversational_ai_service.py`** | **IA Conversacional** | **__init__ (keywords respiratory/fever/pain/urgency/severity), analyze_conversation (dict, síntomas respiratorios, con history/context, urgencia crítica, mensaje vacío, sin síntomas), _classify_symptoms (respiratory, vacío, mixtos), get_conversation_context (history vacío, multi-turno, extrae síntomas), _get_urgency_recommendation (critical/high/medium/low/unknown), flujos completos multi-turno** |
| **`services/test_patient_friendly_explainer.py`** | **Explicador paciente** | **__init__ (symptom_explanations, disease_explanations, urgency_explanations), explain_prediction (retorna dict, keys requeridas, mapeo EPOC, alta/baja confianza, urgencia critical, shap_factors opcionales, top_predictions, enfermedad desconocida, urgency desconocida, symptoms vacío, confianza 0/1.0), _simplify_feature_name (conocido/desconocido/con_guiones), _get_confidence_level (high/medium/low), _build_summary (string, contiene enfermedad), get_patient_explainer (factory, equivalentes), flujos completos asma/covid** |
| `ml_models/test_model_predictions.py` | Predicciones ML | predict_disease con RandomForest/XGBoost/ensemble |
| `ml_models/test_xgboost_model.py` | XGBoost | Entrenamiento, predicción, threshold |
| `ml_models/test_analytics_models.py` | Modelos analíticos | Regresión, clustering, series temporales |
| `ml_models/test_medical_nlp.py` | NLP Médico | Extracción de entidades, clasificación |
| `ml_models/test_model_cache.py` | Caché de modelos | Hit/miss, TTL, invalidación |
| `ml_models/test_lazy_loader.py` | Carga lazy | Carga bajo demanda, precarga |
| `ml_models/test_ml_components.py` | Componentes ML | Preprocesamiento, feature engineering |
| `ml_models/test_automl_respiratory_risk.py` | AutoML riesgo | Optimización automática modelos respiratorios |
| `ml_models/test_fl_secure_aggregation.py` | FL Agregación | Agregación diferencial privada |
| `ml_models/test_rl_reminder_optimizer.py` | RL Optimizer | Q-learning para recordatorios médicos |
| `ml_models/test_risk_personalization.py` | Personalización riesgo | Perfiles individuales de riesgo |
| `ml_models/test_retraining_pipeline.py` | Reentrenamiento | Pipeline automático de actualización |
| `ml_models/test_retraining_system.py` | Sistema reentrenamiento | Gestión de versiones, rollback |
| `ml_models/test_prediction_monitor.py` | Monitor predicciones | Drift detection, alertas de degradación |
| `ml_models/test_advanced_ml_smoke.py` | Smoke tests ML | Tests rápidos de sanidad de modelos |
| `ml_models/test_advanced_ml_edge_cases.py` | Edge cases ML | Inputs inusuales, límites, valores nulos |
| `core/test_cache.py` | Caché Redis | set/get/delete/TTL, serialización |
| `core/test_cache_extended.py` | Caché (extendido) | Patrones complejos, pipeline, pubsub |
| `core/test_config.py` | Configuración | Variables de entorno, validación, defaults |
| `core/test_database.py` | Base de datos | Conexión MongoDB, queries básicas |
| `core/test_pattern_config.py` | Configuración patrones | Validación de patrones de diseño |
| `decorators/test_cache_decorator.py` | Decorator caché | @with_cache (hit/miss/TTL) |
| `decorators/test_circuit_breaker_decorator.py` | Decorator CB | @with_circuit_breaker (open/closed/half-open) |
| `decorators/test_retry_decorator.py` | Decorator retry | @with_retry (max_attempts, backoff, exceptions) |
| `decorators/test_logging_decorator.py` | Decorator log | @with_logging (nivel, tiempo ejecución) |
| `decorators/test_metrics_decorator.py` | Decorator métricas | @with_metrics (tiempo, tasa éxito) |
| `decorators/test_decorators_extended.py` | Decoradores (extendido) | Composición, orden, interacciones |
| `circuit_breaker/test_external_service_circuit_breaker.py` | CB externo | Apertura tras N fallos, recuperación |
| `circuit_breaker/test_openai_circuit_breaker.py` | CB OpenAI | Fallback a modelo local en fallo OpenAI |
| `factories/test_model_factory.py` | Factory modelos | Creación por tipo, parámetros, validación |
| `factories/test_service_factory.py` | Factory servicios | Instanciación con config, singleton |
| `factories/test_strategy_factory.py` | Factory estrategias | Selección por contexto, fallback |
| `strategies/test_local_model_strategy.py` | Estrategia local | Predicción con modelo local (sin API externa) |
| `strategies/test_openai_strategy.py` | Estrategia OpenAI | Llamada API, manejo rate limit, timeout |
| `strategies/test_rule_based_strategy.py` | Estrategia reglas | Reglas deterministas, árbol de decisión |
| `repositories/test_base_repository.py` | Repo base | CRUD genérico, paginación, filtros |
| `repositories/test_patient_repository.py` | Repo paciente | Queries específicas de paciente, índices |
| `repositories/test_ai_result_repository.py` | Repo resultados AI | Persistencia resultados ML, agregaciones |
| `patterns/test_circuit_breaker_pattern.py` | Patrón CB | Implementación completa con estados |
| `patterns/test_decorator_pattern.py` | Patrón Decorator | Composición de decoradores |
| `patterns/test_factory_pattern.py` | Patrón Factory | Abstract factory, concrete factories |
| `utils/test_urgency_calculator.py` | Calculador urgencia | Scoring por síntomas, thresholds clínicos |
| `utils/test_sentry_integration.py` | Sentry | Captura de errores, context, environment |
| `integration/test_service_integration.py` | Integración servicios | Flujos end-to-end internos |
| `integration/test_edge_cases.py` | Casos edge | Inputs límite, timeouts, concurrencia |
| `integration/test_additional_coverage.py` | Cobertura adicional | Tests de ramas no cubiertas |
| `test_main.py` | main.py | Endpoints FastAPI, startup, shutdown |

---

## 19. Pruebas de Compatibilidad (Cross-Browser + Mobile)

### Estrategia de Compatibilidad

| Capa | Herramienta | Qué verifica |
|------|-------------|--------------|
| **Cross-browser E2E** | Cypress | 11 perfiles de dispositivo; overflow horizontal; orientación portrait/landscape; load time |
| **Browser APIs (Jest)** | React Testing Library | localStorage, CSS variables, matchMedia, scrollIntoView, window.open, Promises, Observers, SSR |
| **Mobile (Jest)** | React Testing Library | Touch events, 100vh quirk iOS, DPR, orientationchange, date fallback, safe-area, font 16px |

---

### 19.1 Pruebas Cross-Browser con Cypress

Ubicación: `web/cypress/e2e/`  
Framework: **Cypress** · `cy.viewport()` · `cy.intercept()` · `cy.window()`

#### Perfiles de dispositivo — `cross-browser.cy.js`

| Perfil | Viewport | Categoría |
|--------|----------|-----------|
| `chrome-desktop` | 1920×1080 | Desktop |
| `firefox-desktop` | 1920×1080 | Desktop |
| `safari-desktop` | 1440×900 | Desktop |
| `edge-desktop` | 1920×1080 | Desktop |
| `iphone-se` | 375×667 | Mobile iOS |
| `iphone-14-pro` | 393×852 | Mobile iOS |
| `iphone-14-pro-max` | 430×932 | Mobile iOS |
| `galaxy-s21` | 360×800 | Mobile Android |
| `pixel-7` | 412×915 | Mobile Android |
| `ipad-pro` | 1024×1366 | Tablet |
| `galaxy-tab` | 768×1024 | Tablet Android |

#### Cobertura de escenarios — `cross-browser.cy.js`

| ID | Escenario | Técnica |
|----|-----------|---------|
| COMPAT-01 | Renderiza correctamente en 11 viewports | `cy.viewport()` + visibilidad |
| COMPAT-02 | Sin overflow horizontal en ningún viewport | `win.document.body.scrollWidth ≤ width + 5` |
| COMPAT-03 | API localStorage funciona en todos los browsers | `win.localStorage.setItem/getItem` |
| COMPAT-04 | CSS Custom Properties (variables) funcionan | `el.style.setProperty / getPropertyValue` |
| COMPAT-05 | `window.matchMedia` disponible y funcional | `win.matchMedia('(max-width: 768px)')` |
| COMPAT-06 | `scrollIntoView` con optional chaining — safe en Safari | `el?.scrollIntoView?.({ behavior: 'smooth' })` |
| COMPAT-07 | `window.open` incluye `noopener,noreferrer` | `win.open.toString()` o stub |
| COMPAT-08 | `fetch` API disponible | `win.fetch` truthy |
| COMPAT-09 | `Promise.allSettled` disponible (Chrome 76+, Safari 13+) | `win.Promise.allSettled` truthy |
| COMPAT-10 | `IntersectionObserver` con degradación elegante | `win.IntersectionObserver` o no crash |
| COMPAT-11 | Portrait y Landscape para dispositivos móviles | `cy.viewport(h, w)` swap |
| COMPAT-12 | Formulario de síntomas usable en mobile | `cy.type()` en input táctil |
| COMPAT-13 | Chatbot responde en mobile viewport | Interacción completa en 375px |
| COMPAT-14 | Load time aceptable | Desktop < 5 000ms · Mobile < 8 000ms |

---

### 19.2 Pruebas de Browser APIs con Jest

Ubicación: `web/src/tests/compatibility/`  
Framework: **Jest + React Testing Library**

#### Cobertura — `browser-apis.compat.test.js`

| ID | API | Comportamiento verificado |
|----|-----|--------------------------|
| API-01 | `localStorage` | Set/get/remove; Safari Private Mode: `QuotaExceededError` → fallback 'light' |
| API-02 | CSS Custom Properties | `setProperty` + `getPropertyValue` en ThemeProvider |
| API-03 | `window.matchMedia` | `addEventListener`/`removeEventListener`; cleanup en unmount |
| API-04 | `scrollIntoView` optional chaining | `ref.current?.scrollIntoView?.()` sin throw con ref null o método ausente |
| API-05 | `window.open` noopener | Link externo incluye `noopener,noreferrer` |
| API-06 | `fetch` / axios | Disponibilidad; mock de respuesta JSON |
| API-07 | `Promise.allSettled` | Resolución mixta fulfilled/rejected; detección de soporte |
| API-08 | `IntersectionObserver` | Constructor disponible; degradación si ausente |
| API-09 | `ResizeObserver` | Constructor disponible; degradación si ausente |
| API-10 | `navigator.clipboard` | `writeText` con permiso; fallback sin clipboard API |
| API-11 | `navigator.share` | `navigator.share` disponible; fallback en desktop |
| API-12 | `performance.now()` | Disponible; resuelve a número positivo |
| API-13 | `requestAnimationFrame` | Disponible como función |
| API-14 | CSS `@supports` | Detección de `scroll-behavior: smooth`, `display: grid` |
| API-15 | SSR guards | `typeof window !== 'undefined'` en ThemeProvider verificado por lectura de fuente |

---

### 19.3 Pruebas de Compatibilidad Mobile con Jest

Ubicación: `web/src/tests/compatibility/`  
Framework: **Jest + React Testing Library**

#### Cobertura — `mobile.compat.test.js`

| ID | Área | Comportamiento verificado |
|----|------|--------------------------|
| MOB-01 | Touch events | `touchstart`, `touchend`, `pointerdown`; `touchAction: manipulation` (anti double-tap zoom) |
| MOB-02 | iOS 100vh quirk | `window.innerHeight` en lugar de `100vh`; resize update; cleanup listener |
| MOB-03 | Device Pixel Ratio | DPR 1×/2×/3×/2.75×; detección via `matchMedia(min-resolution)` |
| MOB-04 | Orientation change | Portrait↔Landscape por `orientationchange` + `resize`; `flexDirection` adapts |
| MOB-05 | `input[type="date"]` fallback | Detección de soporte; placeholder `YYYY-MM-DD` en Safari iOS; `onChange` callback |
| MOB-06 | CSS `env(safe-area-inset-*)` | Patrón con fallback `0px`; `viewport-fit=cover` en meta |
| MOB-07 | Font size 16px mínimo | `textarea` con `fontSize: 16px` previene auto-zoom iOS; botones ≥ 14px |
| MOB-08 | `(hover: none)` / `(pointer: coarse)` | Detección táctil; tap targets 56px táctil vs 48px desktop |
| MOB-09 | Smooth scroll polyfill | `scrollIntoView` con `behavior: smooth`; `scrollTo`; optional chaining |
| MOB-10 | iPhone SE (375×667) | Formulario, navbar, layout height, orientación portrait |
| MOB-11 | Galaxy S21 (360×800) | Formulario, layout height, portrait y landscape |
| MOB-12 | Viewport meta | `width=device-width`; `initial-scale=1`; CSS pixel ratio; advertencia `maximum-scale=1` |
| MOB-13 | Touch sequence order | `touchstart → touchend → click`; taps rápidos sin corrupción de estado |
| MOB-14 | `navigator.connection` | `effectiveType` (4G/3G/2G); fallback sin API (iOS Safari); `saveData` mode |
| MOB-15 | Passive event listeners | Detección de soporte `{ passive: true }`; `touchmove` y `wheel` como passive |

#### Dispositivos verificados

| Dispositivo | Viewport (px) | OS | Browser |
|-------------|:---:|---|---------|
| iPhone SE (2020) | 375×667 | iOS 15+ | Safari |
| iPhone 14 Pro | 393×852 | iOS 16+ | Safari |
| iPhone 14 Pro Max | 430×932 | iOS 16+ | Safari |
| Galaxy S21 | 360×800 | Android 12+ | Chrome |
| Pixel 7 | 412×915 | Android 13+ | Chrome |
| iPad Pro 12.9" | 1024×1366 | iPadOS 16+ | Safari |
| Galaxy Tab S8 | 768×1024 | Android 12+ | Chrome |
| Chrome Desktop | 1920×1080 | Windows/macOS | Chrome 76+ |
| Firefox Desktop | 1920×1080 | Windows/macOS | Firefox 71+ |
| Safari Desktop | 1440×900 | macOS | Safari 13+ |
| Edge Desktop | 1920×1080 | Windows | Edge 79+ |

#### Archivos de compatibilidad

| Archivo | Framework | Tests aprox. | Cobertura |
|---------|-----------|:---:|-----------|
| `web/cypress/e2e/cross-browser.cy.js` | Cypress | ~40 | COMPAT-01–14: 11 viewports, APIs, orientación, load time |
| `web/src/tests/compatibility/browser-apis.compat.test.js` | Jest | ~45 | API-01–15: localStorage, CSS vars, matchMedia, Observers, SSR |
| `web/src/tests/compatibility/mobile.compat.test.js` | Jest | ~50 | MOB-01–15: touch, 100vh, DPR, orientation, date, safe-area, passive |

#### Comandos de ejecución

```bash
cd web

# ── Cypress E2E cross-browser ──────────────────────────────────────────────
# Modo headless (CI)
npx cypress run --spec "cypress/e2e/cross-browser.cy.js"

# Modo interactivo
npx cypress open

# Con browser específico
npx cypress run --browser chrome --spec "cypress/e2e/cross-browser.cy.js"
npx cypress run --browser firefox --spec "cypress/e2e/cross-browser.cy.js"
npx cypress run --browser edge --spec "cypress/e2e/cross-browser.cy.js"

# ── Jest — Compatibilidad ───────────────────────────────────────────────────
# Todos los tests de compatibilidad
npx jest --testPathPattern="compatibility" --verbose

# Browser APIs
npx jest src/tests/compatibility/browser-apis.compat.test.js --verbose

# Mobile
npx jest src/tests/compatibility/mobile.compat.test.js --verbose

# Por categoría
npx jest --testPathPattern="compatibility" -t "localStorage"     # solo storage
npx jest --testPathPattern="compatibility" -t "touch"            # solo touch events
npx jest --testPathPattern="compatibility" -t "orientation"      # solo orientación
npx jest --testPathPattern="compatibility" -t "iOS"              # solo quirks iOS

# Con cobertura
npx jest --testPathPattern="compatibility" --coverage
```

---

## 20. Convenciones y patrones

### Estructura de un test unitario de controller

```typescript
// 1. Mock de dependencias antes de cualquier import del módulo
jest.mock('../../../src/services/myService', () => ({
  myService: { method: jest.fn() },
}));

// 2. Helpers reutilizables
const buildReq = (overrides = {}) => ({
  user: { _id: 'user-1', role: 'doctor' },
  body: {}, params: {}, query: {},
  ...overrides,
});
const buildRes = () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { status, json };
};

// 3. Tests agrupados por método
describe('myController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('myMethod', () => {
    it('retorna 200 en caso exitoso', async () => { ... });
    it('retorna 400 sin campo requerido', async () => { ... });
    it('propaga error al next()', async () => { ... });
  });
});
```

### Estructura de un test de modelo (real Mongoose)

```typescript
import mongoose from 'mongoose';
import MyModel from '../../../src/models/MyModel';

describe('MyModel', () => {
  beforeEach(async () => { await MyModel.deleteMany({}); });
  afterAll(async () => { await mongoose.connection.dropDatabase(); });

  it('crea documento con campos válidos', async () => { ... });
  it('falla sin campo requerido', async () => {
    await expect(MyModel.create({ /* sin campo */ })).rejects.toThrow();
  });
});
```

### Estructura de un test de integración

```typescript
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/index';
import { testUtils } from '../setup';

describe('MyEndpoint Integration', () => {
  let token: string;

  beforeEach(async () => {
    await testUtils.cleanTestData();
    token = testUtils.generateTestToken({ userId: new mongoose.Types.ObjectId().toHexString(), role: 'doctor' });
  });

  it('retorna 200 con autenticación válida', async () => {
    const res = await request(app)
      .get('/api/v1/my-endpoint')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.success).toBe(true);
  });
});
```

---

## 21. Ejecución de pruebas

### Comandos disponibles

```bash
# ── Backend ────────────────────────────────────────────
cd backend

# Ejecutar todos los tests
npm test

# Ejecutar solo tests unitarios
npm run test:unit

# Ejecutar solo tests de integración
npm run test:integration

# Ejecutar solo tests E2E de backend
npm run test:e2e

# Ejecutar un archivo E2E específico
npx jest tests/e2e/emergency.e2e.test.ts
npx jest tests/e2e/appointments.e2e.test.ts
npx jest tests/e2e/referrals.e2e.test.ts
npx jest tests/e2e/consent.e2e.test.ts
npx jest tests/e2e/alerts.e2e.test.ts
npx jest tests/e2e/chatbot.e2e.test.ts
npx jest tests/e2e/flows.test.ts

# Ejecutar con cobertura completa
npm run test:coverage

# Ejecutar por patrón
npx jest --testPathPattern="e2e"
npx jest --testPathPattern="controller"

# Ejecutar en modo watch
npm run test:watch

# ── Frontend — Accesibilidad (jest-axe) ───────────────
cd web

# Todos los tests de accesibilidad
npx jest --testPathPattern="accessibility" --verbose

# Archivo específico
npx jest src/tests/accessibility/navbar.accessibility.test.js
npx jest src/tests/accessibility/forms.accessibility.test.js
npx jest src/tests/accessibility/components.accessibility.test.js
npx jest src/tests/accessibility/charts.accessibility.test.js

# ── Frontend — Visual Regression (Jest) ───────────────

# Todos los snapshots visuales
npx jest --testPathPattern="visual" --verbose

# Actualizar snapshots tras cambio intencional de diseño
npx jest --updateSnapshot --testPathPattern="visual"

# ── Frontend E2E (Cypress) ─────────────────────────────
cd web

# Ejecutar todos los tests E2E (headless)
npm run test:e2e

# Abrir Cypress con interfaz gráfica
npm run test:e2e:open

# Ejecutar un spec específico
npx cypress run --spec "cypress/e2e/medical-history.cy.js"
npx cypress run --spec "cypress/e2e/emergency.cy.js"
npx cypress run --spec "cypress/e2e/wearables.cy.js"
npx cypress run --spec "cypress/e2e/profile.cy.js"
npx cypress run --spec "cypress/e2e/admin.cy.js"

# Ejecutar con grabación de video
npx cypress run --config video=true

# ── AI Services (Python) ───────────────────────────────
cd ai-services

# Ejecutar todos los tests
pytest tests/ -v

# Ejecutar tests E2E de servicios
pytest tests/services/ -v

# Con cobertura
pytest tests/ --cov=. --cov-report=html
```

### Variables de entorno para tests

Definidas en `tests/setup.ts`:

| Variable | Valor en test |
|----------|---------------|
| `NODE_ENV` | `test` |
| `JWT_SECRET` | `test-jwt-secret` |
| `MONGODB_URI` | `mongodb://localhost:27017/respicare-test` |
| `REDIS_URL` | `redis://localhost:6379` (mockeado) |
| `AI_SERVICE_URL` | `http://localhost:8000` |
| `INTERNAL_SERVICE_TOKENS` | `internal-test-token` |

### Dependencias de infraestructura

| Herramienta | Uso | Estado |
|-------------|-----|--------|
| `mongodb-memory-server` | Base de datos en memoria para tests de modelos | Automático vía Jest globalSetup |
| `Redis` | Mockeado completamente en `tests/setup.ts` | No requiere Redis real |
| `supertest` | Cliente HTTP para tests de integración | Incluido en devDependencies |
| `jest` | Framework de testing | Configurado en `jest.config.js` |

---

*Documento actualizado el 2026-04-13 (v3.0). Cubre Unit + Integration + E2E Backend + E2E Frontend (Cypress) + AI Services Python. Para mantener actualizado: ejecutar `npm run test:coverage` en backend y `npm run test:e2e` en web, luego revisar la sección de resumen ejecutivo.*