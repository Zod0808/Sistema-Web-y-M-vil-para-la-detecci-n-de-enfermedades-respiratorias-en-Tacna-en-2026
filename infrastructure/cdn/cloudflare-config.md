# Configuración de CDN con CloudFlare

Esta guía describe cómo configurar CloudFlare como CDN para los assets estáticos de RespiCare.

## Requisitos Previos

- Cuenta de CloudFlare
- Dominio configurado en CloudFlare
- Acceso DNS al dominio

## Configuración

### 1. Agregar Dominio a CloudFlare

1. Inicia sesión en el panel de CloudFlare
2. Agrega tu dominio `respicare.example.com`
3. CloudFlare detectará automáticamente los registros DNS existentes

### 2. Configurar DNS

Asegúrate de que los siguientes registros DNS estén configurados:

```
A     respicare.example.com     -> IP del Load Balancer
A     www.respicare.example.com -> IP del Load Balancer
CNAME api.respicare.example.com -> respicare.example.com
```

### 3. Configurar Page Rules para Assets Estáticos

En CloudFlare, ve a **Rules** > **Page Rules** y crea las siguientes reglas:

#### Regla 1: Assets Estáticos (JS, CSS, Imágenes)
- **URL Pattern**: `*respicare.example.com/static/*` o `*respicare.example.com/*.js`, `*respicare.example.com/*.css`
- **Settings**:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 year
  - Browser Cache TTL: Respect Existing Headers
  - Auto Minify: Enable (JS, CSS, HTML)

#### Regla 2: HTML Principal
- **URL Pattern**: `respicare.example.com/` o `www.respicare.example.com/`
- **Settings**:
  - Cache Level: Standard
  - Edge Cache TTL: 2 hours
  - Browser Cache TTL: Respect Existing Headers

### 4. Configurar Speed Optimizations

En **Speed** > **Optimization**:

- **Auto Minify**: Habilitar para JS, CSS, HTML
- **Brotli**: Habilitar
- **Rocket Loader**: Opcional (puede causar problemas con algunas aplicaciones)
- **Mirage**: Habilitar para imágenes
- **Polish**: Habilitar para optimización de imágenes

### 5. Configurar Caching Rules

En **Rules** > **Cache Rules**:

```
Rule Name: Static Assets Cache
URL Pattern: *respicare.example.com/static/*
Cache Status: Eligible
Edge TTL: 1 year
Browser TTL: Respect Existing Headers
```

### 6. Configurar SSL/TLS

En **SSL/TLS**:

- **Encryption mode**: Full (strict)
- **Always Use HTTPS**: On
- **Minimum TLS Version**: 1.2
- **Opportunistic Encryption**: On

### 7. Configurar Firewall Rules (Opcional)

Para proteger contra ataques DDoS y bots:

En **Security** > **WAF**:

- Habilitar Managed Rules
- Configurar Rate Limiting:
  - Threshold: 100 requests per minute
  - Action: Challenge

### 8. Verificar Configuración

Ejecuta el script de verificación:

```bash
./scripts/verify-cdn-config.sh
```

O manualmente:

```bash
# Verificar headers de cache
curl -I https://respicare.example.com/static/js/main.js

# Debe mostrar:
# CF-Cache-Status: HIT
# Cache-Control: public, max-age=31536000, immutable
```

## Monitoreo

### Métricas en CloudFlare

- **Analytics** > **Performance**: Ver métricas de cache hit ratio
- **Analytics** > **Traffic**: Ver tráfico y ancho de banda ahorrado
- **Caching** > **Purge Cache**: Para invalidar cache cuando sea necesario

### Purge Cache

Para invalidar el cache después de un deployment:

```bash
# Usando CloudFlare API
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

O usar el script incluido:

```bash
./scripts/purge-cloudflare-cache.sh
```

## Troubleshooting

### Cache no funciona

1. Verificar que el dominio esté en modo "Proxied" (nube naranja) en CloudFlare
2. Verificar headers de respuesta del servidor
3. Verificar Page Rules están activas

### Assets no se actualizan

1. Purge cache en CloudFlare
2. Verificar que los assets tengan versioning (hash en el nombre)
3. Verificar headers Cache-Control del servidor

## Referencias

- [CloudFlare Caching Documentation](https://developers.cloudflare.com/cache/)
- [CloudFlare Page Rules](https://developers.cloudflare.com/rules/page-rules/)
- [CloudFlare API](https://developers.cloudflare.com/api/)

