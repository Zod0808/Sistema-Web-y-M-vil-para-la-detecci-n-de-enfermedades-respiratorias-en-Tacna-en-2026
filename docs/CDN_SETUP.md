# Configuración de CDN para Assets Estáticos

Esta guía explica cómo configurar un CDN (Content Delivery Network) para optimizar la entrega de assets estáticos en RespiCare.

## 📋 Tabla de Contenidos

- [Introducción](#introducción)
- [Proveedores CDN Soportados](#proveedores-cdn-soportados)
- [Configuración de CloudFlare](#configuración-de-cloudflare)
- [Configuración de AWS CloudFront](#configuración-de-aws-cloudfront)
- [Configuración de Nginx Ingress](#configuración-de-nginx-ingress)
- [Optimización de Assets](#optimización-de-assets)
- [Cache Headers](#cache-headers)
- [Verificación y Testing](#verificación-y-testing)
- [Troubleshooting](#troubleshooting)

---

## Introducción

Un CDN mejora significativamente el rendimiento de la aplicación al:

- **Reducir latencia**: Servir assets desde ubicaciones geográficamente cercanas a los usuarios
- **Reducir carga del servidor**: Descargar el tráfico de assets estáticos del servidor principal
- **Mejorar disponibilidad**: Distribuir contenido a través de múltiples servidores edge
- **Optimizar ancho de banda**: Comprimir y optimizar assets automáticamente

### Estrategia de Cache

| Tipo de Asset | TTL Edge | TTL Browser | Cache Busting |
|--------------|----------|-------------|---------------|
| JS/CSS (con hash) | 1 año | 1 año | Hash en nombre de archivo |
| Imágenes | 30 días | 30 días | Versión en URL |
| Fuentes | 1 año | 1 año | Hash en nombre de archivo |
| HTML | No cache | No cache | Siempre fresco |
| API | No cache | No cache | Siempre fresco |

---

## Proveedores CDN Soportados

### CloudFlare (Recomendado para inicio)

**Ventajas:**
- ✅ Plan gratuito disponible
- ✅ Fácil configuración
- ✅ DDoS protection incluido
- ✅ SSL/TLS automático
- ✅ Workers para transformaciones en edge

**Desventajas:**
- ⚠️ Menos control granular que CloudFront
- ⚠️ Límites en plan gratuito

### AWS CloudFront

**Ventajas:**
- ✅ Integración nativa con AWS
- ✅ Control granular de cache behaviors
- ✅ Lambda@Edge para transformaciones
- ✅ WAF integrado
- ✅ Precios competitivos

**Desventajas:**
- ⚠️ Requiere cuenta AWS
- ⚠️ Configuración más compleja

---

## Configuración de CloudFlare

### 1. Configurar DNS

1. Agrega tu dominio a CloudFlare
2. Configura los siguientes registros DNS:

```
Tipo    Nombre    Contenido                    Proxy
A       @         IP_DEL_LOAD_BALANCER         ✅ Proxied
CNAME   www       respicare.example.com        ✅ Proxied
CNAME   cdn       respicare.example.com        ✅ Proxied
```

### 2. Configurar Page Rules

En el dashboard de CloudFlare, ve a **Rules** → **Page Rules** y crea las siguientes reglas:

#### Regla 1: Cache para Assets Estáticos
- **URL Pattern**: `*.respicare.example.com/static/*`
- **Settings**:
  - Cache Level: `Cache Everything`
  - Edge Cache TTL: `1 year`
  - Browser Cache TTL: `1 year`

#### Regla 2: Cache para Imágenes
- **URL Pattern**: `*.respicare.example.com/images/*`
- **Settings**:
  - Cache Level: `Cache Everything`
  - Edge Cache TTL: `30 days`
  - Browser Cache TTL: `30 days`

#### Regla 3: Cache para Fuentes
- **URL Pattern**: `*.respicare.example.com/fonts/*`
- **Settings**:
  - Cache Level: `Cache Everything`
  - Edge Cache TTL: `1 year`
  - Browser Cache TTL: `1 year`

#### Regla 4: No Cache para API
- **URL Pattern**: `*.respicare.example.com/api/*`
- **Settings**:
  - Cache Level: `Bypass`
  - Browser Cache TTL: `Respect Existing Headers`

### 3. Configurar Transform Rules (Opcional)

Para agregar headers de cache automáticamente:

1. Ve a **Rules** → **Transform Rules** → **Modify Response Header**
2. Crea reglas para agregar `Cache-Control` headers según el tipo de asset

### 4. Configurar CloudFlare Workers (Opcional)

Para transformaciones avanzadas en edge, crea un Worker:

```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  
  // Agregar headers de cache para assets estáticos
  if (url.pathname.startsWith('/static/') || 
      url.pathname.startsWith('/images/') ||
      url.pathname.startsWith('/fonts/')) {
    const response = await fetch(request)
    const newResponse = new Response(response.body, response)
    newResponse.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    newResponse.headers.set('CDN-Cache-Control', 'public, max-age=31536000')
    return newResponse
  }
  
  return fetch(request)
}
```

### 5. Configurar SSL/TLS

1. Ve a **SSL/TLS** → **Overview**
2. Selecciona **Full (strict)** mode
3. Habilita **Always Use HTTPS**
4. Habilita **Automatic HTTPS Rewrites**

---

## Configuración de AWS CloudFront

### 1. Crear Distribución

Usa Terraform o AWS Console para crear la distribución. Ver `infrastructure/cdn-config.yaml` para la configuración completa.

### 2. Configurar Origins

```hcl
origin {
  domain_name = "api.respicare.example.com"
  origin_id   = "respicare-origin"
  
  custom_origin_config {
    http_port              = 80
    https_port             = 443
    origin_protocol_policy = "https-only"
    origin_ssl_protocols   = ["TLSv1.2", "TLSv1.3"]
  }
}
```

### 3. Configurar Cache Behaviors

#### Default Behavior (Assets Estáticos)
- **Path Pattern**: `*`
- **TTL**: Default 1 día, Max 1 año
- **Allowed Methods**: GET, HEAD, OPTIONS
- **Cached Methods**: GET, HEAD

#### API Behavior (No Cache)
- **Path Pattern**: `/api/*`
- **TTL**: 0 (no cache)
- **Allowed Methods**: All
- **Forward Headers**: Authorization, Content-Type, X-Request-ID

#### Images Behavior
- **Path Pattern**: `/images/*`
- **TTL**: Default 30 días, Max 1 año
- **Allowed Methods**: GET, HEAD, OPTIONS

### 4. Configurar Response Headers Policy

Crea una política para agregar headers de seguridad y cache:

```hcl
resource "aws_cloudfront_response_headers_policy" "static_assets" {
  name = "respicare-static-assets-headers"
  
  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains          = true
      preload                     = true
    }
    
    content_type_options {
      override = true
    }
    
    frame_options {
      frame_option = "SAMEORIGIN"
      override     = true
    }
  }
}
```

### 5. Configurar Lambda@Edge (Opcional)

Para transformaciones en edge, crea una función Lambda@Edge:

```javascript
exports.handler = async (event) => {
  const response = event.Records[0].cf.response;
  const headers = response.headers;
  
  // Agregar headers de cache para assets estáticos
  const uri = event.Records[0].cf.request.uri;
  if (uri.startsWith('/static/') || uri.startsWith('/images/')) {
    headers['cache-control'] = [{
      key: 'Cache-Control',
      value: 'public, max-age=31536000, immutable'
    }];
  }
  
  return response;
};
```

---

## Configuración de Nginx Ingress

El archivo `infrastructure/k8s/load-balancer-config.yaml` contiene la configuración de Ingress con headers de cache.

### Headers de Cache por Tipo de Asset

```nginx
# Assets estáticos - cache largo
if ($uri ~* "^/static/.*\.(js|css|woff|woff2|ttf|eot|svg|png|jpg|jpeg|gif|ico|webp)$") {
  add_header Cache-Control "public, max-age=31536000, immutable";
  add_header CDN-Cache-Control "public, max-age=31536000";
}

# Imágenes - cache medio
if ($uri ~* "^/images/.*\.(png|jpg|jpeg|gif|ico|webp|svg)$") {
  add_header Cache-Control "public, max-age=2592000";
}

# Fuentes - cache largo
if ($uri ~* "^/fonts/.*\.(woff|woff2|ttf|eot|otf)$") {
  add_header Cache-Control "public, max-age=31536000, immutable";
}

# HTML - no cache
if ($uri ~* "\.(html|htm)$") {
  add_header Cache-Control "no-cache, no-store, must-revalidate";
  add_header Pragma "no-cache";
  add_header Expires "0";
}

# API - no cache
if ($uri ~* "^/api/") {
  add_header Cache-Control "no-cache, no-store, must-revalidate";
}
```

### Aplicar Configuración

```bash
kubectl apply -f infrastructure/k8s/load-balancer-config.yaml
kubectl apply -f infrastructure/cdn-config.yaml
```

---

## Optimización de Assets

### 1. Minificación

**JavaScript:**
```bash
terser input.js -o output.js --compress --mangle
```

**CSS:**
```bash
cleancss --level 2 -o output.css input.css
```

### 2. Compresión de Imágenes

**JPEG:**
```bash
jpegoptim --max=85 --strip-all image.jpg
```

**PNG:**
```bash
optipng -o7 image.png
```

**SVG:**
```bash
svgo image.svg
```

### 3. Cache Busting

Usa hashes en los nombres de archivo para cache busting:

```javascript
// webpack.config.js
output: {
  filename: '[name].[contenthash].js',
  chunkFilename: '[name].[contenthash].chunk.js',
}
```

### 4. Lazy Loading

Implementa lazy loading para imágenes:

```html
<img src="image.jpg" loading="lazy" alt="Description">
```

### 5. Preload de Assets Críticos

```html
<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/static/main.css" as="style">
```

---

## Cache Headers

### Headers Estándar

| Header | Valor | Descripción |
|--------|-------|-------------|
| `Cache-Control` | `public, max-age=31536000, immutable` | Cache público por 1 año, inmutable |
| `CDN-Cache-Control` | `public, max-age=31536000` | Control específico para CDN |
| `ETag` | `"hash-del-contenido"` | Validación condicional |
| `Last-Modified` | `Wed, 21 Oct 2015 07:28:00 GMT` | Fecha de última modificación |

### Headers de Seguridad

```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

---

## Verificación y Testing

### 1. Verificar Headers de Cache

```bash
curl -I https://cdn.respicare.example.com/static/main.js

# Debe incluir:
# Cache-Control: public, max-age=31536000, immutable
# CDN-Cache-Control: public, max-age=31536000
```

### 2. Verificar Compresión

```bash
curl -H "Accept-Encoding: gzip, br" -I https://cdn.respicare.example.com/static/main.js

# Debe incluir:
# Content-Encoding: br (o gzip)
```

### 3. Verificar CDN Hit/Miss

```bash
curl -I https://cdn.respicare.example.com/static/main.js | grep -i "cf-cache-status"

# Valores posibles:
# HIT: Asset servido desde cache del CDN
# MISS: Asset no estaba en cache, servido desde origin
# BYPASS: Cache bypassed (ej: API)
```

### 4. Testing de Performance

Usa herramientas como:
- **WebPageTest**: https://www.webpagetest.org/
- **GTmetrix**: https://gtmetrix.com/
- **Lighthouse**: Chrome DevTools

### 5. Monitoreo de Cache Hit Ratio

**CloudFlare:**
- Dashboard → Analytics → Cache Analytics

**CloudFront:**
- CloudWatch → Metrics → Cache Hit Rate

---

## Troubleshooting

### Problema: Assets no se actualizan después de deploy

**Solución:**
1. Verifica que los nombres de archivo incluyan hash (cache busting)
2. Purga el cache del CDN:
   - CloudFlare: Dashboard → Caching → Purge Cache
   - CloudFront: Invalidar distribución

### Problema: Cache-Control headers no se aplican

**Solución:**
1. Verifica la configuración de Nginx Ingress
2. Verifica que las reglas del CDN no estén sobrescribiendo headers
3. Revisa los logs del Ingress Controller

### Problema: Assets servidos sin compresión

**Solución:**
1. Verifica que Brotli/Gzip estén habilitados en el CDN
2. Verifica que el origin esté enviando assets comprimidos
3. Revisa la configuración de compression en Nginx

### Problema: CORS errors con assets desde CDN

**Solución:**
1. Configura CORS headers en el CDN
2. Verifica que `Access-Control-Allow-Origin` incluya el dominio correcto
3. Para CloudFront, configura Response Headers Policy con CORS

### Problema: SSL/TLS errors

**Solución:**
1. Verifica que el certificado SSL esté configurado correctamente
2. CloudFlare: SSL/TLS → Overview → Full (strict)
3. CloudFront: Verifica que el certificado ACM esté asociado

---

## Mejores Prácticas

1. **Usa cache busting**: Incluye hash en nombres de archivo para assets versionados
2. **Optimiza antes de subir**: Minifica y comprime assets antes del deploy
3. **Monitorea cache hit ratio**: Objetivo > 90% para assets estáticos
4. **Configura TTLs apropiados**: Largos para assets inmutables, cortos para contenido dinámico
5. **Usa preload**: Precarga assets críticos para mejorar LCP
6. **Implementa lazy loading**: Para imágenes y componentes no críticos
7. **Monitorea performance**: Usa herramientas de testing regularmente

---

## Referencias

- [CloudFlare Documentation](https://developers.cloudflare.com/)
- [AWS CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [Nginx Ingress Annotations](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/)
- [Web.dev - HTTP Caching](https://web.dev/http-cache/)

---

**Última actualización**: Diciembre 2024

