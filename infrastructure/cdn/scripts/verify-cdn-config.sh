#!/bin/bash
# Script para verificar configuración de CDN

set -e

DOMAIN="${CDN_DOMAIN:-respicare.example.com}"

echo "Verificando configuración de CDN para ${DOMAIN}..."
echo ""

# Verificar DNS
echo "1. Verificando DNS..."
DNS_IP=$(dig +short ${DOMAIN} | head -n 1)
if [ -n "$DNS_IP" ]; then
  echo "   ✅ DNS resuelve a: ${DNS_IP}"
else
  echo "   ❌ DNS no resuelve"
  exit 1
fi

# Verificar HTTPS
echo "2. Verificando HTTPS..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://${DOMAIN})
if [ "$HTTP_CODE" == "200" ]; then
  echo "   ✅ HTTPS funciona (HTTP ${HTTP_CODE})"
else
  echo "   ⚠️  HTTPS retorna código: ${HTTP_CODE}"
fi

# Verificar headers de cache
echo "3. Verificando headers de cache para assets estáticos..."
STATIC_URL="https://${DOMAIN}/static/js/main.js"
CACHE_HEADER=$(curl -s -I "${STATIC_URL}" 2>/dev/null | grep -i "cache-control" || echo "")
if [ -n "$CACHE_HEADER" ]; then
  echo "   ✅ Cache-Control encontrado: ${CACHE_HEADER}"
else
  echo "   ⚠️  Cache-Control no encontrado (puede ser normal si el archivo no existe)"
fi

# Verificar CDN headers (CloudFlare)
echo "4. Verificando headers de CDN..."
CF_HEADER=$(curl -s -I "https://${DOMAIN}" | grep -i "cf-" || echo "")
if [ -n "$CF_HEADER" ]; then
  echo "   ✅ CloudFlare detectado:"
  echo "$CF_HEADER" | sed 's/^/      /'
else
  echo "   ℹ️  CloudFlare no detectado (puede estar usando otro CDN o no tener CDN)"
fi

# Verificar CloudFront (AWS)
CF_CLOUDFRONT=$(curl -s -I "https://${DOMAIN}" | grep -i "x-amz-cf-id" || echo "")
if [ -n "$CF_CLOUDFRONT" ]; then
  echo "   ✅ CloudFront detectado"
else
  echo "   ℹ️  CloudFront no detectado"
fi

# Verificar compresión
echo "5. Verificando compresión..."
ACCEPT_ENCODING="gzip, deflate, br"
COMPRESSED=$(curl -s -H "Accept-Encoding: ${ACCEPT_ENCODING}" -I "https://${DOMAIN}" | grep -i "content-encoding" || echo "")
if [ -n "$COMPRESSED" ]; then
  echo "   ✅ Compresión habilitada: ${COMPRESSED}"
else
  echo "   ⚠️  Compresión no detectada"
fi

# Verificar SSL/TLS
echo "6. Verificando SSL/TLS..."
SSL_INFO=$(echo | openssl s_client -connect ${DOMAIN}:443 -servername ${DOMAIN} 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "")
if [ -n "$SSL_INFO" ]; then
  echo "   ✅ Certificado SSL válido"
  echo "$SSL_INFO" | sed 's/^/      /'
else
  echo "   ❌ Error al verificar certificado SSL"
fi

echo ""
echo "Verificación completada."

