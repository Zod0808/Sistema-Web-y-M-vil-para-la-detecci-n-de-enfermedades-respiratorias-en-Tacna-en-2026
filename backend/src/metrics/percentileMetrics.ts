/**
 * Percentile Metrics (p95/p99)
 * 
 * Calcula percentiles (p50, p95, p99) de latencia de requests HTTP
 * y expone métricas para dashboards de performance centralizados.
 */

import { Histogram } from 'prom-client';
import { metricsRegistry } from './metrics';

// Histograma con buckets optimizados para percentiles
export const httpRequestPercentiles = new Histogram({
  name: 'http_request_percentiles',
  help: 'Percentiles de latencia HTTP (p50, p95, p99)',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [
    1, 5, 10, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 750, 1000, 1500, 2000, 3000, 5000
  ]
});

metricsRegistry.registerMetric(httpRequestPercentiles);

/**
 * Calcula percentiles desde un histograma de Prometheus
 */
export function calculatePercentiles(histogram: Histogram, labels: Record<string, string>): {
  p50: number;
  p95: number;
  p99: number;
  count: number;
} {
  const labelValues = Object.values(labels);
  const metric = histogram.labels(...labelValues);
  
  // Obtener buckets y valores acumulados
  const buckets = (metric as any).get().values || [];
  
  if (buckets.length === 0) {
    return { p50: 0, p95: 0, p99: 0, count: 0 };
  }

  // Calcular total de observaciones
  const total = buckets.reduce((sum, bucket) => sum + bucket.value, 0);
  
  if (total === 0) {
    return { p50: 0, p95: 0, p99: 0, count: 0 };
  }

  // Encontrar percentiles
  let p50 = 0, p95 = 0, p99 = 0;
  let cumulative = 0;

  for (const bucket of buckets) {
    cumulative += bucket.value;
    const percentile = (cumulative / total) * 100;
    
    if (percentile >= 50 && p50 === 0) {
      p50 = bucket.le;
    }
    if (percentile >= 95 && p95 === 0) {
      p95 = bucket.le;
    }
    if (percentile >= 99 && p99 === 0) {
      p99 = bucket.le;
      break;
    }
  }

  return { p50, p95, p99, count: total };
}

/**
 * Middleware para registrar latencia en histograma de percentiles
 */
export function percentileMetricsMiddleware(req: any, res: any, next: any) {
  const start = process.hrtime.bigint();
  
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;
    const route = String(req.route?.path ?? req.path ?? '').replace(/:[^/]+/g, ':param');
    const labels = {
      method: req.method,
      route: route || 'unknown',
      status_code: String(res.statusCode)
    };
    
    httpRequestPercentiles.labels(labels.method, labels.route, labels.status_code).observe(durationMs);
  });
  
  next();
}

/**
 * Obtiene métricas de percentiles para un endpoint específico o todos
 */
export function getPercentileMetrics(route?: string, method?: string): {
  [key: string]: {
    p50: number;
    p95: number;
    p99: number;
    count: number;
  };
} {
  const metrics: { [key: string]: any } = {};
  
  // Obtener todas las métricas del histograma
  const allMetrics = (httpRequestPercentiles as any).get();
  
  for (const metric of allMetrics.values || []) {
    const labels = metric.labels || {};
    const routeLabel = labels.route || 'unknown';
    const methodLabel = labels.method || 'unknown';
    const key = `${methodLabel}:${routeLabel}`;
    
    // Filtrar si se especificó route o method
    if (route && routeLabel !== route) continue;
    if (method && methodLabel !== method) continue;
    
    const percentiles = calculatePercentiles(httpRequestPercentiles, labels);
    metrics[key] = percentiles;
  }
  
  return metrics;
}

