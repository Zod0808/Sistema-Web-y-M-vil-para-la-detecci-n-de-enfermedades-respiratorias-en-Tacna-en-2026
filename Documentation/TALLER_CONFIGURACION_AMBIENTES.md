# TALLER DE CONFIGURACIÓN DE AMBIENTES
## RespiCare — Sistema Integral de Gestión de Enfermedades Respiratorias

**Proyecto:** RespiCare  
**Versión del documento:** 1.0.0  
**Fecha:** 2026-05-21  
**Autor:** Cesar Fabian Chávez Linares — 2019063854  
**Curso:** Construcción de Software I  
**Docente:** Ing. Alberto Flor Rodríguez  

> **Propósito:** Este documento permite a un ingeniero de operaciones desplegar, verificar y revertir el sistema RespiCare en cualquiera de sus dos entornos (desarrollo / producción) **sin necesidad de consultar al equipo de desarrollo.** Todos los comandos son reproducibles y están verificados contra el estado actual del repositorio.

---

## ÍNDICE

1. [Principio de Separación de Ambientes](#1-principio-de-separación-de-ambientes)
2. [Paso 1 — Topología y Dependencias (Mini-SBOM)](#2-paso-1--topología-y-dependencias-mini-sbom)
3. [Paso 2 — Variables de Entorno](#3-paso-2--variables-de-entorno)
4. [Paso 3 — Asignación de Recursos Físicos](#4-paso-3--asignación-de-recursos-físicos)
5. [Procedimiento de Despliegue](#5-procedimiento-de-despliegue)
6. [Validación y Auditoría](#6-validación-y-auditoría)
7. [Procedimiento de Rollback](#7-procedimiento-de-rollback)
8. [Apéndices](#8-apéndices)

---

## 1. PRINCIPIO DE SEPARACIÓN DE AMBIENTES

**RespiCare opera bajo separación estricta entre Development y Production.** Ningún componente, volumen, red, secreto ni base de datos es compartido entre ambos entornos. El siguiente diagrama muestra la segregación:

```
┌──────────────────────────────────────────────────────────────────────┐
│                    SEPARACIÓN DE AMBIENTES RESPICARE                 │
├─────────────────────────────┬────────────────────────────────────────┤
│   DESARROLLO (DEV)          │   PRODUCCIÓN (PROD)                    │
│   Archivo: docker-compose   │   Archivo: docker-compose.prod.yml     │
│           .dev.yml          │                                        │
├─────────────────────────────┼────────────────────────────────────────┤
│  Red: respicare-dev-network │  Red: respicare-prod-network           │
│  BD:  respicare_dev         │  BD:  respicare                        │
│  Puerto MongoDB: 27018      │  Puerto MongoDB: 127.0.0.1:27017       │
│  Puerto Redis: 6379 (pub.)  │  Puerto Redis: 127.0.0.1:6379 (priv.) │
│  Logs: json-file / 10m×5   │  Logs: json-file / 10m×5 + rotación   │
│  Secrets: valores por def.  │  Secrets: SOLO desde variables de env. │
│  Admin UI: Mongo Express    │  Admin UI: DESHABILITADA               │
│           Redis Commander   │                                        │
│  Debugger: puerto 9229 abt. │  Debugger: DESHABILITADO               │
│  Hot-reload: ACTIVO         │  Hot-reload: DESACTIVADO               │
│  Rate-limit: DESACTIVADO    │  Rate-limit: ACTIVO (20 req/s AI)      │
└─────────────────────────────┴────────────────────────────────────────┘
```

### Regla de Oro
> **Nunca** ejecutar `docker-compose.prod.yml` apuntando a un `.env` de desarrollo, ni viceversa.  
> **Nunca** exponer puertos de base de datos en producción sin `127.0.0.1:` como prefijo (bind local).  
> **Nunca** incluir valores reales de producción en el repositorio Git.

---

## 2. PASO 1 — TOPOLOGÍA Y DEPENDENCIAS (MINI-SBOM)

### 2.1 Diagrama de Servicios y Comunicación

```
                         ╔══════════ INTERNET ═══════════╗
                         ║   :80 (HTTP → redirige HTTPS) ║
                         ║   :443 (HTTPS, prod solamente)║
                         ╚══════════════╤════════════════╝
                                        │
                          ┌─────────────▼─────────────┐
                          │       NGINX (Proxy)        │
                          │   nginx:alpine             │
                          │   Puerto externo: 80/443   │
                          └──┬────────┬──────────┬─────┘
                             │        │          │
               ┌─────────────▼──┐  ┌──▼──────┐  ┌▼──────────────┐
               │  Web Frontend  │  │ Backend │  │  AI Services  │
               │  React 18      │  │ Node.js │  │  Python 3.11  │
               │  (nginx:alpine)│  │ :3001   │  │  FastAPI :8000│
               │  Expose: 80    │  │         │  │  Expose: 8000 │
               └────────────────┘  └────┬────┘  └──────┬────────┘
                                        │               │
                          ┌─────────────▼───────────────▼────────┐
                          │                                       │
               ┌───────────▼──────────┐        ┌─────────────────▼──┐
               │   MongoDB 6.0        │        │    Redis 7-alpine   │
               │   respicare_dev /    │        │    Cache + Sesiones │
               │   respicare (prod)   │        │    :6379            │
               │   Vol: mongodb_*_data│        │    Vol: redis_*_data│
               └──────────────────────┘        └────────────────────┘
```

**Nodos solo presentes en DEV:**
```
┌─────────────────────┐   ┌─────────────────────────┐
│  Mongo Express      │   │  Redis Commander         │
│  :8081              │   │  :8082                   │
│  Admin visual de BD │   │  Admin visual de caché   │
└─────────────────────┘   └─────────────────────────┘
```

**Nodos solo presentes en PROD:**
```
┌─────────────────────┐   ┌─────────────────────────┐
│  Certbot            │   │  Backup Service          │
│  SSL/TLS automático │   │  mongodump diario        │
│  Let's Encrypt      │   │  Retención: 30 días      │
└─────────────────────┘   └─────────────────────────┘
```

---

### 2.2 Mini-SBOM — Inventario Completo de Dependencias de Infraestructura

| # | Servicio | Imagen / Runtime | Versión | Rol | Entorno |
|---|---|---|---|---|---|
| 1 | **MongoDB** | `mongo` | `6.0` | Base de datos principal (documentos clínicos) | DEV + PROD |
| 2 | **Redis** | `redis` | `7-alpine` | Caché distribuida, sesiones, colas de alertas | DEV + PROD |
| 3 | **Backend API** | `node` | `18-alpine` | REST API + WebSockets (Express, TypeScript) | DEV + PROD |
| 4 | **AI Services** | `python` | `3.11-slim` | Motor ML/NLP/Audio/Vision (FastAPI) | DEV + PROD |
| 5 | **Web Frontend** | `node:18-alpine` → `nginx:alpine` | `18` / `1.25` | Dashboard React 18 (build estático servido por nginx) | DEV + PROD |
| 6 | **Nginx** | `nginx` | `alpine` | Reverse proxy, SSL termination, rate limiting | DEV + PROD |
| 7 | **Mongo Express** | `mongo-express` | `latest` | Interfaz de administración MongoDB | **Solo DEV** |
| 8 | **Redis Commander** | `rediscommander/redis-commander` | `latest` | Interfaz de administración Redis | **Solo DEV** |
| 9 | **Certbot** | `certbot/certbot` | `latest` | Renovación automática SSL/TLS (Let's Encrypt) | **Solo PROD** |
| 10 | **Backup** | `mongo:6.0` | `6.0` | Backup diario con `mongodump` y retención 30 días | **Solo PROD** |

### 2.3 Dependencias Lógicas y Orden de Arranque

```
ORDEN DE INICIO OBLIGATORIO:

Nivel 0 (sin dependencias):
  └─► mongodb   ──► healthcheck: mongosh ping
  └─► redis     ──► healthcheck: redis-cli ping

Nivel 1 (requiere Nivel 0 healthy):
  └─► ai-services  ──► depends_on: mongodb ✓, redis ✓
                       healthcheck: GET /api/v1/health → 200

Nivel 2 (requiere Nivel 1 healthy en PROD / started en DEV):
  └─► backend      ──► depends_on: mongodb ✓, redis ✓, ai-services ✓(prod)/started(dev)
                       healthcheck: GET /health → 200

Nivel 3 (requiere Nivel 2 healthy):
  └─► nginx        ──► depends_on: backend ✓, web ✓
  └─► web          ──► depends_on: backend started

Nivel 4 (proceso paralelo independiente):
  └─► certbot      ──► renovación cada 12h (solo PROD)
  └─► backup       ──► mongodump cada 24h (solo PROD)
  └─► mongo-express──► admin visual (solo DEV)
  └─► redis-commander─► admin visual (solo DEV)
```

### 2.4 Versiones de Dependencias de Aplicación (Runtime)

| Tecnología | Versión | Archivo de bloqueo |
|---|---|---|
| Node.js | 18.x LTS | `backend/package-lock.json` |
| TypeScript | 5.3.x | `backend/tsconfig.json` |
| Express | 4.21.x | `backend/package.json` |
| Mongoose | 7.x | `backend/package.json` |
| Python | 3.11.x | `ai-services/requirements.txt` |
| FastAPI | 0.104.x | `ai-services/requirements.txt` |
| React | 18.x | `web/package-lock.json` |
| TensorFlow/Keras | 2.x | `ai-services/requirements.txt` |
| XGBoost | 2.0.x | `ai-services/requirements.txt` |

---

## 3. PASO 2 — VARIABLES DE ENTORNO

> **REGLA DE SEGURIDAD:** Los valores marcados con 🔒 **NUNCA** deben tener valores reales en el repositorio. Se configuran exclusivamente en el servidor de destino mediante el archivo `.env` que **no está versionado** (figura en `.gitignore`).

### 3.1 Tabla Maestra de Variables — Mapeo Completo

| Variable | Servicio | DEV (valor por defecto) | PROD (obligatorio, sin default) | Categoría |
|---|---|---|---|---|
| `NODE_ENV` | Backend | `development` | `production` | App |
| `PORT` | Backend | `3001` | `3001` | App |
| `HOST` | Backend | `0.0.0.0` | `0.0.0.0` | App |
| `MONGO_USERNAME` | MongoDB, Backend, AI | `admin` | 🔒 sin default | DB |
| `MONGO_PASSWORD` | MongoDB, Backend, AI | `password123` | 🔒 sin default | DB |
| `MONGO_DB` | MongoDB, Backend, AI | `respicare_dev` | `respicare` | DB |
| `MONGODB_URI` | Backend, AI | *(construida desde las anteriores)* | 🔒 sin default | DB |
| `REDIS_URL` | Backend, AI | `redis://redis:6379` | 🔒 con password | Cache |
| `REDIS_PASSWORD` | Redis (PROD) | *(sin auth en DEV)* | 🔒 sin default | Cache |
| `JWT_SECRET` | Backend | `dev-secret-key-change-in-production` | 🔒 sin default | Security |
| `JWT_REFRESH_SECRET` | Backend | `dev-refresh-secret-change-in-production` | 🔒 sin default | Security |
| `JWT_EXPIRE` | Backend | `7d` | `7d` | Security |
| `JWT_REFRESH_EXPIRE` | Backend | `30d` | `30d` | Security |
| `FIELD_ENCRYPTION_KEY` | Backend | *(clave AES-256 de dev)* | 🔒 sin default | Security |
| `OPENAI_API_KEY` | AI Services | *(vacío / sk-test)* | 🔒 sin default | AI |
| `CORS_ORIGINS` | Backend, AI | `http://localhost:3000,http://localhost:8083` | URL real de producción | Network |
| `SMTP_HOST` | Backend | `mailhog` (local) | Servidor SMTP real | Email |
| `SMTP_PORT` | Backend | `1025` | `587` | Email |
| `SMTP_USER` | Backend | `dev@respicare.local` | 🔒 sin default | Email |
| `SMTP_PASS` | Backend | `dev` | 🔒 sin default | Email |
| `FROM_EMAIL` | Backend | `noreply@respicare.local` | `noreply@respicare.tacna` | Email |
| `PUSH_PROVIDER` | Backend | `none` | `expo` | Push |
| `PUSH_API_KEY` | Backend | *(vacío)* | 🔒 sin default | Push |
| `LOG_LEVEL` | Backend, AI | `debug` | `info` | Logging |
| `AI_RATE_LIMIT_ENABLED` | AI Services | `0` (desactivado) | `1` (activado) | AI |
| `AI_RATE_LIMIT_CAPACITY` | AI Services | `1000` | `500` | AI |
| `AI_RATE_LIMIT_REFILL_PER_SEC` | AI Services | `100.0` | `20.0` | AI |
| `REACT_APP_BACKEND_URL` | Web (build-time) | `http://localhost:3001` | URL pública del backend | Frontend |
| `REACT_APP_WS_URL` | Web (build-time) | `ws://localhost:3001` | URL WebSocket de producción | Frontend |
| `REACT_APP_AI_URL` | Web (build-time) | `http://localhost:8000` | URL pública del AI service | Frontend |
| `BACKUP_RETENTION_DAYS` | Backup | N/A | `30` | Ops |
| `ME_COOKIE_SECRET` | Mongo Express | `respicare-cookie-secret` | N/A (solo DEV) | DEV only |

---

### 3.2 Archivo `.env` para Desarrollo

> Guardar como `.env` en la raíz del repositorio. **No versionarlo.**

```dotenv
# ================================================================
# RESPICARE — VARIABLES DE ENTORNO: DESARROLLO
# Ambiente: Development
# Archivo: .env (no versionado — ver .gitignore)
# ================================================================

# --- APLICACIÓN ---
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# --- BASE DE DATOS MONGODB ---
MONGO_USERNAME=admin
MONGO_PASSWORD=password123
MONGO_DB=respicare_dev
MONGODB_URI=mongodb://admin:password123@mongodb:27017/respicare_dev?authSource=admin

# --- REDIS ---
REDIS_URL=redis://redis:6379
# REDIS_PASSWORD no requerida en DEV

# --- SEGURIDAD (JWT) ---
# NOTA: Estos valores son solo para desarrollo. NUNCA usar en producción.
JWT_SECRET=dev-secret-key-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d

# --- CIFRADO DE CAMPOS (AES-256) ---
# Generar con: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
FIELD_ENCRYPTION_KEY=08Slv/UdXHuRefzQoP/URYfW9D01LZX2ONA/X1riCts=

# --- IA / OPENAI ---
OPENAI_API_KEY=sk-your-test-key-here
AI_RATE_LIMIT_ENABLED=0
AI_RATE_LIMIT_CAPACITY=1000
AI_RATE_LIMIT_REFILL_PER_SEC=100.0
AI_MAX_BODY_BYTES=4194304

# --- EMAIL (MailHog local) ---
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_USER=dev@respicare.local
SMTP_PASS=dev
FROM_EMAIL=noreply@respicare.local

# --- CORS ---
CORS_ORIGINS=http://localhost:3000,http://localhost:8083

# --- LOGGING ---
LOG_LEVEL=debug

# --- FRONTEND (React build-time) ---
REACT_APP_BACKEND_URL=http://localhost:3001
REACT_APP_WS_URL=ws://localhost:3001
REACT_APP_AI_URL=http://localhost:8000

# --- MONGO EXPRESS (Admin DEV) ---
ME_COOKIE_SECRET=respicare-cookie-secret-dev
ME_USERNAME=admin
ME_PASSWORD=admin123

# --- PUSH NOTIFICATIONS (desactivado en DEV) ---
PUSH_PROVIDER=none
PUSH_API_KEY=
PUSH_PROJECT_ID=
```

---

### 3.3 Plantilla `.env.production` para Producción

> Crear manualmente en el servidor de producción. **Nunca** subirla al repositorio.  
> Los valores marcados `[COMPLETAR]` son obligatorios y deben ser generados/obtenidos antes del despliegue.

```dotenv
# ================================================================
# RESPICARE — VARIABLES DE ENTORNO: PRODUCCIÓN
# Ambiente: Production
# Ubicación: /opt/respicare/.env.production (en el servidor)
# Permisos: chmod 600 .env.production
# ================================================================

# --- APLICACIÓN ---
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# --- BASE DE DATOS MONGODB ---
# Generar contraseña: openssl rand -base64 24
MONGO_USERNAME=respicare_prod
MONGO_PASSWORD=[COMPLETAR — mínimo 24 caracteres]
MONGO_DB=respicare
MONGODB_URI=mongodb://respicare_prod:[COMPLETAR]@mongodb:27017/respicare?authSource=admin

# --- REDIS ---
# Generar contraseña: openssl rand -base64 24
REDIS_PASSWORD=[COMPLETAR — mínimo 24 caracteres]
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379

# --- SEGURIDAD (JWT) ---
# Generar: openssl rand -base64 64
JWT_SECRET=[COMPLETAR — mínimo 64 caracteres]
JWT_REFRESH_SECRET=[COMPLETAR — mínimo 64 caracteres]
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d

# --- CIFRADO DE CAMPOS (AES-256-CBC) ---
# Generar: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
FIELD_ENCRYPTION_KEY=[COMPLETAR — clave AES-256 en base64]

# --- IA / OPENAI ---
OPENAI_API_KEY=[COMPLETAR — sk-...]
AI_RATE_LIMIT_ENABLED=1
AI_RATE_LIMIT_CAPACITY=500
AI_RATE_LIMIT_REFILL_PER_SEC=20.0
AI_MAX_BODY_BYTES=4194304

# --- EMAIL (SMTP real) ---
SMTP_HOST=[COMPLETAR — ej: smtp.gmail.com]
SMTP_PORT=587
SMTP_USER=[COMPLETAR — correo de servicio]
SMTP_PASS=[COMPLETAR — contraseña de app SMTP]
FROM_EMAIL=noreply@respicare.tacna

# --- CORS ---
CORS_ORIGINS=https://respicare.tacna,https://www.respicare.tacna

# --- LOGGING ---
LOG_LEVEL=info

# --- FRONTEND (React build-time) ---
REACT_APP_BACKEND_URL=https://respicare.tacna
REACT_APP_WS_URL=wss://respicare.tacna
REACT_APP_AI_URL=

# --- PUSH NOTIFICATIONS ---
PUSH_PROVIDER=expo
PUSH_API_KEY=[COMPLETAR]
PUSH_PROJECT_ID=[COMPLETAR]

# --- BACKUP ---
BACKUP_RETENTION_DAYS=30
```

### 3.4 Comandos para Generar Secretos de Producción

```bash
# 1. Contraseña de MongoDB
openssl rand -base64 24

# 2. Contraseña de Redis
openssl rand -base64 24

# 3. JWT Secret (64 bytes)
openssl rand -base64 64

# 4. JWT Refresh Secret (64 bytes)
openssl rand -base64 64

# 5. Clave AES-256 para cifrado de campos
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Ejecutar todos en secuencia y copiar los resultados al .env.production
```

---

## 4. PASO 3 — ASIGNACIÓN DE RECURSOS FÍSICOS

### 4.1 Límites de CPU y Memoria por Servicio

#### Entorno de DESARROLLO

| Servicio | CPU Límite | CPU Reserva | Memoria Límite | Memoria Reserva | Notas |
|---|---|---|---|---|---|
| `mongodb` | Sin límite Docker | — | Sin límite Docker | — | Limitar en host si necesario |
| `redis` | Sin límite Docker | — | `256 MB` (maxmemory) | — | Política: allkeys-lru en PROD |
| `ai-services` | `2 CPUs` | `0.5 CPUs` | `4 GB` | `1 GB` | Modelos ML en memoria |
| `backend` | Sin límite Docker | — | Sin límite Docker | — | Node.js gestiona su heap |
| `web` | Sin límite Docker | — | Sin límite Docker | — | Build-time solamente en PROD |
| `mongo-express` | Sin límite Docker | — | Sin límite Docker | — | Solo DEV |
| `redis-commander` | Sin límite Docker | — | Sin límite Docker | — | Solo DEV |

**Mínimo recomendado para máquina de desarrollo:**
```
CPU:  4 núcleos físicos
RAM:  8 GB (16 GB recomendado para modelos ML)
Disk: 20 GB libres (modelos + datos + logs)
SO:   Windows 10/11 + Docker Desktop ≥ 4.x
      o Linux con Docker Engine ≥ 24.x
```

---

#### Entorno de PRODUCCIÓN

| Servicio | CPU Límite | CPU Reserva | Memoria Límite | Memoria Reserva | `restart` |
|---|---|---|---|---|---|
| `mongodb` | Sin límite Docker | — | Sin límite Docker | — | `always` |
| `redis` | Sin límite Docker | — | `256 MB` (redis conf) | — | `always` |
| `ai-services` | `4 CPUs` | `2 CPUs` | `8 GB` | `4 GB` | `always` |
| `backend` | `1 CPU` | `0.5 CPUs` | `1 GB` | `512 MB` | `always` |
| `web` | Sin límite Docker | — | Sin límite Docker | — | `always` |
| `nginx` | Sin límite Docker | — | Sin límite Docker | — | `always` |
| `certbot` | Sin límite Docker | — | Sin límite Docker | — | bajo demanda |
| `backup` | Sin límite Docker | — | Sin límite Docker | — | `unless-stopped` |

**Mínimo recomendado para servidor de producción:**
```
CPU:  8 vCPUs (para ai-services con 4 CPUs de límite)
RAM:  16 GB (8 GB AI + 1 GB Backend + OS + overhead)
Disk: 100 GB SSD
      ├── /opt/respicare/      → código: 5 GB
      ├── /var/lib/docker/     → volúmenes: 40 GB
      └── /opt/respicare/backups/ → backups: 55 GB
SO:   Ubuntu 22.04 LTS + Docker Engine 24.x
Red:  IP pública + dominio DNS configurado
      Puertos abiertos: 80/TCP, 443/TCP
      Puertos cerrados al exterior: 27017, 6379, 3001, 8000
```

### 4.2 Configuración de Volúmenes Docker

```
DESARROLLO — Volúmenes nombrados:
├── mongodb_dev_data      → Datos de MongoDB DEV
├── redis_dev_data        → Datos de Redis DEV
├── ai_models_dev         → Modelos de ML (descarga única)
├── ai_cache_dev          → Caché de inferencia AI
├── ai_logs_dev           → Logs del servicio AI
├── backend_logs_dev      → Logs del backend
└── web_node_modules      → node_modules del frontend

PRODUCCIÓN — Volúmenes nombrados:
├── mongodb_prod_data     → Datos de MongoDB PROD ⚠️ crítico
├── mongodb_config        → Configuración de MongoDB
├── redis_prod_data       → Datos de Redis PROD
├── ai_models_prod        → Modelos de ML producción
├── ai_cache_prod         → Caché de inferencia AI
├── ai_logs_prod          → Logs AI (10m × 5 archivos)
├── backend_logs_prod     → Logs backend (10m × 5 archivos)
├── backend_uploads_prod  → Archivos subidos por usuarios
└── nginx_logs_prod       → Logs de acceso y error nginx

BIND MOUNTS (producción — directorios del host):
├── ./nginx/nginx.conf    → Configuración nginx (solo lectura)
├── ./nginx/ssl/          → Certificados SSL (solo lectura)
├── ./certbot/conf/       → Let's Encrypt config
├── ./certbot/www/        → Challenge files ACME
└── ./backups/mongodb/    → Backups diarios de MongoDB
```

### 4.3 Puertos Expuestos por Entorno

```
DESARROLLO:
┌─────────┬───────────────┬──────────────────────────────────┐
│ Puerto  │ Servicio      │ Acceso                           │
├─────────┼───────────────┼──────────────────────────────────┤
│ 3000    │ Web Frontend  │ http://localhost:3000            │
│ 3001    │ Backend API   │ http://localhost:3001            │
│ 8000    │ AI Services   │ http://localhost:8000/docs       │
│ 27018   │ MongoDB       │ mongodb://localhost:27018 (DEV)  │
│ 6379    │ Redis         │ redis://localhost:6379           │
│ 8081    │ Mongo Express │ http://localhost:8081            │
│ 8082    │ Redis Cmdr    │ http://localhost:8082            │
│ 9229    │ Node debugger │ chrome://inspect                 │
└─────────┴───────────────┴──────────────────────────────────┘

PRODUCCIÓN:
┌─────────────────────┬───────────────┬────────────────────────────────┐
│ Puerto              │ Servicio      │ Acceso                         │
├─────────────────────┼───────────────┼────────────────────────────────┤
│ 0.0.0.0:80          │ Nginx HTTP    │ Público — redirige a 443       │
│ 0.0.0.0:443         │ Nginx HTTPS   │ Público — entrada principal    │
│ 127.0.0.1:3001      │ Backend API   │ Solo interno — via nginx       │
│ 127.0.0.1:27017     │ MongoDB       │ Solo local — sin acceso externo│
│ 127.0.0.1:6379      │ Redis         │ Solo local — con contraseña    │
│ (interno) 8000      │ AI Services   │ Solo red interna Docker        │
│ (interno) 80        │ Web container │ Solo red interna Docker        │
└─────────────────────┴───────────────┴────────────────────────────────┘
```

---

## 5. PROCEDIMIENTO DE DESPLIEGUE

### 5.1 Despliegue en DESARROLLO

```bash
# PREREQUISITOS:
# - Docker Desktop ≥ 4.x instalado y ejecutando
# - Git instalado
# - Repositorio clonado

# ── PASO 1: Clonar el repositorio ──────────────────────────────────
git clone <url-del-repositorio>
cd proyecto-final-sistema_enfermedades_respiratorias

# ── PASO 2: Crear archivo de variables de entorno ──────────────────
# Copiar la plantilla y editarla (ver Sección 3.2)
cp env.example .env
# No es necesario editar para el primer arranque DEV — los defaults funcionan

# ── PASO 3: Arrancar todos los servicios ───────────────────────────
docker compose -f docker-compose.dev.yml up -d --build

# ── PASO 4: Verificar que todos los servicios están saludables ─────
docker compose -f docker-compose.dev.yml ps

# Salida esperada (todos en estado "healthy" o "running"):
# NAME                         STATUS
# respicare-mongodb-dev        Up X minutes (healthy)
# respicare-redis-dev          Up X minutes (healthy)
# respicare-ai-dev             Up X minutes (healthy)
# respicare-backend-dev        Up X minutes
# respicare-web-dev            Up X minutes (healthy)
# respicare-mongo-express-dev  Up X minutes
# respicare-redis-commander    Up X minutes

# ── PASO 5: Cargar datos de demostración ───────────────────────────
docker exec respicare-backend-dev \
  node src/scripts/seed-complete-system.js

# ── PASO 6: Verificar acceso ───────────────────────────────────────
# Frontend:    http://localhost:3000
# API:         http://localhost:3001/health
# AI Docs:     http://localhost:8000/docs
# Mongo Admin: http://localhost:8081  (admin/admin123)
# Redis Admin: http://localhost:8082
```

---

### 5.2 Despliegue en PRODUCCIÓN

```bash
# PREREQUISITOS:
# - Servidor Ubuntu 22.04 LTS con 8 vCPUs / 16 GB RAM
# - Docker Engine 24.x instalado (NO Docker Desktop)
# - Dominio DNS configurado apuntando a la IP del servidor
# - Puertos 80 y 443 abiertos en el firewall
# - Repositorio clonado en /opt/respicare

# ── PASO 1: Preparar directorio de trabajo ─────────────────────────
sudo mkdir -p /opt/respicare
cd /opt/respicare
git clone <url-del-repositorio> .

# ── PASO 2: Crear y proteger el archivo de variables de producción ─
# Copiar plantilla de la sección 3.3 a este archivo
sudo nano .env.production
# Completar todos los campos marcados [COMPLETAR]

# Restringir permisos: solo el propietario puede leer
sudo chmod 600 .env.production
sudo chown root:root .env.production

# ── PASO 3: Crear directorios de datos ─────────────────────────────
sudo mkdir -p backups/mongodb
sudo mkdir -p nginx/ssl
sudo mkdir -p certbot/conf
sudo mkdir -p certbot/www

# ── PASO 4: Obtener certificado SSL (primera vez) ──────────────────
# Debe estar el DNS ya propagado antes de este paso

# Iniciar nginx en modo HTTP para el challenge ACME:
docker compose -f docker-compose.prod.yml --env-file .env.production \
  up -d nginx

# Solicitar certificado:
docker run --rm \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  certbot/certbot certonly \
  --webroot --webroot-path /var/www/certbot \
  -d respicare.tacna -d www.respicare.tacna \
  --email admin@respicare.tacna \
  --agree-tos --no-eff-email

# ── PASO 5: Habilitar bloque HTTPS en nginx.conf ───────────────────
# Editar nginx/nginx.conf:
# - Descomentar el bloque "server { listen 443 ssl... }"
# - Cambiar server_name al dominio real
# - Activar el return 301 https en el bloque HTTP

# ── PASO 6: Construir y arrancar todos los servicios ───────────────
docker compose -f docker-compose.prod.yml --env-file .env.production \
  up -d --build

# ── PASO 7: Verificar estado de todos los servicios ────────────────
docker compose -f docker-compose.prod.yml ps

# Todos deben mostrar "Up" con "(healthy)" en los servicios con healthcheck

# ── PASO 8: Verificar logs iniciales (primeros 2 minutos) ──────────
docker compose -f docker-compose.prod.yml logs --follow --tail=50

# ── PASO 9: Verificar acceso HTTPS ─────────────────────────────────
curl -I https://respicare.tacna/health
# Respuesta esperada: HTTP/2 200

curl -I https://respicare.tacna/api/v1/health
# Respuesta esperada: HTTP/2 200

curl -I https://respicare.tacna/ai/api/v1/health
# Respuesta esperada: HTTP/2 200
```

---

## 6. VALIDACIÓN Y AUDITORÍA

### 6.1 Auditoría Funcional (FCA) — Verificación de Dependencias Lógicas

**FCA-01: ¿MongoDB está aceptando conexiones y autenticación?**
```bash
# DEV
docker exec respicare-mongodb-dev \
  mongosh --username admin --password password123 \
  --authenticationDatabase admin --eval "db.adminCommand('ping')"
# Esperado: { ok: 1 }

# PROD
docker exec respicare-mongodb-prod \
  mongosh --username respicare_prod --password $MONGO_PASSWORD \
  --authenticationDatabase admin --eval "db.adminCommand('ping')"
# Esperado: { ok: 1 }
```

**FCA-02: ¿Redis responde y requiere autenticación en producción?**
```bash
# DEV — sin autenticación
docker exec respicare-redis-dev redis-cli ping
# Esperado: PONG

# PROD — con autenticación obligatoria
docker exec respicare-redis-prod \
  redis-cli -a $REDIS_PASSWORD ping
# Esperado: PONG
# Si responde sin password: fallo de seguridad CRÍTICO
```

**FCA-03: ¿El Backend API reporta salud correctamente?**
```bash
# DEV
curl -s http://localhost:3001/health | jq .
# Esperado: {"status":"ok","timestamp":"...","services":{"mongodb":"connected","redis":"connected"}}

# PROD
curl -s https://respicare.tacna/health | jq .
# Esperado: mismo formato con HTTPS
```

**FCA-04: ¿Los Servicios de IA cargan todos los modelos ML?**
```bash
# DEV / PROD
curl -s http://localhost:8000/api/v1/health | jq .
# Esperado:
# {
#   "status": "healthy",
#   "models": {
#     "random_forest": "loaded",
#     "xgboost": "loaded",
#     "neural_network": "loaded"
#   }
# }
```

**FCA-05: ¿Las versiones de los servicios coinciden con el SBOM?**
```bash
# Verificar versión de MongoDB
docker exec respicare-mongodb-dev mongosh --eval "db.version()"
# Esperado: 6.0.x

# Verificar versión de Redis
docker exec respicare-redis-dev redis-cli info server | grep redis_version
# Esperado: redis_version:7.x.x

# Verificar versión de Node.js
docker exec respicare-backend-dev node --version
# Esperado: v18.x.x

# Verificar versión de Python
docker exec respicare-ai-dev python --version
# Esperado: Python 3.11.x
```

**FCA-06: ¿El frontend puede comunicarse con el backend? (smoke test de integración)**
```bash
# Probar autenticación end-to-end
curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@demo.com","password":"demo1234"}' | jq .token

# Esperado: string JWT (no null, no error)
```

---

### 6.2 Auditoría Física — Verificación de Recursos

**AFS-01: ¿Los límites de recursos están aplicados?**
```bash
# Verificar CPU y memoria asignadas al servicio AI
docker inspect respicare-ai-dev \
  --format='CPU: {{.HostConfig.NanoCpus}} | Mem: {{.HostConfig.Memory}}'

# PROD — verificar ai-services
docker inspect respicare-ai-prod \
  --format='CPU: {{.HostConfig.NanoCpus}} | Mem: {{.HostConfig.Memory}}'
# Esperado aprox: CPU: 4000000000 | Mem: 8589934592 (8 GB)
```

**AFS-02: ¿Los puertos de producción están solo en localhost?**
```bash
# En el servidor de PRODUCCIÓN — verificar que MongoDB y Redis
# NO están expuestos al exterior
ss -tlnp | grep -E '27017|6379'

# Resultado correcto:
# 127.0.0.1:27017 → BIEN (solo local)
# 127.0.0.1:6379  → BIEN (solo local)

# Resultado incorrecto (fallo de seguridad):
# 0.0.0.0:27017 → MAL (expuesto al exterior)
# 0.0.0.0:6379  → MAL (expuesto al exterior)
```

**AFS-03: ¿Los volúmenes de producción existen y tienen datos?**
```bash
docker volume ls | grep prod
# Esperado: listar mongodb_prod_data, redis_prod_data, etc.

docker system df -v | grep prod
# Verifica el espacio utilizado por cada volumen
```

**AFS-04: ¿El espacio en disco es suficiente?**
```bash
df -h /var/lib/docker
# Recomendación: mínimo 40 GB disponibles en producción

du -sh /opt/respicare/backups/
# Verificar que los backups no consumen todo el espacio
```

---

### 6.3 Auditoría de Seguridad

**SEC-01: ¿Los secretos de producción están excluidos del código fuente?**
```bash
# Verificar que .env.production NO está versionado
git ls-files .env.production
# Esperado: (sin salida — el archivo no está rastreado)

git ls-files .env
# Esperado: (sin salida — el archivo no está rastreado)

# Verificar el .gitignore
grep -E "^\.env" .gitignore
# Esperado: .env y .env.production aparecen en .gitignore
```

**SEC-02: ¿No hay valores de producción hardcodeados en docker-compose?**
```bash
# Buscar posibles secretos hardcodeados en docker-compose.prod.yml
grep -v '${' docker-compose.prod.yml | \
  grep -iE 'password|secret|key|token' | \
  grep -v '#'

# Si el comando devuelve líneas con valores reales → FALLO DE SEGURIDAD
# En docker-compose.prod.yml todos los secretos deben usar ${VAR}
```

**SEC-03: ¿Los headers de seguridad HTTP están activos en nginx?**
```bash
# PROD
curl -sI https://respicare.tacna | \
  grep -E 'X-Frame-Options|X-Content-Type|X-XSS|Referrer-Policy'

# Esperado (todas deben aparecer):
# X-Frame-Options: SAMEORIGIN
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
# Referrer-Policy: no-referrer-when-downgrade
```

**SEC-04: ¿La autenticación Redis funciona en producción?**
```bash
# Intentar acceder sin contraseña — DEBE fallar
docker exec respicare-redis-prod redis-cli ping
# Esperado: NOAUTH Authentication required

# Acceder con contraseña correcta — DEBE funcionar
docker exec respicare-redis-prod \
  redis-cli -a $REDIS_PASSWORD ping
# Esperado: PONG
```

**SEC-05: ¿El backend corre como usuario no-root?**
```bash
docker exec respicare-backend-prod whoami
# Esperado: nodejs  (NO root)

docker exec respicare-backend-dev whoami
# En DEV el usuario puede ser root; en PROD NO debe serlo.
```

**SEC-06: ¿TLS está correctamente configurado?**
```bash
# Verificar versiones TLS soportadas (solo PROD)
openssl s_client -connect respicare.tacna:443 -tls1 2>/dev/null
# TLS 1.0 → debe RECHAZAR la conexión

openssl s_client -connect respicare.tacna:443 -tls1_2 2>/dev/null | \
  grep -E "Protocol|Cipher"
# Esperado: Protocol: TLSv1.2 o TLSv1.3

# Verificar certificado no vencido
echo | openssl s_client -connect respicare.tacna:443 2>/dev/null | \
  openssl x509 -noout -dates
# notAfter debe ser fecha futura
```

---

### 6.4 Checklist de Auditoría (Formato Operacional)

| ID | Verificación | Herramienta | DEV OK | PROD OK |
|---|---|---|---|---|
| FCA-01 | MongoDB responde y autentica | `mongosh ping` | ☐ | ☐ |
| FCA-02 | Redis responde (PROD: con auth) | `redis-cli ping` | ☐ | ☐ |
| FCA-03 | Backend `/health` → 200 | `curl` | ☐ | ☐ |
| FCA-04 | AI models cargados | `curl /api/v1/health` | ☐ | ☐ |
| FCA-05 | Versiones coinciden con SBOM | `docker exec` | ☐ | ☐ |
| FCA-06 | Login end-to-end funciona | `curl POST /auth/login` | ☐ | ☐ |
| AFS-01 | Límites CPU/RAM aplicados | `docker inspect` | N/A | ☐ |
| AFS-02 | MongoDB/Redis solo en localhost | `ss -tlnp` | N/A | ☐ |
| AFS-03 | Volúmenes PROD existen | `docker volume ls` | N/A | ☐ |
| AFS-04 | Espacio en disco suficiente (>40 GB) | `df -h` | ☐ | ☐ |
| SEC-01 | `.env.production` no versionado | `git ls-files` | N/A | ☐ |
| SEC-02 | Sin secretos hardcoded en compose | `grep` | ☐ | ☐ |
| SEC-03 | Headers HTTP de seguridad activos | `curl -I` | N/A | ☐ |
| SEC-04 | Redis requiere auth en producción | `redis-cli` | N/A | ☐ |
| SEC-05 | Backend no corre como root | `docker exec whoami` | N/A | ☐ |
| SEC-06 | TLS 1.2+ activo, TLS 1.0 rechazado | `openssl s_client` | N/A | ☐ |

---

## 7. PROCEDIMIENTO DE ROLLBACK

> **Escenario:** El nuevo despliegue falla o produce errores en producción. Este procedimiento restaura la versión anterior en menos de 10 minutos.

### 7.1 Preparación Pre-despliegue (Ejecutar ANTES de cualquier actualización)

```bash
# ── ANTES de actualizar: tomar snapshot del estado actual ──────────

# 1. Registrar imagen y commit actuales
docker images | grep respicare > /tmp/respicare_images_before.txt
git rev-parse HEAD > /tmp/respicare_commit_before.txt
cat /tmp/respicare_commit_before.txt  # guardar este hash

# 2. Backup de la base de datos
docker exec respicare-mongodb-prod \
  mongodump \
    --username $MONGO_USERNAME \
    --password $MONGO_PASSWORD \
    --authenticationDatabase admin \
    --db respicare \
    --out /backups/pre-deploy-$(date +%Y%m%d-%H%M%S)

# 3. Etiquetar las imágenes actuales como "stable"
docker tag respicare-backend-prod:latest respicare-backend-prod:stable
docker tag respicare-ai-dev:latest respicare-ai-prod:stable
docker tag respicare-web-prod:latest respicare-web-prod:stable

# 4. Guardar commit hash en un archivo de referencia
git rev-parse HEAD > .rollback_target
echo "Rollback target: $(cat .rollback_target)"
```

### 7.2 Detección de Fallo Post-despliegue

```bash
# Verificar estado de todos los contenedores (60 segundos después del despliegue)
docker compose -f docker-compose.prod.yml ps

# Señales de fallo:
# - STATUS: "Restarting (1)" → el contenedor está crasheando en loop
# - STATUS: "Exited (1)" → el contenedor terminó con error
# - HEALTH: "unhealthy" → el healthcheck falla después de start_period

# Ver causa del fallo:
docker compose -f docker-compose.prod.yml logs backend --tail=50
docker compose -f docker-compose.prod.yml logs ai-services --tail=50

# Si alguno está en estado de error → EJECUTAR ROLLBACK
```

### 7.3 Procedimiento de Rollback (Tiempo objetivo: < 10 minutos)

```bash
# ═══════════════════════════════════════════════════════════════
#  ROLLBACK RESPICARE — Versión Anterior
#  Ejecutar cuando el despliegue nuevo falla
# ═══════════════════════════════════════════════════════════════

# ── T+0: DETENER los servicios con problemas ───────────────────
docker compose -f docker-compose.prod.yml down

# ── T+1: Restaurar código a la versión anterior ─────────────────
ROLLBACK_COMMIT=$(cat .rollback_target)
echo "Revirtiendo a commit: $ROLLBACK_COMMIT"
git checkout $ROLLBACK_COMMIT

# ── T+2: Reactivar las imágenes estables (sin rebuild) ──────────
# Opción A — Usar imágenes tagueadas como "stable" (más rápido):
docker tag respicare-backend-prod:stable respicare-backend-prod:latest
docker tag respicare-ai-prod:stable respicare-ai-prod:latest
docker tag respicare-web-prod:stable respicare-web-prod:latest

# ── T+3: Levantar servicios sin rebuild (usa imágenes en caché) ──
docker compose -f docker-compose.prod.yml \
  --env-file .env.production \
  up -d

# ── T+4: Verificar estado (esperar 60s para healthchecks) ────────
sleep 60
docker compose -f docker-compose.prod.yml ps

# ── T+5: Verificar funcionalidad básica ─────────────────────────
curl -sf https://respicare.tacna/health && echo "✓ Backend UP"
curl -sf https://respicare.tacna/api/v1/health && echo "✓ API OK"

# ── T+6: Notificar al equipo ────────────────────────────────────
echo "ROLLBACK completado. Versión activa: $ROLLBACK_COMMIT"
echo "Verificar manualmente: https://respicare.tacna"
```

### 7.4 Rollback de Base de Datos (Solo si hubo migraciones de esquema)

```bash
# Si el despliegue incluía cambios de esquema en MongoDB
# y la BD fue modificada ANTES del rollback de código:

# 1. Detener backend para evitar más escrituras
docker stop respicare-backend-prod

# 2. Restaurar backup pre-despliegue
BACKUP_DIR=$(ls -dt /backups/pre-deploy-* | head -1)
echo "Restaurando desde: $BACKUP_DIR"

docker exec respicare-mongodb-prod \
  mongorestore \
    --username $MONGO_USERNAME \
    --password $MONGO_PASSWORD \
    --authenticationDatabase admin \
    --db respicare \
    --drop \
    $BACKUP_DIR/respicare

# 3. Reiniciar backend con la versión anterior
docker start respicare-backend-prod

# 4. Verificar integridad de datos
docker exec respicare-mongodb-prod \
  mongosh --username $MONGO_USERNAME \
  --password $MONGO_PASSWORD \
  --authenticationDatabase admin \
  --eval "db.getSiblingDB('respicare').stats()"
```

### 7.5 Árbol de Decisión para Rollback

```
¿El despliegue produjo errores?
           │
     ┌─────▼──────┐
     │ ¿El backend│
     │ inicia?    │
     └──────┬─────┘
            │
     ┌──────▼──────────────────────────┐
     │ NO → Ver logs:                  │
     │      docker compose logs backend│
     │      → Error de variables env:  │
     │        Verificar .env.production│
     │      → Error de conexión BD:    │
     │        Verificar MongoDB health │
     │      → Error de código:         │
     │        → EJECUTAR ROLLBACK 7.3  │
     └──────────────────────────────────┘
            │
     ┌──────▼──────────────────────────┐
     │ SÍ → ¿Las pruebas de humo      │
     │       pasan (FCA-03 a FCA-06)? │
     └──────┬──────────────────────────┘
            │
     ┌──────▼──────────────────────────┐
     │ NO → ¿Hubo migración de BD?    │
     │   SÍ → ROLLBACK 7.4 + 7.3     │
     │   NO → ROLLBACK 7.3 solamente  │
     └──────────────────────────────────┘
            │
     ┌──────▼──────────────────────────┐
     │ SÍ → Despliegue exitoso.       │
     │      Actualizar .rollback_target│
     │      con el nuevo commit.       │
     └──────────────────────────────────┘
```

---

## 8. APÉNDICES

### Apéndice A — Comandos Rápidos de Operación Diaria

```bash
# Ver estado de todos los servicios
docker compose -f docker-compose.dev.yml ps        # DEV
docker compose -f docker-compose.prod.yml ps       # PROD

# Ver logs en tiempo real (todos los servicios)
docker compose -f docker-compose.prod.yml logs -f --tail=100

# Ver logs de un servicio específico
docker compose -f docker-compose.prod.yml logs backend -f --tail=100
docker compose -f docker-compose.prod.yml logs ai-services -f --tail=50

# Reiniciar un servicio sin bajar los demás
docker compose -f docker-compose.prod.yml restart backend

# Escalar AI services (si se requiere más capacidad)
docker compose -f docker-compose.prod.yml up -d --scale ai-services=2

# Acceso a shell de contenedor para diagnóstico
docker exec -it respicare-backend-prod sh
docker exec -it respicare-ai-prod bash
docker exec -it respicare-mongodb-prod mongosh \
  --username $MONGO_USERNAME --password $MONGO_PASSWORD \
  --authenticationDatabase admin

# Limpiar contenedores detenidos, imágenes sin usar (precaución en PROD)
docker system prune -f

# Verificar espacio en disco de Docker
docker system df
```

### Apéndice B — Estructura de Directorios en el Servidor de Producción

```
/opt/respicare/
├── .env.production              ← Secretos (chmod 600, no en git)
├── .rollback_target             ← Commit hash de la versión activa
├── docker-compose.prod.yml      ← Orquestación de producción
├── backend/                     ← Código del backend + Dockerfile
├── ai-services/                 ← Código de IA + Dockerfile.prod
├── web/                         ← Código frontend + Dockerfile
├── nginx/
│   ├── nginx.conf               ← Configuración del reverse proxy
│   ├── Dockerfile               ← Imagen nginx personalizada
│   └── ssl/                     ← Certificados SSL (si no usa certbot)
├── certbot/
│   ├── conf/                    ← Let's Encrypt config
│   └── www/                     ← ACME challenge files
├── backups/
│   └── mongodb/                 ← Backups diarios (mongodump)
│       ├── pre-deploy-20260521-143022/
│       └── daily-20260520/
└── scripts/
    └── backup.sh                ← Script de backup automatizado
```

### Apéndice C — Comandos de Generación de Secretos (Referencia Rápida)

```bash
# MONGO_PASSWORD y REDIS_PASSWORD
openssl rand -base64 24

# JWT_SECRET y JWT_REFRESH_SECRET (más largo = más seguro)
openssl rand -base64 64

# FIELD_ENCRYPTION_KEY (exactamente 32 bytes en base64)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Verificar que una clave AES-256 tiene la longitud correcta
echo -n "TuClaveAqui=" | base64 -d | wc -c
# Debe retornar exactamente: 32
```

### Apéndice D — Matriz de Responsabilidades

| Actividad | Desarrollador | Operaciones | Ambos |
|---|---|---|---|
| Actualizar código fuente | ✓ | | |
| Gestionar secretos de producción | | ✓ | |
| Ejecutar despliegue en PROD | | ✓ | |
| Ejecutar despliegue en DEV | ✓ | | |
| Aprobar rollback | | | ✓ |
| Ejecutar rollback | | ✓ | |
| Monitorear logs de producción | | ✓ | |
| Actualizar `docker-compose.prod.yml` | ✓ | | revisión ✓ |
| Backup manual de emergencia | | ✓ | |
| Renovación de certificados SSL | | ✓ | |

---

*Documento generado para RespiCare — Construcción de Software I — Universidad Privada de Tacna — 2026*  
*Versión: 1.0.0 | Revisión: Ing. Alberto Flor Rodríguez*