#!/bin/bash
# Script para invalidar cache de AWS CloudFront

set -e

# Configuración
DISTRIBUTION_ID="${CLOUDFRONT_DISTRIBUTION_ID:-}"
AWS_REGION="${AWS_REGION:-us-east-1}"

if [ -z "$DISTRIBUTION_ID" ]; then
  echo "Error: CLOUDFRONT_DISTRIBUTION_ID debe estar configurado"
  exit 1
fi

echo "Invalidando cache de CloudFront (Distribution: ${DISTRIBUTION_ID})..."

# Opción 1: Invalidar todo
if [ "$1" == "--all" ]; then
  echo "Invalidando todo el cache..."
  aws cloudfront create-invalidation \
    --distribution-id "${DISTRIBUTION_ID}" \
    --paths "/*" \
    --region "${AWS_REGION}"
  
  if [ $? -eq 0 ]; then
    echo "✅ Invalidación creada exitosamente"
  else
    echo "❌ Error al crear invalidación"
    exit 1
  fi
else
  # Opción 2: Invalidar paths específicos
  PATHS="${@:-}"
  if [ -z "$PATHS" ]; then
    echo "Uso: $0 [--all] [path1] [path2] ..."
    echo "Ejemplo: $0 /static/js/main.js /static/css/main.css"
    exit 1
  fi
  
  # Convertir paths a array
  PATHS_ARRAY=()
  for path in $PATHS; do
    PATHS_ARRAY+=("$path")
  done
  
  echo "Invalidando paths específicos: ${PATHS_ARRAY[*]}"
  aws cloudfront create-invalidation \
    --distribution-id "${DISTRIBUTION_ID}" \
    --paths "${PATHS_ARRAY[@]}" \
    --region "${AWS_REGION}"
  
  if [ $? -eq 0 ]; then
    echo "✅ Invalidación creada exitosamente"
    echo "Nota: La invalidación puede tardar 5-15 minutos en completarse"
  else
    echo "❌ Error al crear invalidación"
    exit 1
  fi
fi

