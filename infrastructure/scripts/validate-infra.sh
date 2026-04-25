#!/bin/bash

# Script de validación de infraestructura
# Valida que la infraestructura esté correctamente configurada

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Contadores
PASSED=0
FAILED=0
WARNINGS=0

# Función para imprimir mensajes
info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[✓]${NC} $1"
    ((PASSED++))
}

warning() {
    echo -e "${YELLOW}[!]${NC} $1"
    ((WARNINGS++))
}

error() {
    echo -e "${RED}[✗]${NC} $1"
    ((FAILED++))
}

info "🔍 Validando configuración de infraestructura para RespiCare..."
echo ""

# 1. Verificar archivos esenciales
info "1. Verificando archivos esenciales..."

REQUIRED_FILES=(
    "docker-compose.yml"
    ".env"
    "infrastructure/k8s/backend-deployment.yaml"
    "infrastructure/k8s/backend-ingress.yaml"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        success "Archivo encontrado: $file"
    else
        error "Archivo faltante: $file"
    fi
done

# 2. Validar archivo .env
info ""
info "2. Validando archivo .env..."

if [ ! -f ".env" ]; then
    error "Archivo .env no encontrado"
else
    success "Archivo .env existe"
    
    # Verificar variables críticas
    REQUIRED_VARS=(
        "MONGODB_URI"
        "JWT_SECRET"
        "NODE_ENV"
    )
    
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^${var}=" .env; then
            value=$(grep "^${var}=" .env | cut -d '=' -f2)
            if [ -z "$value" ] || [ "$value" = "" ]; then
                error "Variable $var está vacía en .env"
            else
                success "Variable $var configurada"
            fi
        else
            error "Variable $var no encontrada en .env"
        fi
    done
fi

# 3. Validar Docker
info ""
info "3. Validando Docker..."

if command -v docker &> /dev/null; then
    success "Docker está instalado"
    
    if docker info &> /dev/null; then
        success "Docker daemon está corriendo"
        
        # Verificar versión mínima
        DOCKER_VERSION=$(docker --version | grep -oE '[0-9]+\.[0-9]+' | head -1)
        if [ "$(printf '%s\n' "20.10" "$DOCKER_VERSION" | sort -V | head -n1)" = "20.10" ]; then
            success "Versión de Docker: $DOCKER_VERSION (>= 20.10)"
        else
            warning "Versión de Docker: $DOCKER_VERSION (se recomienda >= 20.10)"
        fi
    else
        error "Docker daemon no está corriendo"
    fi
else
    error "Docker no está instalado"
fi

if command -v docker-compose &> /dev/null; then
    success "Docker Compose está instalado"
    
    COMPOSE_VERSION=$(docker-compose --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    success "Versión de Docker Compose: $COMPOSE_VERSION"
else
    error "Docker Compose no está instalado"
fi

# 4. Validar Kubernetes (opcional)
info ""
info "4. Validando Kubernetes (opcional)..."

if command -v kubectl &> /dev/null; then
    success "kubectl está instalado"
    
    if kubectl cluster-info &> /dev/null 2>&1; then
        success "Cluster de Kubernetes conectado"
        
        # Verificar namespace
        if kubectl get namespace respicare &> /dev/null; then
            success "Namespace 'respicare' existe"
        else
            warning "Namespace 'respicare' no existe (se puede crear con setup-infra.sh)"
        fi
        
        # Verificar recursos
        if kubectl get deployments -n respicare &> /dev/null; then
            DEPLOYMENTS=$(kubectl get deployments -n respicare --no-headers 2>/dev/null | wc -l)
            if [ "$DEPLOYMENTS" -gt 0 ]; then
                success "Deployments encontrados en namespace respicare: $DEPLOYMENTS"
            else
                warning "No hay deployments en namespace respicare"
            fi
        fi
    else
        warning "No se puede conectar a un cluster de Kubernetes"
    fi
else
    warning "kubectl no está instalado (opcional)"
fi

# 5. Validar Terraform (opcional)
info ""
info "5. Validando Terraform (opcional)..."

if command -v terraform &> /dev/null; then
    success "Terraform está instalado"
    
    TERRAFORM_VERSION=$(terraform version -json | grep -oE '"terraform_version":"[^"]*"' | cut -d'"' -f4)
    success "Versión de Terraform: $TERRAFORM_VERSION"
    
    if [ -d "infrastructure/terraform" ]; then
        cd infrastructure/terraform
        
        if [ -f "terraform.tfvars" ]; then
            success "terraform.tfvars encontrado"
            
            if terraform init &> /dev/null; then
                success "Terraform inicializado correctamente"
                
                if terraform validate &> /dev/null; then
                    success "Configuración de Terraform es válida"
                else
                    error "Configuración de Terraform tiene errores"
                fi
            else
                warning "Error al inicializar Terraform"
            fi
        else
            warning "terraform.tfvars no encontrado"
        fi
        
        cd ../..
    else
        warning "Directorio infrastructure/terraform no encontrado"
    fi
else
    warning "Terraform no está instalado (opcional)"
fi

# 6. Validar servicios Docker (si están corriendo)
info ""
info "6. Validando servicios Docker..."

if docker-compose ps 2>/dev/null | grep -q "Up"; then
    info "Servicios Docker detectados, validando salud..."
    
    SERVICES=("backend" "ai-services" "mongodb" "redis")
    
    for service in "${SERVICES[@]}"; do
        if docker-compose ps | grep -q "$service.*Up"; then
            # Intentar health check
            if docker-compose exec -T "$service" echo "OK" &> /dev/null 2>&1; then
                success "Servicio $service está corriendo y respondiendo"
            else
                warning "Servicio $service está corriendo pero no responde"
            fi
        else
            warning "Servicio $service no está corriendo"
        fi
    done
else
    info "No hay servicios Docker corriendo (esto es normal si no has iniciado los servicios)"
fi

# 7. Validar directorios y permisos
info ""
info "7. Validando directorios y permisos..."

REQUIRED_DIRS=(
    "infrastructure/k8s"
    "infrastructure/terraform"
    "mongodb/data"
    "nginx/ssl"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        if [ -w "$dir" ]; then
            success "Directorio $dir existe y es escribible"
        else
            error "Directorio $dir existe pero no es escribible"
        fi
    else
        warning "Directorio $dir no existe (se puede crear con setup-infra.sh)"
    fi
done

# 8. Validar conectividad de red
info ""
info "8. Validando conectividad de red..."

if ping -c 1 8.8.8.8 &> /dev/null; then
    success "Conectividad a Internet: OK"
else
    error "Sin conectividad a Internet"
fi

# Resumen
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
info "📊 Resumen de validación:"
echo ""
success "✓ Validaciones pasadas: $PASSED"
if [ $WARNINGS -gt 0 ]; then
    warning "! Advertencias: $WARNINGS"
fi
if [ $FAILED -gt 0 ]; then
    error "✗ Validaciones fallidas: $FAILED"
fi
echo ""

if [ $FAILED -eq 0 ]; then
    success "✅ Infraestructura validada correctamente!"
    exit 0
else
    error "❌ Hay problemas que deben resolverse antes de continuar"
    exit 1
fi

