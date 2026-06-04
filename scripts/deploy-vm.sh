#!/bin/bash
# RespiCare — Script de despliegue en VM (MongoDB local)
# Uso: ./scripts/deploy-vm.sh [--build]
set -euo pipefail

COMPOSE_FILE="docker-compose.vm.yml"
ENV_FILE=".env"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_FLAG=""

cd "$REPO_DIR"

# ── Colores ───────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── Argumentos ────────────────────────────────────
for arg in "$@"; do
  case $arg in
    --build) BUILD_FLAG="--build" ;;
  esac
done

# ── Verificar dependencias ────────────────────────
command -v docker >/dev/null 2>&1 || err "Docker no está instalado"
docker compose version >/dev/null 2>&1 && COMPOSE_CMD="docker compose" || \
  docker-compose version >/dev/null 2>&1 && COMPOSE_CMD="docker-compose" || \
  err "docker compose / docker-compose no encontrado"

# ── Verificar .env ────────────────────────────────
if [ ! -f "$ENV_FILE" ]; then
  if [ -f ".env.vm" ]; then
    warn ".env no encontrado — copiando desde .env.vm"
    cp .env.vm .env
    warn "IMPORTANTE: edita .env y rellena las passwords/secrets antes de continuar"
    exit 1
  else
    err "No se encontró .env ni .env.vm"
  fi
fi

# Verificar que las variables críticas no sean placeholders
REQUIRED_VARS=("MONGO_PASSWORD" "REDIS_PASSWORD" "JWT_SECRET" "JWT_REFRESH_SECRET")
for var in "${REQUIRED_VARS[@]}"; do
  val=$(grep "^${var}=" "$ENV_FILE" | cut -d'=' -f2-)
  if [ -z "$val" ] || echo "$val" | grep -qi "cambia\|change\|your_\|placeholder"; then
    err "La variable ${var} en .env no está configurada correctamente"
  fi
done
ok "Variables de entorno verificadas"

# ── Pull de imagen base antes de build ────────────
echo ""
echo "Descargando imágenes base..."
$COMPOSE_CMD -f "$COMPOSE_FILE" pull mongodb redis nginx 2>/dev/null || true

# ── Build de servicios ────────────────────────────
if [ -n "$BUILD_FLAG" ]; then
  echo ""
  echo "Construyendo imágenes (backend + ai-services)..."
  $COMPOSE_CMD -f "$COMPOSE_FILE" build --no-cache backend ai-services
  ok "Build completado"
fi

# ── Levantar servicios ────────────────────────────
echo ""
echo "Levantando servicios..."
$COMPOSE_CMD -f "$COMPOSE_FILE" up -d $BUILD_FLAG

ok "Servicios iniciados"

# ── Esperar healthchecks ──────────────────────────
echo ""
echo "Esperando que los servicios estén listos..."

wait_healthy() {
  local name=$1 max=60 i=0
  while [ $i -lt $max ]; do
    status=$(docker inspect --format='{{.State.Health.Status}}' "$name" 2>/dev/null || echo "missing")
    case "$status" in
      healthy) ok "$name está saludable"; return 0 ;;
      unhealthy) err "$name reporta unhealthy — revisa: docker logs $name" ;;
      missing) warn "$name no tiene healthcheck configurado"; return 0 ;;
    esac
    sleep 5; i=$((i+1))
  done
  warn "$name no alcanzó estado healthy en ${max}×5s — puede seguir iniciando"
}

wait_healthy "respicare-mongodb"
wait_healthy "respicare-redis"
wait_healthy "respicare-backend"
wait_healthy "respicare-ai"

# ── Estado final ──────────────────────────────────
echo ""
echo "Estado de los contenedores:"
$COMPOSE_CMD -f "$COMPOSE_FILE" ps

echo ""
ok "Despliegue completado"
echo ""
echo "  Backend API:  http://38.250.158.233/api/"
echo "  AI Service:   http://38.250.158.233/ai/"
echo "  Health:       http://38.250.158.233/health"
echo "  Dominio:      http://respicare.sytes.net"
echo ""
echo "Logs:  docker compose -f $COMPOSE_FILE logs -f [backend|ai-services|mongodb]"
