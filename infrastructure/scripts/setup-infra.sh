#!/bin/bash

# Script de inicialización de infraestructura
# Configura y prepara el entorno de infraestructura para RespiCare

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.yml" ]; then
    error "Este script debe ejecutarse desde la raíz del proyecto"
    exit 1
fi

info "🚀 Iniciando configuración de infraestructura para RespiCare..."

# 1. Verificar dependencias
info "Verificando dependencias..."

check_command() {
    if command -v $1 &> /dev/null; then
        success "$1 está instalado"
        return 0
    else
        error "$1 no está instalado"
        return 1
    fi
}

MISSING_DEPS=0

check_command docker || MISSING_DEPS=1
check_command docker-compose || MISSING_DEPS=1
check_command kubectl || warning "kubectl no está instalado (opcional para K8s)"
check_command terraform || warning "terraform no está instalado (opcional para IaC)"

if [ $MISSING_DEPS -eq 1 ]; then
    error "Faltan dependencias requeridas. Por favor, instálalas antes de continuar."
    exit 1
fi

# 2. Crear directorios necesarios
info "Creando directorios de infraestructura..."

DIRECTORIES=(
    "infrastructure/k8s/secrets"
    "infrastructure/k8s/configs"
    "infrastructure/terraform/state"
    "infrastructure/backups"
    "infrastructure/logs"
    "infrastructure/certs"
    "mongodb/init"
    "mongodb/data"
    "mongodb/backups"
    "nginx/ssl"
    "nginx/logs"
    "redis/data"
    "redis/backups"
)

for dir in "${DIRECTORIES[@]}"; do
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        success "Directorio creado: $dir"
    else
        info "Directorio ya existe: $dir"
    fi
done

# 3. Configurar permisos
info "Configurando permisos..."

chmod 755 infrastructure/scripts/*.sh 2>/dev/null || true
chmod 600 infrastructure/k8s/secrets/*.yaml 2>/dev/null || true
chmod 644 infrastructure/k8s/*.yaml 2>/dev/null || true

success "Permisos configurados"

# 4. Verificar archivo .env
info "Verificando configuración de entorno..."

if [ ! -f ".env" ]; then
    warning "Archivo .env no encontrado"
    if [ -f "env.example" ]; then
        info "Copiando env.example a .env..."
        cp env.example .env
        warning "Por favor, edita el archivo .env con tus configuraciones antes de continuar"
    else
        error "No se encontró env.example. Por favor, crea un archivo .env manualmente."
        exit 1
    fi
else
    success "Archivo .env encontrado"
fi

# 5. Inicializar Terraform (si existe)
if [ -d "infrastructure/terraform" ] && command -v terraform &> /dev/null; then
    info "Inicializando Terraform..."
    cd infrastructure/terraform
    
    if [ ! -f "terraform.tfvars" ]; then
        if [ -f "terraform.tfvars.example" ]; then
            info "Copiando terraform.tfvars.example a terraform.tfvars..."
            cp terraform.tfvars.example terraform.tfvars
            warning "Por favor, edita terraform.tfvars con tus configuraciones"
        fi
    fi
    
    if [ -f "terraform.tfvars" ]; then
        terraform init
        success "Terraform inicializado"
    else
        warning "terraform.tfvars no encontrado. Saltando inicialización de Terraform."
    fi
    
    cd ../..
fi

# 6. Verificar conexión a Docker
info "Verificando conexión a Docker..."

if docker info &> /dev/null; then
    success "Docker está funcionando"
else
    error "No se puede conectar a Docker. Por favor, inicia Docker Desktop o el daemon de Docker."
    exit 1
fi

# 7. Verificar imágenes Docker necesarias
info "Verificando imágenes Docker..."

REQUIRED_IMAGES=(
    "mongo:latest"
    "redis:alpine"
    "nginx:alpine"
)

MISSING_IMAGES=0
for image in "${REQUIRED_IMAGES[@]}"; do
    if docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^${image}$"; then
        info "Imagen encontrada: $image"
    else
        warning "Imagen no encontrada: $image (se descargará al hacer build)"
        MISSING_IMAGES=1
    fi
done

# 8. Configurar Kubernetes (opcional)
if command -v kubectl &> /dev/null; then
    info "Verificando configuración de Kubernetes..."
    
    if kubectl cluster-info &> /dev/null; then
        success "Cluster de Kubernetes conectado"
        
        # Verificar namespaces
        if ! kubectl get namespace respicare &> /dev/null; then
            info "Creando namespace respicare..."
            kubectl create namespace respicare
            success "Namespace respicare creado"
        else
            info "Namespace respicare ya existe"
        fi
    else
        warning "No se puede conectar a un cluster de Kubernetes. Continuando sin K8s..."
    fi
else
    info "kubectl no está instalado. Saltando configuración de Kubernetes."
fi

# 9. Crear archivos de configuración de ejemplo si no existen
info "Verificando archivos de configuración..."

if [ ! -f "infrastructure/k8s/secrets/backend-secrets.yaml" ]; then
    if [ -f "infrastructure/k8s/backend-secrets.example.yaml" ]; then
        info "Copiando ejemplo de secrets..."
        cp infrastructure/k8s/backend-secrets.example.yaml infrastructure/k8s/secrets/backend-secrets.yaml
        warning "Por favor, edita infrastructure/k8s/secrets/backend-secrets.yaml con valores reales"
    fi
fi

# 10. Verificar salud de servicios (si están corriendo)
info "Verificando servicios existentes..."

if docker-compose ps 2>/dev/null | grep -q "Up"; then
    warning "Hay servicios Docker corriendo. Considera detenerlos antes de continuar con: docker-compose down"
else
    success "No hay servicios corriendo"
fi

# Resumen
echo ""
success "✅ Configuración de infraestructura completada!"
echo ""
info "Próximos pasos:"
echo "  1. Edita el archivo .env con tus configuraciones"
echo "  2. Si usas Kubernetes, edita los secrets en infrastructure/k8s/secrets/"
echo "  3. Si usas Terraform, edita terraform.tfvars con tus valores"
echo "  4. Ejecuta: docker-compose -f docker-compose.dev.yml up -d"
echo "  5. O ejecuta: ./infrastructure/scripts/validate-infra.sh para validar la configuración"
echo ""

