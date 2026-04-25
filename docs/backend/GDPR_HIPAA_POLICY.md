## 🛡️ Política de Privacidad y Cumplimiento (GDPR/HIPAA) - Backend RespiCare

> Documento de alto nivel para desarrolladores. No sustituye asesoría legal.

### 1. Principios de Tratamiento de Datos
- **Minimización de datos**: solo se almacenan campos clínicos necesarios para diagnóstico, seguimiento y alertas.
- **Limitación de finalidad**: los datos se usan para:
  - Atención clínica (historias, citas, prescripciones, alertas).
  - Analítica agregada/anónima para calidad del servicio.
- **Retención limitada**:
  - Logs de auditoría: 180 días (CronJob de purga).
  - Backups: política de retención gestionada en Restic/S3 (configurable por entorno).

### 2. Seguridad Técnica
- **En tránsito**:
  - HTTPS obligatorio (Ingress + HSTS + `enforceHttps`).
  - TLS gestionado por cert‑manager + Let’s Encrypt.
- **En reposo**:
  - Cifrado de campos sensibles con AES‑256‑GCM (plugin `applyFieldEncryption`).
  - Backups encriptados con Restic y contraseñas/keys en secretos K8s.
- **Protección frente a ataques**:
  - WAF (ModSecurity + OWASP CRS) a nivel de Ingress.
  - Rate limiting inteligente + límites adicionales en Nginx Ingress.
  - Sanitización y headers de seguridad (`helmet`, `xss-clean`, `mongo-sanitize`, `hpp`).

### 3. Auditoría y Trazabilidad
- **AuditLog**:
  - Registra: método, ruta, estado, IP, user-agent, userId, hash de payload y payload redactado.
  - Uso: reconstrucción de acciones para investigación/pentesting/forense.
- **Retención y acceso**:
  - Acceso restringido a roles de seguridad/administración.
  - Purga automática mediante CronJob `backend-auditlog-purge`.

### 4. Derechos de los Sujetos de Datos (DSR)
- **Exportación de datos**:
  - Endpoint: `GET /api/v1/dsr/export/:userId?includeRaw=false`.
  - Control de acceso: solo `admin` con permiso `dsr:export`.
  - Soporta dataset anonimizado (por defecto) o crudo (solo en flujos internos controlados).
- **Borrado de datos**:
  - Endpoint: `DELETE /api/v1/dsr/delete/:userId`.
  - Requiere:
    - Cabecera `X-Confirm-Action: yes`.
    - `confirm=true` en body o `?confirm=yes` en query.
  - Acciones:
    - Soft‑delete de usuario (desactivado, nombre/avatar redactados).
    - Borrado de historias, citas, prescripciones, alertas, wearables y análisis de IA asociados.
  - Consideraciones:
    - Backups históricos pueden seguir conteniendo datos hasta su caducidad.
    - Se recomienda registro de solicitud DSR en sistema externo de tickets/compliance.

### 5. Roles y RBAC
- Roles principales: `patient`, `doctor`, `admin`.
- Permisos gestionados por `middleware/rbac.ts`:
  - `reports:*`, `prescriptions:validate`, `alerts:manage`, `users:manage`, `dsr:export`, `dsr:delete`, etc.
- Principio de mínimo privilegio:
  - Los pacientes solo acceden a sus propios datos.
  - Los doctores solo acceden a pacientes que atienden (validación en controladores).
  - Solo `admin` puede ejecutar acciones globales (DSR, métricas sensibles, configuración).

### 6. Procedimientos Operativos Recomendados
- **Pentesting y revisiones**:
  - Usar workflow `.github/workflows/security-zap.yml` como escaneo base.
  - Programar pentests manuales periódicos y revisiones de configuración WAF.
- **Gestión de incidentes**:
  - Centralizar logs (incluyendo AuditLog) en plataforma SIEM externa.
  - Definir runbooks de respuesta a incidentes (fuera del alcance de este repo).

### 7. Checklist para Nuevas Funcionalidades Backend
Antes de mergear una nueva feature que toque datos personales/clinicos:
- [ ] ¿Se han añadido solo los campos estrictamente necesarios?
- [ ] ¿Campos sensibles están cifrados si se guardan en Mongo?
- [ ] ¿Se ha actualizado el RBAC si expone nuevas capacidades de administración?
- [ ] ¿Se respeta la visibilidad por rol (patient/doctor/admin)?
- [ ] ¿Se ha considerado impacto en DSR (export/borrado) y auditoría?


