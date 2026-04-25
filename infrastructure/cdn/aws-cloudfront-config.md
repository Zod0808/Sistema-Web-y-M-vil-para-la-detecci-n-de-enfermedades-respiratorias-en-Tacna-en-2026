# Configuración de CDN con AWS CloudFront

Esta guía describe cómo configurar AWS CloudFront como CDN para los assets estáticos de RespiCare.

## Requisitos Previos

- Cuenta de AWS
- Certificado SSL en AWS Certificate Manager (ACM)
- S3 bucket o origen HTTP/HTTPS configurado

## Opción 1: CloudFront con S3 (Assets Estáticos)

### 1. Crear S3 Bucket para Assets

```bash
aws s3 mb s3://respicare-static-assets --region us-east-1
aws s3api put-bucket-versioning \
  --bucket respicare-static-assets \
  --versioning-configuration Status=Enabled
```

### 2. Configurar Política de Bucket

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::respicare-static-assets/*"
    }
  ]
}
```

### 3. Crear CloudFront Distribution

Usa el script de Terraform o CloudFormation incluido, o crea manualmente:

**Configuración básica:**
- **Origin Domain**: `respicare-static-assets.s3.amazonaws.com`
- **Origin Path**: `/static`
- **Origin Access Control**: Habilitar (recomendado)

**Cache Behaviors:**

#### Behavior 1: Assets Estáticos (JS, CSS, Imágenes)
- **Path Pattern**: `/static/*`
- **Origin**: S3 bucket
- **Viewer Protocol Policy**: Redirect HTTP to HTTPS
- **Allowed HTTP Methods**: GET, HEAD, OPTIONS
- **Cache Policy**: CachingOptimized
- **Origin Request Policy**: None
- **Response Headers Policy**: SecurityHeadersPolicy

#### Behavior 2: Default (*)
- **Path Pattern**: `*`
- **Origin**: Load Balancer (ALB/NLB)
- **Viewer Protocol Policy**: Redirect HTTP to HTTPS
- **Allowed HTTP Methods**: GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
- **Cache Policy**: CachingDisabled (para contenido dinámico)
- **Origin Request Policy**: AllViewer
- **Response Headers Policy**: SecurityHeadersPolicy

### 4. Configurar Custom Headers

En **Response Headers Policy**:

```yaml
Custom Headers:
  - Header: X-Content-Type-Options
    Value: nosniff
    Override: true
  - Header: X-Frame-Options
    Value: DENY
    Override: true
  - Header: X-XSS-Protection
    Value: 1; mode=block
    Override: true
  - Header: Strict-Transport-Security
    Value: max-age=31536000; includeSubDomains
    Override: true
```

### 5. Configurar Cache Policies

#### Cache Policy para Assets Estáticos

```json
{
  "Name": "RespiCare-Static-Assets",
  "DefaultTTL": 31536000,
  "MaxTTL": 31536000,
  "MinTTL": 86400,
  "ParametersInCacheKeyAndForwardedToOrigin": {
    "EnableAcceptEncodingGzip": true,
    "EnableAcceptEncodingBrotli": true,
    "HeadersConfig": {
      "HeaderBehavior": "none"
    },
    "QueryStringsConfig": {
      "QueryStringBehavior": "none"
    },
    "CookiesConfig": {
      "CookieBehavior": "none"
    }
  }
}
```

## Opción 2: CloudFront con Origin (Load Balancer)

### 1. Crear CloudFront Distribution

- **Origin Domain**: `alb-respicare-123456789.us-east-1.elb.amazonaws.com`
- **Origin Protocol**: HTTPS only
- **Origin SSL Protocols**: TLSv1.2

### 2. Configurar Behaviors

#### Behavior 1: Assets Estáticos
- **Path Pattern**: `/static/*`, `*.js`, `*.css`, `*.png`, `*.jpg`, `*.svg`, `*.woff2`
- **Cache Policy**: CachingOptimized
- **TTL**: 1 year
- **Compress**: Yes

#### Behavior 2: API
- **Path Pattern**: `/api/*`
- **Cache Policy**: CachingDisabled
- **Origin Request Policy**: AllViewer

#### Behavior 3: Default
- **Path Pattern**: `*`
- **Cache Policy**: Managed-CachingDisabled
- **Origin Request Policy**: AllViewer

### 3. Configurar SSL Certificate

- **SSL Certificate**: Seleccionar certificado de ACM
- **Minimum Protocol Version**: TLSv1.2_2021
- **SSL Support Method**: sni-only

### 4. Configurar Custom Error Responses

```
403: /index.html (200) - 10 minutos
404: /index.html (200) - 10 minutos
```

## Integración con CI/CD

### Script de Upload a S3

```bash
#!/bin/bash
# scripts/upload-assets-to-s3.sh

BUCKET="respicare-static-assets"
DISTRIBUTION_ID="E1234567890ABC"

# Build assets
cd web
npm run build

# Upload a S3
aws s3 sync build/static s3://${BUCKET}/static \
  --cache-control "public, max-age=31536000, immutable" \
  --metadata-directive REPLACE

# Invalidar cache de CloudFront
aws cloudfront create-invalidation \
  --distribution-id ${DISTRIBUTION_ID} \
  --paths "/static/*"
```

## Monitoreo

### CloudWatch Metrics

- **Cache Hit Ratio**: Debe ser > 80%
- **Bytes Downloaded**: Ancho de banda ahorrado
- **Requests**: Total de requests

### CloudFront Logs

Habilitar **Standard Logs** y enviar a S3:

```bash
aws cloudfront update-distribution \
  --id ${DISTRIBUTION_ID} \
  --default-cache-behavior '{
    "Logging": {
      "Enabled": true,
      "Bucket": "respicare-cloudfront-logs.s3.amazonaws.com",
      "Prefix": "cloudfront/"
    }
  }'
```

## Invalidación de Cache

### Manual

```bash
aws cloudfront create-invalidation \
  --distribution-id ${DISTRIBUTION_ID} \
  --paths "/static/*" "/index.html"
```

### Automático (en CI/CD)

Ver script `scripts/invalidate-cloudfront-cache.sh`

## Costos Estimados

- **Data Transfer Out**: $0.085/GB (primeros 10TB)
- **Requests**: $0.0075 por 10,000 requests HTTPS
- **Invalidations**: $0.005 por invalidation (primeras 1,000 gratis/mes)

## Troubleshooting

### Assets no se actualizan

1. Verificar invalidation de cache
2. Verificar TTL en cache policy
3. Verificar headers Cache-Control del origen

### Errores 403/404

1. Verificar permisos del bucket S3
2. Verificar Origin Access Control
3. Verificar path patterns en behaviors

## Referencias

- [AWS CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [CloudFront Cache Policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html)
- [CloudFront Best Practices](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/best-practices.html)

