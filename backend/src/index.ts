/**
 * ENTRY POINT DE PRODUCCIÓN — RespiCare Backend API
 * Contiene todas las rutas, middleware, jobs, telemetría y observabilidad.
 * Scripts: "npm start" (prod) | "npm run dev:original" (dev con nodemon)
 */

import { createServer, Server as HttpServer } from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
const hpp = require('hpp');
const xss = require('xss-clean');
import mongoose from 'mongoose';
const swaggerUi = require('swagger-ui-express');
import 'express-async-errors';

// Importar rutas
import authRoutes from './routes/authRoutes';
import medicalHistoryRoutes from './routes/medicalHistoryRoutes';
import symptomAnalyzerRoutes from './routes/symptomAnalyzerRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import alertRoutes from './routes/alertRoutes';
import fileUploadRoutes from './routes/fileUploadRoutes';
import exportRoutes from './routes/exportRoutes';
import wearableRoutes from './routes/wearableRoutes';
import appointmentsRoutes from './routes/appointmentsRoutes';
import prescriptionRoutes from './routes/prescriptionRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import automaticReportRoutes from './routes/automaticReportRoutes';
import dsrRoutes from './routes/dsrRoutes';
import biRoutes from './routes/biRoutes';
import consentRoutes from './routes/consentRoutes';
import mlOrchestrationRoutes from './routes/mlOrchestrationRoutes';
import fhirRoutes from './routes/fhirRoutes';
import integrationRoutes from './routes/integrationRoutes';
import labRoutes from './routes/labRoutes';
import emergencyRoutes from './routes/emergencyRoutes';
import smsWebhookRoutes from './routes/smsWebhookRoutes';
import smsRoutes from './routes/smsRoutes';
import referralRoutes from './routes/referralRoutes';
import informedConsentRoutes from './routes/informedConsentRoutes';
import chatConversationsRoutes from './routes/chatConversationsRoutes';
import chatAudioRoutes from './routes/chatAudioRoutes';
import chatImageRoutes from './routes/chatImageRoutes';
import healthCenterRoutes from './routes/healthCenterRoutes';

// Importar middleware
import { errorHandler, notFound } from './middleware/errorHandler';
import { enforceHttps } from './middleware/enforceHttps';
import { auditLogger } from './middleware/auditLogger';
import { logger } from './utils/logger';

// Importar configuración
import { config } from './config/config';
import { swaggerSpec } from './config/swagger';
import { initializeRedis, disconnectRedis, getRedisClient } from './config/redisClient';
import { getEncryptionKey } from './utils/encryption';
import { brotliCompression } from './middleware/brotliCompression';
import { smartRateLimiter } from './middleware/rateLimiter';
import { startAlertJobs, stopAlertJobs } from './jobs/alertJobs';
import { startAppointmentJobs, stopAppointmentJobs } from './jobs/appointmentJobs';
import { startReportJobs, stopReportJobs } from './jobs/reportJobs';
import { startMlMetricsJobs, stopMlMetricsJobs } from './jobs/mlMetricsJobs';
import { startLabImportJobs, stopLabImportJobs } from './jobs/labImportJobs';
import { metricsMiddleware, metricsHandler } from './metrics/metrics';
import { percentileMetricsMiddleware } from './metrics/percentileMetrics';
import { initMongoDBMonitoring } from './monitoring/mongodbMonitoring';
import { initTelemetry, shutdownTelemetry } from './telemetry/tracing';
import { initSentry } from './utils/sentry';
import { attachWearableWebSocket } from './sockets/wearableSocketHandler';
import { attachDoctorWebSocket } from './sockets/doctorSocketHandler';

// Dev mode: explicitly development, or NODE_ENV unset. Test/CI/staging/prod
// all skip dev routes so they don't shadow the real prod handlers.
const isDev = (): boolean => {
  const env = process.env['NODE_ENV'];
  return env === undefined || env === '' || env === 'development';
};

class App {
  public app: express.Application;
  private httpServer: ReturnType<typeof createServer>;
  // Isolated http.Server instances used so that ws v8 can route upgrades by
  // path without one WebSocketServer destroying the other's connections.
  private wearableProxyServer: HttpServer;
  private doctorProxyServer: HttpServer;

  constructor() {
    // Iniciar Sentry (no bloqueante si falla)
    initSentry();

    // Iniciar Telemetría (no bloqueante si falla)
    initTelemetry().catch(() => {});
    this.app = express();
    this.httpServer = createServer(this.app);
    this.wearableProxyServer = createServer();
    this.doctorProxyServer = createServer();
    this.setupWebSocketRouting();
    this.initializeMiddlewares();
    if (isDev()) {
      // Dev-only routes MUST be registered BEFORE production routes so their
      // handlers take precedence at overlapping mount points (Express matches
      // in registration order).
      const { applyDevRoutes } = require('./dev');
      applyDevRoutes(this.app);
    }
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeDatabase();
    this.initializeCache();
    this.initializeJobs();
    attachWearableWebSocket(this.wearableProxyServer);
    attachDoctorWebSocket(this.doctorProxyServer);
  }

  private setupWebSocketRouting(): void {
    this.httpServer.on('upgrade', (req, socket, head) => {
      const url = new URL(req.url ?? '', 'ws://localhost');
      if (url.pathname === '/ws/wearables') {
        this.wearableProxyServer.emit('upgrade', req, socket, head);
      } else if (url.pathname === '/ws/doctor') {
        this.doctorProxyServer.emit('upgrade', req, socket, head);
      } else {
        socket.destroy();
      }
    });
  }

  private initializeMiddlewares(): void {
    // Trust proxy para HSTS/HTTPS detrás de balanceadores
    this.app.set('trust proxy', 1);

    // Sentry request handler (debe ir antes de otros middlewares)
    if (process.env.SENTRY_ENABLED === 'true') {
      const Sentry = require('./utils/sentry').Sentry;
      this.app.use(Sentry.Handlers.requestHandler());
      this.app.use(Sentry.Handlers.tracingHandler());
    }

    // Forzar HTTPS en producción
    this.app.use(enforceHttps);

    // Security middleware
    this.app.use(helmet({
      hsts: process.env.NODE_ENV === 'production' ? { maxAge: 15552000, includeSubDomains: true, preload: true } : false,
      contentSecurityPolicy: false // ajustar CSP si hay UI estática
    }));
    this.app.use(cors({
      origin: config.cors.origins,
      credentials: true
    }));

    // Rate limiting (Redis + fallback)
    this.app.use('/api/', smartRateLimiter);

    // Percentile metrics middleware (para p95/p99)
    this.app.use('/api/', percentileMetricsMiddleware);

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Data sanitization
    this.app.use(mongoSanitize());
    this.app.use(xss());
    this.app.use(hpp());

    // Compression (Brotli + Gzip)
    this.app.use(brotliCompression({ threshold: 2048 }));
    this.app.use(compression({
      threshold: 1024,
      level: 6,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      }
    }));

    // Logging
    if (config.server.env === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined'));
    }

    // Audit logs (HIPAA-like) con redacción de PII
    this.app.use(auditLogger);

    // Metrics (Prometheus)
    this.app.use(metricsMiddleware);

    // Swagger documentation
    this.app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'RespiCare API Documentation'
    }));

    // Health check endpoint
    this.app.get('/health', async (_req, res) => {
      const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
      let redisStatus: 'connected' | 'disconnected' | 'error' | 'uninitialized' = 'uninitialized';
      let redisLatencyMs: number | null = null;

      try {
        const redisClient = getRedisClient();

        if (redisClient) {
          const start = Date.now();
          await redisClient.ping();
          redisLatencyMs = Date.now() - start;
          redisStatus = 'connected';
        } else {
          redisStatus = process.env.NODE_ENV === 'test' ? 'uninitialized' : 'disconnected';
        }
      } catch (error) {
        redisStatus = 'error';
        logger.error('❌ Error verificando estado de Redis', { error });
      }

      const overallStatus = redisStatus === 'connected' && mongoStatus === 'connected' ? 'healthy' : 'degraded';

      res.status(200).json({
        success: overallStatus === 'healthy',
        status: overallStatus,
        message: 'RespiCare Backend API health check',
        timestamp: new Date().toISOString(),
        environment: config.server.env,
        version: '1.0.0',
        dependencies: {
          database: {
            status: mongoStatus,
            provider: 'mongodb'
          },
          redis: {
            status: redisStatus,
            latencyMs: redisLatencyMs
          }
        }
      });
    });

    // Metrics endpoint (protegible por token)
    this.app.get('/metrics', metricsHandler);

    // Percentiles endpoint (p95/p99)
    this.app.get('/api/v1/metrics/percentiles', async (req, res) => {
      const { getPercentileMetrics } = await import('./metrics/percentileMetrics');
      const route = req.query.route as string | undefined;
      const method = req.query.method as string | undefined;
      const metrics = getPercentileMetrics(route, method);
      res.json({ success: true, data: metrics });
    });
  }

  private initializeRoutes(): void {
    // API routes
    this.app.use('/api/v1/auth', authRoutes);
    this.app.use('/api/v1/medical-histories', medicalHistoryRoutes);
    this.app.use('/api/v1/symptom-analyzer', symptomAnalyzerRoutes);
    this.app.use('/api/v1/dashboard', dashboardRoutes);
    this.app.use('/api/v1/analytics', analyticsRoutes);
    this.app.use('/api/v1/upload', fileUploadRoutes);
    this.app.use('/api/v1/export', exportRoutes);
    this.app.use('/api/v1/wearables', wearableRoutes);
    this.app.use('/api/v1/alerts', alertRoutes);
    this.app.use('/api/v1/appointments', appointmentsRoutes);
    this.app.use('/api/v1/prescriptions', prescriptionRoutes);
    this.app.use('/api/v1/reports/automatic', automaticReportRoutes);
    this.app.use('/api/v1/dsr', dsrRoutes);
    this.app.use('/api/v1/bi', biRoutes);
    this.app.use('/api/v1/consent', consentRoutes);
    this.app.use('/api/v1/ml', mlOrchestrationRoutes);
    this.app.use('/api/v1/fhir', fhirRoutes);
    this.app.use('/api/v1/integrations', integrationRoutes);
    this.app.use('/api/v1/lab', labRoutes);
    this.app.use('/api/v1/emergencies', emergencyRoutes);
    // Legacy singular alias: existing clients and older integration tests still POST /emergency.
    this.app.use('/api/v1/emergency', emergencyRoutes);
    this.app.use('/api/v1/sms/webhooks', smsWebhookRoutes);
    this.app.use('/api/v1/sms', smsRoutes);
    this.app.use('/api/v1/referrals', referralRoutes);
    this.app.use('/api/v1/informed-consents', informedConsentRoutes);
    // Legacy singular alias used by older integration tests and API consumers.
    this.app.use('/api/v1/informed-consent', informedConsentRoutes);
    this.app.use('/api/v1/health-centers', healthCenterRoutes);
    // Chat routes (conversations, audio, image)
    this.app.use('/api/chat-conversations', chatConversationsRoutes);
    this.app.use('/api/v1/chat', chatAudioRoutes);
    this.app.use('/api/v1/chat', chatImageRoutes);

    // Root endpoint
    this.app.get('/', (_req, res) => {
      res.status(200).json({
        success: true,
        message: 'Bienvenido a RespiCare Backend API',
        version: '1.0.0',
        documentation: '/api/docs',
        health: '/health',
        endpoints: {
          auth: '/api/v1/auth',
          medicalHistories: '/api/v1/medical-histories',
          symptomAnalyzer: '/api/v1/symptom-analyzer',
          dashboard: '/api/v1/dashboard',
          fileUpload: '/api/v1/upload',
          export: '/api/v1/export',
          wearables: '/api/v1/wearables',
          alerts: '/api/v1/alerts',
          appointments: '/api/v1/appointments',
          prescriptions: '/api/v1/prescriptions',
          automaticReports: '/api/v1/reports/automatic'
        }
      });
    });
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFound);

    // Global error handler
    this.app.use(errorHandler);
  }

  private async initializeDatabase(): Promise<void> {
    // Skip database connection and monitoring setup in test environment
    if (process.env.NODE_ENV === 'test') {
      // In test environment, connection is handled by test setup
      if (mongoose.connection.readyState === 1) {
        logger.info('✅ MongoDB ya conectado (test mode)');
      }
      return;
    }

    // Inicializar monitoreo de MongoDB (slow queries, índices)
    initMongoDBMonitoring();

    try {
      // Check if already connected
      if (mongoose.connection.readyState === 1) {
        logger.info('✅ Ya conectado a MongoDB');
        return;
      }

      await mongoose.connect(config.database.mongodb, {
        maxPoolSize: config.database.maxPoolSize,
        minPoolSize: config.database.minPoolSize,
        maxIdleTimeMS: config.database.maxIdleTimeMS,
        serverSelectionTimeoutMS: config.database.serverSelectionTimeoutMS,
        socketTimeoutMS: config.database.socketTimeoutMS
      });

      logger.info('✅ Conectado a MongoDB');
    } catch (error) {
      logger.error('❌ Error conectando a MongoDB:', error);
      if (process.env.NODE_ENV !== 'test') {
        process.exit(1);
      }
    }
  }

  private async initializeCache(): Promise<void> {
    if (process.env.NODE_ENV !== 'test') {
      try {
        getEncryptionKey();
      } catch (err: any) {
        logger.error(`❌ FIELD_ENCRYPTION_KEY inválida: ${err.message}. Datos sensibles no se encriptarán.`);
        if (process.env.NODE_ENV === 'production') process.exit(1);
      }
    }
    try {
      const redis = await initializeRedis();
      if (!redis && process.env.NODE_ENV !== 'test') {
        logger.warn('⚠️  Redis no disponible — rate limiting y caché desactivados. Verifique REDIS_URL.');
      }
    } catch (error) {
      logger.error('❌ Error inicializando Redis:', error);
    }
  }

  private initializeJobs(): void {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    startAlertJobs();
    startAppointmentJobs();
    startReportJobs();
    startMlMetricsJobs();
    startLabImportJobs();
  }

  public listen(): void {
    const port = config.server.port;
    const host = config.server.host;

    this.httpServer.listen(port, host, () => {
      logger.info(`🚀 Servidor ejecutándose en http://${host}:${port}`);
      logger.info(`📚 Documentación disponible en http://${host}:${port}/api/docs`);
      logger.info(`🏥 Health check disponible en http://${host}:${port}/health`);
      logger.info(`🔌 WebSocket wearables en ws://${host}:${port}/ws/wearables`);
      logger.info(`🩺 WebSocket doctor en ws://${host}:${port}/ws/doctor`);
      logger.info(`🌍 Entorno: ${config.server.env}`);
    });
  }
}

// Crear instancia de la aplicación
const appInstance = new App();

// Manejar errores no capturados
process.on('uncaughtException', (err: Error) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', err);
  process.exit(1);
});

process.on('unhandledRejection', (err: Error) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...', err);
  process.exit(1);
});

// Manejar señales de terminación
process.on('SIGTERM', () => {
  logger.info('SIGTERM recibido. Cerrando servidor...');
  stopAlertJobs();
  stopAppointmentJobs();
  stopReportJobs();
  stopMlMetricsJobs();
  stopLabImportJobs();
  Promise.all([shutdownTelemetry(), disconnectRedis()]).finally(() => process.exit(0));
});

process.on('SIGINT', () => {
  logger.info('SIGINT recibido. Cerrando servidor...');
  stopAlertJobs();
  stopAppointmentJobs();
  stopReportJobs();
  stopMlMetricsJobs();
  stopLabImportJobs();
  Promise.all([shutdownTelemetry(), disconnectRedis()]).finally(() => process.exit(0));
});

// Iniciar servidor solo si no estamos en modo test
if (process.env.NODE_ENV !== 'test') {
  appInstance.listen();
}

// Some tests use `request(app)` (expects Express app).
// Others use `appModule.app` / `appModule.listen()` / `appModule.initializeDatabase()`
// (expects the App class). Augment the exported Express app with a self-referencing
// `.app` property AND with bound App-class methods so both patterns work.
const expressApp = appInstance.app as typeof appInstance.app & {
  app: typeof appInstance.app;
  listen: typeof appInstance.listen;
  initializeDatabase: () => Promise<void>;
};
expressApp.app = expressApp;
// `App.listen()` (0-arg, void) and Express's own `.listen(port, ...)` overloads
// are incompatible types on the same property name; assign via `any` like
// `initializeDatabase` below rather than widening the public type.
(expressApp as any).listen = appInstance.listen.bind(appInstance);
// initializeDatabase is a private method on the App class; expose it here for test coverage.
expressApp.initializeDatabase = (appInstance as any).initializeDatabase.bind(appInstance);
// httpServer is a private field on the App class; expose the raw instance so
// tests can spy on its `.listen` without binding a real port.
(expressApp as any).httpServer = (appInstance as any).httpServer;
export default expressApp;
