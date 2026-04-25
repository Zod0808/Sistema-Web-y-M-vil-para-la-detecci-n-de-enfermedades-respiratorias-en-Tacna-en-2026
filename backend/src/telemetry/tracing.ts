/* OpenTelemetry inicialización condicional (OTEL_ENABLED=true)
   No rompe si dependencias no están instaladas: usa imports dinámicos y captura errores. */

import { logger } from '../utils/logger';

let shutdownFn: (() => Promise<void>) | null = null;

export async function initTelemetry(): Promise<void> {
  try {
    if (process.env.OTEL_ENABLED !== 'true') {
      logger.info('OTEL desactivado (OTEL_ENABLED!=true)');
      return;
    }

    // Imports dinámicos para evitar fallas cuando no están instalados
    const [{ NodeSDK }, { getNodeAutoInstrumentations }, { Resource }, { SemanticResourceAttributes }] = await Promise.all([
      import('@opentelemetry/sdk-node'),
      import('@opentelemetry/auto-instrumentations-node'),
      import('@opentelemetry/resources'),
      import('@opentelemetry/semantic-conventions')
    ]);

    // Exportador de trazas configurable: otlp|jaeger
    const exporterType = (process.env.OTEL_EXPORTER || 'otlp').toLowerCase();
    let traceExporter: any;

    if (exporterType === 'jaeger') {
      const { JaegerExporter } = await import('@opentelemetry/exporter-jaeger');
      traceExporter = new JaegerExporter({
        endpoint: process.env.OTEL_EXPORTER_JAEGER_ENDPOINT || 'http://localhost:14268/api/traces'
      });
    } else {
      // OTLP por defecto (HTTP/proto por variables de entorno)
      const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
      traceExporter = new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
        headers: {}
      });
    }

    const serviceName = process.env.OTEL_SERVICE_NAME || 'respicare-backend';
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development'
    });

    const sdk = new NodeSDK({
      resource,
      traceExporter,
      instrumentations: [
        getNodeAutoInstrumentations({
          // Excluir librerías si fuera necesario
        })
      ]
    });

    await sdk.start();
    shutdownFn = async () => {
      try {
        await sdk.shutdown();
        logger.info('OTEL tracer detenido correctamente');
      } catch (err) {
        logger.error('Error deteniendo OTEL tracer', { err });
      }
    };

    logger.info(`OTEL iniciado con exportador: ${exporterType}`);
  } catch (err) {
    logger.warn('OpenTelemetry no inicializado (dependencias no instaladas o error de config)', { err });
  }
}

export async function shutdownTelemetry(): Promise<void> {
  if (shutdownFn) {
    await shutdownFn();
  }
}


