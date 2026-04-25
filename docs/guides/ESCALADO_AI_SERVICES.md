# Guía de Escalado de AI Services

Esta guía explica cómo escalar los servicios de IA para manejar más consultas simultáneas.

## Problema

Cuando el servicio de IA recibe muchas consultas simultáneas, puede saturarse y no responder adecuadamente. Esto se debe a:

1. **Límite de workers**: Un solo proceso con pocos workers
2. **Recursos limitados**: CPU y memoria insuficientes
3. **Sin balanceo de carga**: Todas las peticiones van a una sola instancia

## Soluciones Implementadas

### 1. Aumento de Workers

Se aumentó el número de workers de uvicorn:
- **Desarrollo**: 4 workers
- **Producción**: 8 workers

Esto permite manejar más conexiones simultáneas dentro de un mismo contenedor.

### 2. Configuración de Recursos

Se agregaron límites de recursos en `docker-compose.yml` y `docker-compose.prod.yml`:

```yaml
deploy:
  resources:
    limits:
      cpus: '2-4'
      memory: 4G-8G
    reservations:
      cpus: '0.5-2'
      memory: 1G-4G
```

### 3. Optimización de Uvicorn

Se configuraron parámetros de rendimiento:
- `--timeout-keep-alive 120`: Mantiene conexiones abiertas por más tiempo
- `--limit-concurrency 500-1000`: Limita conexiones concurrentes por worker
- `--backlog 1024-2048`: Tamaño de cola de conexiones pendientes

### 4. Escalado Horizontal

Para manejar aún más carga, puedes escalar horizontalmente creando múltiples instancias del servicio.

## Cómo Escalar los Servicios

### Opción 1: Usando Scripts (Recomendado)

#### En Linux/Mac:
```bash
./scripts/scale-ai-services.sh 3
```

#### En Windows (PowerShell):
```powershell
.\scripts\scale-ai-services.ps1 3
```

### Opción 2: Usando Docker Compose Directamente

#### Docker Compose v2:
```bash
docker compose -f docker-compose.prod.yml up -d --scale ai-services=3
```

#### Docker Compose v1:
```bash
docker-compose -f docker-compose.prod.yml up -d --scale ai-services=3
```

### Opción 3: Modificar docker-compose.prod.yml

Puedes crear múltiples servicios manualmente:

```yaml
  ai-services-1:
    # ... configuración ...
  
  ai-services-2:
    # ... configuración ...
  
  ai-services-3:
    # ... configuración ...
```

Y luego actualizar `nginx.conf` para incluir todos los servicios en el upstream.

## Configuración de Nginx para Balanceo de Carga

Nginx ya está configurado para balancear carga entre múltiples instancias usando `least_conn` (menor número de conexiones).

Cuando escalas con `docker compose scale`, las instancias se nombran automáticamente:
- `ai-services_1`
- `ai-services_2`
- `ai-services_3`
- etc.

Nginx detectará automáticamente estas instancias si están en la misma red Docker.

### Configuración Manual (si es necesario)

Si necesitas configurar manualmente, edita `nginx/nginx.conf`:

```nginx
upstream ai_service {
    least_conn;
    server ai-services_1:8000 max_fails=3 fail_timeout=30s;
    server ai-services_2:8000 max_fails=3 fail_timeout=30s;
    server ai-services_3:8000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}
```

## Monitoreo del Escalado

### Verificar Instancias Activas

```bash
docker ps | grep ai-services
```

### Verificar Estado con Docker Compose

```bash
docker compose -f docker-compose.prod.yml ps ai-services
```

### Verificar Logs

```bash
# Todos los servicios
docker compose -f docker-compose.prod.yml logs ai-services

# Servicio específico
docker compose -f docker-compose.prod.yml logs ai-services_1
```

### Verificar Balanceo de Carga

Puedes usar herramientas como `ab` (Apache Bench) o `wrk`:

```bash
# Instalar wrk (ejemplo en Ubuntu)
sudo apt-get install wrk

# Ejecutar prueba
wrk -t12 -c400 -d30s http://localhost/ai/api/v1/health
```

## Recomendaciones

### Número de Instancias

- **Desarrollo/Testing**: 1-2 instancias
- **Producción pequeña**: 2-3 instancias
- **Producción media**: 3-5 instancias
- **Producción grande**: 5+ instancias (considera Kubernetes)

### Recursos por Instancia

- **Mínimo**: 1 CPU, 2GB RAM
- **Recomendado**: 2 CPU, 4GB RAM
- **Alto rendimiento**: 4 CPU, 8GB RAM

### Workers por Instancia

La fórmula recomendada es:
```
workers = (2 × CPU cores) + 1
```

Para 2 CPUs: `(2 × 2) + 1 = 5 workers` (redondeado a 4-8)

## Troubleshooting

### Problema: Las instancias no se crean

**Solución**: Verifica que no estés usando `container_name` en docker-compose. El escalado requiere que Docker asigne nombres automáticamente.

### Problema: Nginx no encuentra las instancias

**Solución**: 
1. Verifica que todas las instancias estén en la misma red Docker
2. Verifica que nginx esté configurado para usar DNS de Docker
3. Reinicia nginx: `docker compose restart nginx`

### Problema: Alto uso de memoria

**Solución**:
1. Reduce el número de workers por instancia
2. Reduce `--limit-concurrency`
3. Aumenta los límites de memoria en `deploy.resources.limits.memory`

### Problema: Timeouts frecuentes

**Solución**:
1. Aumenta `proxy_read_timeout` en nginx.conf
2. Aumenta `--timeout-keep-alive` en uvicorn
3. Revisa los logs para identificar endpoints lentos

## Próximos Pasos

Para producción a gran escala, considera:

1. **Kubernetes**: Ya tienes configuraciones en `infrastructure/k8s/`
2. **Auto-scaling**: Basado en métricas de CPU/memoria
3. **Load Balancer externo**: AWS ALB, Google Cloud Load Balancer, etc.
4. **Caché distribuido**: Redis Cluster para mejor rendimiento
5. **CDN**: Para contenido estático y respuestas cacheadas

## Referencias

- [Docker Compose Scaling](https://docs.docker.com/compose/reference/scale/)
- [Uvicorn Workers](https://www.uvicorn.org/deployment/#workers)
- [Nginx Load Balancing](https://nginx.org/en/docs/http/load_balancing.html)

