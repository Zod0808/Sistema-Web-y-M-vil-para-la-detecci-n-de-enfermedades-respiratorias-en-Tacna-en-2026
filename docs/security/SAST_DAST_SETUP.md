# 🔒 Guía de Configuración SAST/DAST - RespiCare Tacna

Esta guía explica cómo configurar y usar los escaneos de seguridad estática (SAST) y dinámica (DAST) en el proyecto RespiCare.

---

## 📋 Índice

1. [Introducción](#introducción)
2. [SAST (Static Application Security Testing)](#sast-static-application-security-testing)
3. [DAST (Dynamic Application Security Testing)](#dast-dynamic-application-security-testing)
4. [Configuración de Secrets](#configuración-de-secrets)
5. [Ejecución Manual](#ejecución-manual)
6. [Interpretación de Resultados](#interpretación-de-resultados)
7. [Troubleshooting](#troubleshooting)
8. [Mejores Prácticas](#mejores-prácticas)

---

## Introducción

### ¿Qué es SAST?

**SAST (Static Application Security Testing)** analiza el código fuente, dependencias y configuración sin ejecutar la aplicación. Detecta vulnerabilidades antes de que el código llegue a producción.

**Herramientas implementadas:**
- **Snyk**: Análisis de dependencias y vulnerabilidades
- **SonarQube**: Análisis de código y calidad
- **Bandit**: Análisis de seguridad para Python
- **npm audit**: Auditoría de dependencias Node.js

### ¿Qué es DAST?

**DAST (Dynamic Application Security Testing)** analiza la aplicación en ejecución, simulando ataques reales. Detecta vulnerabilidades en tiempo de ejecución.

**Herramientas implementadas:**
- **OWASP ZAP**: Escaneo de aplicaciones web y APIs
- **Trivy**: Escaneo de contenedores Docker

---

## SAST (Static Application Security Testing)

### Workflow: `.github/workflows/sast-scan.yml`

Este workflow ejecuta múltiples herramientas SAST en paralelo:

#### Jobs Incluidos

1. **snyk-backend**: Escaneo Snyk del backend (Node.js)
2. **snyk-web**: Escaneo Snyk del frontend web
3. **snyk-mobile**: Escaneo Snyk de la aplicación mobile
4. **snyk-python**: Escaneo Snyk de AI Services (Python)
5. **sonarqube-backend**: Análisis SonarQube del backend
6. **sonarqube-python**: Análisis SonarQube de AI Services
7. **bandit-python**: Escaneo Bandit de código Python
8. **npm-audit-backend**: Auditoría npm del backend

### Cuándo se Ejecuta

- **Push** a `master`, `main`, o `develop`
- **Pull Requests** a `master`, `main`, o `develop`
- **Programado**: Cada domingo a las 3 AM UTC
- **Manual**: Usando `workflow_dispatch`

### Configuración Requerida

#### Snyk

1. **Crear cuenta en Snyk**: https://snyk.io
2. **Obtener token**:
   - Ve a Settings → API Token
   - Copia el token
3. **Agregar secret en GitHub**:
   - Settings → Secrets and variables → Actions
   - Agregar `SNYK_TOKEN` con tu token

#### SonarQube

1. **Instalar SonarQube** (local o cloud):
   - Cloud: https://sonarcloud.io (gratis para proyectos open source)
   - Local: https://www.sonarqube.org/downloads/
2. **Crear proyecto** en SonarQube
3. **Obtener token**:
   - My Account → Security → Generate Token
4. **Agregar secrets en GitHub**:
   - `SONAR_TOKEN`: Token de autenticación
   - `SONAR_HOST_URL`: URL de tu instancia (ej: `https://sonarcloud.io`)

### Ejecución Manual

```bash
# Desde GitHub Actions UI
1. Ve a Actions → SAST Security Scan
2. Click en "Run workflow"
3. Selecciona la rama
4. Click en "Run workflow"
```

### Interpretación de Resultados

#### Snyk

- **Severidad**: `low`, `medium`, `high`, `critical`
- **Tipo**: Vulnerabilidad de dependencia, código, configuración
- **Ubicación**: Archivo y línea específica
- **Solución**: Recomendaciones de actualización o parches

**Ejemplo de reporte:**
```
✗ High severity vulnerability found in axios@0.21.1
  Description: Server-Side Request Forgery (SSRF)
  Info: https://snyk.io/vuln/SNYK-JS-AXIOS-1038255
  Introduced through: backend/package.json
  Fix: Upgrade axios to 0.21.2
```

#### SonarQube

- **Issues**: Bugs, vulnerabilidades, code smells
- **Coverage**: Cobertura de código
- **Duplications**: Código duplicado
- **Quality Gate**: Pass/Fail según reglas configuradas

**Métricas clave:**
- **Security Hotspots**: Puntos de atención de seguridad
- **Vulnerabilities**: Vulnerabilidades confirmadas
- **Reliability**: Bugs que pueden causar fallos
- **Maintainability**: Code smells que afectan mantenibilidad

#### Bandit

- **Severity**: `LOW`, `MEDIUM`, `HIGH`
- **Confidence**: `LOW`, `MEDIUM`, `HIGH`
- **Test ID**: Identificador del test de seguridad
- **Ubicación**: Archivo y línea

**Ejemplo:**
```json
{
  "test_id": "B201",
  "test_name": "flask_debug_true",
  "issue_severity": "HIGH",
  "issue_confidence": "HIGH",
  "filename": "app.py",
  "line_number": 10
}
```

---

## DAST (Dynamic Application Security Testing)

### Workflow: `.github/workflows/dast-scan.yml`

Este workflow ejecuta escaneos dinámicos de seguridad:

#### Jobs Incluidos

1. **start-backend**: Inicia el backend para escaneo local
2. **zap-baseline-scan**: Escaneo rápido OWASP ZAP (default)
3. **zap-full-scan**: Escaneo completo OWASP ZAP (scheduled)
4. **zap-api-scan**: Escaneo de API usando OpenAPI spec
5. **trivy-container-scan**: Escaneo de imágenes Docker

### Cuándo se Ejecuta

- **Push** a `master` o `main` (solo backend)
- **Programado**: Cada lunes a las 2 AM UTC
- **Manual**: Usando `workflow_dispatch` con opciones:
  - `target_url`: URL a escanear (default: `http://localhost:3001`)
  - `scan_type`: `baseline`, `full-scan`, o `api-scan`

### Tipos de Escaneo ZAP

#### Baseline Scan (Rápido)

- **Duración**: ~5-10 minutos
- **Cobertura**: Vulnerabilidades comunes (OWASP Top 10)
- **Uso**: CI/CD, PRs
- **Comando**: `zaproxy/action-baseline@v0.10.0`

#### Full Scan (Completo)

- **Duración**: ~30-60 minutos
- **Cobertura**: Todas las vulnerabilidades conocidas
- **Uso**: Escaneos programados, pre-producción
- **Comando**: `zaproxy/action-full-scan@v0.10.0`

#### API Scan

- **Duración**: ~15-30 minutos
- **Cobertura**: Endpoints de API según OpenAPI spec
- **Uso**: Escaneo específico de APIs REST
- **Comando**: `zaproxy/action-api-scan@v0.10.0`
- **Requisito**: OpenAPI spec disponible en `/api-docs/openapi.yaml`

### Ejecución Manual

#### Escanear Backend Local

```bash
# Desde GitHub Actions UI
1. Ve a Actions → DAST Security Scan
2. Click en "Run workflow"
3. Deja target_url vacío (usa localhost:3001)
4. Selecciona scan_type: "baseline"
5. Click en "Run workflow"
```

#### Escanear URL Externa

```bash
# Desde GitHub Actions UI
1. Ve a Actions → DAST Security Scan
2. Click en "Run workflow"
3. Ingresa target_url: "https://api.respicare.dev"
4. Selecciona scan_type: "full-scan"
5. Click en "Run workflow"
```

### Interpretación de Resultados

#### OWASP ZAP

**Alertas por Severidad:**

- **High**: Vulnerabilidades críticas (ej: SQL Injection, XSS)
- **Medium**: Vulnerabilidades importantes (ej: CSRF, información sensible)
- **Low**: Problemas menores (ej: headers faltantes)
- **Informational**: Información útil (ej: tecnologías detectadas)

**Formato de Reportes:**

- **HTML**: `report_html.html` - Visual, fácil de leer
- **Markdown**: `report_md.md` - Para documentación
- **JSON**: `report_json.json` - Para procesamiento automático
- **SARIF**: `report_json.sarif` - Para GitHub Security tab

**Ejemplo de alerta:**
```markdown
## High: SQL Injection

**URL**: http://localhost:3001/api/v1/users?id=1' OR '1'='1
**Parameter**: id
**Evidence**: Database error message
**CWE**: CWE-89
**WASC**: WASC-19
```

#### Trivy

**Vulnerabilidades de Contenedores:**

- **CRITICAL**: Parches inmediatos requeridos
- **HIGH**: Parches urgentes recomendados
- **MEDIUM**: Parches recomendados
- **LOW**: Parches opcionales

**Tipos de vulnerabilidades:**

- **OS packages**: Vulnerabilidades en paquetes del sistema
- **Application dependencies**: Vulnerabilidades en dependencias
- **Misconfigurations**: Configuraciones inseguras

**Ejemplo:**
```
CRITICAL: CVE-2023-12345
Package: openssl
Version: 1.1.1f
Fixed in: 1.1.1t
Description: Buffer overflow in SSL/TLS
```

---

## Configuración de Secrets

### GitHub Secrets Requeridos

#### Para SAST

| Secret | Descripción | Dónde Obtenerlo |
|--------|-------------|-----------------|
| `SNYK_TOKEN` | Token de API de Snyk | https://snyk.io → Settings → API Token |
| `SONAR_TOKEN` | Token de autenticación SonarQube | SonarQube → My Account → Security → Generate Token |
| `SONAR_HOST_URL` | URL de instancia SonarQube | Tu instancia SonarQube (ej: `https://sonarcloud.io`) |

#### Para DAST

No se requieren secrets adicionales para DAST. Los escaneos ZAP y Trivy funcionan sin configuración adicional.

### Cómo Agregar Secrets

1. Ve a tu repositorio en GitHub
2. Settings → Secrets and variables → Actions
3. Click en "New repository secret"
4. Ingresa el nombre y valor
5. Click en "Add secret"

### Verificación

Para verificar que los secrets están configurados:

```bash
# Los workflows mostrarán errores específicos si faltan secrets
# Ejemplo: "SNYK_TOKEN not found" o "SONAR_TOKEN not found"
```

---

## Ejecución Manual

### Desde GitHub Actions UI

1. **Navegar a Actions**:
   - Ve a tu repositorio → pestaña "Actions"

2. **Seleccionar Workflow**:
   - **SAST**: "SAST Security Scan"
   - **DAST**: "DAST Security Scan"

3. **Ejecutar Workflow**:
   - Click en "Run workflow"
   - Selecciona la rama
   - (Para DAST) Ingresa parámetros opcionales
   - Click en "Run workflow"

4. **Monitorear Ejecución**:
   - Ve a la ejecución en curso
   - Revisa los logs de cada job
   - Descarga artifacts al finalizar

### Desde CLI (GitHub CLI)

```bash
# Instalar GitHub CLI
# https://cli.github.com

# Autenticar
gh auth login

# Ejecutar SAST scan
gh workflow run sast-scan.yml

# Ejecutar DAST scan con parámetros
gh workflow run dast-scan.yml \
  -f target_url=https://api.respicare.dev \
  -f scan_type=full-scan
```

### Desde Local (Snyk)

```bash
# Instalar Snyk CLI
npm install -g snyk

# Autenticar
snyk auth

# Escanear backend
cd backend
snyk test

# Escanear con reporte
snyk test --json > snyk-report.json
```

### Desde Local (Bandit)

```bash
# Instalar Bandit
pip install bandit[toml]

# Escanear AI Services
cd ai-services
bandit -r api/ core/ services/ ml_models/ -f json -o bandit-report.json
```

---

## Interpretación de Resultados

### Dónde Ver Resultados

1. **GitHub Security Tab**:
   - Ve a Security → Code scanning alerts
   - Filtra por herramienta (Snyk, SonarQube, ZAP, Trivy)

2. **GitHub Actions Artifacts**:
   - Ve a la ejecución del workflow
   - Descarga los artifacts (HTML, JSON, SARIF)

3. **SonarQube Dashboard**:
   - Ve a tu proyecto en SonarQube
   - Revisa métricas, issues, y quality gate

4. **Snyk Dashboard**:
   - Ve a tu proyecto en Snyk
   - Revisa vulnerabilidades y recomendaciones

### Priorización de Vulnerabilidades

#### Orden de Prioridad

1. **CRITICAL + Exploitable**: Parchear inmediatamente
2. **HIGH + Exploitable**: Parchear en 24-48 horas
3. **CRITICAL + No Exploitable**: Parchear en 1 semana
4. **HIGH + No Exploitable**: Parchear en 2 semanas
5. **MEDIUM**: Planificar parche en próximo sprint
6. **LOW**: Considerar en backlog

#### Factores a Considerar

- **Exploitability**: ¿Es fácil de explotar?
- **Impact**: ¿Qué datos/servicios están en riesgo?
- **Prevalence**: ¿Afecta a muchos endpoints/archivos?
- **Remediation**: ¿Qué tan fácil es parchear?

### Ejemplo de Triage

```markdown
## Vulnerabilidad: SQL Injection en /api/v1/users

**Severidad**: HIGH
**Exploitability**: Alta (fácil de explotar)
**Impact**: Crítico (acceso a datos de pacientes)
**Prevalence**: 1 endpoint

**Acción**: 
- [ ] Parchear inmediatamente
- [ ] Agregar validación de entrada
- [ ] Usar prepared statements
- [ ] Agregar test de seguridad
- [ ] Re-escanear después del parche
```

---

## Troubleshooting

### Problemas Comunes

#### SAST

**Error: "SNYK_TOKEN not found"**

```yaml
# Solución: Agregar secret en GitHub
# Settings → Secrets → Actions → New repository secret
# Nombre: SNYK_TOKEN
# Valor: Tu token de Snyk
```

**Error: "SONAR_TOKEN not found" o "SONAR_HOST_URL not found"**

```yaml
# Solución: Agregar secrets en GitHub
# SNYK_TOKEN: Token de SonarQube
# SONAR_HOST_URL: URL de tu instancia (ej: https://sonarcloud.io)
```

**Error: "Bandit scan failed"**

```bash
# Verificar que Bandit está instalado
pip install bandit[toml]

# Verificar que el código Python es válido
python -m py_compile api/**/*.py
```

#### DAST

**Error: "Backend failed to start"**

```yaml
# Verificar:
# 1. MongoDB service está corriendo
# 2. Variables de entorno están configuradas
# 3. Puerto 3001 no está en uso
# 4. Dependencias están instaladas
```

**Error: "ZAP scan timeout"**

```yaml
# Solución: Aumentar timeout en workflow
# O usar baseline scan en lugar de full scan
```

**Error: "OpenAPI spec not found" (API scan)**

```yaml
# Verificar que el backend expone OpenAPI spec en:
# - /api-docs/openapi.yaml
# - /api/v1/docs/openapi.yaml
# O proporcionar manualmente el spec
```

### Logs y Debugging

#### Ver Logs Completos

```bash
# En GitHub Actions
1. Ve a la ejecución del workflow
2. Click en el job que falló
3. Expande los steps
4. Revisa los logs completos
```

#### Habilitar Debug Mode

```yaml
# Agregar al workflow (temporalmente)
env:
  ACTIONS_STEP_DEBUG: true
  ACTIONS_RUNNER_DEBUG: true
```

---

## Mejores Prácticas

### Integración en CI/CD

1. **SAST en cada PR**:
   - Ejecutar escaneos rápidos (Snyk, npm audit)
   - Bloquear merge si hay vulnerabilidades CRITICAL

2. **DAST en staging**:
   - Ejecutar antes de deploy a producción
   - Escaneo completo semanal

3. **Escaneos programados**:
   - SAST completo: Domingos 3 AM UTC
   - DAST completo: Lunes 2 AM UTC

### Remediation Workflow

1. **Identificar vulnerabilidad**:
   - Revisar reporte SAST/DAST
   - Verificar exploitability e impact

2. **Crear issue**:
   - Título: `[SECURITY] [SEVERITY] Descripción`
   - Etiquetas: `security`, `vulnerability`, `severity-level`
   - Asignar a desarrollador

3. **Parchear**:
   - Crear branch: `security/fix-CVE-XXXX-XXXX`
   - Implementar fix
   - Agregar test de seguridad

4. **Verificar**:
   - Re-ejecutar escaneo SAST/DAST
   - Verificar que la vulnerabilidad desapareció

5. **Merge y Deploy**:
   - Merge a main
   - Deploy a producción
   - Cerrar issue

### Configuración de Quality Gates

#### SonarQube Quality Gate

```yaml
# Configurar en SonarQube:
- Coverage: > 80%
- Duplications: < 3%
- Security Hotspots: 0
- Vulnerabilities: 0
- Bugs: < 10
```

#### Snyk Policy

```yaml
# Configurar en Snyk:
- Fail build on: CRITICAL, HIGH
- Ignore: LOW (con justificación)
- Auto-fix: MEDIUM, LOW (con revisión)
```

### Mantenimiento

1. **Actualizar herramientas**:
   - Revisar actualizaciones de Snyk, SonarQube, ZAP
   - Actualizar workflows cada 3-6 meses

2. **Revisar falsos positivos**:
   - Marcar como "won't fix" en SonarQube
   - Agregar a `.snyk` policy file
   - Documentar justificación

3. **Monitorear tendencias**:
   - Revisar métricas de seguridad semanalmente
   - Identificar patrones de vulnerabilidades
   - Mejorar procesos de desarrollo

---

## Recursos Adicionales

### Documentación Oficial

- **Snyk**: https://docs.snyk.io
- **SonarQube**: https://docs.sonarqube.org
- **OWASP ZAP**: https://www.zaproxy.org/docs
- **Trivy**: https://aquasecurity.github.io/trivy
- **Bandit**: https://bandit.readthedocs.io

### Estándares y Frameworks

- **OWASP Top 10**: https://owasp.org/www-project-top-ten
- **CWE**: https://cwe.mitre.org
- **CVE**: https://cve.mitre.org

### Herramientas Relacionadas

- **GitHub Security**: https://github.com/features/security
- **Dependabot**: https://docs.github.com/en/code-security/dependabot
- **CodeQL**: https://codeql.github.com

---

## 📝 Notas Finales

- Los escaneos SAST/DAST son **complementarios**, no sustitutos
- **SAST** encuentra vulnerabilidades en código
- **DAST** encuentra vulnerabilidades en ejecución
- Usa ambos para cobertura completa

- Los escaneos pueden generar **falsos positivos**
- Siempre verifica manualmente antes de parchear
- Documenta decisiones de "won't fix"

- La seguridad es un **proceso continuo**
- Ejecuta escaneos regularmente
- Mantén herramientas actualizadas
- Educa al equipo sobre mejores prácticas

---

**Última actualización**: Noviembre 2025

**Mantenedor**: Equipo de Seguridad RespiCare

