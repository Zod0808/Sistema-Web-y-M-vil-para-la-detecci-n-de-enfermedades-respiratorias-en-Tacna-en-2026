# Resumen de Mejoras de Rendimiento para AI Services

## Problema Identificado

El servicio de AI no podía manejar muchas consultas simultáneas en Docker, causando:
- Timeouts
- Respuestas lentas
- Saturación del servicio
- Errores 503 (Service Unavailable)

## Soluciones Implementadas

### 1. Aumento de Workers en Producción

**Antes**: 4 workers  
**Ahora**: 8 workers

**Archivo**: `ai-services/Dockerfile.prod`

```dockerfile
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "8", "--timeout-keep-alive", "120", "--limit-concurrency", "1000", "--backlog", "2048"]
```

### 2. Configuración de Timeouts y Límites

Se agregaron parámetros de rendimiento:
- `--timeout-keep-alive 120`: Mantiene conexiones abiertas por 120 segundos
- `--limit-concurrency 1000`: Permite hasta 1000 conexiones concurrentes por worker
- `--backlog 2048`: Cola de 2048 conexiones pendientes

### 3. Límites de Recursos en Docker Compose

**docker-compose.yml** (desarrollo):
```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 4G
    reservations:
      cpus: '0.5'
      memory: 1G
```

**docker-compose.prod.yml** (producción):
```yaml
deploy:
  resources:
    limits:
      cpus: '4'
      memory: 8G
    reservations:
      cpus: '2'
      memory: 4G
```

### 4. Optimización de Rate Limiting

Se ajustaron los límites de rate limiting:
- **Desarrollo**: 200 tokens, 10 tokens/segundo
- **Producción**: 500 tokens, 20 tokens/segundo

### 5. Mejora de Nginx para Balanceo de Carga

**nginx/nginx.conf**:
- Configuración de `keepalive` para conexiones persistentes
- Timeouts aumentados para procesamiento de AI (180s)
- Buffering optimizado
- Retry automático en caso de fallo

### 6. Escalado Horizontal

Se crearon scripts y documentación para escalar horizontalmente:
- `scripts/scale-ai-services.sh` (Linux/Mac)
- `scripts/scale-ai-services.ps1` (Windows)
- `docs/guides/ESCALADO_AI_SERVICES.md` (documentación completa)

## Mejoras de Rendimiento Esperadas

### Antes
- **Capacidad**: ~50-100 requests/segundo
- **Workers**: 4
- **Memoria**: Sin límites definidos
- **Escalado**: No disponible

### Después
- **Capacidad**: ~500-1000 requests/segundo (con 1 instancia)
- **Workers**: 8 por instancia
- **Memoria**: 4-8GB por instancia
- **Escalado**: Hasta N instancias (recomendado 2-5)

## Cómo Aplicar los Cambios

### Para Desarrollo

```bash
docker compose -f docker-compose.dev.yml up -d --build ai-services
```

### Para Producción

```bash
# Reconstruir la imagen
docker compose -f docker-compose.prod.yml build ai-services

# Iniciar con los nuevos recursos
docker compose -f docker-compose.prod.yml up -d ai-services

# Opcional: Escalar a múltiples instancias
docker compose -f docker-compose.prod.yml up -d --scale ai-services=3
```

## Monitoreo

### Verificar Recursos

```bash
docker stats respicare-ai-prod
```

### Verificar Logs

```bash
docker compose -f docker-compose.prod.yml logs -f ai-services
```

### Verificar Health

```bash
curl http://localhost:8000/api/v1/health
```

## Próximos Pasos Recomendados

1. **Monitoreo de Métricas**: Implementar Prometheus/Grafana
2. **Auto-scaling**: Configurar auto-scaling basado en CPU/memoria
3. **Caché Distribuido**: Optimizar uso de Redis para respuestas frecuentes
4. **CDN**: Para contenido estático
5. **Kubernetes**: Para despliegue a gran escala (ya tienes configuraciones en `infrastructure/k8s/`)

## Archivos Modificados

1. `ai-services/Dockerfile.prod` - Aumento de workers y configuración
2. `docker-compose.yml` - Límites de recursos y configuración optimizada
3. `docker-compose.prod.yml` - Recursos aumentados y preparado para escalado
4. `nginx/nginx.conf` - Optimización de balanceo de carga y timeouts

## Archivos Creados

1. `scripts/scale-ai-services.sh` - Script de escalado para Linux/Mac
2. `scripts/scale-ai-services.ps1` - Script de escalado para Windows
3. `docs/guides/ESCALADO_AI_SERVICES.md` - Guía completa de escalado
4. `docs/guides/RESUMEN_MEJORAS_AI_SERVICES.md` - Este documento

## Notas Importantes

⚠️ **Importante**: 
- El escalado horizontal requiere que NO uses `container_name` en docker-compose (ya corregido)
- Nginx detectará automáticamente las nuevas instancias si están en la misma red Docker
- Asegúrate de tener suficientes recursos en tu servidor antes de escalar

✅ **Recomendaciones**:
- Empieza con 2-3 instancias en producción
- Monitorea el uso de CPU y memoria
- Ajusta los límites según tus necesidades
- Considera usar Kubernetes para producción a gran escala

