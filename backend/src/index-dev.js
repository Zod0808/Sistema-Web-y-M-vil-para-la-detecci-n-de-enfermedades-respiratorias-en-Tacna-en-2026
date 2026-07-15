/**
 * RespiCare Backend API - Development Version (JavaScript)
 * Temporary version while fixing TypeScript errors
 */

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const mongoose = require('mongoose');

// Initialize express app
const app = express();
const http = require('http');
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Proxy servers for WebSocket path routing (needed because ws v8 aborts with 400
// if the path doesn't match, preventing the second WSS from handling its path).
const wearableProxyServer = http.createServer();
const doctorProxyServer   = http.createServer();

httpServer.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, 'ws://localhost');
  if (url.pathname === '/ws/wearables') {
    wearableProxyServer.emit('upgrade', req, socket, head);
  } else if (url.pathname === '/ws/doctor') {
    doctorProxyServer.emit('upgrade', req, socket, head);
  } else {
    socket.destroy();
  }
});

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'RespiCare API',
      version: '1.0.0',
      description: 'Sistema Integral de Enfermedades Respiratorias - API Documentation',
      contact: {
        name: 'RespiCare Team',
        email: 'support@respicare.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: [
    path.join(__dirname, 'routes/*.js'),
    path.join(__dirname, 'index-dev.js')
  ]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Configuración de MongoDB
// Si MONGODB_URI no está definida, intenta detectar el entorno
let DEFAULT_MONGO_URI;
if (process.env.DOCKER_ENV === 'true' || process.env.NODE_ENV === 'production') {
  // En Docker o producción, usa el hostname del contenedor
  DEFAULT_MONGO_URI = 'mongodb://admin:change_this_password@mongodb:27017/respicare_dev?authSource=admin';
} else {
  // En desarrollo local, usa localhost
  DEFAULT_MONGO_URI = 'mongodb://localhost:27017/respicare_dev';
}

const MONGODB_URI = process.env.MONGODB_URI || DEFAULT_MONGO_URI;

mongoose.set('strictQuery', false);

mongoose
  .connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 20000
  })
  .then(() => {
    console.log('[MongoDB] Conexión establecida correctamente');
  })
  .catch((error) => {
    console.error('[MongoDB] Error al conectar:', error.message);
  });

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'RespiCare API Documentation'
}));

/**
 * @swagger
 * /:
 *   get:
 *     summary: Root endpoint
 *     description: Returns basic API information
 *     tags: [System]
 *     responses:
 *       200:
 *         description: API information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 version:
 *                   type: string
 *                 status:
 *                   type: string
 *                 environment:
 *                   type: string
 *                 timestamp:
 *                   type: string
 */
app.get('/', (req, res) => {
  res.json({
    message: 'RespiCare Backend API',
    version: '1.0.0',
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check
 *     description: Returns system health status
 *     tags: [System]
 *     responses:
 *       200:
 *         description: System health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 service:
 *                   type: string
 *                 version:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                 uptime:
 *                   type: number
 *                 memory:
 *                   type: object
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Legacy health check
 *     description: Compatibility endpoint that mirrors /api/health
 *     tags: [System]
 *     responses:
 *       200:
 *         description: System health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 service:
 *                   type: string
 *                 version:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                 uptime:
 *                   type: number
 *                 memory:
 *                   type: object
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    metadata: {
      aliasOf: '/api/health'
    }
  });
});

/**
 * @swagger
 * /api:
 *   get:
 *     summary: API information
 *     description: Returns detailed API information and available endpoints
 *     tags: [System]
 *     responses:
 *       200:
 *         description: API information and endpoints
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 version:
 *                   type: string
 *                 status:
 *                   type: string
 *                 endpoints:
 *                   type: object
 *                 database:
 *                   type: object
 */
app.get('/api', (req, res) => {
  res.json({
    message: 'RespiCare API',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      root: '/',
      health: '/api/health',
      info: '/api',
      docs: '/api-docs',
      auth: '/api/auth/* (coming soon)',
      patients: '/api/patients/* (coming soon)',
      medicalHistory: '/api/medical-history/* (coming soon)',
      aiAnalysis: '/api/ai-analysis/* (coming soon)',
          symptomReports: '/api/symptom-reports/* (ACTIVE)',
          heatmap: '/api/symptom-reports/heatmap (ACTIVE)',
          statistics: '/api/symptom-reports/statistics (ACTIVE)',
          chatConversations: '/api/chat-conversations/* (ACTIVE)',
          chatMessages: '/api/chat-conversations/:sessionId/messages (ACTIVE)',
          analytics: '/api/analytics/* (ACTIVE)',
          temporalTrends: '/api/analytics/temporal-trends (ACTIVE)',
          diseaseReports: '/api/analytics/disease-reports (ACTIVE)',
          dashboard: '/api/analytics/dashboard (ACTIVE)',
          mlMonitoring: '/api/analytics/ml/monitoring (ACTIVE)',
          mlFeatures: '/api/analytics/ml/features (ACTIVE)',
          mlFairness: '/api/analytics/ml/fairness (ACTIVE)'
    },
    database: {
      mongodb: 'Connected (placeholder)',
      redis: 'Connected (placeholder)'
    }
  });
});

// Authentication Routes
const authRoutesDev = require('./routes/authRoutesDev');
app.use('/api/v1/auth', authRoutesDev);
app.use('/api/auth', authRoutesDev); // Legacy support

// FHIR Routes - IMPORTANTE: Debe ir ANTES de otras rutas con parámetros
const fhirRoutesDev = require('./routes/fhirRoutesDev');
app.use('/api/v1/fhir', fhirRoutesDev);




// All former .js routes (symptomReports, chatConversations, chatAudio,
// chatImage, analyticsRoutesNew→publicAnalytics, simpleAnalytics, mlAnalytics)
// migrated to TS. They are loaded below inside the ts-node/register block.

// Alert Routes — eliminados los mocks; la implementación real está en alertRoutes.ts (cargado al final)




// ── Rutas TypeScript (cargadas con ts-node/register) ────────────────────────
// Los módulos .ts no podían cargarse antes porque faltaba ts-node/register.
// Se agrega aquí para no romper los requires JS previos.
try {
  require('ts-node').register({ transpileOnly: true, skipIgnore: true });

  // ── Dev-only handlers (src/dev/*.ts) ─────────────────────────────────────
  // Mounted BEFORE the production TS routes so dev semantics take precedence
  // (Express matches in registration order).
  const dashboardDev        = require('./dev/dashboardDev').default;
  const medicalHistoriesDev = require('./dev/medicalHistoriesDev').default;
  const appointmentsDev     = require('./dev/appointmentsDev').default;
  const reportsDev          = require('./dev/reportsDev').default;
  const { applyMlMonitoringDev } = require('./dev/mlMonitoringDev');

  app.use('/api/v1/dashboard',         dashboardDev);
  app.use('/api/v1/medical-histories', medicalHistoriesDev);
  app.use('/api/v1/appointments',      appointmentsDev);
  app.use('/api/v1/reports/automatic', reportsDev);
  applyMlMonitoringDev(app);

  // Placeholder stub (kept for frontend compat)
  app.get('/api/patients', (req, res) => res.json({ message: 'Patients endpoint', status: 'placeholder', data: [] }));

  // ── Production TS routes ─────────────────────────────────────────────────
  const prescriptionRoutes  = require('./routes/prescriptionRoutes').default;
  const labRoutes           = require('./routes/labRoutes').default;
  const referralRoutes      = require('./routes/referralRoutes').default;
  const emergencyRoutes     = require('./routes/emergencyRoutes').default;
  const informedConsentRoutes = require('./routes/informedConsentRoutes').default;
  const dashboardRoutes     = require('./routes/dashboardRoutes').default;
  const alertRoutes         = require('./routes/alertRoutes').default;
  const appointmentsRoutes  = require('./routes/appointmentsRoutes').default;
  const medicalHistoryRoutes = require('./routes/medicalHistoryRoutes').default;
  const wearableRoutes      = require('./routes/wearableRoutes').default;
  const symptomAnalyzerRoutes = require('./routes/symptomAnalyzerRoutes').default;
  const chatConversationsRoutes = require('./routes/chatConversationsRoutes').default;
  const chatAudioRoutes     = require('./routes/chatAudioRoutes').default;
  const chatImageRoutes     = require('./routes/chatImageRoutes').default;
  const symptomReportsRoutes = require('./routes/symptomReportsRoutes').default;
  const publicAnalyticsRoutes = require('./routes/publicAnalyticsRoutes').default;
  const simpleAnalyticsRoutes = require('./routes/simpleAnalyticsRoutes').default;
  const mlAnalyticsRoutes    = require('./routes/mlAnalyticsRoutes').default;

  app.use('/api/v1/prescriptions',     prescriptionRoutes);
  app.use('/api/v1/lab',               labRoutes);
  app.use('/api/v1/referrals',         referralRoutes);
  app.use('/api/v1/emergencies',       emergencyRoutes);
  app.use('/api/v1/informed-consents', informedConsentRoutes);
  app.use('/api/v1/dashboard',         dashboardRoutes);
  app.use('/api/v1/alerts',            alertRoutes);
  app.use('/api/v1/appointments',      appointmentsRoutes);
  app.use('/api/v1/medical-histories', medicalHistoryRoutes);
  app.use('/api/v1/wearables',         wearableRoutes);
  app.use('/api/v1/symptom-analyzer',  symptomAnalyzerRoutes);
  app.use('/api/chat-conversations',   chatConversationsRoutes);
  app.use('/api/v1/chat',              chatAudioRoutes);
  app.use('/api/v1/chat',              chatImageRoutes);
  app.use('/api/symptom-reports',      symptomReportsRoutes);
  app.use('/api/analytics',            publicAnalyticsRoutes);
  app.use('/api/analytics',            simpleAnalyticsRoutes);
  app.use('/api/analytics',            mlAnalyticsRoutes);
  app.use('/api/v1/analytics',         mlAnalyticsRoutes);

  // Attach WebSocket handlers to isolated proxy servers so that ws v8 path
  // routing doesn't abort connections meant for the other handler.
  const { attachWearableWebSocket } = require('./sockets/wearableSocketHandler');
  const { attachDoctorWebSocket }   = require('./sockets/doctorSocketHandler');
  attachWearableWebSocket(wearableProxyServer);
  attachDoctorWebSocket(doctorProxyServer);

  console.log('✅ TypeScript routes loaded successfully');
  console.log('✅ WebSocket handlers attached (/ws/wearables, /ws/doctor)');
} catch (err) {
  console.error('⚠️  Could not load TypeScript routes:', err.message);
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
    availableEndpoints: {
      root: '/',
      health: '/api/health',
      info: '/api'
    }
  });
});

// Error handler — respeta el statusCode de AppError de TypeScript
app.use((err, req, res, next) => {
  const status = err.statusCode || err.status || 500;
  if (status >= 500) console.error('Error:', err);
  res.status(status).json({
    error: status >= 500 ? 'Internal Server Error' : err.message,
    message: err.message || 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// Start server (using httpServer so WebSocket handlers can attach)
httpServer.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 RespiCare Backend API');
  console.log('='.repeat(50));
  console.log(`📍 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API URL: http://localhost:${PORT}`);
  console.log(`❤️  Health: http://localhost:${PORT}/api/health`);
  console.log(`📚 Info: http://localhost:${PORT}/api`);
  console.log(`📖 API Docs: http://localhost:${PORT}/api-docs`);
  console.log(`🔌 WebSocket wearables: ws://localhost:${PORT}/ws/wearables`);
  console.log(`🩺 WebSocket doctor:    ws://localhost:${PORT}/ws/doctor`);
  console.log('='.repeat(50) + '\n');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('\nSIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  process.exit(0);
});

module.exports = { app, httpServer };

