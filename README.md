# RespiCare — Sistema Web y Móvil para la Detección de Enfermedades Respiratorias

**Plataforma clínica integral** para la gestión, monitoreo y análisis de enfermedades respiratorias en Tacna, Perú (2026). Integra un backend REST, servicios de inteligencia artificial y machine learning, dashboard web, app Android nativa con simulación de wearables y herramientas de administración en tiempo real.

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-6.0-47A248?logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## Estado de Despliegue

| Componente | Estado | Plataforma |
|---|---|---|
| Frontend Web | ✅ Activo | Vercel (rama `fabian`) |
| Backend API | ✅ Activo | Docker + Nginx + Cloudflare Tunnel |
| AI / ML Services | ✅ Activo | Docker + FastAPI |
| Base de Datos | ✅ Activo | MongoDB 6.0 (Docker local) |
| Caché / Sesiones | ✅ Activo | Redis 7 (Docker) |
| App Móvil | ✅ Compilable | Capacitor Android (APK debug/release) |
| MongoDB Express | ✅ Activo | `tunnel/mongo-express/` |
| Redis Commander | ✅ Activo | `tunnel/redis-commander/` |

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    Internet / Vercel                     │
│         https://respicare.vercel.app  (React SPA)        │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS / WSS
                         ▼
┌─────────────────────────────────────────────────────────┐
│            Cloudflare Tunnel (puerto 80)                 │
│    are-collecting-aids-females.trycloudflare.com         │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   Nginx (Alpine)                         │
│  /api/           → Backend Node.js   :3001               │
│  /ai/            → AI Services       :8000               │
│  /ws/            → WebSocket wearables                   │
│  /socket.io/     → Socket.io tiempo real                 │
│  /health         → Health check público                  │
│  /mongo-express/ → MongoDB Express UI                    │
│  /redis-commander/ → Redis Commander UI                  │
│  /openapi.json   → AI OpenAPI spec (Swagger UI)          │
└──────┬──────────────┬───────────────────────────────────┘
       │              │
       ▼              ▼
┌────────────┐  ┌─────────────────┐
│  Backend   │  │   AI Services   │
│  Node.js   │  │   FastAPI       │
│  Express   │  │   Python 3.11   │
│  :3001     │  │   :8000         │
└─────┬──────┘  └────────┬────────┘
      │                  │
      ▼                  ▼
┌───────────┐    ┌───────────────┐
│  MongoDB  │    │     Redis     │
│  :27017   │    │    :6379      │
└───────────┘    └───────────────┘
```

---

## Módulos y Funcionalidades

### Backend API (Node.js / Express / TypeScript)

- **Autenticación y Autorización** — JWT con refresh token, roles (`admin`, `doctor`, `patient`), cifrado de campos sensibles AES-256-GCM
- **Gestión de Usuarios** — CRUD completo con activación/desactivación, estadísticas por rol
- **Historiales Médicos** — Creación, actualización, sincronización offline
- **Citas Médicas** — Programación, reprogramación, cancelación, disponibilidad de doctores
- **Alertas Clínicas** — Dashboard de alertas críticas, reconocimiento, categorización
- **Prescripciones** — Gestión y seguimiento de medicamentos
- **Referidos** — Flujo completo de derivaciones entre especialistas
- **Resultados de Laboratorio** — Registro y consulta de análisis
- **Wearables** — Métricas en tiempo real vía WebSocket (FC, SpO₂, pasos)
- **Analytics Ejecutivo** — KPIs clínicos, epidemiología por distritos, predicción de brotes
- **Consentimientos Informados** — Gestión y auditoría GDPR/LOPD
- **HL7 FHIR** — Interoperabilidad con estándares internacionales de salud
- **Chat Conversacional** — Historial médico-paciente persistente
- **Swagger UI** — Documentación interactiva en `/api/docs`

### AI / ML Services (Python / FastAPI)

- **Análisis de Síntomas** — Clasificación y probabilidad de enfermedades respiratorias
- **Análisis de Imágenes Médicas** — ResNet50 para 8 tipos: radiografías, TC, espirometría, oximetría, expectoración, erupción, cianosis
- **Análisis de Audio / Tos** — 6 tipos de tos clasificados; transcripción multilingüe con Whisper
- **Chatbot Multimodal** — Integración texto + imagen + audio con OpenAI
- **Experimentos ML** — Registro, comparación y versionado de modelos
- **Monitoreo de Fairness** — Métricas de equidad en modelos clínicos
- **Rate Limiting** — Token bucket configurable por IP
- **Swagger / ReDoc** — Documentación en `/ai/docs`

### Frontend Web (React 18 / Vercel)

- **Dashboard de Estado** — Monitoreo en tiempo real de servicios, conexiones y health checks
- **Panel de Administración** — Gestión de usuarios, estadísticas por rol, creación/edición inline
- **Monitoreo de Pacientes** — WebSocket para datos de wearables en tiempo real con umbrales clínicos
- **Analytics Dashboard** — Gráficos interactivos (Recharts), dashboard ejecutivo con KPIs
- **Agenda Médica** — Calendario de citas con filtros por doctor y paciente
- **Consola de Alertas** — Visualización y reconocimiento de alertas críticas
- **Historial Médico** — Registro y edición de historiales clínicos
- **Prescripciones** — Gestión de recetas y seguimiento
- **Resultados de Laboratorio** — Visualización de análisis
- **Referidos** — Gestión de derivaciones entre especialistas
- **HL7 / FHIR** — Herramientas de interoperabilidad clínica
- **Emergencias** — Módulo de atención de emergencias médicas
- **Herramientas Admin** — Acceso integrado a MongoDB Express y Redis Commander

### App Móvil (Next.js 16 + Capacitor / Android)

- **APK nativo** — Compilable como Android APK (debug y release)
- **Offline First** — Cola de sincronización SQLite, indicadores de estado de red
- **Wearables BLE** — Conexión Bluetooth Low Energy con dispositivos médicos
- **Análisis Multimodal** — Captura de imágenes, grabación de audio, análisis en tiempo real
- **Chatbot con IA** — Asistente médico por voz, imagen y texto
- **Monitoreo de Salud** — FC, SpO₂, pasos con emulación de sensores en desarrollo
- **Geolocalización** — Para servicios de emergencia y localización
- **Biometría** — Autenticación con huella digital / Face ID (Capacitor)
- **i18n** — ES, EN (placeholders PT, FR, QU — Quechua)
- **Notificaciones Locales** — Alertas y recordatorios de citas (FCM ready)

---

## Stack Tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend Web | React, Axios, Recharts | 18.x |
| App Móvil | Next.js, Capacitor | 16.x / 6.x |
| Backend | Node.js, Express, TypeScript | 18+ / 4.x |
| AI Services | Python, FastAPI, uvicorn | 3.11+ |
| ML | PyTorch, Whisper, ResNet50, scikit-learn | — |
| Base de Datos | MongoDB | 6.0 |
| Caché | Redis | 7.x |
| Reverse Proxy | Nginx Alpine | 1.31 |
| Tunnel | Cloudflare Tunnel (cloudflared) | 2026.x |
| Contenedores | Docker, Docker Compose | — |
| CI/CD | GitHub Actions + Vercel | — |
| Cifrado | AES-256-GCM (campos sensibles) | — |

---

## Despliegue en Producción (VM Local + Cloudflare Tunnel)

### Prerrequisitos

- Docker y Docker Compose
- Git
- Conexión a internet (para Cloudflare Tunnel)

### 1. Clonar el repositorio

```bash
git clone https://github.com/Zod0808/Sistema-Web-y-M-vil-para-la-detecci-n-de-enfermedades-respiratorias-en-Tacna-en-2026.git
cd Sistema-Web-y-M-vil-para-la-detecci-n-de-enfermedades-respiratorias-en-Tacna-en-2026
```

### 2. Configurar variables de entorno

```bash
cp .env.vm .env
```

Editar `.env` con valores reales (las contraseñas de demo NO sirven en producción):

```env
MONGO_USERNAME=admin
MONGO_PASSWORD=password_seguro
REDIS_PASSWORD=redis_password
JWT_SECRET=$(openssl rand -base64 64)
JWT_REFRESH_SECRET=$(openssl rand -base64 64)
FIELD_ENCRYPTION_KEY=08Slv/UdXHuRefzQoP/URYfW9D01LZX2ONA/X1riCts=  # 32 bytes base64
CORS_ORIGINS=https://tu-frontend.vercel.app
OPENAI_API_KEY=sk-...   # opcional, para chatbot con IA
```

### 3. Levantar servicios Docker

```bash
docker compose -f docker-compose.vm.yml --env-file .env up -d
```

### 4. Instalar y levantar Cloudflare Tunnel

```bash
# Instalar cloudflared
curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o /tmp/cloudflared.deb
dpkg -i /tmp/cloudflared.deb

# Crear servicio systemd
cat > /etc/systemd/system/cloudflared-tunnel.service << 'EOF'
[Unit]
Description=Cloudflare Quick Tunnel - RespiCare
After=network.target docker.service
[Service]
Type=simple
ExecStart=/usr/bin/cloudflared tunnel --url http://localhost:80 --no-autoupdate
Restart=on-failure
RestartSec=10
[Install]
WantedBy=multi-user.target
EOF

systemctl enable --now cloudflared-tunnel

# Ver la URL del tunnel (formato: xxxx.trycloudflare.com)
journalctl -u cloudflared-tunnel | grep "trycloudflare.com"
```

### 5. Configurar Vercel

En **Vercel Dashboard → Settings → Environment Variables** (para todos los entornos):

| Variable | Valor |
|---|---|
| `REACT_APP_BACKEND_URL` | `https://TU-TUNNEL.trycloudflare.com` |
| `REACT_APP_AI_URL` | `https://TU-TUNNEL.trycloudflare.com/ai` |
| `REACT_APP_WS_URL` | `wss://TU-TUNNEL.trycloudflare.com` |

Luego **Redeploy** sin caché de build.

### 6. Verificar

```bash
curl https://TU-TUNNEL.trycloudflare.com/health
curl https://TU-TUNNEL.trycloudflare.com/ai/api/v1/health
docker ps --format "table {{.Names}}\t{{.Status}}"
```

---

## URLs del Sistema

| Servicio | URL |
|---|---|
| Frontend Web (branch alias) | `https://sistema-web-y-m-vil-para-la-detecc-git-e27aec-zod0808s-projects.vercel.app` |
| Backend Health | `https://TUNNEL/health` |
| Backend API Docs (Swagger) | `https://TUNNEL/api/docs` |
| AI Services Docs (Swagger) | `https://TUNNEL/ai/docs` |
| MongoDB Express | `https://TUNNEL/mongo-express/` |
| Redis Commander | `https://TUNNEL/redis-commander/` |

---

## Credenciales de Demo

| Rol | Email | Contraseña |
|---|---|---|
| Admin | `admin@demo.com` | `admin1234` |
| Doctor | `doctor@demo.com` | `admin1234` |
| Doctor | `laura.martinez@demo.com` | `admin1234` |
| Paciente | `juan.perez@demo.com` | `admin1234` |

---

## Desarrollo Local

```bash
# Levantar infraestructura (MongoDB + Redis + Backend + AI)
docker compose up -d

# Frontend Web (hot reload)
cd web && npm install && npm start
# → http://localhost:3000

# App Móvil (simulación web)
cd mobile/medical-app && npm install && npm run dev
# → http://localhost:8083
```

---

## Generar APK Android

```bash
cd mobile/medical-app

# Asegúrate de que .env.production tiene la URL del tunnel activo
# NEXT_PUBLIC_API_URL=https://TU-TUNNEL.trycloudflare.com/api/v1

# APK debug (para pruebas en dispositivo)
npm run apk:debug
# → android/app/build/outputs/apk/debug/app-debug.apk

# APK release (para distribución)
npm run apk:release
```

> **Nota:** La URL del tunnel cambia si `cloudflared` se reinicia. Actualiza `.env.production` y regenera el APK.

---

## Estructura del Proyecto

```
respicare/
├── backend/                    # API REST · Node.js / Express / TypeScript
│   ├── src/
│   │   ├── controllers/        # 27 rutas — auth, citas, alertas, wearables…
│   │   ├── models/             # Esquemas Mongoose con cifrado AES-256
│   │   ├── routes/             # Definición de endpoints REST
│   │   ├── middleware/         # Auth JWT, CORS, rate limiting, errorHandler
│   │   └── utils/              # Logger Winston, cifrado, AppError
│   └── Dockerfile
│
├── ai-services/                # IA / ML · Python / FastAPI
│   ├── main.py                 # App FastAPI (216 archivos Python)
│   ├── routers/                # Síntomas, audio, imágenes, chat, ML
│   ├── models/                 # ResNet50, Whisper, scikit-learn
│   └── Dockerfile.prod
│
├── web/                        # Frontend Web · React 18
│   ├── src/
│   │   ├── pages/              # 18 páginas clínicas
│   │   ├── components/         # Recharts, alertas, calendario, wearables
│   │   ├── contexts/           # AuthContext (JWT + localStorage)
│   │   └── utils/apiBase.js    # Resolución dinámica de URLs (tunnel-aware)
│   └── Dockerfile
│
├── mobile/medical-app/         # App Móvil · Next.js 16 + Capacitor
│   ├── app/                    # Páginas Next.js
│   ├── lib/api/                # Cliente HTTP con retry, offline queue (153 archivos)
│   ├── lib/services/           # BLE, SQLite, biometría, notificaciones, IA
│   ├── .env.production         # URLs de producción (tunnel Cloudflare)
│   └── capacitor.config.ts     # Config Android (appId, plugins, permisos)
│
├── nginx/
│   ├── nginx.vm.conf           # Config VM: CORS mapa, /ai/, /ws/, herramientas admin
│   └── nginx.server.conf       # Config servidor externo (Certbot SSL)
│
├── docker-compose.vm.yml       # Stack completo para VM local
├── docker-compose.server.yml   # Stack con MongoDB Atlas externo
├── docker-compose.yml          # Stack base para desarrollo
└── .env.vm                     # Plantilla de variables para VM
```

---

## Base de Datos

| Colección | Registros | Descripción |
|---|---|---|
| `users` | 15 | Admin, doctores, pacientes |
| `symptomreports` | 1.000 | Reportes de síntomas |
| `wearabledatas` | 578 | Datos de dispositivos wearable |
| `auditlogs` | 371 | Registro de auditoría del sistema |
| `chatconversations` | 124 | Historial de chat |
| `appointments` | 51 | Citas médicas |
| `aianalyses` | 46 | Resultados de análisis de IA |
| `medicalhistories` | 46 | Historiales clínicos |
| `alerts` | 43 | Alertas clínicas |
| `labresults` | 39 | Resultados de laboratorio |
| `automaticreports` | 30 | Reportes automáticos |
| `prescriptions` | 35 | Prescripciones médicas |
| `referrals` | 20 | Derivaciones médicas |
| `mlexperiments` | 20 | Experimentos de machine learning |

---

## Seguridad

- **Cifrado de campos** — AES-256-GCM en datos personales almacenados en MongoDB (`name`, `phone`)
- **JWT dual** — Access token (7d) + Refresh token (30d) con rotación
- **Rate limiting** — Token bucket en AI services; límite por IP en backend Express
- **CORS estricto** — Lista blanca por origen en nginx (regex para todos los deployments de Vercel)
- **Helmet.js** — HSTS, XSS protection, CSP, X-Frame-Options
- **Sanitización** — mongo-sanitize, xss-clean, hpp contra inyecciones
- **Auditoría completa** — 371 registros de acciones en `auditlogs`
- **Autenticación móvil** — bcrypt + NativeStorage (SharedPreferences Android) para persistencia segura

---

## Variables de Entorno Clave

### Servidor (`.env`)

```env
MONGO_USERNAME=admin
MONGO_PASSWORD=...
MONGO_DB=respicare
REDIS_PASSWORD=...
JWT_SECRET=...                   # openssl rand -base64 64
JWT_REFRESH_SECRET=...
FIELD_ENCRYPTION_KEY=...         # 32 bytes en base64 (AES-256-GCM)
CORS_ORIGINS=https://frontend.vercel.app
OPENAI_API_KEY=sk-...            # opcional
```

### Frontend Web (Vercel Environment Variables)

```env
REACT_APP_BACKEND_URL=https://TUNNEL.trycloudflare.com
REACT_APP_AI_URL=https://TUNNEL.trycloudflare.com/ai
REACT_APP_WS_URL=wss://TUNNEL.trycloudflare.com
```

### App Móvil (`mobile/medical-app/.env.production`)

```env
NEXT_PUBLIC_API_URL=https://TUNNEL.trycloudflare.com/api/v1
NEXT_PUBLIC_AI_SERVICE_URL=https://TUNNEL.trycloudflare.com/ai/api/v1
```

---

## Versión Actual

**v2.1.5** — Ver [CHANGELOG.md](./CHANGELOG.md) para el historial completo.

### Últimas mejoras de infraestructura
- ✅ Migración de datos reales desde máquina física a Docker (2.306 documentos)
- ✅ Cloudflare Tunnel para acceso externo sin port forwarding ni dominio de pago
- ✅ MongoDB Express y Redis Commander accesibles desde el frontend
- ✅ CORS unificado en nginx — elimina headers duplicados de backend y AI service
- ✅ Dashboard con estado de servicios backend y AI en tiempo real
- ✅ Swagger UI funcional para backend (`/api/docs`) y AI services (`/ai/docs`)
- ✅ Panel de Administración con contadores reales de usuarios, doctores y pacientes
- ✅ App móvil configurada con URLs de producción para APK

---

## Licencia

MIT — ver [LICENSE](./LICENSE)

---

*RespiCare — Universidad Privada de Tacna · Fabian Chavez · 2026*
