#!/bin/bash
# Script para escalar servicios de AI en Docker Compose
# Uso: ./scripts/scale-ai-services.sh [número_de_instancias]

set -e

NUM_INSTANCES=${1:-2}
COMPOSE_FILE=${2:-docker-compose.prod.yml}

echo "🚀 Escalando servicios AI a $NUM_INSTANCES instancias..."

# Verificar que docker-compose está disponible
if ! command -v docker-compose &> /dev/null && ! command -v docker &> /dev/null; then
    echo "❌ Error: docker-compose o docker no están instalados"
    exit 1
fi

# Usar docker compose (v2) si está disponible, sino docker-compose (v1)
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
elif docker-compose version &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo "❌ Error: No se encontró docker-compose"
    exit 1
fi

# Escalar el servicio
echo "📈 Escalando ai-services a $NUM_INSTANCES instancias usando $COMPOSE_FILE..."
$COMPOSE_CMD -f $COMPOSE_FILE up -d --scale ai-services=$NUM_INSTANCES --no-recreate

echo "✅ Servicios escalados exitosamente"
echo ""
echo "📊 Estado de los servicios:"
$COMPOSE_CMD -f $COMPOSE_FILE ps ai-services

echo ""
echo "💡 Nota: Asegúrate de que nginx.conf esté configurado para balancear carga entre las instancias"
echo "   Puedes verificar las instancias con: docker ps | grep ai-services"

