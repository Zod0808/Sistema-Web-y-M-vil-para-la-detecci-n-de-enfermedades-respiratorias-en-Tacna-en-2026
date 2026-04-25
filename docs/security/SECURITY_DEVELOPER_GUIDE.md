# 🔒 Guía de Seguridad para Desarrolladores - RespiCare Tacna

Guía corta de prácticas y restricciones de seguridad ya implementadas en el proyecto.

---

## 📋 Índice

1. [Principios de Seguridad](#principios-de-seguridad)
2. [Autenticación y Autorización](#autenticación-y-autorización)
3. [Protección de Datos](#protección-de-datos)
4. [Seguridad en Web](#seguridad-en-web)
5. [Seguridad en Mobile](#seguridad-en-mobile)
6. [Seguridad en Backend](#seguridad-en-backend)
7. [Restricciones y Mejores Prácticas](#restricciones-y-mejores-prácticas)

---

## Principios de Seguridad

### 1. Defense in Depth (Defensa en Profundidad)
- Múltiples capas de seguridad en cada nivel (cliente, servidor, base de datos, red)
- No confiar en una sola medida de seguridad

### 2. Least Privilege (Privilegio Mínimo)
- Usuarios y servicios solo tienen los permisos mínimos necesarios
- RBAC granular por rol y permiso

### 3. Secure by Default
- Configuración segura por defecto
- Requiere configuración explícita para relajar restricciones

### 4. Fail Secure
- En caso de error, el sistema debe fallar de forma segura (denegar acceso)

---

## Autenticación y Autorización

### Autenticación

#### Backend
- **JWT Tokens**: Todos los endpoints protegidos requieren token JWT válido
- **Middleware**: `authenticate` en `backend/src/middleware/auth.ts`
- **Expiración**: Tokens expiran según configuración (default: 24h)
- **Refresh Tokens**: Sistema de refresh para renovar tokens sin re-login

#### Web
- Tokens almacenados en memoria (no en localStorage por defecto)
- Auto-logout en caso de token expirado

#### Mobile
- Tokens almacenados en `expo-secure-store` (cifrado)
- Auto-logout y limpieza de datos en logout

### Autorización (RBAC)

#### Sistema de Roles
- **patient**: Usuario paciente (permisos básicos)
- **doctor**: Médico (permisos de lectura/escritura clínica)
- **admin**: Administrador (todos los permisos)

#### Sistema de Permisos Granulares

**Permisos por Rol**:

**Admin**:
- `reports:*` - Todos los permisos de reportes
- `dsr:export`, `dsr:delete` - Data Subject Rights
- `users:manage` - Gestión de usuarios
- `alerts:manage` - Gestión de alertas
- `prescriptions:*` - Todos los permisos de prescripciones
- `appointments:*` - Todos los permisos de citas
- `medical-histories:*` - Todos los permisos de historias
- `analytics:admin` - Analytics administrativos
- `bi:export` - Exportación BI
- `uploads:manage` - Gestión de uploads

**Doctor**:
- `reports:read`, `reports:export`
- `prescriptions:validate`, `prescriptions:create`, `prescriptions:read`
- `appointments:manage`, `appointments:read`, `appointments:create`, `appointments:update`
- `medical-histories:read`, `medical-histories:create`, `medical-histories:update`
- `analytics:read`
- `bi:export`
- `uploads:read`

**Patient**:
- `prescriptions:read` (solo propias)
- `appointments:read`, `appointments:create` (solo propias)
- `medical-histories:read`, `medical-histories:create` (solo propias)
- `uploads:read` (solo propios)

#### Uso en Endpoints

```typescript
// Por rol
router.get('/admin', requireRole('admin'), handler);

// Por permiso granular
router.post('/prescriptions', requirePermission('prescriptions:create'), handler);

// Múltiples roles
router.get('/dashboard', requireRole(['admin', 'doctor']), handler);
```

#### ⚠️ Restricciones

- **NUNCA** exponer endpoints sin autenticación (excepto login/register)
- **SIEMPRE** usar `requireRole` o `requirePermission` en endpoints sensibles
- **VALIDAR** en controladores que los usuarios solo accedan a sus propios recursos

---

## Protección de Datos

### Cifrado

#### En Reposo
- **Campos sensibles**: Cifrados con AES-256-GCM
- **Modelos protegidos**: `MedicalHistory`, `User`, `Prescription`, `Appointment`, `Alert`, `AIAnalysis`
- **Plugin de cifrado**: `backend/src/utils/encryption.ts`

#### En Tránsito
- **HTTPS obligatorio** en producción
- **HSTS** habilitado (maxAge: 15552000, includeSubDomains, preload)
- **TLS 1.2+** requerido

### Sanitización

#### Backend
- **express-mongo-sanitize**: Previene NoSQL injection
- **xss-clean**: Previene XSS
- **hpp**: Previene HTTP Parameter Pollution
- **Validación de inputs**: `express-validator` en todas las rutas

#### Web
- **DOMPurify** (recomendado) o sanitización básica
- **Validación de URLs** antes de usar en iframes/links
- **Sanitización de inputs** antes de renderizar

### Anonimización

- **PII Redaction**: En audit logs y analytics
- **Pseudonymization**: Para análisis estadísticos
- **Data Anonymization**: `backend/src/utils/anonymization.ts`

---

## Seguridad en Web

### Content Security Policy (CSP)

#### Configuración Actual
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' http://localhost:3001 https://api.respicare.local;
  frame-src 'none' https://www.youtube.com https://player.vimeo.com;
  frame-ancestors 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
  block-all-mixed-content;
" />
```

#### Enforcement en Cliente
- **CSP Enforcer**: `web/src/utils/cspEnforcer.js`
- Detecta y registra violaciones de CSP
- Bloquea `eval()` y `Function()` constructor

### Control de Iframes

#### ⚠️ Restricciones Estrictas

- **Por defecto**: `frame-src 'none'` (bloquea todos los iframes)
- **Lista blanca**: Solo dominios explícitamente permitidos (YouTube, Vimeo)
- **Sandbox restrictivo**: Solo `allow-scripts`, `allow-same-origin`, `allow-forms`
- **NO permitir**: `allow-popups`, `allow-top-navigation`, `allow-modals`

#### Uso Seguro

```javascript
import { createSafeIframe } from './utils/securityUtils';

// Crear iframe seguro
const iframe = createSafeIframe('https://www.youtube.com/embed/...', {
  width: 560,
  height: 315,
  title: 'Video educativo',
  allowedDomains: ['https://www.youtube.com'], // Lista blanca
});
```

### Sanitización de HTML

```javascript
import { sanitizeHTML } from './utils/securityUtils';

// Sanitizar HTML antes de renderizar
const safeHTML = sanitizeHTML(userInput));
```

### Validación de URLs

```javascript
import { isSafeURL } from './utils/securityUtils';

// Validar URL antes de usar
if (isSafeURL(url)) {
  // Usar URL
} else {
  // Rechazar URL
}
```

---

## Seguridad en Mobile

### Almacenamiento Seguro

- **Tokens**: `expo-secure-store` (cifrado nativo)
- **Datos sensibles**: Nunca en `AsyncStorage` sin cifrar
- **Logout**: Limpieza completa de datos (`clearAllData`)

### Protección de Pantalla

- **Screen Capture Prevention**: Activado en pantallas sensibles (Historial, IA, Citas)
- **Privacy Overlay**: Overlay cuando la app está en background
- **FLAG_SECURE**: Equivalente en Android (cuando esté disponible)

### Consentimiento (GDPR/HIPAA)

- **Pantalla de consentimiento**: `ConsentScreen.tsx`
- **Logs de consentimiento**: Almacenados en backend (`ConsentLog` model)
- **Versionado**: Versión de política de consentimiento
- **Revocación**: Usuarios pueden revocar consentimiento

#### Flujo de Consentimiento

1. Usuario ve pantalla de consentimiento al registrarse
2. Debe aceptar consentimientos requeridos
3. Consentimiento se registra localmente y en backend
4. Log de consentimiento con timestamp, IP, user-agent
5. Usuario puede revocar desde configuración

### Validación de Inputs

- Validación en cliente antes de enviar al backend
- Sanitización de inputs de usuario
- Validación de formatos (email, URL, etc.)

---

## Seguridad en Backend

### Headers de Seguridad

#### Helmet.js
```typescript
helmet({
  hsts: {
    maxAge: 15552000, // 180 días
    includeSubDomains: true,
    preload: true
  },
  contentSecurityPolicy: false // Configurado en HTML
})
```

#### Headers Adicionales
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

### Rate Limiting

- **Smart Rate Limiter**: Redis + fallback in-memory
- **Límites por ruta**: Configurables por endpoint
- **Límites por método**: GET más permisivo que POST/PUT/DELETE

### Validación de Inputs

#### Express-Validator
- Validación en todas las rutas
- Sanitización automática
- Mensajes de error descriptivos

```typescript
const validation = [
  body('email').isEmail().normalizeEmail(),
  body('age').isInt({ min: 0, max: 120 }),
  body('name').trim().isLength({ min: 1, max: 100 }),
];
```

### Audit Logging

- **Todas las acciones críticas** se registran en `AuditLog`
- **PII Redaction**: Datos sensibles se redactan antes de guardar
- **Retención**: Logs se purgan automáticamente (CronJob)
- **Trazabilidad**: IP, user-agent, timestamp, usuario

### WAF (Web Application Firewall)

- **ModSecurity** en Ingress (Kubernetes)
- **OWASP CRS** (Core Rule Set)
- **Rate limiting** a nivel de Ingress
- **Bloqueo de patrones maliciosos**

### DDoS Protection

- **Rate limiting** distribuido (Redis)
- **Límites de payload** (10MB max)
- **Timeout de requests** configurado
- **Connection pooling** limitado

---

## Restricciones y Mejores Prácticas

### ❌ NUNCA Hacer

1. **NUNCA** almacenar contraseñas en texto plano
2. **NUNCA** exponer endpoints sin autenticación (excepto login/register)
3. **NUNCA** confiar en validación solo del cliente
4. **NUNCA** usar `eval()` o `Function()` constructor
5. **NUNCA** crear iframes sin usar `createSafeIframe()`
6. **NUNCA** renderizar HTML sin sanitizar
7. **NUNCA** exponer información sensible en errores
8. **NUNCA** usar `unsafe-inline` o `unsafe-eval` en CSP (excepto cuando sea absolutamente necesario)
9. **NUNCA** almacenar tokens en localStorage (Web) o AsyncStorage sin cifrar (Mobile)
10. **NUNCA** permitir acceso a recursos sin validar propiedad del usuario

### ✅ SIEMPRE Hacer

1. **SIEMPRE** validar y sanitizar inputs del usuario
2. **SIEMPRE** usar HTTPS en producción
3. **SIEMPRE** usar RBAC granular (`requireRole` o `requirePermission`)
4. **SIEMPRE** validar propiedad de recursos en controladores
5. **SIEMPRE** registrar acciones críticas en audit logs
6. **SIEMPRE** cifrar datos sensibles en reposo
7. **SIEMPRE** usar parámetros preparados en queries (Mongoose lo hace automáticamente)
8. **SIEMPRE** limitar tamaño de payloads
9. **SIEMPRE** usar rate limiting en endpoints públicos
10. **SIEMPRE** mantener dependencias actualizadas

### 🔍 Checklist de Seguridad

Antes de hacer commit, verificar:

- [ ] ¿El endpoint requiere autenticación?
- [ ] ¿El endpoint tiene RBAC adecuado (`requireRole` o `requirePermission`)?
- [ ] ¿Se valida la propiedad del recurso en el controlador?
- [ ] ¿Los inputs están validados y sanitizados?
- [ ] ¿Se registran acciones críticas en audit logs?
- [ ] ¿Los datos sensibles están cifrados?
- [ ] ¿Se manejan errores sin exponer información sensible?
- [ ] ¿Se usa HTTPS en producción?
- [ ] ¿Se aplican rate limits donde corresponde?

---

## Pruebas de Seguridad

### OWASP ZAP

- **Workflow**: `.github/workflows/security-zap.yml`
- **Ejecución**: Manual (workflow_dispatch)
- **Reportes**: HTML, MD, JSON

### Pruebas de Penetración

- **Recomendado**: Ejecutar periódicamente (trimestral)
- **Herramientas**: OWASP ZAP, Burp Suite, Nessus
- **Documentación**: Registrar hallazgos y remediaciones

### Pruebas de Carga (DDoS Simulation)

- **Herramientas**: Apache Bench, wrk, k6
- **Objetivo**: Verificar que rate limiting y WAF funcionen correctamente

---

## Incidentes de Seguridad

### Proceso de Respuesta

1. **Detectar**: Monitoreo, alertas, reportes
2. **Contener**: Aislar sistemas afectados
3. **Eradicar**: Eliminar amenaza
4. **Recuperar**: Restaurar servicios
5. **Documentar**: Registrar incidente y lecciones aprendidas

### Reportar Vulnerabilidades

- **Email**: security@respicare.local (configurar según necesidad)
- **Proceso**: Reporte responsable de vulnerabilidades
- **Tiempo de respuesta**: 48 horas para confirmación

---

## Recursos Adicionales

- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **GDPR Compliance**: `backend/GDPR_HIPAA_POLICY.md`
- **Security Policy**: `SECURITY.md`
- **Audit Logs**: `backend/src/models/AuditLog.ts`

---

**Última actualización**: 2024-11-03  
**Versión**: 1.0.0

