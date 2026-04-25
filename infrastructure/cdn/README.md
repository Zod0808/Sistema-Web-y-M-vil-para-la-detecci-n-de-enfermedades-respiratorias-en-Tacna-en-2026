# Configuración de CDN para RespiCare

Este directorio contiene la configuración y documentación para implementar un Content Delivery Network (CDN) para los assets estáticos de RespiCare.

## Objetivo

Mejorar el rendimiento y reducir la latencia de carga de assets estáticos (JS, CSS, imágenes, fuentes) mediante:

- Distribución geográfica de contenido
- Cache en edge locations
- Compresión de assets
- Reducción de carga en servidores origen

## Opciones de CDN

### 1. CloudFlare (Recomendado para inicio)

**Ventajas:**
- Gratis para uso básico
- Fácil configuración
- Protección DDoS incluida
- SSL/TLS automático

**Documentación:** Ver [cloudflare-config.md](./cloudflare-config.md)

### 2. AWS CloudFront

**Ventajas:**
- Integración nativa con AWS
- Control granular de cache
- Soporte para S3 y Load Balancers
- Analytics detallados

**Documentación:** Ver [aws-cloudfront-config.md](./aws-cloudfront-config.md)

## Configuración de Assets Estáticos

### Estructura de Assets

Los assets estáticos se generan durante el build de React:

```
web/build/
├── static/
│   ├── css/
│   │   └── main.[hash].css
│   ├── js/
│   │   └── main.[hash].js
│   └── media/
│       └── [archivos de imágenes]
├── index.html
└── manifest.json
```

### Headers de Cache

Los assets estáticos deben incluir headers de cache apropiados:

- **JS/CSS/Imágenes**: `Cache-Control: public, max-age=31536000, immutable`
- **HTML**: `Cache-Control: public, max-age=3600, must-revalidate`
- **Manifest/JSON**: `Cache-Control: public, max-age=86400`

Ver configuración en [web-ingress.yaml](../k8s/web-ingress.yaml).

## Scripts de Utilidad

### Verificar Configuración

```bash
./scripts/verify-cdn-config.sh
```

### Purgar Cache (CloudFlare)

```bash
# Purgar todo
CLOUDFLARE_ZONE_ID=xxx CLOUDFLARE_API_TOKEN=xxx ./scripts/purge-cloudflare-cache.sh --all

# Purgar URLs específicas
CLOUDFLARE_ZONE_ID=xxx CLOUDFLARE_API_TOKEN=xxx ./scripts/purge-cloudflare-cache.sh \
  https://respicare.example.com/static/js/main.js
```

### Invalidar Cache (CloudFront)

```bash
# Invalidar todo
CLOUDFRONT_DISTRIBUTION_ID=xxx ./scripts/invalidate-cloudfront-cache.sh --all

# Invalidar paths específicos
CLOUDFRONT_DISTRIBUTION_ID=xxx ./scripts/invalidate-cloudfront-cache.sh \
  /static/js/main.js /static/css/main.css
```

## Integración con CI/CD

### GitHub Actions

Agregar paso para invalidar cache después del deployment:

```yaml
- name: Invalidate CDN Cache
  run: |
    if [ "${{ env.ENVIRONMENT }}" == "production" ]; then
      ./infrastructure/cdn/scripts/invalidate-cloudfront-cache.sh /static/*
    fi
  env:
    CLOUDFRONT_DISTRIBUTION_ID: ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }}
```

## Monitoreo

### Métricas Clave

- **Cache Hit Ratio**: Debe ser > 80%
- **Latencia**: Reducción de 50-70% vs servidor origen
- **Ancho de Banda**: Reducción de 60-80% en servidor origen
- **TTFB (Time to First Byte)**: < 100ms desde edge locations

### Herramientas

- **CloudFlare Analytics**: Dashboard en panel de CloudFlare
- **CloudFront CloudWatch**: Métricas en AWS CloudWatch
- **Real User Monitoring (RUM)**: Integrar con herramientas como Google Analytics

## Troubleshooting

### Assets no se actualizan

1. Verificar que los assets tengan versioning (hash en nombre)
2. Invalidar/purgar cache del CDN
3. Verificar headers Cache-Control del servidor origen

### Cache Hit Ratio bajo

1. Verificar configuración de cache policies
2. Verificar que los assets estén siendo servidos desde CDN
3. Revisar logs de CDN para identificar problemas

### Errores 403/404

1. Verificar configuración de CORS
2. Verificar permisos de origen (S3, Load Balancer)
3. Verificar path patterns en CDN

## Mejores Prácticas

1. **Versioning de Assets**: Usar hash en nombres de archivos para cache agresivo
2. **Compresión**: Habilitar Brotli/Gzip en CDN
3. **Minificación**: Minificar JS/CSS antes de subir
4. **Lazy Loading**: Cargar assets bajo demanda cuando sea posible
5. **Preconnect/DNS-Prefetch**: Agregar headers para mejorar conexiones

## Referencias

- [Web.dev: HTTP Caching](https://web.dev/http-cache/)
- [MDN: HTTP Caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)
- [CloudFlare Caching](https://developers.cloudflare.com/cache/)
- [AWS CloudFront Best Practices](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/best-practices.html)

