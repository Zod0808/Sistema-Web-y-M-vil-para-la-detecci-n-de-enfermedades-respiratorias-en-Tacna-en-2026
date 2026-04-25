# Scripts de Infraestructura - RespiCare

Este directorio contiene scripts para la gestión y automatización de la infraestructura del proyecto RespiCare.

## 📋 Scripts Disponibles

### 1. `setup-infra.sh` - Inicialización de Infraestructura

Configura y prepara el entorno de infraestructura.

**Uso:**
```bash
./infrastructure/scripts/setup-infra.sh
```

**Funcionalidades:**
- Verifica dependencias (Docker, Docker Compose, kubectl, Terraform)
- Crea directorios necesarios
- Configura permisos
- Verifica archivo `.env`
- Inicializa Terraform (si está disponible)
- Verifica conexión a Docker
- Configura Kubernetes (opcional)

### 2. `validate-infra.sh` - Validación de Infraestructura

Valida que la infraestructura esté correctamente configurada.

**Uso:**
```bash
./infrastructure/scripts/validate-infra.sh
```

**Funcionalidades:**
- Valida archivos esenciales
- Verifica variables de entorno en `.env`
- Valida Docker y Docker Compose
- Valida Kubernetes (opcional)
- Valida Terraform (opcional)
- Verifica servicios Docker corriendo
- Valida directorios y permisos
- Verifica conectividad de red

**Salida:**
- ✓ Validaciones pasadas
- ! Advertencias
- ✗ Validaciones fallidas

### 3. `deploy-infra.sh` - Deployment de Infraestructura

Despliega la infraestructura en el entorno especificado.

**Uso:**
```bash
# Desarrollo
./infrastructure/scripts/deploy-infra.sh dev deploy

# Staging
./infrastructure/scripts/deploy-infra.sh staging deploy

# Producción
./infrastructure/scripts/deploy-infra.sh prod deploy

# Rollback
./infrastructure/scripts/deploy-infra.sh dev rollback
```

**Funcionalidades:**
- Deployment con Docker Compose
- Deployment en Kubernetes (opcional)
- Deployment con Terraform (opcional)
- Rollback de deployments

**Nota:** Para producción, se requiere confirmación explícita.

### 4. `monitor-infra.sh` - Monitoreo de Infraestructura

Monitorea el estado y salud de la infraestructura.

**Uso:**
```bash
# Monitoreo único
./infrastructure/scripts/monitor-infra.sh

# Modo watch (actualización cada 5 segundos)
./infrastructure/scripts/monitor-infra.sh --watch
```

**Funcionalidades:**
- Estado de servicios Docker
- Estado de Kubernetes (deployments, pods, services, ingress)
- Estado de servicios de aplicación (Backend, AI Services, MongoDB, Redis)
- Recursos del sistema (CPU, memoria, disco)
- Logs recientes

### 5. `backup-infra.sh` - Backup y Restore

Realiza backups de datos y configuración.

**Uso:**
```bash
# Crear backup
./infrastructure/scripts/backup-infra.sh backup

# Listar backups
./infrastructure/scripts/backup-infra.sh list

# Restaurar backup
./infrastructure/scripts/backup-infra.sh restore <archivo_backup.tar.gz>
```

**Funcionalidades:**
- Backup de MongoDB
- Backup de Redis
- Backup de configuración (`.env`, `docker-compose.yml`, K8s manifests, Terraform)
- Backup de logs
- Compresión automática
- Restore de backups

**Ubicación de backups:** `infrastructure/backups/`

## 🔧 Requisitos

### Dependencias Requeridas
- **Docker** >= 20.10
- **Docker Compose** >= 1.29

### Dependencias Opcionales
- **kubectl** (para Kubernetes)
- **Terraform** >= 1.5.0 (para IaC)
- **curl** (para health checks)
- **tar** y **gzip** (para backups)

## 📝 Notas

### Permisos en Windows
En Windows, los scripts `.sh` requieren WSL (Windows Subsystem for Linux) o Git Bash para ejecutarse. Alternativamente, se pueden usar los scripts PowerShell equivalentes si están disponibles.

### Variables de Entorno
Asegúrate de tener configurado el archivo `.env` antes de ejecutar los scripts. Puedes copiar `env.example` a `.env` y editarlo según tus necesidades.

### Kubernetes
Los scripts de Kubernetes requieren:
- `kubectl` configurado y conectado a un cluster
- Namespace `respicare` creado (se crea automáticamente con `setup-infra.sh`)

### Terraform
Los scripts de Terraform requieren:
- `terraform.tfvars` configurado (puedes copiar `terraform.tfvars.example`)

## 🚀 Flujo de Trabajo Recomendado

1. **Inicialización:**
   ```bash
   ./infrastructure/scripts/setup-infra.sh
   ```

2. **Validación:**
   ```bash
   ./infrastructure/scripts/validate-infra.sh
   ```

3. **Deployment:**
   ```bash
   ./infrastructure/scripts/deploy-infra.sh dev deploy
   ```

4. **Monitoreo:**
   ```bash
   ./infrastructure/scripts/monitor-infra.sh --watch
   ```

5. **Backup (regular):**
   ```bash
   ./infrastructure/scripts/backup-infra.sh backup
   ```

## 📚 Documentación Adicional

- [README Principal](../../README.md)
- [Guía de Deployment](../../DEPLOYMENT.md)
- [Terraform README](../terraform/README.md)
- [Kubernetes Manifests](../k8s/)

## 🐛 Solución de Problemas

### Error: "Permission denied"
```bash
chmod +x infrastructure/scripts/*.sh
```

### Error: "Docker daemon not running"
Inicia Docker Desktop o el daemon de Docker.

### Error: "kubectl: command not found"
Instala kubectl o omite las funcionalidades de Kubernetes.

### Error: "terraform: command not found"
Instala Terraform o omite las funcionalidades de Terraform.

## 📞 Soporte

Para problemas o preguntas sobre los scripts, consulta la documentación principal del proyecto o crea un issue en el repositorio.

