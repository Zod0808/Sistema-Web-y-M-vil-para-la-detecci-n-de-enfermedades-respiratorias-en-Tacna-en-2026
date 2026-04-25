#!/bin/bash

# Script de deployment de infraestructura
# Despliega la infraestructura en el entorno especificado

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

# Verificar argumentos
ENVIRONMENT=${1:-dev}
ACTION=${2:-deploy}

if [ "$ENVIRONMENT" != "dev" ] && [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "prod" ]; then
    error "Entorno inválido: $ENVIRONMENT. Use: dev, staging, o prod"
    exit 1
fi

info "🚀 Iniciando deployment de infraestructura..."
info "Entorno: $ENVIRONMENT"
info "Acción: $ACTION"
echo ""

# Función para deploy con Docker Compose
deploy_docker_compose() {
    local env=$1
    local compose_file="docker-compose.yml"
    
    if [ "$env" = "dev" ]; then
        compose_file="docker-compose.dev.yml"
    elif [ "$env" = "prod" ]; then
        compose_file="docker-compose.prod.yml"
    fi
    
    if [ ! -f "$compose_file" ]; then
        error "Archivo $compose_file no encontrado"
        return 1
    fi
    
    info "Desplegando con Docker Compose ($compose_file)..."
    
    # Validar configuración
    docker-compose -f "$compose_file" config > /dev/null
    success "Configuración de Docker Compose válida"
    
    # Construir imágenes
    info "Construyendo imágenes..."
    docker-compose -f "$compose_file" build --no-cache
    
    # Iniciar servicios
    info "Iniciando servicios..."
    docker-compose -f "$compose_file" up -d
    
    # Esperar a que los servicios estén listos
    info "Esperando a que los servicios estén listos..."
    sleep 10
    
    # Verificar salud
    info "Verificando salud de los servicios..."
    docker-compose -f "$compose_file" ps
    
    success "Deployment con Docker Compose completado"
}

# Función para deploy con Kubernetes
deploy_kubernetes() {
    local env=$1
    
    if ! command -v kubectl &> /dev/null; then
        error "kubectl no está instalado"
        return 1
    fi
    
    if ! kubectl cluster-info &> /dev/null; then
        error "No se puede conectar a un cluster de Kubernetes"
        return 1
    fi
    
    info "Desplegando en Kubernetes (entorno: $env)..."
    
    # Aplicar namespaces
    if [ -f "infrastructure/k8s/namespaces.yaml" ]; then
        info "Aplicando namespaces..."
        kubectl apply -f infrastructure/k8s/namespaces.yaml
    fi
    
    # Aplicar secrets
    if [ -d "infrastructure/k8s/secrets" ]; then
        info "Aplicando secrets..."
        for secret_file in infrastructure/k8s/secrets/*.yaml; do
            if [ -f "$secret_file" ]; then
                kubectl apply -f "$secret_file"
            fi
        done
    fi
    
    # Aplicar configmaps
    if [ -f "infrastructure/k8s/nginx-load-balancer-config.yaml" ]; then
        info "Aplicando ConfigMaps..."
        kubectl apply -f infrastructure/k8s/nginx-load-balancer-config.yaml
    fi
    
    # Aplicar deployments
    info "Aplicando deployments..."
    for deployment_file in infrastructure/k8s/*-deployment.yaml; do
        if [ -f "$deployment_file" ]; then
            kubectl apply -f "$deployment_file"
        fi
    done
    
    # Aplicar services
    info "Aplicando services..."
    for service_file in infrastructure/k8s/*-service.yaml; do
        if [ -f "$service_file" ]; then
            kubectl apply -f "$service_file"
        fi
    done
    
    # Aplicar ingress
    if [ -f "infrastructure/k8s/backend-ingress.yaml" ]; then
        info "Aplicando Ingress..."
        kubectl apply -f infrastructure/k8s/backend-ingress.yaml
    fi
    
    if [ -f "infrastructure/k8s/web-ingress.yaml" ]; then
        kubectl apply -f infrastructure/k8s/web-ingress.yaml
    fi
    
    # Esperar a que los pods estén listos
    info "Esperando a que los pods estén listos..."
    kubectl wait --for=condition=ready pod --all -n respicare --timeout=300s || true
    
    # Mostrar estado
    info "Estado de los deployments:"
    kubectl get deployments -n respicare
    
    info "Estado de los pods:"
    kubectl get pods -n respicare
    
    success "Deployment en Kubernetes completado"
}

# Función para deploy con Terraform
deploy_terraform() {
    local env=$1
    
    if ! command -v terraform &> /dev/null; then
        error "Terraform no está instalado"
        return 1
    fi
    
    if [ ! -d "infrastructure/terraform" ]; then
        error "Directorio infrastructure/terraform no encontrado"
        return 1
    fi
    
    info "Desplegando con Terraform (entorno: $env)..."
    
    cd infrastructure/terraform
    
    # Inicializar si es necesario
    if [ ! -d ".terraform" ]; then
        info "Inicializando Terraform..."
        terraform init
    fi
    
    # Validar configuración
    info "Validando configuración..."
    terraform validate
    
    # Plan
    info "Generando plan de ejecución..."
    terraform plan -var="environment=$env" -out=tfplan
    
    # Aplicar (con confirmación para prod)
    if [ "$env" = "prod" ]; then
        warning "⚠️  Estás a punto de desplegar en PRODUCCIÓN"
        read -p "¿Continuar? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            info "Deployment cancelado"
            cd ../..
            return 1
        fi
    fi
    
    info "Aplicando cambios..."
    terraform apply tfplan
    
    # Mostrar outputs
    info "Outputs de Terraform:"
    terraform output
    
    cd ../..
    success "Deployment con Terraform completado"
}

# Función para rollback
rollback() {
    local env=$1
    
    warning "Iniciando rollback para entorno: $env"
    
    if command -v kubectl &> /dev/null && kubectl cluster-info &> /dev/null; then
        info "Haciendo rollback en Kubernetes..."
        kubectl rollout undo deployment --all -n respicare
        success "Rollback en Kubernetes completado"
    fi
    
    if [ -f "docker-compose.yml" ]; then
        info "Deteniendo servicios Docker..."
        docker-compose down
        success "Servicios Docker detenidos"
    fi
}

# Ejecutar acción
case "$ACTION" in
    deploy)
        # Intentar deploy con Docker Compose primero
        if [ -f "docker-compose.yml" ] || [ -f "docker-compose.dev.yml" ] || [ -f "docker-compose.prod.yml" ]; then
            deploy_docker_compose "$ENVIRONMENT"
        fi
        
        # Si kubectl está disponible, también deployar en K8s
        if command -v kubectl &> /dev/null && kubectl cluster-info &> /dev/null; then
            read -p "¿También desplegar en Kubernetes? (y/n): " deploy_k8s
            if [ "$deploy_k8s" = "y" ] || [ "$deploy_k8s" = "Y" ]; then
                deploy_kubernetes "$ENVIRONMENT"
            fi
        fi
        
        # Si Terraform está disponible, también deployar con Terraform
        if command -v terraform &> /dev/null && [ -d "infrastructure/terraform" ]; then
            read -p "¿También desplegar con Terraform? (y/n): " deploy_tf
            if [ "$deploy_tf" = "y" ] || [ "$deploy_tf" = "Y" ]; then
                deploy_terraform "$ENVIRONMENT"
            fi
        fi
        ;;
    rollback)
        rollback "$ENVIRONMENT"
        ;;
    *)
        error "Acción inválida: $ACTION. Use: deploy o rollback"
        exit 1
        ;;
esac

echo ""
success "✅ Deployment completado!"
info "Verifica el estado de los servicios con: ./infrastructure/scripts/monitor-infra.sh"

