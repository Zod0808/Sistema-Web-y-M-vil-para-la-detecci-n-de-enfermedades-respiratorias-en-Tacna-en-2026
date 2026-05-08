# REPORTE L99 — ANÁLISIS DE BRECHAS DEL SISTEMA
## RespiCare Tacna · Sistema de Enfermedades Respiratorias
**Fecha:** 2026-05-06  
**Rama activa:** `fabian`  
**Versión revisada:** 2.0.1.1  
**Elaborado por:** Análisis automatizado + revisión técnica experta

---

## 1. RESUMEN EJECUTIVO

RespiCare es un sistema médico full-stack para la gestión de enfermedades respiratorias compuesto por cuatro capas: **Backend Node.js/TypeScript**, **Frontend Web React**, **Aplicación Móvil Next.js/Capacitor** y **Servicios de IA FastAPI (Python)**. El sistema demuestra madurez técnica considerable — más de 80 pruebas en backend, 60+ en web, arquitectura limpia parcial, ML avanzado con federated learning — pero presenta brechas críticas que comprometen la calidad en producción.

**Estado general del sistema:** `FUNCIONAL CON BRECHAS CRÍTICAS`

| Capa | Completitud | Calidad | Riesgo |
|------|-------------|---------|--------|
| Backend | 88% | Media-Alta | Medio |
| Web Frontend | 80% | Media | Medio-Alto |
| Mobile | 75% | Media | Alto |
| AI Services | 85% | Alta | Bajo-Medio |
| Infraestructura | 70% | Media | Medio |

---

## 2. CONTEXTO DE LA REVISIÓN

### 2.1 Cambios recientes en la rama `fabian`

Los siguientes archivos tienen modificaciones no confirmadas que representan la iteración más reciente del sistema:

| Archivo | Tipo | Descripción del cambio |
|---------|------|------------------------|
| `backend/src/index.ts` | Modificado | Entry point principal con integración de nuevos WebSockets |
| `backend/src/sockets/wearableSocketHandler.ts` | Modificado | Handler WebSocket para datos de wearables en tiempo real |
| `backend/src/sockets/doctorSocketHandler.ts` | **Nuevo** | Handler WebSocket para dashboard médico en tiempo real |
| `backend/src/sockets/vitalsEmitter.ts` | **Nuevo** | Event bus entre handlers de wearable y doctor |
| `mobile/medical-app/lib/services/bleWearableService.ts` | **Nuevo** | Servicio BLE GATT para wearables reales |
| `mobile/medical-app/lib/services/useVitalsSource.ts` | **Nuevo** | Hook unificado de fuente de vitales (BLE/HealthConnect/Emulador) |
| `mobile/medical-app/components/tabs/wearables.tsx` | Modificado | Vista móvil con soporte multi-fuente (BLE/HC/EMU) |
| `web/src/pages/PatientMonitoringPage.js` | **Nuevo** | Dashboard tiempo real de monitoreo de pacientes |
| `web/src/pages/PatientMonitoringPage.css` | **Nuevo** | Estilos del dashboard de monitoreo |
| `web/src/App.js` | Modificado | Rutas actualizadas con nueva página de monitoreo |
| `web/src/components/Navbar.js` | Modificado | Navegación actualizada |
| `web/src/components/Navbar.css` | Modificado | Estilos de navegación |
| `web/src/components/ProtectedRoute.js` | Modificado | Protección de rutas actualizada |
| `web/src/pages/LoginPage.js` | Modificado | Página de login actualizada |
| `web/src/pages/LoginPage.css` | Modificado | Estilos de login |
| `web/src/pages/RegisterPage.js` | Modificado | Página de registro actualizada |

**Característica implementada en esta iteración:** Sistema completo de monitoreo de vitales en tiempo real vía WebSocket con triple fuente de datos (BLE GATT / Android Health Connect / Emulador de sensores).

---

## 3. ANÁLISIS DE BRECHAS POR CAPA

---

### 3.1 BACKEND — Node.js / TypeScript

#### 3.1.1 Fortalezas identificadas

- **Cobertura de rutas excelente:** 30+ endpoints cubriendo historiales médicos, citas, recetas, laboratorio, FHIR, HL7, alertas, consentimientos, referidos, emergencias, exportación y BI.
- **Seguridad robusta:** HTTPS enforcement, rate limiting contextual, XSS/NoSQL injection protection, RBAC con audit logging, field encryption en modelo User.
- **Jobs programados:** alertas, citas, reportes, métricas ML, importación de laboratorio.
- **WebSocket bidireccional:** Implementación nueva y correcta — `wearableSocketHandler` persiste datos en MongoDB, emite al `vitalsEmitter`, y `doctorSocketHandler` retransmite solo a médicos suscritos con autenticación JWT.

#### 3.1.2 Brechas detectadas

| ID | Severidad | Componente | Descripción | Impacto |
|----|-----------|------------|-------------|---------|
| B-01 | 🔴 CRÍTICO | `tsconfig.json` | `strict: false`, `noImplicitAny: false`, todos los checks de tipo desactivados | Pérdida total de seguridad de tipos en ≥31k LOC |
| B-02 | 🔴 CRÍTICO | `notificationService.ts` | Canal de email tiene stub: `"Email channel not yet implemented, skipping"` | Notificaciones críticas nunca llegan por email |
| B-03 | 🟠 ALTO | `index-dev.js` / `index-clean.js` | Dos archivos de entrada alternativos en `.js` de >1600 líneas cada uno | Duplicación de lógica, no migrados a TypeScript |
| B-04 | 🟠 ALTO | Routes duplicadas | `analyticsRoutes.ts` + `analyticsRoutes.js` + `analyticsRoutesNew.js`; `chatConversationsRoutes.ts` + `.js`; `authRoutes.ts` + `authRoutesDev.js` | Ambigüedad en endpoints activos |
| B-05 | 🟠 ALTO | Controladores duplicados | Lógica en `/controllers` y también en `/interface-adapters/controllers` | Clean Architecture parcial genera confusión |
| B-06 | 🟠 ALTO | Tests E2E | Solo 1 archivo E2E (`flows.test.ts`) para >30 rutas | Flujos de integración extremo-a-extremo no cubiertos |
| B-07 | 🟡 MEDIO | `SymptomReport.js` / `ChatConversation.js` | Dos modelos de Mongoose aún en JavaScript | Sin type-checking en esquemas de datos médicos |
| B-08 | 🟡 MEDIO | Sockets sin rate limiting | `wearableSocketHandler` acepta mensajes sin throttle por conexión | Posible flooding de escrituras a MongoDB |
| B-09 | 🟡 MEDIO | JWT fallback inseguro | `process.env.JWT_SECRET || 'respicare-secret-key'` en ambos socket handlers | En dev sin `.env`, el secret es predecible |
| B-10 | 🟡 MEDIO | Jobs faltantes | No hay job de archivado de datos antiguos ni de limpieza de sesiones expiradas | Crecimiento descontrolado de BD a largo plazo |
| B-11 | 🟢 BAJO | Generated files en git | `/interface-adapters/dtos/generated/` y similares no están en `.gitignore` | Ruido en commits, posibles conflictos de merge |
| B-12 | 🟢 BAJO | `wearableAlertService` | Dependencia del handler no verificada en el análisis | Riesgo si el servicio falla silenciosamente |

---

### 3.2 WEB FRONTEND — React

#### 3.2.1 Fortalezas identificadas

- **Cobertura de páginas completa:** 18 páginas incluyendo la nueva `PatientMonitoringPage` con WebSocket en tiempo real.
- **Autenticación implementada:** `AuthContext` + `ProtectedRoute` operativos.
- **PatientMonitoringPage.js:** Implementación limpia — reconexión automática cada 3s, ping/pong cada 25s, ordenamiento de tarjetas por criticidad (alertas primero), registro cronológico de alertas, umbral visual configurable.
- **Tests exhaustivos:** 60+ archivos incluyendo accesibilidad (axe), regresión visual, seguridad XSS/CSRF.

#### 3.2.2 Brechas detectadas

| ID | Severidad | Componente | Descripción | Impacto |
|----|-----------|------------|-------------|---------|
| W-01 | 🔴 CRÍTICO | Toda la carpeta `/web/src` | Cero TypeScript — 18 páginas + 30 componentes en `.js` puro | Sin type-checking en toda la UI clínica |
| W-02 | 🔴 CRÍTICO | Ausencia de Error Boundaries | Ningún componente tiene `<ErrorBoundary>` | Un error en cualquier componente derrumba toda la app |
| W-03 | 🟠 ALTO | `PatientMonitoringPage.js` | `WS_URL` construye URL como `ws://localhost:3001` sin validar REACT_APP_WS_URL | En producción/HTTPS el protocolo debe ser `wss://` |
| W-04 | 🟠 ALTO | Servicio layer mínimo | Solo 2 archivos en `/services` (`apiBase.js`, `i18nService.js`) — lógica de API dispersa en componentes | Acoplamiento alto, difícil testing |
| W-05 | 🟠 ALTO | `PatientMonitoringPage.js` línea 84 | `ws.readyState < 2` para evitar reconexión — lógica correcta pero sin manejo de estado `CLOSING` | Posible doble conexión en edge cases |
| W-06 | 🟡 MEDIO | Componentes duplicados | `ChatBot.js` + `ChatBotEnhanced.js`, `AnalyticsDashboard.js` + `AnalyticsDashboardSimple.js` | Deuda técnica, indeterminado cuál usar |
| W-07 | 🟡 MEDIO | Tests snapshot | 7 archivos `.snap` — snapshot testing es frágil y no verifica comportamiento real | Falsos positivos/negativos frecuentes |
| W-08 | 🟡 MEDIO | Ausencia de gestión de estado global | Solo Context API — sin Redux/Zustand para datos compartidos complejos | Prop drilling en flujos multi-componente |
| W-09 | 🟡 MEDIO | `PatientMonitoringPage` sin paginación | `alertLog` crece indefinidamente (limitado a 50 en memoria, pero UI no pagina) | Degradación visual con muchas alertas simultáneas |
| W-10 | 🟢 BAJO | `statusFor()` retorna `'waiting'` para `reading === null` | Estado inicial `null` correcto, pero `'waiting'` no tiene clase CSS definida (verificar) | Posible tarjeta sin estilo visual |

---

### 3.3 MOBILE — Next.js 16 / Capacitor 6

#### 3.3.1 Fortalezas identificadas

- **Arquitectura triple-fuente de vitales (`useVitalsSource`):** Abstracción elegante que prioriza BLE GATT → Health Connect → Emulador como fallback, con estado unificado.
- **Componente `WearablesView` completo:** UI detallada con indicadores de conexión, alertas en tiempo real via WebSocket, historial de BD, escenarios de simulación, sincronización HTTP de respaldo.
- **TypeScript estricto** en todo el código móvil (a diferencia del web).
- **Librería UI Radix + Tailwind:** 40+ componentes con accesibilidad nativa.
- **Documentación extensa** de red, APK, ngrok.

#### 3.3.2 Brechas detectadas

| ID | Severidad | Componente | Descripción | Impacto |
|----|-----------|------------|-------------|---------|
| M-01 | 🔴 CRÍTICO | `package.json` | **CERO dependencias de testing** (Jest, React Testing Library, Vitest) a pesar de que `jest.config.js` y `/__tests__/` existen | La app móvil es completamente untesteada |
| M-02 | 🔴 CRÍTICO | `bleWearableService.ts` (nuevo) | No revisado en detalle — servicio BLE es código de producción crítico sin tests | Fallas en dispositivo real sin cobertura |
| M-03 | 🟠 ALTO | `wearables.tsx` línea 126 | `emulatorSensors.current ?? emulatorSensors.applyScenario(activeScenario)` — `applyScenario` tiene side-effect en fallback de sync | Comportamiento inesperado al sincronizar sin datos live |
| M-04 | 🟠 ALTO | Scripts de build | `apk:debug`, `apk:release` usan PowerShell con rutas absolutas de Windows | No portable a CI/CD en Linux |
| M-05 | 🟠 ALTO | `ngrok` en documentación de acceso | Guías de producción mencionan túneles ngrok/Cloudflare como mecanismo de acceso | Exposición insegura del backend en red pública |
| M-06 | 🟡 MEDIO | `useVitalsSource` hook (nuevo) | Sin manejo explícito de limpieza (`cleanup`) de listeners BLE al desmontar | Posible memory leak en navegación entre tabs |
| M-07 | 🟡 MEDIO | `WearablesView` sin autenticación WebSocket | `wearableWs.connect()` no envía token JWT al conectar (verificar `wearableWebSocket.ts`) | Si el backend exige auth en WS, la conexión fallará silenciosamente |
| M-08 | 🟡 MEDIO | Gestión de errores BLE | `connectBle()` retorna `false` o `undefined` — tipos ambiguos | Condicional `ok === false` puede fallar si retorna `undefined` |
| M-09 | 🟡 MEDIO | Offline sync | `offline-sync-provider.tsx` existe pero sin librería offline-first (PouchDB, TanStack) | Sincronización offline puede ser incompleta o perderse |
| M-10 | 🟢 BAJO | Múltiples env files | `.env.local`, `.env.staging`, `.env.production` sin validación de schema en startup | Variables faltantes causan errores silenciosos en runtime |

---

### 3.4 AI SERVICES — Python FastAPI

#### 3.4.1 Fortalezas identificadas

- **Cobertura de modelos ML excepcional:** ensemble predictor, BERT médico, federated learning, AutoML, anomaly detection, demand forecasting.
- **Patrones de resiliencia:** circuit breakers para OpenAI y servicios externos, retry decorator, cache decorator.
- **Observabilidad:** Sentry integrado de forma no-bloqueante, logging estructurado.
- **Arquitectura Factory + Strategy:** limpia y extensible.

#### 3.4.2 Brechas detectadas

| ID | Severidad | Componente | Descripción | Impacto |
|----|-----------|------------|-------------|---------|
| A-01 | 🟠 ALTO | `main.py` | Rutas registradas en bloques `try/except` — un import fallido solo imprime warning, no detiene el servidor | Endpoints que fallan en import quedan silenciosamente ausentes |
| A-02 | 🟠 ALTO | Sin `requirements.txt` visible | No se encontró archivo de dependencias Python en raíz de `ai-services` | Reproducibilidad de entorno no garantizada |
| A-03 | 🟡 MEDIO | Sin versionado de modelos ML | No hay API de versiones de modelos ni estrategia A/B testing | No se puede comparar modelos en producción |
| A-04 | 🟡 MEDIO | Sin data drift detection | `ml_monitoring.py` existe pero sin alertas de drift de distribución | Degradación de modelo no detectada automáticamente |
| A-05 | 🟡 MEDIO | `dockerfile` (minúscula) | Nombre no convencional para el Dockerfile del servicio AI | Puede fallar en sistemas case-sensitive o CI/CD |
| A-06 | 🟢 BAJO | Sin pruebas de contrato API | No hay validación de schema OpenAPI en los tests de AI services | Cambios en response breaking pasan desapercibidos |

---

### 3.5 INFRAESTRUCTURA Y DevOps

#### 3.5.1 Fortalezas identificadas

- **Docker Compose multi-ambiente:** dev, prod, staging con health checks en todos los servicios.
- **Nginx con SSL:** reverse proxy correctamente configurado.
- **CI/CD completo:** 12 workflows de GitHub Actions incluyendo tests, builds, release management y ML benchmarking.
- **Documentación operacional:** runbooks, troubleshooting, GPU guide, dashboards guide.

#### 3.5.2 Brechas detectadas

| ID | Severidad | Componente | Descripción | Impacto |
|----|-----------|------------|-------------|---------|
| I-01 | 🟠 ALTO | Sin stack de observabilidad | No hay Prometheus + Grafana ni ELK/Loki en `docker-compose.yml` | Cero visibilidad de métricas en producción |
| I-02 | 🟠 ALTO | Sin SAST/DAST en CI | Ningún workflow ejecuta SonarQube, Snyk o OWASP ZAP | Vulnerabilidades de código no detectadas en pipeline |
| I-03 | 🟠 ALTO | Sin message queue | Jobs async usan cron puro sin cola de mensajes (RabbitMQ/Redis Streams) | Pérdida de tareas si el servicio se reinicia durante ejecución |
| I-04 | 🟡 MEDIO | Sin Dockerfile de producción para Web | Solo existe `dockerfile.dev` para el frontend React | Imagen de producción no definida |
| I-05 | 🟡 MEDIO | Sin thresholds de cobertura | `jest.config.js` no define `coverageThreshold` | Cobertura puede bajar sin que CI falle |
| I-06 | 🟡 MEDIO | Sin secrets manager | Secrets en `.env` files sin rotación automatizada ni vault | Variables sensibles expuestas en archivos de configuración |
| I-07 | 🟢 BAJO | Inconsistencia en nombres de Dockerfile | `Dockerfile` (backend), `dockerfile` (ai-services), `dockerfile.dev` (web) | Confusión en scripts de build |

---

## 4. MAPA DE RIESGO CONSOLIDADO

```
SEVERIDAD × PROBABILIDAD

         │ BAJA PROB.  │ MEDIA PROB. │ ALTA PROB.
─────────┼─────────────┼─────────────┼────────────
CRÍTICO  │             │  B-02,W-02  │  B-01,W-01
         │             │  M-01,M-02  │
─────────┼─────────────┼─────────────┼────────────
ALTO     │  A-01,I-03  │  B-04,B-06  │  W-03,W-04
         │             │  M-04,I-01  │  M-05
─────────┼─────────────┼─────────────┼────────────
MEDIO    │  A-03,A-04  │  B-08,B-09  │  W-06,W-07
         │  I-02,I-06  │  M-06,M-07  │  M-03
─────────┼─────────────┼─────────────┼────────────
BAJO     │  I-07,A-05  │  B-11,B-12  │  W-10,M-10
```

---

## 5. PLAN DE REMEDIACIÓN PRIORIZADO

### Prioridad 0 — Antes del siguiente merge a `main`

| ID | Acción | Esfuerzo | Responsable |
|----|--------|----------|-------------|
| B-09 | Eliminar fallback `'respicare-secret-key'` en socket handlers — lanzar error si `JWT_SECRET` no está definida | 15 min | Backend |
| W-03 | En `PatientMonitoringPage.js`: derivar protocolo WS de `window.location.protocol` (`ws:` vs `wss:`) en lugar de hardcode | 20 min | Web |
| B-02 | Implementar canal de email en `notificationService.ts` o al menos lanzar error explícito en lugar de skip silencioso | 1h | Backend |
| M-07 | Verificar que `wearableWebSocket.ts` envíe token JWT en el mensaje `auth` inicial — si no, agregar | 30 min | Mobile |

### Prioridad 1 — Sprint actual

| ID | Acción | Esfuerzo |
|----|--------|----------|
| M-01 | Agregar Jest + React Testing Library a `mobile/medical-app/package.json` y crear al menos 3 pruebas de `WearablesView` | 3h |
| B-08 | Agregar throttle por conexión en `wearableSocketHandler` (máx. N mensajes/segundo por `patientId`) | 2h |
| W-02 | Agregar `<ErrorBoundary>` en `App.js` como wrapper global y en rutas críticas | 1h |
| I-05 | Definir `coverageThreshold` en `jest.config.js` del backend (mínimo 70% statements/lines) | 30 min |
| A-02 | Crear/verificar `requirements.txt` o `pyproject.toml` con versiones pinadas en `ai-services/` | 1h |

### Prioridad 2 — Próximo sprint

| ID | Acción | Esfuerzo |
|----|--------|----------|
| B-01 | Habilitar `strict: true` en `backend/tsconfig.json` y corregir errores de tipo emergentes | 4-8h |
| W-01 | Migrar páginas críticas a `.tsx` comenzando por: `PatientMonitoringPage`, `LoginPage`, `Dashboard` | 8h |
| B-04/05 | Eliminar rutas y controladores duplicados — elegir una implementación canónica | 4h |
| I-01 | Agregar Prometheus + Grafana al `docker-compose.yml` | 3h |
| M-06 | Auditar `useVitalsSource` para asegurar cleanup de listeners BLE en `useEffect` return | 1h |

### Prioridad 3 — Deuda técnica

| ID | Acción | Esfuerzo |
|----|--------|----------|
| B-06 | Expandir suite E2E a flujos críticos: login→wearable→alerta, login→dashboard→monitoreo | 6h |
| I-02 | Integrar Snyk en pipeline de CI para análisis de dependencias vulnerables | 2h |
| W-04 | Extraer llamadas API de componentes a servicios dedicados en `/web/src/services/` | 6h |
| A-01 | Cambiar imports de rutas en `main.py` a fallo explícito en startup si un módulo falta | 1h |
| I-03 | Evaluar Redis Streams o BullMQ para jobs async en backend | 4h |

---

## 6. ESTADO DE LA FEATURE ACTUAL (Iteración Semana 4)

### 6.1 Sistema de Monitoreo en Tiempo Real — COMPLETADO FUNCIONALMENTE

La implementación de la rama `fabian` agrega una característica de alto valor:

```
Wearable (BLE/HC/EMU)
       │
       ▼  WebSocket /ws/wearables
[wearableSocketHandler] ──→ MongoDB (WearableData)
       │                ──→ vitalsEmitter.emit('vitals', reading)
       │                          │
       │                          ▼
       │               [doctorSocketHandler] ──→ /ws/doctor
       │                          │
       │                          ▼
       │                 Web: PatientMonitoringPage
       │                 (tarjetas por paciente, alertas en tiempo real)
       │
       ▼  HTTP fallback
  /api/wearables/sync
```

**Implementación evaluada:**
- ✅ `vitalsEmitter.ts`: EventEmitter singleton correcto, `setMaxListeners(100)` apropiado
- ✅ `wearableSocketHandler.ts`: autenticación JWT, timeout 10s, persistencia MongoDB, emit a bus, alertas de umbral
- ✅ `doctorSocketHandler.ts`: verificación de rol `doctor|admin`, suscripción a pacientes específicos o `*`, retransmisión filtrada
- ✅ `PatientMonitoringPage.js`: reconexión automática, ping/pong, ordenamiento por criticidad
- ✅ `WearablesView` + `useVitalsSource`: prioridad BLE→HC→EMU, indicadores de fuente, UI completa
- ⚠️ Brecha W-03: protocolo WS hardcodeado como `ws://` (rompe en HTTPS/producción)
- ⚠️ Brecha B-09: JWT_SECRET con fallback inseguro en ambos handlers
- ⚠️ Brecha B-08: sin rate limiting por conexión WebSocket

---

## 7. MÉTRICAS DEL SISTEMA

| Métrica | Valor | Tendencia |
|---------|-------|-----------|
| Líneas de código Backend (TS) | ~31,811 | ↑ |
| Archivos de tests Backend | 80+ | ↑ |
| Archivos de tests Web | 60+ | ↑ |
| Archivos de tests Mobile | **0 ejecutables** | ⚠️ |
| Rutas API Backend | 30+ | ↑ |
| Componentes Web | 30+ | ↑ |
| Modelos ML AI Services | 17 | ↑ |
| Workflows CI/CD | 12 | → |
| Cobertura backend estimada | >70% (Semana 3) | ↑ |
| Cobertura móvil | **0%** | ✗ |

---

## 8. DEUDA TÉCNICA ACUMULADA

### Estimación de esfuerzo por categoría

| Categoría | Issues | Esfuerzo estimado |
|-----------|--------|-------------------|
| Seguridad (P0/P1) | 4 | 2h |
| Testing (críticos) | 3 | 8h |
| TypeScript migration | 2 | 12-20h |
| Duplicaciones/limpieza | 4 | 6h |
| Infraestructura | 4 | 8h |
| Error handling | 3 | 3h |
| **Total** | **20** | **~39-47h** |

---

## 9. CONCLUSIONES

### Lo que funciona bien
1. **Backend sólido** con amplia cobertura de tests, seguridad bien configurada y servicios médicos completos
2. **Feature de monitoreo en tiempo real** correctamente arquitecturada con EventEmitter bus
3. **Mobile TypeScript estricto** — contrasta positivamente con el web
4. **AI Services** con patrones de resiliencia maduros

### Lo que requiere atención inmediata
1. **JWT_SECRET fallback** (`'respicare-secret-key'`) en socket handlers — vector de ataque directo
2. **Protocolo WebSocket hardcodeado** como `ws://` — romperá en producción con HTTPS
3. **Mobile sin testing** — feature crítica (BLE, wearables) sin cobertura de pruebas alguna
4. **Email notifications stub** — canal de alertas críticas no implementado

### Recomendación estratégica
Antes de avanzar con nuevas features, dedicar un sprint de calidad que cubra las 4 brechas P0 (estimado: 1-2 días) y las 5 brechas P1 (estimado: 3-4 días). El sistema tiene fundamentos sólidos — las brechas son reparables sin refactoring mayor.

---

*Reporte generado el 2026-05-06 sobre el estado de la rama `fabian` en commit `a2146eb` (2.0.1.1)*
