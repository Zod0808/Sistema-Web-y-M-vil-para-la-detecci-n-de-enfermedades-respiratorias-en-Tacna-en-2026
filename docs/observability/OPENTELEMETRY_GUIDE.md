# 📊 Guía de OpenTelemetry - RespiCare Tacna

Esta guía documenta la implementación de observabilidad avanzada usando OpenTelemetry en el proyecto RespiCare.

---

## 📋 Índice

1. [Introducción](#introducción)
2. [Arquitectura](#arquitectura)
3. [Configuración Backend](#configuración-backend)
4. [Configuración AI Services](#configuración-ai-services)
5. [Despliegue en Kubernetes](#despliegue-en-kubernetes)
6. [Métricas de Negocio](#métricas-de-negocio)
7. [Tracing Distribuido](#tracing-distribuido)
8. [Visualización](#visualización)
9. [Troubleshooting](#troubleshooting)
10. [Mejores Prácticas](#mejores-prácticas)

---

## Introducción

OpenTelemetry es un estándar abierto para observabilidad que proporciona:
- **Tracing distribuido**: Seguimiento de requests a través de múltiples servicios
- **Métricas**: Medición de performance y comportamiento del sistema
- **Logs**: Integración con logs estructurados

### Beneficios

- **Visibilidad completa**: Entender el flujo completo de requests
- **Debugging más rápido**: Identificar cuellos de botella y errores
- **Métricas de negocio**: Medir KPIs técnicos y de negocio
- **Estándar abierto**: Compatible con múltiples backends (Jaeger, Prometheus, etc.)

---

## Arquitectura

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────┐
│   Backend       │────────▶│  OTEL Collector  │────────▶│   Jaeger    │
│  (Node.js)      │  OTLP   │   (Kubernetes)   │         │  (UI/Query) │
└─────────────────┘         └──────────────────┘         └─────────────┘
                                      │
┌─────────────────┐                   │
│  AI Services   │───────────────────┘
│   (Python)     │      OTLP
└─────────────────┘
```

### Componentes

1. **Instrumentación**: Código en Backend y AI Services que genera traces y métricas
2. **OTEL Collector**: Recolecta, procesa y exporta telemetría
3. **Jaeger**: Backend de tracing para visualización
4. **Prometheus**: Backend de métricas (opcional)

---

## Configuración Backend

### Instalación de Dependencias

```bash
cd backend
npm install @opentelemetry/sdk-node \
            @opentelemetry/auto-instrumentations-node \
            @opentelemetry/exporter-trace-otlp-http \
            @opentelemetry/exporter-metrics-otlp-http \
            @opentelemetry/resources \
            @opentelemetry/semantic-conventions \
            @opentelemetry/api
```

### Configuración

El archivo `backend/src/observability/otel-config.ts` contiene la configuración completa.

**Variables de Entorno:**

```bash
# Habilitar OpenTelemetry
OTEL_ENABLED=true

# Nombre del servicio
OTEL_SERVICE_NAME=respicare-backend
OTEL_SERVICE_VERSION=1.0.0

# Exportador (otlp o jaeger)
OTEL_EXPORTER=otlp

# Endpoint del OTEL Collector
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://otel-collector:4318/v1/traces
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://otel-collector:4318/v1/metrics

# O para Jaeger directo
OTEL_EXPORTER=jaeger
OTEL_EXPORTER_JAEGER_ENDPOINT=http://jaeger-collector:14268/api/traces
```

### Inicialización

En `backend/src/index.ts`:

```typescript
import { initOpenTelemetry, shutdownOpenTelemetry } from './observability/otel-config';

// Al inicio de la aplicación
await initOpenTelemetry();

// Al cerrar la aplicación
process.on('SIGTERM', async () => {
  await shutdownOpenTelemetry();
  process.exit(0);
});
```

### Uso de Métricas de Negocio

```typescript
import { incrementBusinessMetric, recordBusinessLatency } from './observability/otel-config';

// Incrementar contador
incrementBusinessMetric('appointmentsCreated', 1, {
  doctorId: '123',
  specialty: 'pulmonology'
});

// Registrar latencia
recordBusinessLatency('mlPredictionLatency', 150, {
  model: 'symptom-analyzer'
});
```

### Uso de Tracing Personalizado

```typescript
import { createBusinessSpan, addSpanAttributes } from './observability/otel-config';

// Crear span personalizado
await createBusinessSpan('processAppointment', async (span) => {
  span.setAttribute('appointment.id', appointmentId);
  span.setAttribute('appointment.type', 'consultation');
  
  // Lógica de negocio
  const result = await processAppointment(appointmentId);
  
  return result;
}, {
  'business.operation': 'processAppointment',
  'appointment.id': appointmentId
});
```

---

## Configuración AI Services

### Instalación de Dependencias

```bash
cd ai-services
pip install opentelemetry-api \
            opentelemetry-sdk \
            opentelemetry-exporter-otlp \
            opentelemetry-instrumentation-fastapi \
            opentelemetry-instrumentation-requests \
            opentelemetry-instrumentation-httpx
```

### Configuración

El archivo `ai-services/observability/otel_setup.py` contiene la configuración completa.

**Variables de Entorno:**

```bash
# Habilitar OpenTelemetry
OTEL_ENABLED=true

# Nombre del servicio
OTEL_SERVICE_NAME=respicare-ai-services
OTEL_SERVICE_VERSION=1.0.0

# Endpoint del OTEL Collector
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
```

### Inicialización

En `ai-services/main.py`:

```python
from observability.otel_setup import init_opentelemetry, instrument_fastapi_app

# Al inicio de la aplicación
if init_opentelemetry():
    instrument_fastapi_app(app)
```

### Uso de Métricas de Negocio

```python
from observability.otel_setup import increment_business_metric, record_business_latency

# Incrementar contador
increment_business_metric('ml_predictions_total', 1, {
    'model': 'symptom-analyzer',
    'type': 'classification'
})

# Registrar latencia
record_business_latency('ml_prediction_latency', 150.5, {
    'model': 'symptom-analyzer'
})
```

### Uso de Tracing Personalizado

```python
from observability.otel_setup import trace_business_operation, create_business_span

# Decorador
@trace_business_operation('analyze_symptoms')
async def analyze_symptoms(data):
    # Lógica de negocio
    return result

# Context manager
with create_business_span('process_image', {'image_id': image_id}):
    result = process_image(image_id)
```

---

## Despliegue en Kubernetes

### Namespace de Observabilidad

```bash
kubectl create namespace observability
```

### Desplegar Jaeger

```bash
kubectl apply -f infrastructure/k8s/jaeger-deployment.yaml
```

**Verificar:**

```bash
kubectl get pods -n observability -l app=jaeger
kubectl get svc -n observability -l app=jaeger
```

### Desplegar OTEL Collector

```bash
kubectl apply -f infrastructure/k8s/otel-collector.yaml
```

**Verificar:**

```bash
kubectl get pods -n observability -l app=otel-collector
kubectl get svc -n observability -l app=otel-collector
```

### Configurar Backend y AI Services

Asegúrate de que las variables de entorno estén configuradas en los deployments:

```yaml
env:
  - name: OTEL_ENABLED
    value: "true"
  - name: OTEL_EXPORTER_OTLP_ENDPOINT
    value: "http://otel-collector.observability.svc.cluster.local:4318"
```

---

## Métricas de Negocio

### Métricas Disponibles

#### Backend

- `respicare.patients.active`: Número de pacientes activos
- `respicare.appointments.created`: Total de citas creadas
- `respicare.appointments.completed`: Total de citas completadas
- `respicare.medical_histories.created`: Total de historias médicas creadas
- `respicare.alerts.triggered`: Total de alertas activadas
- `respicare.ml.predictions`: Total de predicciones ML
- `respicare.ml.prediction_latency`: Latencia de predicciones ML
- `respicare.prescriptions.created`: Total de prescripciones creadas
- `respicare.reports.generated`: Total de reportes generados

#### AI Services

- `respicare.ml.predictions`: Total de predicciones ML
- `respicare.ml.prediction_latency`: Latencia de predicciones ML
- `respicare.symptom_analyses.total`: Total de análisis de síntomas
- `respicare.image_analyses.total`: Total de análisis de imágenes
- `respicare.audio_transcriptions.total`: Total de transcripciones de audio
- `respicare.model.inference_latency`: Latencia de inferencia de modelos
- `respicare.cache.hits`: Total de hits en cache
- `respicare.cache.misses`: Total de misses en cache

### Consultar Métricas

Las métricas se exportan a través del OTEL Collector y pueden ser consultadas en Prometheus o el backend de métricas configurado.

---

## Tracing Distribuido

### Flujo de Tracing

1. **Request entra al Backend**: Se crea un span raíz
2. **Backend llama a AI Services**: Se propaga el trace context
3. **AI Services procesa**: Crea spans hijos
4. **Respuesta**: Todos los spans se envían al OTEL Collector

### Propagación de Context

El trace context se propaga automáticamente a través de:
- Headers HTTP (`traceparent`, `tracestate`)
- gRPC metadata
- Mensajes de cola (si se implementa)

### Visualizar Traces

1. Acceder a Jaeger UI: `http://jaeger.respicare.local:16686`
2. Seleccionar servicio: `respicare-backend` o `respicare-ai-services`
3. Buscar traces por:
   - Service name
   - Operation name
   - Tags
   - Time range

---

## Visualización

### Jaeger UI

**Acceso:**
- URL: `http://jaeger.respicare.local:16686`
- O port-forward: `kubectl port-forward -n observability svc/jaeger-query 16686:16686`

**Funcionalidades:**
- Buscar traces por servicio, operación, tags
- Ver detalles de spans individuales
- Analizar latencias y dependencias
- Ver errores y excepciones

### Grafana (Opcional)

Puedes configurar Grafana para visualizar métricas de OpenTelemetry:

1. Configurar Prometheus como fuente de datos
2. Importar dashboards de OpenTelemetry
3. Crear dashboards personalizados para métricas de negocio

---

## Troubleshooting

### OpenTelemetry no se inicializa

**Síntoma:** No aparecen traces en Jaeger

**Solución:**
1. Verificar que `OTEL_ENABLED=true`
2. Verificar que las dependencias están instaladas
3. Revisar logs del backend/AI services
4. Verificar conectividad con OTEL Collector

### Traces incompletos

**Síntoma:** Algunos spans no aparecen

**Solución:**
1. Verificar propagación de trace context
2. Verificar que todos los servicios tienen OTEL habilitado
3. Revisar configuración de sampling

### Alto uso de recursos

**Síntoma:** OTEL Collector consume mucha CPU/memoria

**Solución:**
1. Ajustar `send_batch_size` en el processor
2. Configurar sampling
3. Filtrar spans ruidosos (health checks, etc.)

### Métricas no aparecen

**Síntoma:** Métricas de negocio no se exportan

**Solución:**
1. Verificar que las métricas están inicializadas
2. Verificar endpoint de métricas en OTEL Collector
3. Revisar configuración de `PeriodicExportingMetricReader`

---

## Mejores Prácticas

### 1. Naming de Spans

- Usar nombres descriptivos: `processAppointment`, `analyzeSymptoms`
- Incluir contexto: `appointment.process`, `ml.predict`
- Evitar nombres genéricos: `operation`, `process`

### 2. Atributos de Spans

- Agregar atributos relevantes: IDs, tipos, estados
- No incluir datos sensibles (PII)
- Usar atributos semánticos estándar cuando sea posible

### 3. Sampling

- En desarrollo: 100% sampling
- En producción: 10-20% sampling para reducir overhead
- Aumentar sampling para operaciones críticas

### 4. Métricas de Negocio

- Definir métricas relevantes para el negocio
- Usar unidades consistentes (ms, count, bytes)
- Agregar labels/atributos para segmentación

### 5. Performance

- Usar batching para reducir overhead
- Configurar timeouts apropiados
- Monitorear el impacto de OTEL en performance

### 6. Seguridad

- No incluir datos sensibles en traces
- Usar redacción automática para PII
- Configurar autenticación en backends de observabilidad

---

## Recursos Adicionales

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [OTEL Collector Documentation](https://opentelemetry.io/docs/collector/)
- [OpenTelemetry Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/)

---

**Última actualización**: Noviembre 2025

**Mantenedor**: Equipo de Desarrollo RespiCare

