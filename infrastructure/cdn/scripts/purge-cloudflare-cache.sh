#!/bin/bash
# Script para purgar cache de CloudFlare

set -e

# Configuración
ZONE_ID="${CLOUDFLARE_ZONE_ID:-}"
API_TOKEN="${CLOUDFLARE_API_TOKEN:-}"

if [ -z "$ZONE_ID" ] || [ -z "$API_TOKEN" ]; then
  echo "Error: CLOUDFLARE_ZONE_ID y CLOUDFLARE_API_TOKEN deben estar configurados"
  exit 1
fi

echo "Purgando cache de CloudFlare..."

# Opción 1: Purge everything
if [ "$1" == "--all" ]; then
  echo "Purgando todo el cache..."
  curl -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache" \
    -H "Authorization: Bearer ${API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data '{"purge_everything":true}' | jq '.'
  
  if [ $? -eq 0 ]; then
    echo "✅ Cache purgado exitosamente"
  else
    echo "❌ Error al purgar cache"
    exit 1
  fi
else
  # Opción 2: Purge específico por URLs
  URLS="${@:-}"
  if [ -z "$URLS" ]; then
    echo "Uso: $0 [--all] [url1] [url2] ..."
    echo "Ejemplo: $0 https://respicare.example.com/static/js/main.js"
    exit 1
  fi
  
  # Convertir URLs a array JSON
  URL_ARRAY=$(printf '%s\n' "$URLS" | jq -R . | jq -s .)
  
  echo "Purgando URLs específicas..."
  curl -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache" \
    -H "Authorization: Bearer ${API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data "{\"files\":${URL_ARRAY}}" | jq '.'
  
  if [ $? -eq 0 ]; then
    echo "✅ URLs purgadas exitosamente"
  else
    echo "❌ Error al purgar URLs"
    exit 1
  fi
fi

