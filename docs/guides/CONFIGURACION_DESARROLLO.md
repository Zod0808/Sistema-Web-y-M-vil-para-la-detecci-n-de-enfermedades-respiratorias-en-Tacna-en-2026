# Configuración de Desarrollo - AI Services

## Mejoras Aplicadas para Desarrollo

Aunque estés en modo desarrollo, ahora el servicio de AI tiene optimizaciones de rendimiento para manejar más consultas.

### Configuración Actual

**docker-compose.dev.yml**:
- **Workers**: 4 workers (aunque con --reload)
- **Recursos**: 2 CPU, 4GB RAM (límites)
- **Rate Limiting**: Deshabilitado por defecto (o límites muy altos)
- **Timeouts**: 120 segundos keep-alive
- **Concurrencia**: 500 conexiones por worker
- **Backlog**: 1024 conexiones pendientes

### Características de Desarrollo

1. **Hot Reload**: Mantiene `--reload` para desarrollo activo
2. **Logs Detallados**: `--log-level debug` para debugging
3. **Rate Limiting Flexible**: Puede deshabilitarse o aumentarse
4. **Recursos Adecuados**: Suficientes para desarrollo pero no excesivos

## Cómo Usar

### Iniciar Servicios de Desarrollo

```bash
docker compose -f docker-compose.dev.yml up -d
```

### Reconstruir Solo AI Services

```bash
docker compose -f docker-compose.dev.yml build ai-services
docker compose -f docker-compose.dev.yml up -d ai-services
```

### Ver Logs en Tiempo Real

```bash
docker compose -f docker-compose.dev.yml logs -f ai-services
```

### Verificar Recursos

```bash
docker stats respicare-ai-dev
```

## Ajustar Configuración

### Habilitar Rate Limiting en Desarrollo

Si quieres probar el rate limiting en desarrollo, edita `docker-compose.dev.yml`:

```yaml
environment:
  AI_RATE_LIMIT_ENABLED: "1"
  AI_RATE_LIMIT_CAPACITY: "200"
  AI_RATE_LIMIT_REFILL_PER_SEC: "10.0"
```

### Aumentar Workers en Desarrollo

Si necesitas más capacidad en desarrollo, cambia el comando:

```yaml
command: uvicorn main:app --host 0.0.0.0 --port 8000 --workers 6 --reload --log-level debug --timeout-keep-alive 120 --limit-concurrency 500 --backlog 1024
```

### Aumentar Recursos

Si tu máquina tiene más recursos disponibles:

```yaml
deploy:
  resources:
    limits:
      cpus: '4'
      memory: 8G
    reservations:
      cpus: '1'
      memory: 2G
```

## Diferencias con Producción

| Característica | Desarrollo | Producción |
|---------------|------------|------------|
| Workers | 4 | 8 |
| Hot Reload | ✅ Sí | ❌ No |
| Log Level | DEBUG | INFO |
| Rate Limiting | Deshabilitado | Habilitado |
| Recursos | 2 CPU, 4GB | 4 CPU, 8GB |
| Volúmenes | Montaje directo | Volúmenes nombrados |

## Troubleshooting

### Problema: El servicio se reinicia constantemente

**Solución**: Verifica los logs para errores:
```bash
docker compose -f docker-compose.dev.yml logs ai-services
```

### Problema: Muy lento con --reload

**Solución**: 
- Reduce el número de workers a 2
- O desactiva --reload temporalmente para pruebas de rendimiento

### Problema: Consume mucha memoria

**Solución**:
- Reduce workers a 2
- Reduce `--limit-concurrency` a 250
- Verifica que no haya memory leaks en el código

## Monitoreo en Desarrollo

### Health Check

```bash
curl http://localhost:8000/api/v1/health
```

### Métricas de Rendimiento

Los logs de rendimiento se guardan en:
```
ai-services/monitoring/performance/perf_YYYYMMDD.jsonl
```

### Ver Uso de Recursos

```bash
# Tiempo real
docker stats respicare-ai-dev

# Resumen
docker stats --no-stream respicare-ai-dev
```

## Notas Importantes

⚠️ **Importante**:
- En desarrollo, `--reload` puede consumir más recursos
- Los volúmenes montados directamente pueden ser más lentos que en producción
- El rate limiting está deshabilitado por defecto para facilitar desarrollo

✅ **Recomendaciones**:
- Usa `docker-compose.dev.yml` para desarrollo
- Usa `docker-compose.prod.yml` para pruebas de rendimiento
- Monitorea el uso de recursos durante desarrollo
- Considera desactivar --reload si no estás haciendo cambios activos

