# 🛡️ Pruebas de WAF y DDoS - RespiCare Tacna

Documentación de pruebas de seguridad (WAF, DDoS) y hallazgos.

---

## 📋 Índice

1. [Configuración WAF](#configuración-waf)
2. [Pruebas de WAF](#pruebas-de-waf)
3. [Pruebas de DDoS](#pruebas-de-ddos)
4. [OWASP ZAP](#owasp-zap)
5. [Hallazgos y Remedios](#hallazgos-y-remedios)

---

## Configuración WAF

### ModSecurity en Kubernetes

**Ubicación**: `infrastructure/k8s/backend-ingress.yaml`

**Configuración**:
- **WAF**: ModSecurity habilitado
- **OWASP CRS**: Core Rule Set activado
- **Modo**: Detección (puede cambiar a bloqueo en producción)
- **Rate Limiting**: Configurado a nivel de Ingress

### Reglas Personalizadas

```yaml
annotations:
  nginx.ingress.kubernetes.io/enable-modsecurity: "true"
  nginx.ingress.kubernetes.io/enable-owasp-core-ruleset: "true"
  nginx.ingress.kubernetes.io/modsecurity-snippet: |
    SecRuleEngine On
    SecRequestBodyAccess On
    SecResponseBodyAccess On
```

---

## Pruebas de WAF

### 1. SQL Injection

#### Prueba
```bash
curl -X POST https://api.respicare.local/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@test.com'\'' OR 1=1--", "password": "test"}'
```

#### Resultado Esperado
- **WAF**: Bloquea la request (403 Forbidden)
- **Log**: Registrado en ModSecurity logs
- **Audit Log**: Registrado en backend

### 2. XSS (Cross-Site Scripting)

#### Prueba
```bash
curl -X POST https://api.respicare.local/api/v1/medical-histories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"patientName": "<script>alert(\"XSS\")</script>", ...}'
```

#### Resultado Esperado
- **WAF**: Bloquea la request (403 Forbidden)
- **Backend**: También sanitiza con `xss-clean`
- **Doble protección**: WAF + Backend

### 3. Path Traversal

#### Prueba
```bash
curl -X GET "https://api.respicare.local/api/v1/upload/file-info/../../../etc/passwd" \
  -H "Authorization: Bearer $TOKEN"
```

#### Resultado Esperado
- **WAF**: Bloquea la request
- **Backend**: Validación de ruta también previene acceso

### 4. Command Injection

#### Prueba
```bash
curl -X POST https://api.respicare.local/api/v1/symptom-analyzer \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"symptoms": [{"name": "test; rm -rf /", ...}]}'
```

#### Resultado Esperado
- **WAF**: Bloquea la request
- **Backend**: No ejecuta comandos del sistema

---

## Pruebas de DDoS

### 1. Rate Limiting

#### Prueba con Apache Bench
```bash
# 1000 requests, 100 concurrent
ab -n 1000 -c 100 -H "Authorization: Bearer $TOKEN" \
  https://api.respicare.local/api/v1/dashboard/doctor
```

#### Resultado Esperado
- **Rate Limiter**: Limita requests por IP/usuario
- **Respuestas 429**: Too Many Requests después del límite
- **Redis**: Almacena contadores de rate limiting

### 2. Slowloris Attack

#### Prueba
```bash
# Enviar requests lentas para agotar conexiones
slowhttptest -c 1000 -H -i 10 -r 200 -t GET -u https://api.respicare.local/health
```

#### Resultado Esperado
- **Timeout configurado**: Requests lentas se cierran
- **Connection pooling**: Límite de conexiones simultáneas
- **WAF**: Puede detectar y bloquear patrones de Slowloris

### 3. HTTP Flood

#### Prueba con wrk
```bash
# 1000 conexiones, 10 threads, 30 segundos
wrk -t 10 -c 1000 -d 30s https://api.respicare.local/health
```

#### Resultado Esperado
- **Rate Limiting**: Limita requests por segundo
- **WAF**: Puede detectar y bloquear IPs maliciosas
- **Load Balancer**: Distribuye carga

### 4. Payload Size Attack

#### Prueba
```bash
# Enviar payload muy grande
curl -X POST https://api.respicare.local/api/v1/medical-histories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  --data @large_payload.json  # > 10MB
```

#### Resultado Esperado
- **Backend**: Rechaza payloads > 10MB (413 Payload Too Large)
- **WAF**: También puede bloquear payloads grandes

---

## OWASP ZAP

### Configuración

**Workflow**: `.github/workflows/security-zap.yml`

**Ejecución**:
```bash
# Manual desde GitHub Actions
# O localmente:
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://api.respicare.local \
  -J zap-report.json \
  -r zap-report.html
```

### Escaneo Básico

**Comandos**:
- `-a`: Atacar (modo activo)
- `-m 5`: Tiempo máximo de escaneo (5 minutos)
- `-J`: Reporte JSON
- `-r`: Reporte HTML

### Reglas Personalizadas

**Archivo**: `.zap/rules.tsv` (si existe)

**Formato**: TSV con reglas a ignorar o ajustar

---

## Hallazgos y Remedios

### Hallazgos Conocidos

#### 1. CSP con `unsafe-inline` y `unsafe-eval`
- **Severidad**: Media
- **Descripción**: React requiere `unsafe-inline` para estilos inline y `unsafe-eval` para hot-reload en desarrollo
- **Remedio**: 
  - En producción, usar nonces para scripts inline
  - Deshabilitar `unsafe-eval` en producción
  - Usar webpack para generar hashes de scripts

#### 2. Rate Limiting Básico
- **Severidad**: Baja
- **Descripción**: Rate limiting funciona pero podría ser más granular
- **Remedio**: 
  - Implementar rate limiting por endpoint
  - Diferentes límites para diferentes tipos de usuarios
  - Whitelist para IPs confiables

#### 3. WAF en Modo Detección
- **Severidad**: Media
- **Descripción**: WAF está en modo detección, no bloqueo
- **Remedio**: 
  - Cambiar a modo bloqueo en producción
  - Monitorear falsos positivos
  - Ajustar reglas según necesidad

### Pruebas Pendientes

- [ ] Prueba de carga distribuida (múltiples IPs)
- [ ] Prueba de Slow POST
- [ ] Prueba de HTTP/2 Rapid Reset
- [ ] Prueba de amplificación DNS
- [ ] Prueba de botnets simulados

### Métricas de Seguridad

#### WAF
- **Requests bloqueados**: Monitorear en logs de ModSecurity
- **Falsos positivos**: Revisar y ajustar reglas
- **Tiempo de respuesta**: WAF no debe agregar >50ms de latencia

#### DDoS Protection
- **Requests por segundo**: Monitorear picos
- **Rate limit hits**: Contar 429 responses
- **Uptime durante ataque**: Objetivo >99%

---

## Herramientas Recomendadas

### Escaneo de Vulnerabilidades
- **OWASP ZAP**: Escaneo automático
- **Burp Suite**: Escaneo manual avanzado
- **Nessus**: Escaneo de infraestructura

### Pruebas de Carga
- **Apache Bench (ab)**: Pruebas básicas
- **wrk**: Pruebas de alto rendimiento
- **k6**: Pruebas con scripting
- **Locust**: Pruebas distribuidas

### Monitoreo
- **ModSecurity logs**: Revisar bloqueos
- **Prometheus**: Métricas de rate limiting
- **Grafana**: Dashboards de seguridad

---

## Proceso de Pruebas

### Frecuencia

- **OWASP ZAP**: Semanal (CI/CD)
- **Pruebas de carga**: Mensual
- **Penetration testing**: Trimestral
- **Auditoría de seguridad**: Anual

### Reportes

- **Formato**: HTML, JSON, Markdown
- **Almacenamiento**: Artifacts de GitHub Actions
- **Revisión**: Equipo de seguridad
- **Remediación**: Issues de GitHub con etiqueta `security`

---

## Checklist de Pruebas

### Pre-Producción

- [ ] OWASP ZAP sin vulnerabilidades críticas
- [ ] Rate limiting funcionando
- [ ] WAF bloqueando ataques conocidos
- [ ] Headers de seguridad configurados
- [ ] Cifrado en tránsito (HTTPS)
- [ ] Cifrado en reposo verificado
- [ ] Audit logs funcionando
- [ ] RBAC en todos los endpoints

### Post-Despliegue

- [ ] Monitoreo de WAF activo
- [ ] Alertas configuradas
- [ ] Logs centralizados
- [ ] Backup de configuración
- [ ] Plan de respuesta a incidentes

---

**Última actualización**: 2024-11-03  
**Versión**: 1.0.0

