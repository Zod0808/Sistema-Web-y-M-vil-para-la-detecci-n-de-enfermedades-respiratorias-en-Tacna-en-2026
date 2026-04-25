# RespiCare

Plataforma clínica para la gestión y análisis de enfermedades respiratorias. Integra backend REST, servicios de IA/ML, dashboard web y app Android nativa con simulación de wearables.

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-6-47A248?logo=mongodb&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                     Clientes                            │
│  Web (React 18)          Mobile (Next.js + Capacitor)   │
│  localhost:3000          APK → Android Emulator         │
└──────────────┬──────────────────────┬───────────────────┘
               │                      │  adb reverse tcp:3001
               ▼                      ▼
┌──────────────────────────────────────────────────────────┐
│              Backend  (Node.js / TypeScript)             │
│              Express · JWT · Mongoose · Redis            │
│              localhost:3001                              │
└───────────────┬──────────────────────────────────────────┘
                │
        ┌───────┴────────┐
        ▼                ▼
  MongoDB 6         AI Services
  respicare_dev     (Python / FastAPI)
                    localhost:8000
```

**Roles**: `patient` · `doctor` · `admin`  
**Almacenamiento**: MongoDB (datos clínicos) + Redis (caché)  
**ML**: Random Forest 96.86% · XGBoost 97.28% · Neural Network 99.64% · Ensemble >99.8%

---

## Inicio rápido

### Requisitos

- Docker Desktop 4.x
- Node.js 18+
- Python 3.11+ *(solo si no usas Docker)*
- Android Studio + Emulador Pixel 7 Pro *(solo para app móvil)*

### 1. Levantar los servicios

```bash
git clone <repo-url>
cd proyecto-final-sistema_enfermedades_respiratorias

docker compose -f docker-compose.dev.yml up -d
```

Servicios disponibles tras el arranque:

| Servicio | URL |
|---|---|
| Backend API | http://localhost:3001 |
| Swagger / API Docs | http://localhost:3001/api-docs |
| AI Services | http://localhost:8000/docs |
| MongoDB | mongodb://localhost:27017 |

### 2. Cargar datos de demo

```bash
docker exec respicare-backend-dev node src/scripts/seed-complete-system.js
```

Crea 13 colecciones con datos enlazados: usuarios, historias médicas, citas, prescripciones, alertas, wearables, experimentos ML, auditoría y más.

### 3. Credenciales de acceso

| Rol | Email | Contraseña |
|---|---|---|
| Paciente | `paciente@demo.com` | `demo1234` |
| Doctor | `doctor@demo.com` | `demo1234` |
| Admin | `admin@demo.com` | `admin1234` |

---

## App móvil (APK Android)

La app corre como APK nativa en el emulador Pixel 7 Pro vía **Next.js 16 + Capacitor 6**.

```bash
cd mobile/medical-app

# Build del frontend estático
npm run build

# Sincronizar assets a Android
npx cap sync android

# Compilar APK
cd android && ./gradlew assembleDebug

# Instalar en el emulador y activar túneles de red
adb install -r app/build/outputs/apk/debug/app-universal-debug.apk
adb reverse tcp:3001 tcp:3001
adb reverse tcp:8000 tcp:8000
```

> Los comandos `adb reverse` deben re-ejecutarse cada vez que se reinicia el emulador.

---

## Simulación de wearables

El módulo imita el flujo real de un smartwatch Wear OS sin hardware físico.

```
EmulatorSensorService  →  WearablesView  →  POST /api/v1/wearables/sync  →  MongoDB
(Ornstein-Uhlenbeck)      (tick 3 s)         (source: android_sensor)        (patientId)
```

**Escenarios disponibles en la app:**

| Escenario | FC objetivo | SpO2 | Pasos/tick |
|---|---|---|---|
| Reposo | 62 BPM | 98% | 0–1 |
| Activo | 88 BPM | 97% | 5–15 |
| Ejercicio | 145 BPM | 96% | 15–35 |
| Alerta SpO2 | 105 BPM | 88% | 0–3 |

El drift entre ticks sigue un proceso de **Ornstein-Uhlenbeck** (`θ=0.25`, `σ=1.8` para FC; `θ=0.4`, `σ=0.4` para SpO2) para simular variabilidad fisiológica realista.

---

## API — endpoints principales

Todos los endpoints requieren `Authorization: Bearer <token>` salvo los de auth.

```
POST   /api/v1/auth/login
POST   /api/v1/auth/register

GET    /api/v1/dashboard/patient
GET    /api/v1/dashboard/doctor

GET    /api/v1/medical-histories
POST   /api/v1/medical-histories

GET    /api/v1/appointments
POST   /api/v1/appointments
GET    /api/v1/appointments/me/upcoming

GET    /api/v1/prescriptions
GET    /api/v1/alerts
GET    /api/v1/lab/results
GET    /api/v1/referrals

POST   /api/v1/wearables/sync       # body: { data: [{ heartRate, oxygenSaturation, steps, timestamp, source }] }
GET    /api/v1/wearables/metrics    # métricas agregadas de las últimas 24 h
GET    /api/v1/wearables/data       # historial de lecturas (?limit=N)

POST   /api/v1/symptom-analyzer/analyze
GET    /api/v1/analytics/executive-dashboard
GET    /api/v1/reports/automatic
```

Documentación interactiva completa: `GET /api-docs` (Swagger/OpenAPI).

---

## Permisos por rol (RBAC)

| Permiso | patient | doctor | admin |
|---|:---:|:---:|:---:|
| `prescriptions:read` | ✓ | ✓ | ✓ |
| `prescriptions:create` | | ✓ | ✓ |
| `appointments:read` | ✓ | ✓ | ✓ |
| `medical-histories:read` | ✓ | ✓ | ✓ |
| `lab:read` | ✓ | ✓ | ✓ |
| `alerts:read` | ✓ | ✓ | ✓ |
| `fhir:read` | ✓ | ✓ | ✓ |
| `analytics:read` | | ✓ | ✓ |
| `users:manage` | | | ✓ |

---

## Estructura del proyecto

```
├── backend/                  # Node.js · TypeScript · Express
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/           # Mongoose schemas (MongoDB)
│   │   ├── routes/
│   │   ├── middleware/       # auth.ts · rbac.ts · validation.ts
│   │   └── scripts/          # seed-complete-system.js
│   └── tests/
│
├── ai-services/              # Python · FastAPI · PyTorch
│   ├── app/
│   │   ├── ml/               # Random Forest · XGBoost · Neural Network
│   │   ├── nlp/              # BERT médico · NER · resumen
│   │   ├── audio/            # Whisper · Librosa · análisis de tos
│   │   └── vision/           # ResNet50 · imágenes médicas
│   └── monitoring/
│
├── mobile/
│   └── medical-app/          # Next.js 16 + Capacitor 6 → APK Android
│       ├── components/tabs/  # wearables.tsx · dashboard.tsx · ...
│       ├── lib/
│       │   ├── api/services/ # wearableService.ts · authService.ts · ...
│       │   └── services/     # emulatorSensors.ts
│       └── android/          # proyecto Gradle (AGP 8.3.2 · Gradle 8.4)
│
├── web/                      # React 18 · dashboard ejecutivo
│
└── docker-compose.dev.yml    # MongoDB · Redis · Backend · AI Services
```

---

## Variables de entorno

El backend en Docker usa las siguientes variables (con defaults para desarrollo):

```env
MONGODB_URI=mongodb://admin:change_this_password@mongodb:27017/respicare?authSource=admin
REDIS_URL=redis://redis:6379
JWT_SECRET=dev-secret-key-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production
FIELD_ENCRYPTION_KEY=<base64-aes256-key>   # requerido para MedicalHistory
NODE_ENV=development
PORT=3001
```

Para generación de la clave AES-256:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Documentación académica

**Universidad Privada de Tacna** · Ingeniería de Sistemas · Construcción de Software II · 2026  
**Docente**: Ing. Alberto Flor Rodríguez  
**Estudiante**: Cesar Fabian Chávez Linares (2019063854)

| Documento | Descripción |
|---|---|
| [FD05 — Informe Final](Documentation/FD05-EPIS-Informe%20ProyectoFinal.docx.md) | Informe completo del proyecto |
| [FD01 — Factibilidad](Documentation/FD01-EPIS-Informe%20de%20Factibilidad%20de%20Proyecto.docx) | Análisis de factibilidad |
| [FD03 — SRS](Documentation/FD03-EPIS-Informe%20SRS%20de%20Proyecto.docx) | Especificación de requisitos |
| [FD04 — SAD](Documentation/FD04-EPIS-Informe%20SAD%20de%20Proyecto.docx) | Arquitectura del sistema |
| [FD07 — SCRUM](Documentation/FD07-EPIS-Informe%20AGIL-SCRUM%20de%20Proyecto.md) | Metodología ágil aplicada |

---

## Licencia

MIT © 2026 Cesar Fabian Chávez Linares