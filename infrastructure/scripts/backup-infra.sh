#!/bin/bash

# Script de backup y restore de infraestructura
# Realiza backups de datos y configuración

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

# Configuración
BACKUP_DIR="infrastructure/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="respicare_backup_${TIMESTAMP}"

# Verificar argumentos
ACTION=${1:-backup}

# Crear directorio de backups
mkdir -p "$BACKUP_DIR"

# Función para backup de MongoDB
backup_mongodb() {
    info "Realizando backup de MongoDB..."
    
    BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}/mongodb"
    mkdir -p "$BACKUP_PATH"
    
    # Intentar backup desde contenedor Docker
    if docker ps | grep -q "mongodb"; then
        CONTAINER_NAME=$(docker ps | grep "mongodb" | awk '{print $1}' | head -1)
        
        # Backup usando mongodump
        if docker exec "$CONTAINER_NAME" mongodump --version &> /dev/null; then
            docker exec "$CONTAINER_NAME" mongodump --archive > "${BACKUP_PATH}/mongodb_${TIMESTAMP}.archive"
            success "Backup de MongoDB completado: ${BACKUP_PATH}/mongodb_${TIMESTAMP}.archive"
        else
            warning "mongodump no está disponible en el contenedor"
        fi
    else
        # Backup desde MongoDB local si está instalado
        if command -v mongodump &> /dev/null; then
            mongodump --out "$BACKUP_PATH" 2>/dev/null && \
            success "Backup de MongoDB completado: $BACKUP_PATH" || \
            warning "No se pudo realizar backup de MongoDB (puede que no esté corriendo)"
        else
            warning "MongoDB no está disponible para backup"
        fi
    fi
}

# Función para backup de Redis
backup_redis() {
    info "Realizando backup de Redis..."
    
    BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}/redis"
    mkdir -p "$BACKUP_PATH"
    
    # Intentar backup desde contenedor Docker
    if docker ps | grep -q "redis"; then
        CONTAINER_NAME=$(docker ps | grep "redis" | awk '{print $1}' | head -1)
        
        # Redis guarda automáticamente, solo copiamos el dump
        if docker exec "$CONTAINER_NAME" redis-cli ping &> /dev/null; then
            # Forzar save
            docker exec "$CONTAINER_NAME" redis-cli BGSAVE
            sleep 2
            
            # Copiar archivo de dump si existe
            if docker exec "$CONTAINER_NAME" test -f /data/dump.rdb; then
                docker cp "${CONTAINER_NAME}:/data/dump.rdb" "${BACKUP_PATH}/dump_${TIMESTAMP}.rdb"
                success "Backup de Redis completado: ${BACKUP_PATH}/dump_${TIMESTAMP}.rdb"
            else
                warning "No se encontró archivo de dump de Redis"
            fi
        fi
    else
        warning "Redis no está disponible para backup"
    fi
}

# Función para backup de configuración
backup_config() {
    info "Realizando backup de configuración..."
    
    BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}/config"
    mkdir -p "$BACKUP_PATH"
    
    # Backup de archivos de configuración
    CONFIG_FILES=(
        ".env"
        "docker-compose.yml"
        "docker-compose.dev.yml"
        "docker-compose.prod.yml"
        "infrastructure/k8s/*.yaml"
        "infrastructure/terraform/*.tf"
        "infrastructure/terraform/*.tfvars"
    )
    
    for pattern in "${CONFIG_FILES[@]}"; do
        for file in $pattern; do
            if [ -f "$file" ]; then
                RELATIVE_PATH=$(echo "$file" | sed 's|^\./||')
                TARGET_DIR="${BACKUP_PATH}/$(dirname "$RELATIVE_PATH")"
                mkdir -p "$TARGET_DIR"
                cp "$file" "${BACKUP_PATH}/${RELATIVE_PATH}"
            fi
        done
    done
    
    success "Backup de configuración completado: $BACKUP_PATH"
}

# Función para backup de logs
backup_logs() {
    info "Realizando backup de logs..."
    
    BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}/logs"
    mkdir -p "$BACKUP_PATH"
    
    # Backup de logs de Docker
    if [ -f "docker-compose.yml" ] || [ -f "docker-compose.dev.yml" ]; then
        docker-compose logs > "${BACKUP_PATH}/docker_compose_logs_${TIMESTAMP}.log" 2>/dev/null || true
    fi
    
    # Backup de logs de Kubernetes
    if command -v kubectl &> /dev/null && kubectl cluster-info &> /dev/null; then
        kubectl logs --all-namespaces --tail=1000 > "${BACKUP_PATH}/k8s_logs_${TIMESTAMP}.log" 2>/dev/null || true
    fi
    
    success "Backup de logs completado: $BACKUP_PATH"
}

# Función para crear backup completo
backup_all() {
    info "🚀 Iniciando backup completo de infraestructura..."
    echo ""
    
    mkdir -p "${BACKUP_DIR}/${BACKUP_NAME}"
    
    backup_mongodb
    echo ""
    
    backup_redis
    echo ""
    
    backup_config
    echo ""
    
    backup_logs
    echo ""
    
    # Crear archivo de información del backup
    INFO_FILE="${BACKUP_DIR}/${BACKUP_NAME}/backup_info.txt"
    cat > "$INFO_FILE" << EOF
Backup de RespiCare
===================
Fecha: $(date)
Timestamp: $TIMESTAMP
Sistema: $(uname -a)
Docker: $(docker --version 2>/dev/null || echo "N/A")
Kubernetes: $(kubectl version --client --short 2>/dev/null || echo "N/A")
EOF
    
    # Comprimir backup
    info "Comprimiendo backup..."
    cd "$BACKUP_DIR"
    tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
    cd - > /dev/null
    
    # Calcular tamaño
    BACKUP_SIZE=$(du -sh "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)
    
    echo ""
    success "✅ Backup completo creado: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
    info "Tamaño: $BACKUP_SIZE"
    info "Para restaurar: ./infrastructure/scripts/backup-infra.sh restore ${BACKUP_NAME}.tar.gz"
}

# Función para restaurar backup
restore_backup() {
    local backup_file=$1
    
    if [ -z "$backup_file" ]; then
        error "Debe especificar el archivo de backup a restaurar"
        echo "Uso: ./infrastructure/scripts/backup-infra.sh restore <backup_file.tar.gz>"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        error "Archivo de backup no encontrado: $backup_file"
        exit 1
    fi
    
    warning "⚠️  Esta operación restaurará datos desde el backup"
    warning "⚠️  Esto puede sobrescribir datos existentes"
    read -p "¿Continuar? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        info "Restauración cancelada"
        exit 0
    fi
    
    info "Extrayendo backup..."
    EXTRACT_DIR="${BACKUP_DIR}/restore_${TIMESTAMP}"
    mkdir -p "$EXTRACT_DIR"
    tar -xzf "$backup_file" -C "$EXTRACT_DIR"
    
    BACKUP_CONTENT=$(ls -d "$EXTRACT_DIR"/*/ | head -1)
    
    # Restaurar MongoDB
    if [ -d "${BACKUP_CONTENT}mongodb" ]; then
        info "Restaurando MongoDB..."
        # Implementar lógica de restauración según necesidad
        warning "Restauración de MongoDB debe hacerse manualmente"
    fi
    
    # Restaurar Redis
    if [ -d "${BACKUP_CONTENT}redis" ]; then
        info "Restaurando Redis..."
        # Implementar lógica de restauración según necesidad
        warning "Restauración de Redis debe hacerse manualmente"
    fi
    
    # Restaurar configuración
    if [ -d "${BACKUP_CONTENT}config" ]; then
        info "Restaurando configuración..."
        warning "Revisa los archivos en ${BACKUP_CONTENT}config antes de restaurar"
    fi
    
    success "✅ Restauración completada (revisa los archivos extraídos en $EXTRACT_DIR)"
}

# Listar backups disponibles
list_backups() {
    info "📦 Backups disponibles:"
    echo ""
    
    if [ -d "$BACKUP_DIR" ] && [ "$(ls -A $BACKUP_DIR/*.tar.gz 2>/dev/null)" ]; then
        ls -lh "$BACKUP_DIR"/*.tar.gz | awk '{print $9, "(" $5 ")"}'
    else
        warning "No hay backups disponibles"
    fi
}

# Ejecutar acción
case "$ACTION" in
    backup)
        backup_all
        ;;
    restore)
        restore_backup "$2"
        ;;
    list)
        list_backups
        ;;
    *)
        echo "Uso: $0 {backup|restore|list} [archivo_backup]"
        echo ""
        echo "Comandos:"
        echo "  backup              - Crear backup completo"
        echo "  restore <archivo>   - Restaurar desde backup"
        echo "  list                - Listar backups disponibles"
        exit 1
        ;;
esac

