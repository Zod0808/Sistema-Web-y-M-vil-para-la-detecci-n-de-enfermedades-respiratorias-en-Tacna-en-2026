# 🏥 RespiCare Backend API

Backend API completo para el sistema de gestión de enfermedades respiratorias RespiCare Tacna.

## 🚀 Características

### ✅ **Funcionalidades Implementadas**

#### **1. Autenticación y Autorización**
- ✅ Registro de usuarios (pacientes, doctores, administradores)
- ✅ Login con JWT y refresh tokens
- ✅ Middleware de autenticación robusto
- ✅ Control de roles y permisos
- ✅ Cambio de contraseña seguro
- ✅ Desactivación de cuentas
- ✅ Gestión de usuarios (Admin)

#### **2. Gestión de Historias Médicas**
- ✅ CRUD completo de historias médicas
- ✅ Sincronización offline
- ✅ Búsqueda y filtros avanzados (por fecha, ubicación, paciente)
- ✅ Validación de datos con Joi
- ✅ Exportación de datos (JSON, CSV, PDF)
- ✅ Estadísticas y reportes

#### **3. Análisis de Síntomas con IA** 🤖
- ✅ Integración con servicios de IA (Python/FastAPI)
- ✅ Análisis automático de síntomas con Machine Learning
- ✅ Clasificación de severidad y urgencia
- ✅ Recomendaciones médicas inteligentes
- ✅ Tendencias de síntomas temporales
- ✅ Identificación de signos de alarma
- ✅ Historial de análisis de síntomas
- ✅ Estadísticas de síntomas

#### **4. Dashboard y Analytics** 📊
- ✅ Dashboard personalizado por rol (Admin, Doctor, Paciente)
- ✅ Estadísticas en tiempo real
- ✅ Métricas de crecimiento
- ✅ Análisis de tendencias temporales (7d, 30d, 90d, 1año)
- ✅ Reportes de enfermedades por tipo
- ✅ Reportes geográficos por distrito
- ✅ Gráficos interactivos

#### **5. Analytics Avanzados**
- ✅ Tendencias temporales de síntomas
- ✅ Reportes de enfermedades por tipo
- ✅ Analytics geográficos por ubicación
- ✅ Análisis de síntomas más frecuentes
- ✅ Clasificación por severidad (bajo, medio, alto, severo)
- ✅ Dashboard ejecutivo (KPIs de alertas, IA, citas, satisfacción)
- ✅ Predicción temprana de brotes epidemiológicos
- ✅ Endpoints REST para analytics predictivo (`/api/v1/analytics/*`)

#### **5.1 Reportes Automáticos** (Nuevo)
- ✅ Generación automática de reportes diarios (23:59 diario)
- ✅ Generación automática de reportes semanales (domingos 23:59)
- ✅ Generación automática de reportes mensuales (día 1, 00:00)
- ✅ Detección automática de anomalías en métricas usando z-score y análisis de tendencias
- ✅ Exportación automática de reportes en formatos PDF, CSV y JSON
- ✅ Dashboard personalizable con filtros por tipo, visualización de métricas y anomalías
- ✅ Sistema completo de alertas de métricas anormales con niveles de severidad (low, medium, high, critical)
- ✅ Métricas de crecimiento comparativas (pacientes, historias, alertas)
- ✅ Análisis de top diagnósticos, categorías de síntomas y distribución por distrito
- ✅ Endpoints REST completos (`/api/v1/reports/automatic/*`)

#### **6. Gestión de Archivos**
- ✅ Subida de imágenes médicas
- ✅ Grabación de notas de audio
- ✅ Procesamiento automático de imágenes
- ✅ Compresión y optimización
- ✅ Gestión de almacenamiento

#### **7. Exportación de Datos**
- ✅ Exportación en múltiples formatos (JSON, CSV, PDF)
- ✅ Filtros avanzados de exportación
- ✅ Estadísticas de usuarios
- ✅ Reportes personalizados

#### **8. Seguridad Avanzada**
- ✅ Encriptación de contraseñas con bcrypt
- ✅ Rate limiting por IP
- ✅ Sanitización de datos (XSS, NoSQL injection)
- ✅ Validación de entrada robusta
- ✅ Headers de seguridad con Helmet
- ✅ CORS configurado

#### **9. Chat y Conversaciones**
- ✅ Sistema de chat con servicio de IA
- ✅ Conversaciones persistentes
- ✅ Análisis de mensajes con ML
- ✅ Clasificación automática de intención
- ✅ Respuestas contextualizadas

#### **10. Base de Datos**
- ✅ Modelos MongoDB con Mongoose
- ✅ Índices optimizados para consultas
- ✅ Validaciones a nivel de esquema
- ✅ Middleware de encriptación
- ✅ Relaciones entre entidades
- ✅ Modelos: User, MedicalHistory, SymptomReport, ChatConversation, AIAnalysis

#### **11. Documentación API**
- ✅ Swagger/OpenAPI completa en `/api-docs`
- ✅ Documentación interactiva
- ✅ Esquemas de datos detallados
- ✅ Ejemplos de uso

#### **12. Utilidades de Desarrollo**
- ✅ Scripts de seeding de datos
- ✅ Logging estructurado con Winston
- ✅ Manejo de errores centralizado
- ✅ Validación de datos robusta con Joi
- ✅ TypeScript con configuración optimizada para CI/CD

#### **13. Integraciones HL7 / FHIR** ✅
- ✅ Cliente FHIR configurable con soporte CRUD, búsqueda y bundles transaccionales
- ✅ Parser HL7 v2 (segmentos MSH/PID/OBR/OBX) y conversor a recursos FHIR `Observation`
- ✅ Soporte HL7 v3 (XML) mediante `xml2js`
- ✅ Pruebas unitarias dedicadas (`npm run test -- fhirService`, `npm run test -- hl7Parser`)
- ✅ Endpoints REST externos y flujos de interoperabilidad hospitalaria

#### **14. Servicio de Emergencias** ⭐ **NUEVO**
- ✅ Integración con servicios de emergencia (API externa configurable)
- ✅ Alertas automáticas a emergencias (integración con sistema de alertas)
- ✅ Integración GPS para ubicación (validación y tracking)
- ✅ Detección automática de emergencias desde síntomas críticos
- ✅ Gestión de emergencias activas (crear, consultar, cancelar)
- ✅ Notificación a contactos de emergencia vía SMS (Twilio)
- ✅ Endpoints REST completos (`/api/v1/emergencies/*`)
  - `POST /api/v1/emergencies` - Crear emergencia
  - `GET /api/v1/emergencies/:emergencyId` - Obtener estado
  - `POST /api/v1/emergencies/:emergencyId/cancel` - Cancelar emergencia
  - `GET /api/v1/emergencies/active` - Emergencias activas del usuario
  - `POST /api/v1/emergencies/detect` - Detección automática desde síntomas

#### **15. Servicio SMS (Multi-proveedor)** ⭐ **NUEVO**
- ✅ Integración con múltiples proveedores (Twilio, AWS SNS, MessageBird)
- ✅ Soporte para modo mock (desarrollo/testing)
- ✅ Validación de números telefónicos (formato E.164)
- ✅ Formato automático de números locales a internacionales
- ✅ SMS especiales para emergencias con formato optimizado
- ✅ Envío masivo de SMS (bulk) con rate limiting
- ✅ Verificación de estado de mensajes
- ✅ Integración completa con sistema de notificaciones
- ✅ Fallback automático a modo mock si el proveedor falla
- ✅ Cifrado de números de teléfono en base de datos
- ✅ **Rate limiting avanzado** basado en límites de proveedores
- ✅ **Webhooks** para recibir confirmaciones de entrega (Twilio, AWS SNS, MessageBird)
- ✅ **Métricas completas** (tasa de éxito, costos, estadísticas por proveedor)
- ✅ **Tracking de costos** por proveedor y período
- ✅ **Estadísticas de rate limiting** en tiempo real

## 🏗️ Arquitectura Técnica

### **Stack Tecnológico:**
- **Node.js** + **TypeScript** - Runtime y tipado
- **Express.js** - Framework web
- **MongoDB** + **Mongoose** - Base de datos
- **JWT** - Autenticación
- **Joi** - Validación de datos
- **Winston** - Logging
- **Helmet** - Seguridad
- **Axios** - Cliente HTTP para IA y FHIR
- **Multer** - Manejo de archivos
- **Sharp** - Procesamiento de imágenes
- **PDFKit** - Generación de PDFs
- **CSV-Writer** - Exportación CSV
- **xml2js** - Procesamiento de mensajes HL7 v3 (XML)
- **Swagger** - Documentación API

### **Estructura del Proyecto:**
```
backend/
├── src/
│   ├── controllers/         # Controladores de API
│   │   ├── authController.ts
│   │   ├── medicalHistoryController.ts
│   │   ├── symptomAnalyzerController.ts
│   │   ├── dashboardController.ts
│   │   ├── fileUploadController.ts
│   │   ├── exportController.ts
│   │   ├── automaticReportController.ts
│   │   ├── alertController.ts
│   │   └── appointmentController.ts
│   ├── models/             # Modelos de MongoDB
│   │   ├── User.ts
│   │   ├── MedicalHistory.ts
│   │   ├── AIAnalysis.ts
│   │   ├── AutomaticReport.ts
│   │   ├── Alert.ts
│   │   ├── Appointment.ts
│   │   ├── Referral.ts
│   │   └── InformedConsent.ts
│   ├── middleware/         # Middleware personalizado
│   │   ├── auth.ts
│   │   ├── errorHandler.ts
│   │   └── validation.ts
│   ├── routes/             # Rutas de API
│   │   ├── authRoutes.ts
│   │   ├── medicalHistoryRoutes.ts
│   │   ├── symptomAnalyzerRoutes.ts
│   │   ├── dashboardRoutes.ts
│   │   ├── fileUploadRoutes.ts
│   │   ├── exportRoutes.ts
│   │   ├── automaticReportRoutes.ts
│   │   ├── alertRoutes.ts
│   │   ├── appointmentsRoutes.ts
│   │   ├── referralRoutes.ts
│   │   └── informedConsentRoutes.ts
│   ├── services/           # Servicios de negocio
│   │   ├── aiIntegration.ts
│   │   ├── fileUploadService.ts
│   │   ├── exportService.ts
│   │   ├── analyticsService.ts
│   │   ├── epidemiologicalService.ts
│   │   ├── automaticReportService.ts
│   │   ├── metricAlertService.ts
│   │   ├── alertService.ts
│   │   ├── appointmentService.ts
│   │   ├── referralService.ts
│   │   └── consentService.ts
│   ├── jobs/               # Jobs programados
│   │   ├── alertJobs.ts
│   │   ├── appointmentJobs.ts
│   │   └── reportJobs.ts
│   ├── validators/         # Validadores Joi
│   │   ├── authValidators.ts
│   │   └── medicalHistoryValidators.ts
│   ├── utils/              # Utilidades
│   │   ├── AppError.ts
│   │   ├── asyncHandler.ts
│   │   └── logger.ts
│   ├── config/             # Configuración
│   │   ├── config.ts
│   │   └── swagger.ts
│   ├── types/              # Tipos TypeScript
│   │   └── index.ts
│   ├── scripts/            # Scripts de utilidad
│   │   └── seed.ts
│   └── index.ts            # Punto de entrada
├── logs/                   # Archivos de log
├── uploads/                # Archivos subidos
│   ├── images/            # Imágenes médicas
│   └── audio/             # Notas de audio
└── package.json            # Dependencias
```

## 🚀 Instalación y Configuración

### **Prerrequisitos:**
- Node.js >= 18.0.0
- MongoDB >= 6.0
- Redis >= 6.0 (opcional)

### **Instalación:**
```bash
# Instalar dependencias
npm install

# Copiar archivo de configuración
cp env.example .env

# Editar variables de entorno
nano .env

# Compilar TypeScript
npm run build

# Ejecutar en desarrollo
npm run dev

# Ejecutar en producción
npm start
```

### **Variables de Entorno:**
```bash
# Servidor
NODE_ENV=development
PORT=3001
HOST=localhost

# Base de datos
MONGODB_URI=mongodb://localhost:27017/respicare
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your_refresh_secret_key_here
JWT_REFRESH_EXPIRE=30d

# Seguridad
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
INTERNAL_SERVICE_TOKENS=service-token-1,service-token-2
CRITICAL_ALERT_ROLES=doctor,admin
FIELD_ENCRYPTION_KEY=BASE64_32_BYTES_KEY_HERE
PUSH_PROVIDER=expo
PUSH_API_KEY=your_push_api_key
PUSH_PROJECT_ID=your_push_project_id
DRUG_INTERACTION_API_URL=https://api.drugs.com/v1
DRUG_INTERACTION_API_KEY=your_api_key_here

# Servicio de Emergencias
EMERGENCY_SERVICE_ENABLED=true
EMERGENCY_SERVICE_API_URL=https://api.emergency-service.com/v1
EMERGENCY_SERVICE_API_KEY=your_emergency_service_api_key
EMERGENCY_NUMBER=911

# Servicio SMS (Multi-proveedor)
SMS_ENABLED=true
SMS_PROVIDER=twilio  # Opciones: twilio, aws_sns, messagebird, mock, none

# Twilio
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# AWS SNS
AWS_SNS_REGION=us-east-1
AWS_SNS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SNS_SECRET_ACCESS_KEY=your_aws_secret_access_key

# MessageBird
MESSAGEBIRD_API_KEY=your_messagebird_api_key
MESSAGEBIRD_ORIGINATOR=RespiCare

# Rate Limiting (opcional, usa límites por defecto del proveedor si no se especifica)
SMS_RATE_LIMIT_PER_MINUTE=60
SMS_RATE_LIMIT_PER_HOUR=1000
SMS_RATE_LIMIT_PER_DAY=10000

# Jobs de alertas
ALERTS_SCHEDULED_INTERVAL_MS=30000
ALERTS_PENDING_INTERVAL_MS=45000

# Jobs de reportes automáticos (configurados con node-cron)
# Reporte diario: 23:59 diario
# Reporte semanal: domingos 23:59
# Reporte mensual: día 1 de cada mes 00:00

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

### 🔐 TLS extremo a extremo
- Kubernetes Ingress con TLS administrado por cert-manager (Let's Encrypt):
  - Manifiestos: `infrastructure/k8s/backend-deployment.yaml`, `infrastructure/k8s/backend-ingress.yaml`
  - Anotaciones para `nginx` y `force-ssl-redirect`, HSTS activo
- Backend fuerza HTTPS en producción y habilita HSTS (`helmet`) con `trust proxy`
- Asegurar que el tráfico interno sea solo mTLS o red privada (Service Mesh/NetworkPolicies)
  - ClusterIssuer: `infrastructure/k8s/cert-issuer.yaml`
  - Ejemplo de secretos: `infrastructure/k8s/backend-secrets.example.yaml`

### 🗄️ Retención y acceso a logs de auditoría
- Modelo `AuditLog` con PII redactada y hash del payload
- Retención recomendada: 180 días (configurable por entorno y regulaciones locales)
- Acceso restringido: solo roles `admin` y `security` en entornos productivos
- Exportación para auditorías: acceso bajo solicitud y registro de acceso
- Borrado seguro al vencer el periodo: job programado para purga (pendiente de automatizar)
  - CronJob K8s: `infrastructure/k8s/backend-auditlog-cronjob.yaml`

### 🌐 Network Policies
- Denegar todo por defecto y permitir solo desde Ingress/Ns autorizados:
  - `infrastructure/k8s/backend-networkpolicies.yaml`

### 📈 Observabilidad
- Métricas Prometheus:
  - Middleware y endpoint `/metrics` con token opcional (`METRICS_AUTH_TOKEN`)
  - Archivo: `backend/src/metrics/metrics.ts`
- Logs estructurados (JSON) vía logger central (stdout) y auditoría activada
- Tracing OpenTelemetry (opcional por entorno):
  - Activación: `OTEL_ENABLED=true`
  - Exportador: `OTEL_EXPORTER=otlp|jaeger`
  - Variables comunes:
    - `OTEL_SERVICE_NAME=respicare-backend`
    - OTLP: `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://otel-collector:4318/v1/traces`
    - Jaeger: `OTEL_EXPORTER_JAEGER_ENDPOINT=http://jaeger-collector:14268/api/traces`
  - Archivo: `backend/src/telemetry/tracing.ts`
  - Infra de referencia:
    - OpenTelemetry Collector: `infrastructure/k8s/otel-collector.yaml`
    - Jaeger (all-in-one): `infrastructure/k8s/jaeger.yaml`

### 🛡️ Hardening APIs
- Rate limiting inteligente (Redis + fallback) por ruta/rol (`backend/src/middleware/rateLimiter.ts`)
- Headers de seguridad vía `helmet`, sanitización (xss-clean, mongo-sanitize, hpp)
- WAF recomendado en capa Ingress (Nginx + ModSecurity) [pendiente de despliegue]
  - Anotaciones agregadas en `infrastructure/k8s/backend-ingress.yaml` (ModSecurity + OWASP CRS + limit RPS)

### 🔒 RBAC granular avanzado
- Middleware de roles/permisos: `backend/src/middleware/rbac.ts`
- Ejemplo aplicado en rutas de reportes automáticos (lectura, estadísticas, generación, exportación)

### 🔐 Backups encriptados
- CronJob con Restic a S3/compatible: `infrastructure/k8s/mongo-backup-restic.yaml`
- Retención: daily 7, weekly 4, monthly 6 (ajustable)

### 👮 Cumplimiento GDPR/HIPAA (lineamientos)
- Minimización de datos y cifrado en reposo/en tránsito
- Anonimización/pseudonimización para analytics/export
- Auditoría de accesos y retención limitada (180 días por defecto)
- DSR (Data Subject Rights): endpoints de exportación/borrado bajo flujo supervisado
- Endpoints DSR (admin + doble confirmación):
  - `GET /api/v1/dsr/export/:userId?includeRaw=false`
  - `DELETE /api/v1/dsr/delete/:userId` (requiere header `X-Confirm-Action: yes` y `confirm=true` o `?confirm=yes`)
  - Permisos: `dsr:export`, `dsr:delete`
  - Código: `backend/src/routes/dsrRoutes.ts`, `backend/src/controllers/dsrController.ts`
- Política detallada para desarrolladores: [docs/backend/GDPR_HIPAA_POLICY.md](../docs/backend/GDPR_HIPAA_POLICY.md)
- Copias de seguridad cifradas y acceso restringido
- WAF/Rate limiting/DoS mitigation y monitoreo continuo

### 🧪 Anonimización y Pseudonimización (export/analytics)
- Utilidad: `backend/src/utils/anonymization.ts`:
  - `pseudonymize(value)`: HMAC con `ANONYMIZATION_SALT`
  - `redactPII(obj, fields)`: Redacción de campos sensibles
  - `anonymizeForAnalytics(obj)`: Hash de IDs y redacción de PII común
- Variables de entorno:
  - `ANONYMIZATION_SALT` (requerida para pseudonimización)
- Cifrado adicional aplicado a entidades:
  - `User` (name, avatar), `Prescription` (diagnosis, observations, validationNotes),
    `Appointment` (reason, notes, location.address/meetingLink, cancellationReason),
    `MedicalHistory` (patientName, diagnosis, description, audioNotes, location.address),
    `Alert` (title, message, lastError)

### **Scripts de Seeding**

```bash
# Poblar usuarios e historias médicas de ejemplo
npm run seed

# Generar alertas y métricas para el dashboard de alertas
npm run seed:alerts
```

## 📚 API Endpoints

### **Autenticación (`/api/v1/auth`)**
```http
POST   /register          # Registrar usuario
POST   /login             # Iniciar sesión
POST   /refresh-token     # Refrescar token
POST   /logout            # Cerrar sesión
GET    /profile           # Obtener perfil
PUT    /profile           # Actualizar perfil
PUT    /change-password   # Cambiar contraseña
PUT    /deactivate        # Desactivar cuenta
GET    /users             # Listar usuarios (admin)
GET    /stats             # Estadísticas (admin)
```

### **Historias Médicas (`/api/v1/medical-histories`)**
```http
POST   /                  # Crear historia médica
GET    /                  # Listar historias médicas
GET    /:id               # Obtener historia por ID
PUT    /:id               # Actualizar historia
DELETE /:id               # Eliminar historia
POST   /sync              # Sincronizar offline
GET    /stats             # Estadísticas
GET    /top-diagnoses     # Diagnósticos más comunes
GET    /age-stats         # Estadísticas por edad
GET    /location          # Buscar por ubicación
GET    /date-range        # Buscar por fechas
```

### **Análisis de Síntomas (`/api/v1/symptom-analyzer`)**
```http
POST   /analyze           # Analizar síntomas con IA
GET    /trends/:patientId # Obtener tendencias de síntomas
GET    /recommendations   # Obtener recomendaciones generales
GET    /status            # Estado del servicio de IA
GET    /history/:patientId # Historial de análisis
GET    /statistics/:patientId # Estadísticas de síntomas
```

### **Dashboard (`/api/v1/dashboard`)**
```http
GET    /admin             # Dashboard de administrador
GET    /doctor            # Dashboard de doctor
GET    /patient           # Dashboard de paciente
GET    /health            # Estado del sistema
```

### **Analytics (`/api/v1/analytics`)**
```http
GET    /executive-dashboard        # Dashboard ejecutivo con KPIs y brotes
GET    /temporal-trends            # Tendencias temporales de síntomas
GET    /disease-reports             # Reportes por tipo de enfermedad
GET    /geographic-data             # Datos geográficos de síntomas
GET    /symptom-summary             # Resumen de síntomas más frecuentes
GET    /district-trends             # Tendencias por distrito
GET    /outbreak-predictions        # Predicciones de brotes epidemiológicos
```

### **Gestión de Archivos (`/api/v1/upload`)**
```http
POST   /medical-files     # Subir archivos médicos
GET    /file-info/:path   # Información de archivo
DELETE /file/:path        # Eliminar archivo
GET    /stats             # Estadísticas de archivos (admin)
POST   /cleanup           # Limpiar archivos antiguos (admin)
```

### **Exportación (`/api/v1/export`)**
```http
POST   /medical-histories # Exportar historias médicas
POST   /user-statistics   # Exportar estadísticas (admin)
GET    /formats           # Formatos disponibles
GET    /history           # Historial de exportaciones
```

### **Alertas (`/api/v1/alerts`)**
```http
POST   /critical-symptom             # Crear alerta automática por síntoma crítico
POST   /medication-reminders         # Programar recordatorio de medicamento
POST   /follow-up                    # Programar seguimiento médico
POST   /doctor-notifications         # Notificar a médicos sobre casos urgentes
POST   /:alertId/acknowledge         # Reconocer una alerta como atendida
GET    /                              # Listar alertas del usuario autenticado
GET    /dashboard/summary            # Resumen global de alertas (admin)
GET    /monitoring                   # Métricas de cola Redis y fallos (admin)
POST   /admin/process                # Forzar procesamiento inmediato (admin)
```

### **SMS (`/api/v1/sms`)** ⭐ **NUEVO**
```http
GET     /metrics              # Métricas generales (admin)
GET     /metrics/costs        # Costos por período (admin)
GET     /metrics/rate-limit   # Estadísticas de rate limiting (admin)
```

### **SMS Webhooks (`/api/v1/sms/webhooks`)** ⭐ **NUEVO**
```http
POST    /twilio               # Webhook de Twilio para confirmaciones
POST    /aws-sns              # Webhook de AWS SNS para confirmaciones
POST    /messagebird          # Webhook de MessageBird para confirmaciones
```

### **Citas Médicas (`/api/v1/appointments`)**
```http
POST   /                             # Crear cita (doctor/admin/paciente con token válido)
GET    /                             # Listar citas (filtros por doctor, paciente, estado, fechas)
GET    /me/upcoming                  # Listar próximas citas del usuario autenticado
GET    /doctor/:doctorId/availability # Disponibilidad del doctor en un rango
GET    /:appointmentId               # Obtener detalle de cita
PUT    /:appointmentId               # Actualizar detalles (doctor/admin)
PATCH  /:appointmentId/cancel        # Cancelar cita (doctor/admin)
PATCH  /:appointmentId/reschedule    # Reprogramar cita (doctor/admin)
PATCH  /:appointmentId/complete      # Marcar cita como completada (doctor/admin)
```

### **Referidos (`/api/v1/referrals`)** ⭐ **NUEVO**
```http
POST   /                             # Crear referido (doctor/admin)
GET    /                             # Listar referidos (filtros por paciente, doctor, estado, tipo, prioridad)
GET    /:referralId                  # Obtener detalle de referido
PATCH  /:referralId                  # Actualizar referido (doctor/admin)
POST   /:referralId/accept           # Aceptar referido (doctor/admin)
POST   /:referralId/reject           # Rechazar referido (doctor/admin)
POST   /:referralId/complete         # Completar referido (doctor/admin)
POST   /:referralId/cancel           # Cancelar referido (doctor/admin)
GET    /stats/summary                # Estadísticas de referidos (doctor/admin)
GET    /pending/list                 # Listar referidos pendientes
GET    /overdue/list                 # Listar referidos vencidos
```

**Tipos de Referido:**
- `consultation` - Consulta
- `specialist` - Especialista
- `diagnostic` - Diagnóstico
- `treatment` - Tratamiento
- `follow_up` - Seguimiento
- `emergency` - Emergencia

**Estados:**
- `pending` - Pendiente
- `accepted` - Aceptado
- `rejected` - Rechazado
- `in_progress` - En Progreso
- `completed` - Completado
- `cancelled` - Cancelado

**Prioridades:**
- `low` - Baja
- `medium` - Media
- `high` - Alta
- `urgent` - Urgente

**Ejemplo de uso:**
```bash
# Crear referido
curl -X POST http://localhost:3001/api/v1/referrals \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient123",
    "patientName": "Juan Pérez",
    "referringDoctorId": "doctor456",
    "referringDoctorName": "Dr. García",
    "referredToSpecialty": "Cardiología",
    "referralType": "specialist",
    "priority": "high",
    "reason": "Paciente requiere evaluación cardiológica por síntomas de arritmia"
  }'

# Aceptar referido
curl -X POST http://localhost:3001/api/v1/referrals/REFERRAL_ID/accept \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "referredToDoctorId": "doctor789",
    "notes": "Aceptado para evaluación"
  }'

# Obtener estadísticas
curl -X GET http://localhost:3001/api/v1/referrals/stats/summary \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### **Consentimientos Informados (`/api/v1/informed-consents`)** ⭐ **NUEVO**
```http
POST   /                             # Crear consentimiento informado (doctor/admin)
GET    /                             # Listar consentimientos (filtros por paciente, doctor, estado, tipo)
GET    /:consentId                   # Obtener detalle de consentimiento
PATCH  /:consentId                   # Actualizar consentimiento (doctor/admin)
POST   /:consentId/present           # Presentar consentimiento al paciente (doctor/admin)
POST   /:consentId/sign              # Agregar firma electrónica (paciente/doctor/witness/guardian)
POST   /:consentId/revoke            # Revocar consentimiento
GET    /:consentId/verify-signature  # Verificar firma electrónica
GET    /:consentId/pdf               # Generar PDF del consentimiento firmado
GET    /stats/summary                # Estadísticas de consentimientos (doctor/admin)
GET    /pending/list                 # Listar consentimientos pendientes de firma
GET    /expired/list                 # Listar consentimientos expirados
```

**Tipos de Consentimiento:**
- `procedure` - Procedimiento
- `treatment` - Tratamiento
- `surgery` - Cirugía
- `research` - Investigación
- `data_sharing` - Compartir Datos
- `photography` - Fotografía
- `video_recording` - Grabación de Video
- `other` - Otro

**Estados:**
- `draft` - Borrador
- `pending_signature` - Pendiente de Firma
- `signed` - Firmado
- `revoked` - Revocado
- `expired` - Expirado

**Métodos de Firma:**
- `digital` - Firma Digital (certificado)
- `biometric` - Firma Biométrica
- `click_to_sign` - Click para Firmar
- `typed` - Firma Mecanografiada

**Ejemplo de uso:**
```bash
# Crear consentimiento informado
curl -X POST http://localhost:3001/api/v1/informed-consents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient123",
    "patientName": "Juan Pérez",
    "doctorId": "doctor456",
    "doctorName": "Dr. García",
    "consentType": "procedure",
    "title": "Consentimiento para Procedimiento de Endoscopia",
    "description": "El paciente consiente en someterse al procedimiento de endoscopia...",
    "risks": ["Sangrado menor", "Infección"],
    "benefits": ["Diagnóstico preciso", "Tratamiento temprano"],
    "alternatives": ["Radiografía", "Tomografía"]
  }'

# Presentar consentimiento al paciente
curl -X POST http://localhost:3001/api/v1/informed-consents/CONSENT_ID/present \
  -H "Authorization: Bearer YOUR_TOKEN"

# Firmar consentimiento
curl -X POST http://localhost:3001/api/v1/informed-consents/CONSENT_ID/sign \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "signerId": "patient123",
    "signerName": "Juan Pérez",
    "signerRole": "patient",
    "signatureData": "data:image/png;base64,iVBORw0KG...",
    "signatureMethod": "click_to_sign"
  }'

# Generar PDF del consentimiento firmado
curl -X GET http://localhost:3001/api/v1/informed-consents/CONSENT_ID/pdf \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output consentimiento.pdf

# Obtener estadísticas
curl -X GET http://localhost:3001/api/v1/informed-consents/stats/summary \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### **Reportes Automáticos (`/api/v1/reports/automatic`)** (Nuevo)
```http
GET    /                             # Listar todos los reportes automáticos (filtros: type, status, limit, page)
GET    /stats                        # Estadísticas de reportes (admin)
GET    /latest/:type                 # Obtener último reporte por tipo (daily/weekly/monthly)
GET    /:type/list                   # Listar reportes por tipo (daily/weekly/monthly)
GET    /:id                          # Obtener reporte por ID
POST   /generate                     # Generar reporte manualmente (admin)
POST   /:id/export                   # Exportar reporte (PDF/CSV/JSON)
```

**Ejemplo de uso:**
```bash
# Generar reporte diario manualmente
curl -X POST http://localhost:3001/api/v1/reports/automatic/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportType": "daily",
    "includeAnomalies": true,
    "autoExport": true,
    "exportFormat": "pdf"
  }'

# Obtener último reporte semanal
curl -X GET http://localhost:3001/api/v1/reports/automatic/latest/weekly \
  -H "Authorization: Bearer YOUR_TOKEN"

# Exportar reporte a CSV
curl -X POST http://localhost:3001/api/v1/reports/automatic/REPORT_ID/export \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"format": "csv"}' \
  --output report.csv
```

## 🔒 Seguridad

### **Medidas Implementadas:**
- **Autenticación JWT** con refresh tokens
- **Encriptación bcrypt** para contraseñas
- **Rate limiting** por IP
- **Sanitización XSS** y NoSQL injection
- **Validación robusta** con Joi
- **Headers de seguridad** con Helmet
- **CORS** configurado
- **Logging** de seguridad

### **Validaciones:**
- **Entrada de datos** - Joi schemas
- **Contraseñas** - Patrones seguros
- **Emails** - Formato válido
- **Roles** - Enum validado
- **Fechas** - Rango válido
- **Ubicaciones** - Coordenadas válidas

## 📊 Modelos de Datos

### **User**
```typescript
{
  _id: string;
  name: string;
  email: string;
  password: string; // Encriptada
  role: 'patient' | 'doctor' | 'admin';
  avatar?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### **MedicalHistory**
```typescript
{
  _id: string;
  patientId: string;
  doctorId: string;
  patientName: string;
  age: number;
  diagnosis: string;
  symptoms: Symptom[];
  description?: string;
  date: Date;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  images?: string[];
  audioNotes?: string;
  isOffline?: boolean;
  syncStatus: 'pending' | 'synced' | 'error';
  createdAt: Date;
  updatedAt: Date;
}
```

### **SymptomReport** (Nuevo)
```typescript
{
  _id: string;
  userId: string;
  symptoms: Array<{
    name: string;
    severity: 'low' | 'moderate' | 'high' | 'severe';
    duration: number; // en días
    description?: string;
  }>;
  location: {
    district: string;
    city: string;
    country: string;
  };
  reportedAt: Date;
  category: string;
  severity: 'low' | 'moderate' | 'high' | 'severe';
}
```

### **ChatConversation** (Nuevo)
```typescript
{
  _id: string;
  sessionId: string;
  userId: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    metadata?: object;
  }>;
  metadata: {
    source: string;
    language: string;
  };
  location: {
    city: string;
    country: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### **AIAnalysis** (Nuevo)
```typescript
{
  _id: string;
  medicalHistoryId: string;
  analysisResult: {
    disease: string;
    confidence: number;
    urgencyLevel: 'critical' | 'high' | 'medium' | 'low';
    symptoms: string[];
    recommendations: string[];
  };
  modelVersion: string;
  analyzedAt: Date;
}
```

### **AutomaticReport** (Nuevo)
```typescript
{
  _id: string;
  reportType: 'daily' | 'weekly' | 'monthly';
  period: {
    startDate: Date;
    endDate: Date;
  };
  status: 'pending' | 'generating' | 'completed' | 'failed' | 'exported';
  metrics: {
    totalPatients: number;
    totalDoctors: number;
    totalAdmins: number;
    totalMedicalHistories: number;
    totalAlerts: number;
    criticalAlerts: number;
    totalAppointments: number;
    completedAppointments: number;
    aiAnalyses: number;
    averageAIConfidence: number;
    topDiagnoses: Array<{ diagnosis: string; count: number }>;
    symptomCategories: Array<{ category: string; total: number }>;
    districtDistribution: Array<{ district: string; count: number }>;
    growthMetrics: {
      patientsGrowth: number;
      historiesGrowth: number;
      alertsGrowth: number;
    };
  };
  anomalies?: Array<{
    metric: string;
    value: number;
    expectedRange: { min: number; max: number };
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    detectedAt: Date;
  }>;
  filePath?: string;
  exportedAt?: Date;
  exportFormat?: 'pdf' | 'csv' | 'json';
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

## 🧪 Testing

### **Ejecutar Tests:**
```bash
# Tests unitarios
npm test

# Tests con watch
npm run test:watch

# Coverage report
npm run test:coverage

# Suites específicas recientes (HL7 / FHIR)
npm run test -- fhirService
npm run test -- hl7Parser
```

### **Tipos de Tests:**
- **Unit tests** - Funciones individuales
- **Integration tests** - Endpoints API
- **Validation tests** - Schemas Joi
- **Security tests** - Autenticación y autorización

### **Infraestructura para pruebas**
- **MongoDB**: la suite utiliza `mongodb-memory-server`, por lo que no necesitas levantar un servicio externo para los tests unitarios/integración. Si prefieres usar una instancia real, exporta `MONGODB_URI` apuntando a tu servidor y ejecútalo (por ejemplo `docker compose up -d mongodb` desde la raíz del proyecto).
- **Redis**: los tests usan un mock en memoria configurado en `tests/setup.ts`. Puedes forzar HIT/MISS desde tus pruebas con `testUtils.redis.set()` o reiniciar el estado con `testUtils.redis.reset()`. Para validar contra un Redis real, levanta el servicio (`docker compose up -d redis`) y elimina el mock si deseas probar la integración completa.
- **Compresión Brotli**: durante las pruebas las peticiones HTTP se envían con `Accept-Encoding: identity` y el header `X-No-Compression` para evitar discrepancias al comparar cuerpos planos. Si necesitas probar compresión explícitamente, establece manualmente el header en tu petición dentro del test.

## 📈 Monitoreo y Logs

### **Logging:**
- **Winston** para logging estructurado
- **Niveles** - error, warn, info, debug
- **Archivos** - error.log, combined.log
- **Consola** - En desarrollo

### **Health Check:**
```http
GET /health
```
Respuesta:
```json
{
  "success": true,
  "message": "RespiCare Backend API está funcionando",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "development",
  "version": "1.0.0"
}
```

## 📊 Jobs Programados

### **Jobs Automáticos:**
- **Alertas** (`alertJobs.ts`): Procesa alertas programadas y pendientes cada 30-45 segundos
- **Citas Médicas** (`appointmentJobs.ts`): Envía recordatorios de citas próximas
- **Reportes Automáticos** (`reportJobs.ts`): Genera reportes periódicos
  - **Diario**: Todos los días a las 23:59
  - **Semanal**: Domingos a las 23:59
  - **Mensual**: Día 1 de cada mes a las 00:00

Los jobs se inician automáticamente al arrancar el servidor y se detienen correctamente al recibir señales SIGTERM/SIGINT.

## 🤖 Integración con IA

### **Servicios AI Disponibles:**
- **Python/FastAPI** en puerto 8000
- **Análisis de síntomas** con Machine Learning (XGBoost + SHAP)
- **Clasificación de enfermedades** (124 enfermedades respiratorias)
- **Explicabilidad SHAP** - Factores de decisión y predicciones alternativas
- **Confianza del modelo**: 99.81% accuracy
- **Analytics ML**: Predicción de tendencias, detección de anomalías, clustering de riesgo

### **Endpoints de IA:**
```http
# Análisis de síntomas
POST http://localhost:8000/api/v1/analyze

# Análisis con explicación SHAP
POST http://localhost:8000/api/v1/ml-analyze

# Estado del servicio
GET http://localhost:8000/api/v1/health/detailed
```

### **Flujo de Integración:**
```mermaid
graph LR
    A[Backend API] --> B[AI Service]
    B --> C[XGBoost Model]
    B --> D[SHAP Explainer]
    C --> E[Predicción]
    D --> F[Explicabilidad]
    E --> A
    F --> A
```

## 🚀 Deployment

### **Docker:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

### **Variables de Producción:**
- `NODE_ENV=production`
- `MONGODB_URI` - Base de datos de producción
- `JWT_SECRET` - Clave secreta fuerte
- `CORS_ORIGINS` - Dominios permitidos

## 📚 Documentación

### **Documentación Técnica:**
- **[docs/backend/README.md](../docs/backend/README.md)** - Índice de documentación del backend
- **[docs/backend/SETUP.md](../docs/backend/SETUP.md)** - Guía de configuración e instalación
- **[docs/backend/CLEAN_ARCHITECTURE.md](../docs/backend/CLEAN_ARCHITECTURE.md)** - Arquitectura limpia implementada
- **[docs/backend/GDPR_HIPAA_POLICY.md](../docs/backend/GDPR_HIPAA_POLICY.md)** - Políticas de cumplimiento GDPR/HIPAA
- **[docs/backend/CORRECCIONES_LINTING.md](../docs/backend/CORRECCIONES_LINTING.md)** - Correcciones de linting y calidad

### **Swagger/OpenAPI:**
- Documentación disponible en `/api/docs`
- Esquemas de request/response
- Ejemplos de uso
- Autenticación incluida

### **Postman Collection:**
- Colección completa de endpoints
- Variables de entorno
- Tests automatizados
- Documentación integrada

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
- **Tests** - Jest + Supertest
- **Documentación** - JSDoc

## 📞 Soporte

- **Email** - soporte@respicare.com
- **Documentación** - [docs.respicare.com](https://docs.respicare.com)
- **Issues** - GitHub Issues
- **Discord** - [RespiCare Community](https://discord.gg/respicare)

---

**Desarrollado para RespiCare Tacna - Sistema de Gestión de Enfermedades Respiratorias** 🏥
