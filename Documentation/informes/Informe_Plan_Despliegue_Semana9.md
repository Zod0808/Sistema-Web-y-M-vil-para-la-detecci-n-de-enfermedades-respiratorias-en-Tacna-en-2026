# Misión del Arquitecto: Plan de Despliegue y Definición de Ambientes

| Campo | Detalle |
|:---|:---|
| **Proyecto** | RespiCare — Sistema Web y Móvil para la Detección de Enfermedades Respiratorias en Tacna |
| **Asignatura** | Construcción de Software I |
| **Objetivo Procedimental** | Semana 9 — Elaborar el plan de despliegue y definir las áreas y ambientes de sistemas |
| **Docente** | Mag. Alberto Johnatan Flor Rodríguez |
| **Estándar** | SWEBOK V4 — Fase de Despliegue de Software |
| **Estudiante** | Chávez Linares, Cesar Fabian — 2019063854 |
| **Institución** | Universidad Privada de Tacna — EPIS |
| **Versión del sistema** | 1.0.17.17.2 (164 commits — rama `fabian`) |
| **Fecha** | Mayo 2026 |

---

## Estado Actual del Sistema

Antes de elaborar el plan de despliegue, se documenta el estado real del repositorio al momento de redactar este informe:

| Artefacto | Estado actual |
|:---|:---:|
| Backend (`authController.ts`, `authRoutes.ts`) | Modificado — mejoras de autenticación |
| Mobile (`capacitor.config.ts`, `package.json`) | Modificado — configuración APK actualizada |
| Web (`App.css`, `ChatBot.css`, `ChatBotEnhanced.css`) | Modificado — ajustes de UI |
| Web (`LanguageSelector.js`, `ThemeProvider.js`) | Modificado — soporte i18n y tema |
| Web (`AuthContext.js`, `AdminPage.js`) | Modificado — contexto de autenticación |
| Web (`PatientMonitoringPage.js`) | Modificado — monitoreo de pacientes |
| Nuevos archivos de rendimiento | `perf_20260514.jsonl`, `perf_20260515.jsonl` |
| Rama activa | `fabian` |

---

## 1. Definición de Ambientes

### 1.1 Arquitectura de Tres Ambientes

```text
  ┌──────────────────────────────────────────────────────────────────────────┐
  │               PIPELINE DE AMBIENTES — RESPICARE                          │
  └──────────────────────────────────────────────────────────────────────────┘

  ┌────────────────┐   Commit/Push    ┌─────────────────┐  Tag vX.Y.Z  ┌──────────────────┐
  │                │ ──────────────► │                 │ ────────────► │                  │
  │  DEV           │                 │  QA / STAGING   │              │  PRODUCCIÓN       │
  │  (Local)       │ ◄────────────── │  (Cloud)        │ ◄──────────── │  (Cloud)          │
  │                │  Fix regresión  │                 │  Rollback     │                  │
  └────────────────┘                 └─────────────────┘              └──────────────────┘
   docker-compose                    GitHub Actions                    GitHub Actions
   .dev.yml                          deploy-staging.yml               deploy-production.yml
   localhost                         staging.respicare.dev            respicare.tacna.pe
```

---

### 1.2 Ambiente de Desarrollo (DEV)

**Archivo de configuración:** `docker-compose.dev.yml`  
**Red Docker:** `respicare-dev-network`  
**Propósito:** Iteración rápida, depuración local, pruebas unitarias y de integración.

#### Servicios y Puertos Expuestos

| Servicio | Contenedor | Puerto Externo | Puerto Interno | URL de Acceso | Observaciones |
|:---|:---|:---:|:---:|:---|:---|
| Nginx (Proxy) | `respicare-nginx-dev` | 80 | 80 | http://localhost | Enruta a todos los servicios |
| Backend API | `respicare-backend-dev` | 3001 | 3001 | http://localhost:3001 | Hot reload activo (`nodemon`) |
| Node Debugger | `respicare-backend-dev` | 9229 | 9229 | debug://localhost:9229 | Inspector Node.js — VS Code |
| AI Services | `respicare-ai-dev` | 8000 | 8000 | http://localhost:8000 | Docs: http://localhost:8000/docs |
| Web Frontend | `respicare-web-dev` | 3000 | 3000 | http://localhost:3000 | Hot reload (`CHOKIDAR_USEPOLLING=true`) |
| MongoDB | `respicare-mongodb-dev` | 27018 | 27017 | localhost:27018 | Puerto alternativo para no conflicto |
| Redis | `respicare-redis-dev` | 6379 | 6379 | localhost:6379 | Sin contraseña en DEV |
| Mongo Express | `respicare-mongo-express-dev` | 8081 | 8081 | http://localhost:8081 | UI de administración MongoDB |
| Redis Commander | `respicare-redis-commander-dev` | 8082 | 8082 | http://localhost:8082 | UI de administración Redis |

#### Variables de Entorno Clave — DEV

```bash
NODE_ENV=development
LOG_LEVEL=debug
MONGO_DB=respicare_dev
AI_RATE_LIMIT_ENABLED=0          # Rate limiting DESACTIVADO
AI_RATE_LIMIT_CAPACITY=1000      # Alta capacidad para pruebas
CHOKIDAR_USEPOLLING=true         # Hot reload en Windows/Docker
TESTING=true                     # Deshabilita rate limiting en tests
```

#### Recursos Asignados — DEV

| Servicio | CPU Límite | Memoria Límite | CPU Reservado | Memoria Reservada |
|:---|:---:|:---:|:---:|:---:|
| AI Services | 2 cores | 4 GB | 0.5 cores | 1 GB |
| Backend | Sin límite | Sin límite | — | — |
| MongoDB | Sin límite | Sin límite | — | — |
| Redis | Sin límite | 256 MB | — | — |

#### Comando de Inicio — DEV

```bash
docker-compose -f docker-compose.dev.yml up -d
# o usando scripts:
./scripts/start-dev.sh
```

---

### 1.3 Ambiente de QA / Staging

**Archivo de configuración:** `.github/workflows/deploy-staging.yml` + manifiestos `infrastructure/k8s/`  
**Namespace Kubernetes:** `staging`  
**URL:** `https://staging.respicare.dev`  
**Trigger:** Push a ramas `develop` o `staging`  
**Propósito:** Validación funcional, pruebas de regresión, pruebas de aceptación con datos sintéticos antes del pase a producción.

#### Pipeline de QA (GitHub Actions `deploy-staging.yml`)

```text
  Push a develop/staging
         │
         ▼
  ┌─────────────────────┐
  │ Build images staging │   → Construye imágenes Docker etiquetadas
  │ (ghcr.io/...)       │     con el SHA del commit
  └──────────┬──────────┘
             │
             ▼
  ┌───────────────────────────┐
  │ Push a GitHub Container   │   → ghcr.io/[org]/respicare-backend:staging
  │ Registry (GHCR)           │     ghcr.io/[org]/respicare-ai:staging
  └──────────┬────────────────┘
             │
             ▼
  ┌────────────────────────────┐
  │ Deploy a Kubernetes        │   → kubectl apply -f infrastructure/k8s/
  │ namespace: staging         │     Usa ArgoCD (infrastructure/argocd/)
  └──────────┬─────────────────┘
             │
             ▼
  ┌────────────────────────────┐
  │ Health checks + smoke tests │  → Verifica /health, /api/v1/health
  │                            │     y flujos críticos del sistema
  └────────────────────────────┘
```

#### Características diferenciadoras de QA

| Característica | DEV | QA / Staging |
|:---|:---:|:---:|
| Datos | Datos de desarrollo (locales) | Datos sintéticos (64,522 casos ML) |
| SSL/TLS | No (HTTP plano) | Sí (Let's Encrypt) |
| Rate Limiting | Desactivado | Activado (reducido) |
| Monitoreo | Mongo Express, Redis Commander | Prometheus + Grafana |
| Tracing | Opcional | OpenTelemetry activo |
| Kubernetes | No | Sí (namespace `staging`) |
| Escala | 1 réplica | 1-2 réplicas (HPA) |
| Backups | No | Sí (manual) |

---

### 1.4 Ambiente de Producción (PROD)

**Archivo de configuración:** `docker-compose.prod.yml` / manifiestos Kubernetes producción  
**Namespace Kubernetes:** `production` (Terraform: `infrastructure/terraform/`)  
**URL pública:** `https://respicare.tacna.pe` *(o dominio configurado)*  
**Trigger:** Tag de versión `v*.*.*` con confirmación manual (`DEPLOY`)  
**Propósito:** Sistema en operación real con datos clínicos de pacientes.

#### Servicios y Puertos — PROD

| Servicio | Contenedor | Puerto Público | Puerto Interno | Restricción de acceso |
|:---|:---|:---:|:---:|:---|
| Nginx HTTPS | `respicare-nginx-prod` | **443** | 443 | Público (internet) |
| Nginx HTTP | `respicare-nginx-prod` | **80** | 80 | Público (redirige a HTTPS) |
| Backend API | `respicare-backend-prod` | — | 3001 | Solo interno (127.0.0.1) |
| AI Services | `respicare-ai-prod` | — | 8000 | Solo interno (red Docker) |
| MongoDB | `respicare-mongodb-prod` | — | 27017 | Solo interno (red Docker) |
| Redis | `respicare-redis-prod` | — | 6379 | Solo interno (127.0.0.1) |
| Certbot | `respicare-certbot-prod` | — | — | Gestión automática SSL |
| Backup | `respicare-backup-prod` | — | — | Backup diario 2:00 AM |

#### Variables de Entorno Clave — PROD

```bash
NODE_ENV=production
LOG_LEVEL=info
MONGO_DB=respicare                      # Base de datos de producción
MONGO_USERNAME=<desde secrets>
MONGO_PASSWORD=<desde secrets>
JWT_SECRET=<openssl rand -base64 32>
FIELD_ENCRYPTION_KEY=<AES-256 base64>
AI_RATE_LIMIT_ENABLED=1                # Rate limiting ACTIVO
AI_RATE_LIMIT_CAPACITY=500
AI_RATE_LIMIT_REFILL_PER_SEC=20.0
AI_MAX_BODY_BYTES=2097152              # 2 MB (más restrictivo)
OTEL_ENABLED=true                      # Telemetría ACTIVA
OTEL_SERVICE_NAME=respicare-backend
BACKUP_RETENTION_DAYS=30
```

#### Recursos Asignados — PROD

| Servicio | CPU Límite | Memoria Límite | CPU Reservado | Memoria Reservada | Réplicas (K8s) |
|:---|:---:|:---:|:---:|:---:|:---:|
| AI Services | 4 cores | **8 GB** | 2 cores | 4 GB | 1-3 (HPA) |
| Backend | 1 core | 1 GB | 0.5 cores | 512 MB | 2-5 (HPA) |
| MongoDB | 2 cores | 4 GB | 1 core | 2 GB | 1 (Replica Set) |
| Redis | 0.5 cores | 256 MB | 0.25 cores | 128 MB | 1 |

#### Firewall y Seguridad de Red — PROD

```bash
# Puertos permitidos (UFW)
sudo ufw allow 80/tcp     # HTTP → redirige a HTTPS
sudo ufw allow 443/tcp    # HTTPS (Nginx)
sudo ufw allow 22/tcp     # SSH administración

# Puertos bloqueados explícitamente
sudo ufw deny 27017       # MongoDB — NUNCA expuesto
sudo ufw deny 6379        # Redis — NUNCA expuesto
sudo ufw deny 3001        # Backend — solo via Nginx
sudo ufw deny 8000        # AI Services — solo via Nginx
```

---

### 1.5 Matriz de Riesgo por Ambiente

La matriz evalúa el impacto de un incidente en cada ambiente cruzado con la probabilidad de ocurrencia, determinando el nivel de control requerido.

| Riesgo | Probabilidad | Impacto DEV | Impacto QA | Impacto PROD | Control en PROD |
|:---|:---:|:---:|:---:|:---:|:---|
| **Datos de pacientes expuestos** | Baja | Ninguno (datos de prueba) | Ninguno (datos sintéticos) | 🔴 Crítico | Encriptación AES-256, RBAC, audit logs, HIPAA/LPD |
| **Caída del servicio de predicción IA** | Media | 🟡 Bajo (dev local) | 🟡 Medio (QA bloqueada) | 🔴 Alto (usuarios sin diagnóstico) | Circuit breaker, reintentos, timeout 180s, HPA K8s |
| **Corrupción de base de datos** | Muy baja | 🟢 Nulo (datos dev) | 🟡 Medio (perder QA) | 🔴 Crítico (datos clínicos) | Backups diarios 2 AM, retención 30 días, replica set |
| **Inyección de código (XSS/SQLi)** | Baja | 🟡 Medio | 🟡 Medio | 🔴 Crítico | DOMPurify, Zod validation, WAF en Nginx, OWASP ZAP |
| **Modelo ML con accuracy degradado** | Baja | 🟢 Bajo (tests locales) | 🟡 Medio (QA detecta) | 🔴 Alto (diagnósticos incorrectos) | PSI drift monitoring, alertas OpenTelemetry, umbral PSI>0.20 |
| **Latencia API > 500ms** | Media | 🟢 Sin impacto | 🟡 Detectado en QA | 🔴 Alto (UX degradada) | HPA Kubernetes, Redis cache, Artillery stress testing |
| **Falla de build en CI/CD** | Media | 🟢 Solo local | 🟡 Bloquea staging | 🟡 Bloquea release | GitHub Actions con gates obligatorios, 0 errores TS/mypy |
| **Certificado SSL vencido** | Muy baja | N/A | 🟡 Medio | 🔴 Alto (sitio inaccesible) | Certbot auto-renovación, alerta 30 días antes |
| **Prompt injection en chatbot** | Baja | 🟢 Controlado (TESTING=true) | 🟡 Detectado en DAST | 🔴 Crítico | Sanitización de prompts, test_prompt_injection.py en CI |
| **Drift de datos ML (PSI > 0.20)** | Media | 🟢 No aplica | 🟡 Detectado en bench | 🔴 Alto (predicciones sesgadas) | KS-test, PSI monitoring, alerta activa en perf_*.jsonl |

**Leyenda:** 🔴 Crítico — control obligatorio | 🟡 Medio — control recomendado | 🟢 Bajo — monitoreo pasivo | N/A — no aplica

#### Resumen de Nivel de Control por Ambiente

```text
  Ambiente  │  Nivel de Control  │  Datos          │  Acceso externo
  ──────────┼────────────────────┼─────────────────┼────────────────
  DEV       │  ⬛ Mínimo          │  Sintéticos/Dev │  Solo localhost
  QA        │  🟨 Moderado        │  Sintéticos     │  HTTPS restringido
  PROD      │  🟥 Máximo          │  Clínicos reales│  HTTPS público (80/443)
```

---

## 2. Criterios de Testabilidad

### 2.1 Modularidad del Código Fuente

La testabilidad de un sistema depende directamente de su grado de modularidad: módulos cohesivos con interfaces claras son fácilmente aislables para pruebas. RespiCare implementa modularidad en tres dimensiones.

#### 2.1.1 Separación en Microservicios

```text
  ┌────────────────────────────────────────────────────────────────────────┐
  │                  ARQUITECTURA DE MICROSERVICIOS                        │
  └────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────┐  HTTP/REST   ┌──────────────────┐
  │  Frontend Web    │ ────────────► │  Backend API     │
  │  React 18        │              │  Node.js/TS      │
  │  /web/src/       │              │  /backend/src/   │
  │  Puerto: 3000    │              │  Puerto: 3001    │
  └──────────────────┘              └────────┬─────────┘
                                             │ HTTP/REST
  ┌──────────────────┐                       ▼
  │  Mobile App      │             ┌──────────────────┐  Mongoose ┌─────────┐
  │  Next.js+Cap.6   │             │  AI Services     │ ─────────► │ MongoDB │
  │  /mobile/        │             │  Python/FastAPI  │           │  :27017 │
  └──────────────────┘             │  /ai-services/   │           └─────────┘
                                   │  Puerto: 8000    │
                                   └────────┬─────────┘  Redis   ┌─────────┐
                                            └──────────────────► │  Redis  │
                                                                  │  :6379  │
                                                                  └─────────┘
  Cada microservicio:
  ✅ Se despliega de forma independiente
  ✅ Tiene su propio Dockerfile y suite de tests
  ✅ Expone health checks propios
  ✅ Se puede escalar individualmente en Kubernetes
```

**Evidencia de testabilidad por microservicio:**

| Microservicio | Framework de Test | Tests implementados | Cobertura | Aislamiento de test |
|:---|:---:|:---:|:---:|:---|
| Backend API | Jest + Supertest | 380+ | 80.44 % | Mocks de MongoDB con `mongodb-memory-server` |
| AI Services | pytest + pytest-asyncio | 150+ | 49.37 % | Mocks de OpenAI, Whisper, SHAP en `conftest.py` |
| Frontend Web | Jest + React Testing Library | 40+ | 75.67 % | Mocks de `fetch` y contextos React |
| Mobile App | Jest + React Testing Library | 50+ | Sin métrica global* | Mocks de Capacitor plugins |

#### 2.1.2 Clean Architecture en el Backend

El backend implementa **Clean Architecture** con 4 capas, cada una testeable de forma independiente:

```
  backend/src/
  ├── domain/              ← Entidades y reglas de negocio puras (sin dependencias)
  │   ├── entities/        │  Testeable con unit tests puros (sin mocks)
  │   └── rules/           │
  ├── application/         ← Casos de uso (depende solo de domain)
  │   └── use-cases/       │  Testeable con mocks de repositories
  ├── infrastructure/      ← Implementaciones concretas (MongoDB, Redis, SMTP)
  │   ├── database/        │  Testeable con mongodb-memory-server
  │   └── external/        │
  └── interface-adapters/  ← Controllers, Routes, DTOs
      ├── controllers/     │  Testeable con Supertest (sin DB real)
      └── dto/             │
```

**Patrón de inyección de dependencias** que habilita el reemplazo de implementaciones reales por mocks en testing:

```typescript
// backend/src/application/use-cases/symptomAnalysis.ts
export class SymptomAnalysisUseCase {
  constructor(
    private readonly symptomRepo: ISymptomRepository,   // ← interfaz, no implementación
    private readonly aiService: IAIService,              // ← testeable con mock
    private readonly notifier: INotificationService      // ← testeable con mock
  ) {}
}
```

#### 2.1.3 Strategy Pattern en AI Services

Los 12+ patrones de diseño implementados maximizan la modularidad y por tanto la testabilidad:

```python
# ai-services/strategies/ — testeable por estrategia individual
class OpenAIStrategy(IAnalysisStrategy):      # test_openai_strategy.py
class LocalModelStrategy(IAnalysisStrategy):  # test_local_model_strategy.py
class RuleBasedStrategy(IAnalysisStrategy):   # test_rule_based_strategy.py

# Cada estrategia tiene su propio archivo de test con mocks del cliente
# correspondiente (OpenAI mock, torch mock, reglas mock)
```

---

### 2.2 Observabilidad del Sistema

La observabilidad implementada en RespiCare permite verificar el comportamiento interno del sistema sin necesidad de depuración invasiva, lo que es fundamental tanto para testing en QA como para monitoreo en producción.

#### 2.2.1 Stack de Observabilidad

```text
  ┌──────────────────────────────────────────────────────────────────────┐
  │                  STACK DE OBSERVABILIDAD                              │
  └──────────────────────────────────────────────────────────────────────┘

  ┌─────────────┐   traces    ┌─────────────────────┐   export   ┌──────────────┐
  │  Backend    │ ──────────► │  OpenTelemetry      │ ─────────► │  Jaeger      │
  │  (TS/OTEL)  │            │  Collector           │           │  (tracing)   │
  └─────────────┘            │  otel-collector.yaml │            └──────────────┘
  ┌─────────────┐   traces   └──────────┬──────────┘            ┌──────────────┐
  │  AI Services│ ─────────────────────►│            ──────────► │  Prometheus  │
  │  (Py/OTEL)  │            metrics   └──────────────────────►  │  (metrics)   │
  └─────────────┘                                                └──────┬───────┘
                                                                        │
                                                                        ▼
                                                                 ┌──────────────┐
                                                                 │  Grafana     │
                                                                 │  (dashboards)│
                                                                 └──────────────┘
  Logs:                                                          ┌──────────────┐
  backend_logs/  ──────────────────────────────────────────────► │  ELK Stack   │
  ai_logs/                                                       │ (Kibana)     │
                                                                 └──────────────┘
```

#### 2.2.2 Métricas de Negocio Instrumentadas

**Backend (TypeScript — `backend/src/observability/otel-config.ts`):**

| Métrica OpenTelemetry | Tipo | Descripción |
|:---|:---:|:---|
| `respicare.patients.active` | UpDownCounter | Pacientes activos en el sistema |
| `respicare.ml.predictions` | Counter | Total de predicciones ML ejecutadas |
| `respicare.ml.prediction_latency` | Histogram | Latencia de predicciones (ms) — umbral: < 500ms |
| `respicare.appointments.created` | Counter | Citas médicas creadas |
| `respicare.appointments.completed` | Counter | Citas completadas exitosamente |
| `respicare.medical_histories.created` | Counter | Historiales clínicos creados |
| `respicare.alerts.triggered` | Counter | Alertas críticas disparadas |
| `respicare.prescriptions.created` | Counter | Prescripciones emitidas |
| `respicare.reports.generated` | Counter | Reportes analíticos generados |

**AI Services (Python — `ai-services/observability/otel_setup.py`):**

| Métrica OpenTelemetry | Tipo | Descripción |
|:---|:---:|:---|
| `respicare.ml.predictions` | Counter | Predicciones ML totales |
| `respicare.ml.prediction_latency` | Histogram | Latencia ML — umbral: < 800ms p95 |
| `respicare.model.inference_latency` | Histogram | Latencia de inferencia del modelo |
| `respicare.symptom_analyses.total` | Counter | Análisis de síntomas ejecutados |
| `respicare.image_analyses.total` | Counter | Análisis de imágenes médicas |
| `respicare.audio_transcriptions.total` | Counter | Transcripciones de audio de tos |
| `respicare.cache.hits` | Counter | Aciertos de caché (Redis) |
| `respicare.cache.misses` | Counter | Fallos de caché (requieren cómputo) |

#### 2.2.3 Health Check Endpoints (Criterio de Testabilidad Automática)

| Servicio | Endpoint | Respuesta esperada | Intervalo | Timeout | Reintentos |
|:---|:---|:---:|:---:|:---:|:---:|
| Backend API | `GET /health` | HTTP 200 | 30 s | 10 s | 3 |
| AI Services | `GET /api/v1/health` | HTTP 200 | 30 s | 10 s | 3 |
| MongoDB | `mongosh db.runCommand("ping")` | `{ ok: 1 }` | 10 s (dev) / 30 s (prod) | 5 s | 5 (dev) / 3 (prod) |
| Redis | `redis-cli PING` | `PONG` | 10 s (dev) / 30 s (prod) | 5 s | 5 (dev) / 3 (prod) |
| Nginx | `GET /health` (wget) | HTTP 200 | 30 s | 10 s | 3 |

#### 2.2.4 Monitoreo de Rendimiento de Modelos ML

Evidenciado por los archivos activos en el repositorio:

```
ai-services/monitoring/performance/
├── perf_20260514.jsonl    ← Métricas del 14 de mayo 2026 (archivo sin trackear)
└── perf_20260515.jsonl    ← Métricas del 15 de mayo 2026 (archivo sin trackear)
```

Cada archivo `.jsonl` registra por predicción: `timestamp`, `model_version`, `accuracy_sample`, `latency_ms`, `features_used`, `drift_psi`. Cuando `PSI > 0.20` (umbral configurado), el sistema emite una alerta de drift de datos — mecanismo crítico de gobernanza ML detectado en `CP-ML-002` del Informe de Pruebas.

#### 2.2.5 Logging Estructurado por Ambiente

| Ambiente | `LOG_LEVEL` | Formato | Destino |
|:---:|:---:|:---:|:---|
| DEV | `debug` | JSON / texto | Consola (stdout Docker) |
| QA | `info` | JSON | Volumen `ai_logs_staging/`, `backend_logs_staging/` |
| PROD | `info` | JSON | Volumen persistente → ELK Stack (Kibana) |

---

## 3. Estructura del Plan: Lienzo de Despliegue

---

### 3.1 Roles y Responsabilidades

| Rol | Responsable | Responsabilidades en el Despliegue |
|:---|:---|:---|
| **Arquitecto / DevOps** | Chávez Linares, Cesar Fabian | Ejecutar scripts de despliegue, configurar variables de entorno, gestionar Kubernetes, supervisar health checks, ejecutar rollback |
| **Product Owner** | Chávez Linares, Cesar Fabian | Definir criterios de aceptación funcional, confirmar Go/No-Go desde la perspectiva de negocio |
| **QA Lead** | Chávez Linares, Cesar Fabian | Ejecutar suite de pruebas de regresión, validar cobertura, revisar informe de defectos pre-despliegue |
| **Scrum Master / Supervisor** | Mag. Alberto J. Flor Rodríguez | Revisar y aprobar el plan, auditar los artefactos de calidad, validar el cumplimiento del DoD |
| **Sistema CI/CD** | GitHub Actions (automatizado) | Build, test, push de imágenes, deploy a staging y producción, smoke tests post-deploy |

> **Nota:** Al ser un proyecto de desarrollador único, los roles de Arquitecto, DevOps, QA Lead y Product Owner recaen en el mismo individuo. La separación de roles se mantiene como estructura conceptual para garantizar que cada perspectiva sea evaluada explícitamente antes de cada despliegue.

---

### 3.2 Herramientas SWEBOK para el Despliegue

SWEBOK V4 establece que la gestión de la construcción y el despliegue deben apoyarse en herramientas verificables. RespiCare implementa las siguientes:

| Categoría SWEBOK | Herramienta | Versión | Uso en RespiCare | Archivo de configuración |
|:---|:---|:---:|:---|:---|
| **Gestión de configuración** | Git + GitHub | — | Control de versiones, ramas, tags de release | `.git/`, `.gitignore` |
| **Integración continua** | GitHub Actions | — | 15+ workflows: build, test, SAST, DAST, deploy | `.github/workflows/` |
| **Contenedores** | Docker + Docker Compose | 20.10+ / 2.0+ | Empaquetado de 5 servicios + infraestructura | `docker-compose*.yml`, `Dockerfile` |
| **Orquestación** | Kubernetes (kubectl) | 1.27+ | Despliegue en staging y producción escalable | `infrastructure/k8s/*.yaml` |
| **Infraestructura como código** | Terraform | 1.5+ | Provisión de namespaces, secrets, network policies | `infrastructure/terraform/` |
| **GitOps / Despliegue declarativo** | ArgoCD | — | Sincronización continua del estado deseado | `infrastructure/argocd/application.yaml` |
| **Proxy / Load Balancer** | Nginx | 1.24+ | Routing, rate limiting, SSL termination, WAF básico | `nginx/nginx.conf` |
| **Autoscaling** | Kubernetes HPA | — | Escala automática Backend (2-5 réplicas) y AI (1-3) | `infrastructure/k8s/*-hpa-enhanced.yaml` |
| **Caché distribuida** | Redis | 7-alpine | Session store, caché de predicciones ML, rate limiting | `docker-compose*.yml` |
| **Análisis estático** | SonarQube + ESLint + mypy | — | Calidad de código, deuda técnica, type safety | `.github/workflows/static-code-analysis.yml` |
| **Seguridad** | OWASP ZAP + SAST/DAST | — | Pruebas de penetración automatizadas | `.github/workflows/security-zap.yml`, `sast-scan.yml` |
| **Monitoreo** | Prometheus + Grafana + Jaeger | — | Métricas, dashboards, trazas distribuidas | `infrastructure/k8s/prometheus-deployment.yaml` |
| **SSL automático** | Certbot (Let's Encrypt) | — | Renovación automática de certificados HTTPS | `docker-compose.prod.yml` (servicio `certbot`) |
| **CDN** | Cloudflare / AWS CloudFront | — | Caché de assets estáticos, protección DDoS | `infrastructure/cdn/` |
| **Chaos Engineering** | (chaos-experiments.yaml) | — | Pruebas de resiliencia ante fallas (K8s) | `infrastructure/k8s/chaos-experiments.yaml` |
| **Backups** | Script Docker + Restic | — | Backup diario MongoDB a las 2:00 AM, retención 30 días | `infrastructure/k8s/mongo-backup-restic.yaml` |
| **Registro de contenedores** | GitHub Container Registry | — | Almacén de imágenes Docker por tag/SHA | `ghcr.io/[org]/respicare-*` |

---

### 3.3 Criterios Go / No-Go

Los criterios Go/No-Go son las condiciones necesarias y suficientes que deben cumplirse para autorizar el paso de un ambiente al siguiente. Un único criterio en estado **No-Go** detiene el despliegue.

#### 3.3.1 Gate DEV → QA (Staging)

| # | Criterio | Herramienta de verificación | Umbral | Estado actual |
|:---:|:---|:---|:---:|:---:|
| G1 | Compilación TypeScript sin errores | `npx tsc --noEmit` | 0 errores | ✅ Go |
| G2 | Tipo check Python sin errores | `mypy ai-services/` | 0 errores | ✅ Go |
| G3 | Cobertura Backend ≥ 80 % | `jest --coverage` | 80.44 % ≥ 80 % | ✅ Go |
| G4 | Cobertura AI Services ≥ 35 % | `pytest --cov` | 49.37 % ≥ 35 % | ✅ Go |
| G5 | 0 tests fallidos en suite completa | `jest` + `pytest` | 0 failures | ✅ Go |
| G6 | 0 vulnerabilidades críticas (SAST) | `static-code-analysis.yml` | CVSS < 7.0 | ✅ Go |
| G7 | Build Docker exitoso (todos los servicios) | `docker-compose build` | Exit code 0 | ✅ Go |
| G8 | Health checks pasan en DEV | `./scripts/healthcheck.sh` | HTTP 200 todos | ✅ Go |
| G9 | Linting sin errores bloqueantes | ESLint + flake8 | 0 errores críticos | ✅ Go |
| G10 | Defectos críticos en backlog: 0 | Informe de Pruebas | 0 severity Critical | ✅ Go |

**Defectos abiertos en backlog técnico:** 10 defectos de severidad Media/Alta, 0 críticos. → **Gate DEV → QA: ✅ APROBADO**

#### 3.3.2 Gate QA → Producción

| # | Criterio | Herramienta de verificación | Umbral | Estado actual |
|:---:|:---|:---|:---:|:---:|
| P1 | Todos los criterios DEV → QA cumplidos | (heredados) | 100 % | ✅ Go |
| P2 | Pruebas de regresión completas en staging | `testing.yml` + smoke tests | 0 regresiones | ✅ Go |
| P3 | Pruebas de seguridad DAST (OWASP ZAP) | `dast-scan.yml` | 0 hallazgos High/Critical | ✅ Go |
| P4 | Cobertura Frontend Web ≥ 70 % | `jest --coverage` | 70 % ≥ 70 % | ✅ Go |
| P5 | ML Accuracy ≥ 95 % (XGBoost) | `ai-ml-bench.yml` | 99.81 % ≥ 95 % | ✅ Go |
| P6 | Latencia API p95 < 500 ms | Artillery load test | < 500 ms | ✅ Go |
| P7 | Latencia AI Services p95 < 800 ms | pytest-benchmark | < 800 ms | ✅ Go |
| P8 | Fairness ML: diferencia de accuracy entre segmentos ≤ 3 % | Fairness tests | ⚠️ 7.3 % (> 3 %) | ❌ **No-Go** |
| P9 | Drift PSI `respiratory_rate` < 0.20 | `perf_*.jsonl` monitoring | ⚠️ PSI = 0.28 | ❌ **No-Go** |
| P10 | Disponibilidad objetivo 99.5 % en staging (72h) | Uptime monitoring | 99.5 % | ✅ Go |
| P11 | Variables de entorno de producción configuradas y auditadas | Checklist manual | Todas definidas | ✅ Go |
| P12 | SSL/TLS activo y certificado válido | `openssl s_client` | Válido > 30 días | ✅ Go |
| P13 | Backup manual ejecutado y verificado pre-deploy | `docker exec backup /backup.sh` | Exit 0 + archivo generado | ✅ Go |
| P14 | Confirmación explícita del Scrum Master | Revisión del informe | Aprobado | 🔲 Pendiente |
| P15 | Input manual `DEPLOY` en GitHub Actions | `deploy-production.yml` | Input == "DEPLOY" | 🔲 Pendiente |

**Estado actual del Gate QA → Producción:**

> ⛔ **NO-GO** — Los criterios P8 (sesgo demográfico) y P9 (drift de datos) bloquean el pase a producción. Estos defectos están registrados como `CP-ML-001` y `CP-ML-002` en el Informe de Resultados de Pruebas, con prioridad Crítica/Alta respectivamente. Deben resolverse en Sprint 3-4 antes de autorizar el primer despliegue en producción con datos clínicos reales.

---

### 3.4 Plan de Rollback

El plan de rollback define las acciones a ejecutar si un despliegue introduce un problema crítico en producción. El objetivo es **restablecer el servicio en menos de 10 minutos** desde la detección del incidente.

#### 3.4.1 Árbol de Decisión de Rollback

```text
  Incidente detectado en PROD
           │
           ▼
  ¿El health check falla?
  ┌────────┴────────┐
  SÍ                NO
  │                 │
  ▼                 ▼
  Rollback          ¿Degradación de rendimiento
  inmediato         o comportamiento inesperado?
  (< 5 min)        ┌────────┴────────┐
                   SÍ               NO
                   │                │
                   ▼                ▼
               Rollback          Investigar
               planificado       en logs
               (< 10 min)        Grafana/Jaeger
```

#### 3.4.2 Procedimiento de Rollback — Docker Compose (Despliegue Actual)

```bash
# PASO 1: Identificar la versión anterior estable
docker images ghcr.io/org/respicare-backend --format "{{.Tag}}"
# → v1.0.16, v1.0.17, v1.0.17.17.1  (la anterior a la actual)

# PASO 2: Actualizar el archivo .env con el tag anterior
BACKEND_IMAGE_TAG=v1.0.17.17.1
AI_IMAGE_TAG=v1.0.17.17.1

# PASO 3: Bajar los servicios afectados
docker-compose -f docker-compose.prod.yml stop backend ai-services

# PASO 4: Actualizar servicios con imagen anterior
docker-compose -f docker-compose.prod.yml up -d --no-deps backend ai-services

# PASO 5: Verificar health checks
curl -f http://localhost:3001/health && echo "Backend OK"
curl -f http://localhost:8000/api/v1/health && echo "AI Services OK"

# PASO 6: Verificar logs por 5 minutos
docker-compose -f docker-compose.prod.yml logs --tail=100 -f backend

# TIEMPO ESTIMADO: 3-5 minutos
```

#### 3.4.3 Procedimiento de Rollback — Kubernetes (Despliegue Avanzado)

```bash
# PASO 1: Verificar historial de despliegues
kubectl rollout history deployment/respicare-backend -n production
kubectl rollout history deployment/respicare-ai-services -n production

# PASO 2: Rollback inmediato a la revisión anterior
kubectl rollout undo deployment/respicare-backend -n production
kubectl rollout undo deployment/respicare-ai-services -n production

# PASO 3: Verificar estado del rollback
kubectl rollout status deployment/respicare-backend -n production
# → Waiting for rollout to finish... 2/2 pods updated

# PASO 4: Verificar pods en ejecución
kubectl get pods -n production -l app=respicare-backend

# PASO 5: Verificar health checks
kubectl exec -n production deployment/respicare-backend -- curl -f http://localhost:3001/health

# TIEMPO ESTIMADO: 2-3 minutos (Kubernetes gestiona el rolling update)
```

#### 3.4.4 Rollback de Base de Datos (Caso extremo)

```bash
# Solo si el deploy incluyó migración de base de datos que introdujo corrupción:

# PASO 1: Detener todos los servicios que escriben a MongoDB
docker-compose -f docker-compose.prod.yml stop backend ai-services

# PASO 2: Identificar el backup más reciente
ls -lt ./backups/mongodb/ | head -5
# → respicare_backup_20260514_020001.tar.gz (backup automático 2:00 AM)

# PASO 3: Restaurar desde backup
docker exec -it respicare-backup-prod ./restore.sh respicare_backup_20260514_020001.tar.gz

# PASO 4: Verificar integridad de datos
docker exec -it respicare-mongodb-prod mongosh -u admin -p $MONGO_PASSWORD \
  --eval "db.patients.countDocuments()" respicare

# PASO 5: Reiniciar servicios
docker-compose -f docker-compose.prod.yml up -d backend ai-services

# TIEMPO ESTIMADO: 10-20 minutos (depende del tamaño del backup)
# PÉRDIDA DE DATOS MÁXIMA: Datos ingresados desde las 2:00 AM hasta el incidente
```

#### 3.4.5 Criterios de Activación del Rollback

| Condición | Severidad | Tiempo máximo de respuesta | Acción |
|:---|:---:|:---:|:---|
| Health check falla por > 2 minutos | 🔴 Crítica | 5 min | Rollback inmediato (automático en K8s con `livenessProbe`) |
| Latencia API p95 > 2,000 ms por 5 min | 🔴 Alta | 10 min | Rollback planificado |
| Error rate > 5 % en los últimos 15 min | 🔴 Alta | 10 min | Rollback planificado |
| ML accuracy < 90 % (detectado en métricas) | 🟡 Media | 30 min | Revertir solo AI Services |
| Certificado SSL inválido | 🔴 Alta | 15 min | Certbot renewal manual + rollback Nginx config |
| Datos de paciente expuestos (brecha) | 🔴 Crítica | Inmediato | Rollback + notificación de incidente de privacidad |

---

### 3.5 Flujo Completo del Despliegue

```text
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │           LIENZO DE DESPLIEGUE — RESPICARE                                  │
  │                                                                              │
  │  FASE 1: PREPARACIÓN (DEV)                                                  │
  │  ─────────────────────────                                                  │
  │  1. Codificación + TDD (ciclo Red→Green→Refactor)                           │
  │  2. Checklist PSP personal pre-commit                                       │
  │  3. git push → rama feature/fabian                                          │
  │                                                                              │
  │  FASE 2: INTEGRACIÓN CONTINUA (GitHub Actions)                              │
  │  ───────────────────────────────────────────────                            │
  │  4. Trigger automático → testing.yml                                         │
  │     ├── backend-tests.yml     (Jest, 80.44% coverage)                      │
  │     ├── ai-services-tests.yml (pytest, 49.37%)                              │
  │     ├── web-tests.yml         (Jest RTL, 75.67%)                            │
  │     ├── static-code-analysis.yml (ESLint, SonarQube, mypy)                  │
  │     ├── sast-scan.yml         (análisis de seguridad estático)               │
  │     └── ai-ml-bench.yml       (benchmarks ML, accuracy, drift)              │
  │  5. Gate DEV → QA: ¿TODOS los criterios G1-G10 pasan? → ✅ Continuar       │
  │                                                                              │
  │  FASE 3: DESPLIEGUE A STAGING (QA)                                         │
  │  ────────────────────────────────────                                       │
  │  6. Push imágenes Docker → GHCR                                             │
  │  7. kubectl apply → namespace staging                                       │
  │  8. Health checks + smoke tests en staging.respicare.dev                   │
  │  9. Pruebas de regresión completas + DAST (OWASP ZAP)                      │
  │  10. Gate QA → PROD: ¿Criterios P1-P15 pasan?                              │
  │      ├── ✅ Go: Continuar a Fase 4                                          │
  │      └── ❌ No-Go: Detener + documentar + planificar fix                   │
  │                                                                              │
  │  FASE 4: DESPLIEGUE A PRODUCCIÓN                                           │
  │  ───────────────────────────────────                                        │
  │  11. Backup manual de MongoDB pre-deploy                                    │
  │  12. Crear tag de versión: git tag v1.0.18                                  │
  │  13. GitHub Actions deploy-production.yml activado por tag                 │
  │  14. Input manual de confirmación: "DEPLOY"                                 │
  │  15. Build imágenes producción + push GHCR                                 │
  │  16. kubectl apply → namespace production (rolling update)                  │
  │  17. Health checks post-deploy (30 segundos de gracia)                     │
  │  18. Smoke tests en producción (endpoints críticos)                         │
  │  19. Monitoreo activo 24h post-deploy (Grafana + Jaeger)                   │
  │                                                                              │
  │  FASE 5: MONITOREO POST-DESPLIEGUE                                         │
  │  ────────────────────────────────────                                       │
  │  20. Dashboard Grafana: latencia, error rate, throughput                    │
  │  21. OpenTelemetry: traces de predicciones ML                               │
  │  22. Alertmanager: notificaciones si métricas superan umbrales              │
  │  23. Drift monitoring: perf_*.jsonl → PSI diario                            │
  │  24. ¿Incidente? → Ejecutar plan de rollback (Sección 3.4)                 │
  └─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Resumen Ejecutivo del Estado de Despliegue

| Dimensión | Estado | Detalle |
|:---|:---:|:---|
| **Ambiente DEV** | ✅ Operativo | `docker-compose.dev.yml` funcional, 9 servicios, hot reload activo |
| **Ambiente QA/Staging** | ✅ Configurado | GitHub Actions `deploy-staging.yml` + K8s manifiestos listos |
| **Ambiente PROD** | ⚠️ No-Go | 2 defectos ML bloquean el pase: sesgo demográfico (P8) + drift PSI (P9) |
| **Gate DEV → QA** | ✅ Aprobado | 10/10 criterios cumplidos |
| **Gate QA → PROD** | ❌ Bloqueado | 13/15 criterios cumplidos — P8 y P9 en No-Go |
| **Plan de Rollback** | ✅ Definido | Docker (3-5 min) + Kubernetes (2-3 min) + DB (10-20 min) |
| **Observabilidad** | ✅ Implementada | OpenTelemetry + Prometheus + Grafana + Jaeger + ELK |
| **CI/CD** | ✅ Automatizado | 15+ workflows GitHub Actions |
| **Backups PROD** | ✅ Configurado | Diario 2:00 AM, retención 30 días, Restic en K8s |
| **SSL/TLS** | ✅ Configurado | Certbot + Let's Encrypt en `docker-compose.prod.yml` |

### Próximas acciones para alcanzar Go en producción

| Acción | Responsable | Sprint | Criterio desbloqueado |
|:---|:---:|:---:|:---:|
| Rebalancear dataset ML para mayores de 70 años (≥ 5 muestras/clase) | Desarrollador | Sprint 3 | P8 |
| Reentrenar XGBoost con dataset ampliado | Desarrollador | Sprint 3-4 | P8 |
| Actualizar datos de entrenamiento para corregir drift PSI de `respiratory_rate` | Desarrollador | Sprint 4 | P9 |
| Validar fairness accuracy diferencial ≤ 3 % tras reentrenamiento | Desarrollador | Sprint 4 | P8 |
| Confirmar PSI < 0.20 en datos frescos | Desarrollador | Sprint 4 | P9 |
| Revisión y aprobación final del Scrum Master | Mag. Alberto Flor | Sprint 4 | P14 |

---

*Documento: RESPICARE-DEPLOY-PLAN-S9 · Estándar: SWEBOK V4 · Semana 9 · Fecha: Mayo 2026*  
*Elaborado por: Chávez Linares, Cesar Fabian (2019063854)*  
*Revisado por: Mag. Alberto Johnatan Flor Rodríguez*