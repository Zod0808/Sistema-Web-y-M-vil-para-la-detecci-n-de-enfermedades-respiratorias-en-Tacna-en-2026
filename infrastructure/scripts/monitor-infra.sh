#!/bin/bash

# Script de monitoreo de infraestructura
# Monitorea el estado y salud de la infraestructura

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

error() {
    echo -e "${RED}[✗]${NC} $1"
}

header() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Monitorear Docker
monitor_docker() {
    header "🐳 Estado de Servicios Docker"
    
    if ! command -v docker &> /dev/null; then
        error "Docker no está instalado"
        return
    fi
    
    if ! docker info &> /dev/null; then
        error "Docker daemon no está corriendo"
        return
    fi
    
    # Servicios corriendo
    info "Servicios corriendo:"
    docker-compose ps 2>/dev/null || docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    echo ""
    
    # Uso de recursos
    info "Uso de recursos Docker:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" 2>/dev/null || echo "No hay contenedores corriendo"
    
    echo ""
    
    # Espacio en disco
    info "Espacio en disco Docker:"
    docker system df
}

# Monitorear Kubernetes
monitor_kubernetes() {
    header "☸️  Estado de Kubernetes"
    
    if ! command -v kubectl &> /dev/null; then
        warning "kubectl no está instalado"
        return
    fi
    
    if ! kubectl cluster-info &> /dev/null; then
        warning "No se puede conectar a un cluster de Kubernetes"
        return
    fi
    
    # Namespaces
    info "Namespaces:"
    kubectl get namespaces | grep -E "NAME|respicare" || echo "Namespace respicare no encontrado"
    
    echo ""
    
    # Deployments
    info "Deployments:"
    kubectl get deployments -n respicare 2>/dev/null || echo "No hay deployments en namespace respicare"
    
    echo ""
    
    # Pods
    info "Pods:"
    kubectl get pods -n respicare 2>/dev/null || echo "No hay pods en namespace respicare"
    
    echo ""
    
    # Services
    info "Services:"
    kubectl get services -n respicare 2>/dev/null || echo "No hay services en namespace respicare"
    
    echo ""
    
    # Ingress
    info "Ingress:"
    kubectl get ingress -n respicare 2>/dev/null || echo "No hay ingress en namespace respicare"
    
    echo ""
    
    # Recursos de nodos
    info "Recursos de nodos:"
    kubectl top nodes 2>/dev/null || echo "No se puede obtener métricas de nodos (métricas-server puede no estar instalado)"
}

# Monitorear servicios de aplicación
monitor_services() {
    header "🔍 Estado de Servicios de Aplicación"
    
    # Backend
    info "Backend API:"
    if curl -s -f http://localhost:3001/health > /dev/null 2>&1; then
        success "Backend está respondiendo (http://localhost:3001)"
        RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' http://localhost:3001/health)
        info "  Tiempo de respuesta: ${RESPONSE_TIME}s"
    else
        error "Backend no está respondiendo (http://localhost:3001)"
    fi
    
    echo ""
    
    # AI Services
    info "AI Services:"
    if curl -s -f http://localhost:8000/health > /dev/null 2>&1; then
        success "AI Services está respondiendo (http://localhost:8000)"
        RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' http://localhost:8000/health)
        info "  Tiempo de respuesta: ${RESPONSE_TIME}s"
    else
        error "AI Services no está respondiendo (http://localhost:8000)"
    fi
    
    echo ""
    
    # MongoDB
    info "MongoDB:"
    if docker exec respicare-mongodb-dev mongosh --eval "db.adminCommand('ping')" &> /dev/null 2>&1 || \
       docker exec respicare-mongodb mongosh --eval "db.adminCommand('ping')" &> /dev/null 2>&1; then
        success "MongoDB está respondiendo"
    else
        warning "No se puede verificar MongoDB (puede que no esté corriendo o no sea accesible)"
    fi
    
    echo ""
    
    # Redis
    info "Redis:"
    if docker exec respicare-redis-dev redis-cli ping &> /dev/null 2>&1 || \
       docker exec respicare-redis redis-cli ping &> /dev/null 2>&1; then
        success "Redis está respondiendo"
    else
        warning "No se puede verificar Redis (puede que no esté corriendo o no sea accesible)"
    fi
}

# Monitorear recursos del sistema
monitor_system() {
    header "💻 Recursos del Sistema"
    
    # CPU
    info "CPU:"
    if command -v top &> /dev/null; then
        CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
        info "  Uso: ${CPU_USAGE}%"
    elif [ -f /proc/loadavg ]; then
        LOAD=$(cat /proc/loadavg | awk '{print $1}')
        info "  Load average (1min): $LOAD"
    fi
    
    echo ""
    
    # Memoria
    info "Memoria:"
    if command -v free &> /dev/null; then
        free -h | grep -E "Mem|Swap"
    elif [ -f /proc/meminfo ]; then
        TOTAL_MEM=$(grep MemTotal /proc/meminfo | awk '{print $2}')
        FREE_MEM=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
        USED_MEM=$((TOTAL_MEM - FREE_MEM))
        USED_PERC=$((USED_MEM * 100 / TOTAL_MEM))
        info "  Total: $((TOTAL_MEM / 1024)) MB"
        info "  Usado: $((USED_MEM / 1024)) MB ($USED_PERC%)"
        info "  Libre: $((FREE_MEM / 1024)) MB"
    fi
    
    echo ""
    
    # Disco
    info "Disco:"
    if command -v df &> /dev/null; then
        df -h | grep -E "Filesystem|/$|/home"
    fi
}

# Monitorear logs recientes
monitor_logs() {
    header "📋 Logs Recientes (últimas 10 líneas)"
    
    if [ -f "docker-compose.yml" ] || [ -f "docker-compose.dev.yml" ]; then
        info "Logs de Docker Compose:"
        docker-compose logs --tail=10 2>/dev/null || echo "No se pueden obtener logs"
    fi
}

# Ejecutar monitoreo
main() {
    clear
    header "📊 Monitoreo de Infraestructura - RespiCare"
    echo ""
    date
    echo ""
    
    monitor_docker
    echo ""
    
    monitor_kubernetes
    echo ""
    
    monitor_services
    echo ""
    
    monitor_system
    echo ""
    
    monitor_logs
    echo ""
    
    header "✅ Monitoreo completado"
}

# Modo interactivo o una sola vez
if [ "$1" = "--watch" ] || [ "$1" = "-w" ]; then
    info "Modo watch activado (Ctrl+C para salir)"
    while true; do
        main
        sleep 5
        clear
    done
else
    main
fi

