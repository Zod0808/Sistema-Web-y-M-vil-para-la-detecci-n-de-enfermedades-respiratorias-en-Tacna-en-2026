import client, { collectDefaultMetrics, Registry, Histogram, Counter } from 'prom-client';
import { Request, Response, NextFunction } from 'express';

export const metricsRegistry = new Registry();
collectDefaultMetrics({ register: metricsRegistry });

export const httpRequestDurationMs = new Histogram({
  name: 'http_request_duration_ms',
  help: 'Duración de la petición HTTP en ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000]
});

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total de peticiones HTTP',
  labelNames: ['method', 'route', 'status_code']
});

metricsRegistry.registerMetric(httpRequestDurationMs);
metricsRegistry.registerMetric(httpRequestsTotal);

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;
    const route = (req.route?.path || req.path || '').replace(/:[^/]+/g, ':param');
    const labels = {
      method: req.method,
      route: route || 'unknown',
      status_code: String(res.statusCode)
    };
    httpRequestDurationMs.labels(labels.method, labels.route, labels.status_code).observe(durationMs);
    httpRequestsTotal.labels(labels.method, labels.route, labels.status_code).inc();
  });
  next();
}

export async function metricsHandler(req: Request, res: Response) {
  const token = process.env.METRICS_AUTH_TOKEN;
  if (token && req.get('Authorization') !== `Bearer ${token}`) {
    res.status(401).send('Unauthorized');
    return;
  }
  res.set('Content-Type', metricsRegistry.contentType);
  res.end(await metricsRegistry.metrics());
}


