/**
 * MongoDB Monitoring
 * 
 * Monitorea slow queries, uso de índices y performance de la base de datos.
 * Genera alertas cuando se detectan queries lentas o índices no utilizados.
 */

import mongoose from 'mongoose';
import { logger } from '../utils/logger';
import { metricsRegistry } from '../metrics/metrics';
import { Histogram, Counter, Gauge } from 'prom-client';

// Métricas de Prometheus
export const mongoQueryDuration = new Histogram({
  name: 'mongo_query_duration_ms',
  help: 'Duración de queries MongoDB en ms',
  labelNames: ['collection', 'operation', 'index_used'],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
});

export const mongoSlowQueries = new Counter({
  name: 'mongo_slow_queries_total',
  help: 'Total de queries lentas (>1000ms)',
  labelNames: ['collection', 'operation']
});

export const mongoIndexUsage = new Gauge({
  name: 'mongo_index_usage',
  help: 'Uso de índices (1 = usado, 0 = no usado)',
  labelNames: ['collection', 'index_name']
});

metricsRegistry.registerMetric(mongoQueryDuration);
metricsRegistry.registerMetric(mongoSlowQueries);
metricsRegistry.registerMetric(mongoIndexUsage);

interface SlowQueryAlert {
  collection: string;
  operation: string;
  duration: number;
  query: any;
  timestamp: Date;
}

const SLOW_QUERY_THRESHOLD_MS = 1000; // 1 segundo
const slowQueriesCache: SlowQueryAlert[] = [];
const MAX_CACHE_SIZE = 100;

/**
 * Configura profiling de MongoDB para detectar slow queries
 */
export function setupMongoDBProfiling(): void {
  if (!mongoose.connection.db) {
    logger.warn('MongoDB no está conectado, no se puede configurar profiling');
    return;
  }

  // Habilitar profiling en nivel 1 (solo slow queries)
  mongoose.connection.db.admin().command({
    profile: 1,
    slowms: SLOW_QUERY_THRESHOLD_MS,
  }).then(() => {
    logger.info(`✅ MongoDB profiling habilitado (threshold: ${SLOW_QUERY_THRESHOLD_MS}ms)`);
  }).catch((error) => {
    logger.error('Error configurando MongoDB profiling', { error });
  });

  // Monitorear colección system.profile periódicamente
  setInterval(() => {
    checkSlowQueries().catch((error) => {
      logger.error('Error revisando slow queries', { error });
    });
  }, 60000); // Cada minuto
}

/**
 * Revisa slow queries desde system.profile
 */
async function checkSlowQueries(): Promise<void> {
  if (!mongoose.connection.db) return;

  try {
    const profileCollection = mongoose.connection.db.collection('system.profile');
    const recentSlowQueries = await profileCollection
      .find({
        millis: { $gte: SLOW_QUERY_THRESHOLD_MS },
        ts: { $gte: new Date(Date.now() - 60000) } // Último minuto
      })
      .sort({ ts: -1 })
      .limit(10)
      .toArray();

    for (const query of recentSlowQueries) {
      const collection = query.ns?.split('.')[1] || 'unknown';
      const operation = query.op || 'unknown';
      const duration = query.millis || 0;

      // Registrar métrica
      mongoSlowQueries.labels(collection, operation).inc();
      mongoQueryDuration.labels(collection, operation, query.planSummary || 'unknown').observe(duration);

      // Agregar a cache de alertas
      const alert: SlowQueryAlert = {
        collection,
        operation,
        duration,
        query: query.command || query.query || {},
        timestamp: query.ts || new Date(),
      };

      slowQueriesCache.unshift(alert);
      if (slowQueriesCache.length > MAX_CACHE_SIZE) {
        slowQueriesCache.pop();
      }

      // Log de alerta
      logger.warn('⚠️ Slow query detectada', {
        collection,
        operation,
        duration: `${duration}ms`,
        query: JSON.stringify(alert.query).substring(0, 200),
      });
    }
  } catch (error: any) {
    // system.profile puede no estar disponible en todos los entornos
    if (error.codeName !== 'NamespaceNotFound') {
      logger.error('Error revisando slow queries', { error: error.message });
    }
  }
}

/**
 * Analiza uso de índices en una colección
 */
export async function analyzeIndexUsage(collectionName: string): Promise<{
  used: string[];
  unused: string[];
}> {
  if (!mongoose.connection.db) {
    return { used: [], unused: [] };
  }

  try {
    const collection = mongoose.connection.db.collection(collectionName);
    const stats = await mongoose.connection.db.command({ collStats: collectionName }) as any;

    const indexes = stats.indexSizes || {};
    const indexNames = Object.keys(indexes);
    const used: string[] = [];
    const unused: string[] = [];

    // Revisar system.profile para ver qué índices se usan
    const profileCollection = mongoose.connection.db.collection('system.profile');
    const recentQueries = await profileCollection
      .find({
        ns: `${mongoose.connection.db.databaseName}.${collectionName}`,
        ts: { $gte: new Date(Date.now() - 3600000) } // Última hora
      })
      .limit(100)
      .toArray();

    const usedIndexes = new Set<string>();
    for (const query of recentQueries) {
      const planSummary = query.planSummary || '';
      // Extraer nombres de índices del planSummary
      const indexMatch = planSummary.match(/IXSCAN\s+(\w+)/);
      if (indexMatch) {
        usedIndexes.add(indexMatch[1]);
      }
    }

    for (const indexName of indexNames) {
      if (usedIndexes.has(indexName) || indexName === '_id_') {
        used.push(indexName);
        mongoIndexUsage.labels(collectionName, indexName).set(1);
      } else {
        unused.push(indexName);
        mongoIndexUsage.labels(collectionName, indexName).set(0);
      }
    }

    return { used, unused };
  } catch (error: any) {
    logger.error(`Error analizando índices de ${collectionName}`, { error: error.message });
    return { used: [], unused: [] };
  }
}

/**
 * Obtiene las últimas slow queries detectadas
 */
export function getSlowQueries(limit: number = 10): SlowQueryAlert[] {
  return slowQueriesCache.slice(0, limit);
}

/**
 * Middleware para monitorear queries de Mongoose
 */
export function setupMongooseMonitoring(): void {
  // Interceptar queries de Mongoose
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const originalExec = mongoose.Query.prototype.exec;

  mongoose.Query.prototype.exec = function(...args: any[]) {
    const start = Date.now();
    const collection = this.model?.collection?.name || 'unknown';
    const operation = this.op || 'find';

    return originalExec.apply(this, args as []).then((result: any) => {
      const duration = Date.now() - start;
      
      // Registrar métrica
      mongoQueryDuration.labels(collection, operation, 'unknown').observe(duration);

      // Alerta si es lenta
      if (duration >= SLOW_QUERY_THRESHOLD_MS) {
        mongoSlowQueries.labels(collection, operation).inc();
        logger.warn('⚠️ Slow Mongoose query', {
          collection,
          operation,
          duration: `${duration}ms`,
          filter: JSON.stringify(this.getQuery()).substring(0, 200),
        });
      }

      return result;
    });
  };

  logger.info('✅ Mongoose monitoring habilitado');
}

/**
 * Inicializa monitoreo de MongoDB
 */
export function initMongoDBMonitoring(): void {
  if (mongoose.connection.readyState === 1) {
    setupMongoDBProfiling();
    setupMongooseMonitoring();
  } else {
    mongoose.connection.once('connected', () => {
      setupMongoDBProfiling();
      setupMongooseMonitoring();
    });
  }
}

