/**
 * Configuración avanzada de OpenTelemetry para RespiCare Backend
 * 
 * Incluye:
 * - Tracing distribuido completo
 * - Métricas de negocio personalizadas
 * - Logs estructurados
 * - Integración con Jaeger y OTLP
 */

import { logger } from '../utils/logger';

// Tipos para evitar errores si las dependencias no están instaladas
type NodeSDK = any;
type Resource = any;
type SemanticResourceAttributes = any;
type OTLPTraceExporter = any;
type OTLPMetricExporter = any;
type JaegerExporter = any;
type BatchSpanProcessor = any;
type PeriodicExportingMetricReader = any;
type MeterProvider = any;
type TracerProvider = any;
type Meter = any;
type Tracer = any;
type Span = any;

let sdk: NodeSDK | null = null;
let meterProvider: MeterProvider | null = null;
let tracerProvider: TracerProvider | null = null;
let businessMetrics: Map<string, any> = new Map();
let shutdownFn: (() => Promise<void>) | null = null;

/**
 * Inicializa OpenTelemetry con configuración avanzada
 */
export async function initOpenTelemetry(): Promise<void> {
  try {
    if (process.env.OTEL_ENABLED !== 'true') {
      logger.info('OpenTelemetry desactivado (OTEL_ENABLED!=true)');
      return;
    }

    // Imports dinámicos para evitar fallas cuando no están instalados
    const [
      { NodeSDK },
      { getNodeAutoInstrumentations },
      { Resource },
      { SemanticResourceAttributes },
      { OTLPTraceExporter },
      { OTLPMetricExporter },
      { BatchSpanProcessor },
      { PeriodicExportingMetricReader },
      { metrics },
      { trace }
    ] = await Promise.all([
      import('@opentelemetry/sdk-node'),
      import('@opentelemetry/auto-instrumentations-node'),
      import('@opentelemetry/resources'),
      import('@opentelemetry/semantic-conventions'),
      import('@opentelemetry/exporter-trace-otlp-http'),
      import('@opentelemetry/exporter-metrics-otlp-http'),
      import('@opentelemetry/sdk-trace-base'),
      import('@opentelemetry/sdk-metrics'),
      import('@opentelemetry/api'),
      import('@opentelemetry/api')
    ]);

    const serviceName = process.env.OTEL_SERVICE_NAME || 'respicare-backend';
    const serviceVersion = process.env.OTEL_SERVICE_VERSION || process.env.APP_VERSION || '1.0.0';
    const environment = process.env.NODE_ENV || 'development';

    // Configurar Resource con atributos semánticos
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
      [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: process.env.HOSTNAME || 'unknown',
      'service.namespace': 'respicare',
      'service.team': 'backend'
    });

    // Configurar exportador de trazas
    const exporterType = (process.env.OTEL_EXPORTER || 'otlp').toLowerCase();
    let traceExporter: OTLPTraceExporter | JaegerExporter;

    if (exporterType === 'jaeger') {
      const { JaegerExporter } = await import('@opentelemetry/exporter-jaeger');
      traceExporter = new JaegerExporter({
        endpoint: process.env.OTEL_EXPORTER_JAEGER_ENDPOINT || 'http://jaeger-collector:14268/api/traces',
        tags: {
          service: serviceName,
          version: serviceVersion,
          environment
        }
      });
    } else {
      // OTLP por defecto
      traceExporter = new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 
             process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 
             'http://otel-collector:4318/v1/traces',
        headers: process.env.OTEL_EXPORTER_OTLP_HEADERS 
          ? JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS)
          : {}
      });
    }

    // Configurar procesador de spans con batching
    const spanProcessor = new BatchSpanProcessor(traceExporter, {
      maxExportBatchSize: 512,
      exportTimeoutMillis: 30000,
      scheduledDelayMillis: 5000
    });

    // Configurar exportador de métricas
    const metricExporter = new OTLPMetricExporter({
      url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || 
           process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 
           'http://otel-collector:4318/v1/metrics',
      headers: process.env.OTEL_EXPORTER_OTLP_HEADERS 
        ? JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS)
        : {}
    });

    // Configurar lector de métricas periódico
    const metricReader = new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 60000, // Exportar cada minuto
      exportTimeoutMillis: 30000
    });

    // Configurar SDK de Node.js
    sdk = new NodeSDK({
      resource,
      traceExporter,
      spanProcessor,
      instrumentations: [
        getNodeAutoInstrumentations({
          // Configurar instrumentaciones específicas
          '@opentelemetry/instrumentation-http': {
            enabled: true,
            ignoreIncomingRequestHook: (req: any) => {
              // Ignorar health checks y métricas
              return req.url === '/health' || req.url === '/metrics';
            }
          },
          '@opentelemetry/instrumentation-express': {
            enabled: true
          },
          '@opentelemetry/instrumentation-mongodb': {
            enabled: true
          },
          '@opentelemetry/instrumentation-redis': {
            enabled: true
          }
        })
      ],
      metricReader
    });

    await sdk.start();
    
    // Obtener providers
    meterProvider = metrics.getMeterProvider() as MeterProvider;
    tracerProvider = trace.getTracerProvider() as TracerProvider;

    // Inicializar métricas de negocio personalizadas
    await initBusinessMetrics();

    shutdownFn = async () => {
      try {
        await sdk?.shutdown();
        await meterProvider?.shutdown();
        logger.info('OpenTelemetry detenido correctamente');
      } catch (err) {
        logger.error('Error deteniendo OpenTelemetry', { err });
      }
    };

    logger.info(`✅ OpenTelemetry iniciado con exportador: ${exporterType}`, {
      serviceName,
      serviceVersion,
      environment
    });
  } catch (err: any) {
    logger.warn('OpenTelemetry no inicializado (dependencias no instaladas o error de config)', { 
      error: err.message 
    });
  }
}

/**
 * Inicializa métricas de negocio personalizadas
 */
async function initBusinessMetrics(): Promise<void> {
  try {
    const { metrics } = await import('@opentelemetry/api');
    const meter = metrics.getMeter('respicare-business', '1.0.0');

    // Métricas de pacientes
    const activePatients = meter.createUpDownCounter('respicare.patients.active', {
      description: 'Número de pacientes activos'
    });
    businessMetrics.set('activePatients', activePatients);

    // Métricas de citas
    const appointmentsCreated = meter.createCounter('respicare.appointments.created', {
      description: 'Total de citas creadas'
    });
    businessMetrics.set('appointmentsCreated', appointmentsCreated);

    const appointmentsCompleted = meter.createCounter('respicare.appointments.completed', {
      description: 'Total de citas completadas'
    });
    businessMetrics.set('appointmentsCompleted', appointmentsCompleted);

    // Métricas de historias médicas
    const medicalHistoriesCreated = meter.createCounter('respicare.medical_histories.created', {
      description: 'Total de historias médicas creadas'
    });
    businessMetrics.set('medicalHistoriesCreated', medicalHistoriesCreated);

    // Métricas de alertas
    const alertsTriggered = meter.createCounter('respicare.alerts.triggered', {
      description: 'Total de alertas activadas',
      unit: '1'
    });
    businessMetrics.set('alertsTriggered', alertsTriggered);

    // Métricas de análisis ML
    const mlPredictions = meter.createCounter('respicare.ml.predictions', {
      description: 'Total de predicciones ML realizadas'
    });
    businessMetrics.set('mlPredictions', mlPredictions);

    const mlPredictionLatency = meter.createHistogram('respicare.ml.prediction_latency', {
      description: 'Latencia de predicciones ML en milisegundos',
      unit: 'ms'
    });
    businessMetrics.set('mlPredictionLatency', mlPredictionLatency);

    // Métricas de prescripciones
    const prescriptionsCreated = meter.createCounter('respicare.prescriptions.created', {
      description: 'Total de prescripciones creadas'
    });
    businessMetrics.set('prescriptionsCreated', prescriptionsCreated);

    // Métricas de reportes
    const reportsGenerated = meter.createCounter('respicare.reports.generated', {
      description: 'Total de reportes generados'
    });
    businessMetrics.set('reportsGenerated', reportsGenerated);

    logger.info('✅ Métricas de negocio personalizadas inicializadas');
  } catch (err: any) {
    logger.warn('No se pudieron inicializar métricas de negocio', { error: err.message });
  }
}

/**
 * Obtiene un contador de métricas de negocio
 */
export function getBusinessMetric(name: string): any {
  return businessMetrics.get(name);
}

/**
 * Incrementa una métrica de negocio
 */
export function incrementBusinessMetric(name: string, value: number = 1, attributes?: Record<string, string>): void {
  const metric = businessMetrics.get(name);
  if (metric) {
    try {
      if (metric.add) {
        metric.add(value, attributes);
      } else if (metric.record) {
        metric.record(value, attributes);
      }
    } catch (err) {
      logger.warn(`Error incrementando métrica ${name}`, { error: err });
    }
  }
}

/**
 * Registra una latencia en una métrica de histograma
 */
export function recordBusinessLatency(name: string, value: number, attributes?: Record<string, string>): void {
  const metric = businessMetrics.get(name);
  if (metric && metric.record) {
    try {
      metric.record(value, attributes);
    } catch (err) {
      logger.warn(`Error registrando latencia ${name}`, { error: err });
    }
  }
}

/**
 * Crea un span personalizado para operaciones de negocio
 */
export async function createBusinessSpan<T>(
  name: string,
  operation: (span: Span) => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  try {
    const { trace } = await import('@opentelemetry/api');
    const tracer = trace.getTracer('respicare-business', '1.0.0');
    
    return await tracer.startActiveSpan(name, {
      attributes: {
        'business.operation': name,
        ...attributes
      }
    }, async (span) => {
      try {
        const result = await operation(span);
        span.setStatus({ code: 1 }); // OK
        return result;
      } catch (error: any) {
        span.setStatus({ 
          code: 2, // ERROR
          message: error.message 
        });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    });
  } catch (err) {
    // Si OpenTelemetry no está disponible, ejecutar sin tracing
    logger.warn('OpenTelemetry no disponible, ejecutando sin span', { error: err });
    return await operation({} as Span);
  }
}

/**
 * Agrega atributos a un span activo
 */
export function addSpanAttributes(attributes: Record<string, string | number | boolean>): void {
  try {
    const { trace } = require('@opentelemetry/api');
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      Object.entries(attributes).forEach(([key, value]) => {
        activeSpan.setAttribute(key, value);
      });
    }
  } catch (err) {
    // Ignorar si OpenTelemetry no está disponible
  }
}

/**
 * Registra un evento en el span activo
 */
export function recordSpanEvent(name: string, attributes?: Record<string, string | number | boolean>): void {
  try {
    const { trace } = require('@opentelemetry/api');
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.addEvent(name, attributes);
    }
  } catch (err) {
    // Ignorar si OpenTelemetry no está disponible
  }
}

/**
 * Detiene OpenTelemetry
 */
export async function shutdownOpenTelemetry(): Promise<void> {
  if (shutdownFn) {
    await shutdownFn();
    shutdownFn = null;
  }
}

/**
 * Obtiene el estado de OpenTelemetry
 */
export function getOpenTelemetryStatus(): {
  enabled: boolean;
  sdkInitialized: boolean;
  metricsCount: number;
} {
  return {
    enabled: process.env.OTEL_ENABLED === 'true',
    sdkInitialized: sdk !== null,
    metricsCount: businessMetrics.size
  };
}

