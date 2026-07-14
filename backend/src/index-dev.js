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

// Dashboard Routes - Simple implementation for development
// IMPORTANTE: Estas rutas deben estar ANTES de las rutas de analytics para evitar conflictos
app.get('/api/v1/dashboard/patient', async (req, res) => {
  console.log('📊 Dashboard patient route called');
  try {
    const mongoose = require('mongoose');
    const jwt = require('jsonwebtoken');
    
    // Intentar obtener userId del token de autenticación
    let authenticatedUserId = null;
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const secret = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
        const decoded = jwt.verify(token, secret);
        authenticatedUserId = decoded.userId || decoded.id || decoded._id;
        console.log('✅ User authenticated for dashboard:', authenticatedUserId);
      } catch (e) {
        console.warn('⚠️ Invalid token in dashboard request:', e.message);
        return res.status(401).json({
          success: false,
          message: 'Token de autenticación inválido'
        });
      }
    }
    
    if (!authenticatedUserId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }
    
    // Convertir userId a ObjectId
    let userIdObj;
    try {
      userIdObj = typeof authenticatedUserId === 'string'
        ? new mongoose.Types.ObjectId(authenticatedUserId)
        : authenticatedUserId;
    } catch (e) {
      userIdObj = authenticatedUserId;
    }
    
    // Obtener estadísticas básicas del paciente
    let MedicalHistory, Appointment, Alert;
    
    try {
      MedicalHistory = mongoose.model('MedicalHistory');
    } catch (e) {
      const schema = new mongoose.Schema({}, { strict: false, timestamps: true });
      MedicalHistory = mongoose.model('MedicalHistory', schema);
    }
    
    try {
      Appointment = mongoose.model('Appointment');
    } catch (e) {
      const schema = new mongoose.Schema({}, { strict: false, timestamps: true });
      Appointment = mongoose.model('Appointment', schema);
    }
    
    try {
      Alert = mongoose.model('Alert');
    } catch (e) {
      const schema = new mongoose.Schema({}, { strict: false, timestamps: true });
      Alert = mongoose.model('Alert', schema);
    }
    
    // Contar historias médicas del paciente (usar ObjectId)
    const totalHistories = await MedicalHistory.countDocuments({
      $or: [
        { patientId: userIdObj },
        { patientId: authenticatedUserId },
        { patientId: authenticatedUserId.toString() }
      ]
    }).catch(() => 0);
    
    // Contar todas las citas del paciente
    const totalAppointments = await Appointment.countDocuments({
      $or: [
        { patientId: userIdObj },
        { patientId: authenticatedUserId },
        { patientId: authenticatedUserId.toString() }
      ]
    }).catch(() => 0);
    
    // Contar citas próximas (con fecha mayor o igual a hoy)
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Resetear a inicio del día
    
    const upcomingAppointments = await Appointment.countDocuments({
      $or: [
        { patientId: userIdObj },
        { patientId: authenticatedUserId },
        { patientId: authenticatedUserId.toString() }
      ],
      status: { $in: ['scheduled', 'rescheduled'] },
      $or: [
        { date: { $gte: now } },
        { scheduledAt: { $gte: now } }
      ]
    }).catch(() => 0);
    
    // Contar alertas activas (no reconocidas)
    const activeAlerts = await Alert.countDocuments({
      $or: [
        { userId: userIdObj },
        { userId: authenticatedUserId },
        { userId: authenticatedUserId.toString() },
        { patientId: userIdObj },
        { patientId: authenticatedUserId },
        { patientId: authenticatedUserId.toString() }
      ],
      $or: [
        { acknowledged: false },
        { acknowledged: { $exists: false } },
        { status: { $ne: 'acknowledged' } }
      ]
    }).catch(() => 0);
    
    console.log(`📊 Dashboard stats for user ${authenticatedUserId}:`, {
      totalHistories,
      totalAppointments,
      upcomingAppointments,
      activeAlerts
    });
    
    res.json({
      success: true,
      data: {
        totalHistories,
        totalMedicalHistories: totalHistories,
        upcomingAppointments,
        totalAppointments,
        activeAlerts,
        totalAlerts: activeAlerts,
        recentActivity: [],
        healthScore: null,
        lastCheckup: null
      }
    });
  } catch (error) {
    console.error('❌ Error fetching patient dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener datos del dashboard',
      error: error.message
    });
  }
});

app.get('/api/v1/dashboard/doctor', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        totalPatients: 0,
        todayAppointments: 0,
        pendingReports: 0,
        recentActivity: []
      }
    });
  } catch (error) {
    console.error('Error fetching doctor dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener datos del dashboard',
      error: error.message
    });
  }
});

app.get('/api/v1/dashboard/admin', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        totalUsers: 0,
        totalPatients: 0,
        totalDoctors: 0,
        systemHealth: 'operational'
      }
    });
  } catch (error) {
    console.error('Error fetching admin dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener datos del dashboard',
      error: error.message
    });
  }
});

// Temporary patients endpoint
app.get('/api/patients', (req, res) => {
  res.json({
    message: 'Patients endpoint',
    status: 'placeholder',
    data: []
  });
});

// Medical History Routes - Simple implementation for development
app.get('/api/v1/medical-histories', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const jwt = require('jsonwebtoken');
    const { patientId, limit = 50, page = 1 } = req.query;
    
    // Intentar obtener userId del token de autenticación
    let authenticatedUserId = null;
    let userRole = null;
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const secret = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
        const decoded = jwt.verify(token, secret);
        authenticatedUserId = decoded.userId || decoded.id || decoded._id;
        
        // Obtener el rol del usuario
        try {
          const UserModel = mongoose.model('User');
          const user = await UserModel.findById(authenticatedUserId).lean();
          if (user) {
            userRole = user.role;
          }
        } catch (e) {
          // Si no se puede obtener el usuario, continuar sin rol
        }
      } catch (e) {
        console.warn('Invalid token in medical histories request:', e.message);
      }
    }
    
    // Intentar obtener el modelo MedicalHistory si existe
    let MedicalHistory;
    try {
      MedicalHistory = mongoose.model('MedicalHistory');
    } catch (e) {
      // Si no existe, crear un schema simple
      const medicalHistorySchema = new mongoose.Schema({
        patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
        patientName: String,
        age: Number,
        diagnosis: String,
        symptoms: [{
          name: String,
          severity: String,
          duration: String
        }],
        description: String,
        date: { type: Date, default: Date.now },
        location: {
          latitude: Number,
          longitude: Number,
          address: String
        },
        images: [String],
        audioNotes: String,
        isOffline: Boolean,
        syncStatus: String
      }, { timestamps: true });
      
      medicalHistorySchema.index({ patientId: 1, createdAt: -1 });
      MedicalHistory = mongoose.model('MedicalHistory', medicalHistorySchema);
    }
    
    // Construir query
    const query = {};
    
    // Si el usuario autenticado es un paciente, solo mostrar sus historias
    if (userRole === 'patient' && authenticatedUserId) {
      // Para pacientes, filtrar automáticamente por su ID usando ObjectId
      try {
        const userIdObj = typeof authenticatedUserId === 'string' 
          ? new mongoose.Types.ObjectId(authenticatedUserId)
          : authenticatedUserId;
        query.patientId = userIdObj;
        console.log(`🔒 Filtering medical histories for patient: ${authenticatedUserId}`);
      } catch (e) {
        query.patientId = authenticatedUserId;
      }
    } else if (patientId) {
      // Si se proporciona patientId explícitamente (para doctores o admins)
      try {
        const patientIdObj = typeof patientId === 'string'
          ? new mongoose.Types.ObjectId(patientId)
          : patientId;
        query.patientId = patientIdObj;
      } catch (e) {
        query.patientId = patientId;
      }
    } else if (authenticatedUserId) {
      // Si hay usuario autenticado pero no sabemos el rol, asumir paciente
      try {
        const userIdObj = typeof authenticatedUserId === 'string'
          ? new mongoose.Types.ObjectId(authenticatedUserId)
          : authenticatedUserId;
        query.patientId = userIdObj;
        console.log(`🔒 Filtering medical histories for authenticated user: ${authenticatedUserId}`);
      } catch (e) {
        query.patientId = authenticatedUserId;
      }
    }
    
    // Obtener historias médicas
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const histories = await MedicalHistory.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();
    
    const total = await MedicalHistory.countDocuments(query);
    
    console.log(`📋 Medical histories query - User: ${authenticatedUserId}, Role: ${userRole}, Found: ${histories.length}`);
    
    res.json({
      success: true,
      data: histories,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Error fetching medical histories:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener historias médicas',
      error: error.message
    });
  }
});

app.get('/api/v1/medical-histories/:id', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const MedicalHistory = mongoose.model('MedicalHistory');
    const history = await MedicalHistory.findById(req.params.id).lean();
    
    if (!history) {
      return res.status(404).json({
        success: false,
        message: 'Historia médica no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error fetching medical history:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener historia médica',
      error: error.message
    });
  }
});

// Symptom Reports Routes
const symptomReportsRoutes = require('./routes/symptomReportsRoutes');
app.use('/api/symptom-reports', symptomReportsRoutes);

// Chat Conversations Routes
const chatConversationsRoutes = require('./routes/chatConversationsRoutes');
app.use('/api/chat-conversations', chatConversationsRoutes);

// Chat Audio Routes (Transcription & Cough Analysis)
const chatAudioRoutes = require('./routes/chatAudioRoutes');
app.use('/api/v1/chat', chatAudioRoutes);

// Chat Image Routes (Image Analysis)
const chatImageRoutes = require('./routes/chatImageRoutes');
app.use('/api/v1/chat', chatImageRoutes);

// Analytics Routes
const analyticsRoutes = require('./routes/analyticsRoutesNew');
app.use('/api/analytics', analyticsRoutes);

// Simple Analytics Routes (for better performance)
const simpleAnalyticsRoutes = require('./routes/simpleAnalyticsRoutes');
app.use('/api/analytics', simpleAnalyticsRoutes);

// ML Analytics Routes (for SHAP and ML monitoring)
const mlAnalyticsRoutes = require('./routes/mlAnalyticsRoutes');
app.use('/api/analytics', mlAnalyticsRoutes);
app.use('/api/v1/analytics', mlAnalyticsRoutes);

// Alert Routes — eliminados los mocks; la implementación real está en alertRoutes.ts (cargado al final)

// ---------------------------------------------------------------------------
// Automatic Reports Routes - Rutas temporales para desarrollo
// ---------------------------------------------------------------------------

// GET /api/v1/reports/automatic - Listar reportes automáticos desde MongoDB
app.get('/api/v1/reports/automatic', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (!isMongoConnected) {
      console.warn('⚠️ MongoDB no está conectado para obtener reportes automáticos');
      // Devolver respuesta exitosa con array vacío en lugar de error
      return res.json({
        success: true,
        data: {
          reports: [],
          total: 0
        }
      });
    }

    const { type } = req.query;
    
    // Obtener modelo AutomaticReport
    let AutomaticReport;
    try {
      AutomaticReport = mongoose.model('AutomaticReport');
    } catch (e) {
      // Si no existe, crear el schema inline
      const AutomaticReportSchema = new mongoose.Schema({
        reportType: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true, index: true },
        period: {
          startDate: { type: Date, required: true },
          endDate: { type: Date, required: true },
        },
        status: { type: String, enum: ['pending', 'generating', 'completed', 'failed', 'exported'], default: 'pending', index: true },
        metrics: { type: mongoose.Schema.Types.Mixed, default: {} },
        anomalies: [{ type: mongoose.Schema.Types.Mixed }],
        filePath: { type: String },
        exportedAt: { type: Date },
        exportFormat: { type: String, enum: ['pdf', 'csv', 'json'] },
        generatedBy: { type: String },
        generatedAt: { type: Date, default: Date.now },
      }, { timestamps: true, collection: 'automaticreports' });
      AutomaticReport = mongoose.model('AutomaticReport', AutomaticReportSchema);
    }

    // Construir query
    const query = {};
    if (type && type !== 'all') {
      query.reportType = type;
    }

    // Obtener reportes de la base de datos
    let reports = [];
    try {
      reports = await AutomaticReport.find(query)
        .sort({ 'period.startDate': -1 })
        .limit(50)
        .lean();
    } catch (queryError) {
      console.error('❌ Error ejecutando query de reportes:', queryError);
      // Si falla la query, devolver array vacío en lugar de error
      reports = [];
    }

    // Mapear reportes de forma segura
    const mappedReports = reports.map(report => {
      try {
        return {
          _id: report._id ? report._id.toString() : null,
          reportType: report.reportType || 'unknown',
          status: report.status || 'pending',
          generatedAt: report.generatedAt ? (report.generatedAt.toISOString ? report.generatedAt.toISOString() : new Date(report.generatedAt).toISOString()) : null,
          period: {
            startDate: report.period?.startDate 
              ? (report.period.startDate.toISOString ? report.period.startDate.toISOString() : new Date(report.period.startDate).toISOString())
              : new Date().toISOString(),
            endDate: report.period?.endDate 
              ? (report.period.endDate.toISOString ? report.period.endDate.toISOString() : new Date(report.period.endDate).toISOString())
              : new Date().toISOString()
          },
          metrics: report.metrics || {},
          anomalies: report.anomalies || [],
          topDiagnoses: report.metrics?.topDiagnoses || [],
          exportFormats: report.exportFormat ? [report.exportFormat] : [],
          exportedAt: report.exportedAt ? (report.exportedAt.toISOString ? report.exportedAt.toISOString() : new Date(report.exportedAt).toISOString()) : null
        };
      } catch (mapError) {
        console.warn('⚠️ Error mapeando reporte:', mapError, report);
        return null;
      }
    }).filter(report => report !== null);

    res.json({
      success: true,
      data: {
        reports: mappedReports,
        total: mappedReports.length
      }
    });
  } catch (error) {
    console.error('❌ Error fetching automatic reports:', error);
    console.error('Stack trace:', error.stack);
    // Devolver respuesta exitosa con array vacío en lugar de error para no romper el frontend
    res.json({
      success: true,
      data: {
        reports: [],
        total: 0
      },
      warning: `Error al obtener reportes: ${error.message}`
    });
  }
});

// GET /api/v1/reports/automatic/stats - Estadísticas de reportes desde MongoDB
app.get('/api/v1/reports/automatic/stats', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (!isMongoConnected) {
      console.warn('⚠️ MongoDB no está conectado para obtener estadísticas de reportes');
      // Devolver estadísticas vacías en lugar de error
      return res.json({
        success: true,
        data: {
          total: 0,
          byType: { daily: 0, weekly: 0, monthly: 0 },
          byStatus: { completed: 0, pending: 0, generating: 0, failed: 0, exported: 0 },
          lastGenerated: null,
          nextScheduled: null
        }
      });
    }

    // Obtener modelo AutomaticReport
    let AutomaticReport;
    try {
      AutomaticReport = mongoose.model('AutomaticReport');
    } catch (e) {
      const AutomaticReportSchema = new mongoose.Schema({
        reportType: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true, index: true },
        status: { type: String, enum: ['pending', 'generating', 'completed', 'failed', 'exported'], default: 'pending', index: true },
        generatedAt: { type: Date, default: Date.now },
      }, { timestamps: true, collection: 'automaticreports' });
      AutomaticReport = mongoose.model('AutomaticReport', AutomaticReportSchema);
    }

    // Obtener estadísticas desde MongoDB
    let total = 0;
    let byType = [];
    let byStatus = [];
    let lastGenerated = null;

    try {
      [total, byType, byStatus, lastGenerated] = await Promise.all([
        AutomaticReport.countDocuments().catch(() => 0),
        AutomaticReport.aggregate([
          { $group: { _id: '$reportType', count: { $sum: 1 } } }
        ]).catch(() => []),
        AutomaticReport.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]).catch(() => []),
        AutomaticReport.findOne().sort({ generatedAt: -1 }).select('generatedAt').lean().catch(() => null)
      ]);
    } catch (queryError) {
      console.error('❌ Error ejecutando query de estadísticas:', queryError);
      // Continuar con valores por defecto
    }

    const byTypeObj = { daily: 0, weekly: 0, monthly: 0 };
    if (Array.isArray(byType)) {
      byType.forEach(item => {
        if (item && item._id && item._id in byTypeObj) {
          byTypeObj[item._id] = item.count || 0;
        }
      });
    }

    const byStatusObj = { completed: 0, pending: 0, generating: 0, failed: 0, exported: 0 };
    if (Array.isArray(byStatus)) {
      byStatus.forEach(item => {
        if (item && item._id && item._id in byStatusObj) {
          byStatusObj[item._id] = item.count || 0;
        }
      });
    }

    res.json({
      success: true,
      data: {
        total: total || 0,
        byType: byTypeObj,
        byStatus: byStatusObj,
        lastGenerated: lastGenerated?.generatedAt 
          ? (lastGenerated.generatedAt.toISOString ? lastGenerated.generatedAt.toISOString() : new Date(lastGenerated.generatedAt).toISOString())
          : null,
        nextScheduled: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Error fetching report statistics:', error);
    console.error('Stack trace:', error.stack);
    // Devolver estadísticas vacías en lugar de error
    res.json({
      success: true,
      data: {
        total: 0,
        byType: { daily: 0, weekly: 0, monthly: 0 },
        byStatus: { completed: 0, pending: 0, generating: 0, failed: 0, exported: 0 },
        lastGenerated: null,
        nextScheduled: null
      },
      warning: `Error al obtener estadísticas: ${error.message}`
    });
  }
});

// GET /api/v1/reports/automatic/:reportId - Obtener detalles de un reporte desde MongoDB
app.get('/api/v1/reports/automatic/:reportId', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (!isMongoConnected) {
      return res.status(503).json({
        success: false,
        message: 'MongoDB no está conectado. No se pueden obtener detalles del reporte.',
        error: 'Database connection unavailable'
      });
    }

    const { reportId } = req.params;
    
    // Obtener modelo AutomaticReport
    let AutomaticReport;
    try {
      AutomaticReport = mongoose.model('AutomaticReport');
    } catch (e) {
      const AutomaticReportSchema = new mongoose.Schema({
        reportType: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
        period: {
          startDate: { type: Date, required: true },
          endDate: { type: Date, required: true },
        },
        status: { type: String, enum: ['pending', 'generating', 'completed', 'failed', 'exported'] },
        metrics: { type: mongoose.Schema.Types.Mixed, default: {} },
        anomalies: [{ type: mongoose.Schema.Types.Mixed }],
        filePath: { type: String },
        exportedAt: { type: Date },
        exportFormat: { type: String, enum: ['pdf', 'csv', 'json'] },
        generatedBy: { type: String },
        generatedAt: { type: Date, default: Date.now },
      }, { timestamps: true });
      AutomaticReport = mongoose.model('AutomaticReport', AutomaticReportSchema);
    }

    // Buscar reporte en la base de datos
    const report = await AutomaticReport.findById(reportId).lean();

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Reporte no encontrado',
        error: 'Report not found'
      });
    }

    res.json({
      success: true,
      data: {
        _id: report._id.toString(),
        reportType: report.reportType,
        status: report.status,
        generatedAt: report.generatedAt ? report.generatedAt.toISOString() : null,
        period: {
          startDate: report.period.startDate.toISOString(),
          endDate: report.period.endDate.toISOString()
        },
        metrics: report.metrics || {},
        anomalies: report.anomalies || [],
        topDiagnoses: report.metrics?.topDiagnoses || [],
        exportFormats: report.exportFormat ? [report.exportFormat] : [],
        exportedAt: report.exportedAt ? report.exportedAt.toISOString() : null
      }
    });
  } catch (error) {
    console.error('Error fetching report details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching report details',
      error: error.message
    });
  }
});

// POST /api/v1/reports/automatic/generate - Generar un nuevo reporte
app.post('/api/v1/reports/automatic/generate', (req, res) => {
  try {
    const { reportType, includeAnomalies, autoExport, exportFormat } = req.body;
    
    // Simular generación de reporte
    const newReport = {
      _id: `report-${Date.now()}`,
      reportType: reportType || 'daily',
      status: 'generating',
      generatedAt: null,
      period: {
        start: new Date(Date.now() - (reportType === 'daily' ? 24 : reportType === 'weekly' ? 7 * 24 : 30 * 24) * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      },
      summary: null,
      exportFormats: exportFormat ? [exportFormat] : []
    };

    // Simular que el reporte se completa después de un tiempo
    setTimeout(() => {
      newReport.status = 'completed';
      newReport.generatedAt = new Date().toISOString();
      newReport.summary = {
        totalCases: Math.floor(Math.random() * 100) + 20,
        highSeverity: Math.floor(Math.random() * 20),
        mediumSeverity: Math.floor(Math.random() * 40),
        lowSeverity: Math.floor(Math.random() * 30),
        anomalies: includeAnomalies ? Math.floor(Math.random() * 5) : 0
      };
    }, 2000);

    res.status(201).json({
      success: true,
      message: `Reporte ${reportType} en proceso de generación`,
      data: newReport
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error generating report',
      error: error.message
    });
  }
});

// POST /api/v1/reports/automatic/:reportId/export - Exportar un reporte
app.post('/api/v1/reports/automatic/:reportId/export', (req, res) => {
  try {
    const { reportId } = req.params;
    const { format = 'pdf' } = req.body;
    
    // Simular exportación
    res.json({
      success: true,
      message: `Reporte exportado en formato ${format}`,
      data: {
        reportId,
        format,
        downloadUrl: `/api/v1/reports/automatic/${reportId}/download?format=${format}`,
        exportedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error exporting report',
      error: error.message
    });
  }
});

// ---------------------------------------------------------------------------
// Mocked Appointments API (development-only)
// ---------------------------------------------------------------------------

const SAMPLE_APPOINTMENTS = [
  {
    id: 'apt-001',
    patientId: 'patient-456',
    doctorId: 'doctor-123',
    scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    durationMinutes: 30,
    status: 'scheduled',
    reason: 'Consulta de control',
    notes: 'Paciente con historial de asma leve',
  },
  {
    id: 'apt-002',
    patientId: 'patient-789',
    doctorId: 'doctor-123',
    scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    durationMinutes: 30,
    status: 'scheduled',
    reason: 'Evaluación de tos persistente',
  },
  {
    id: 'apt-003',
    patientId: 'patient-123',
    doctorId: 'doctor-999',
    scheduledAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    durationMinutes: 45,
    status: 'completed',
    reason: 'Control post tratamiento',
  },
];

const normalizeArrayParam = (value) => {
  if (!value) return undefined;
  if (Array.isArray(value)) return value.flatMap((item) => String(item).split(','));
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

app.get('/api/v1/appointments', async (req, res) => {
  const jwt = require('jsonwebtoken');
  const mongoose = require('mongoose');

  // Authenticate
  const authHeader = req.headers.authorization;
  let userId = null;
  let userRole = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.substring(7), process.env.JWT_SECRET || 'dev-secret-key-change-in-production');
      userId = decoded.userId || decoded.id || decoded._id;
    } catch (e) {
      return res.status(401).json({ success: false, message: 'Token inválido' });
    }
  } else {
    return res.status(401).json({ success: false, message: 'Token requerido' });
  }

  // Get user role from DB
  try {
    const UserModel = mongoose.models.User;
    if (UserModel && userId) {
      const u = await UserModel.findById(userId).select('role');
      if (u) userRole = u.role;
    }
  } catch (_) {}

  const { status, from, to } = req.query;
  let { doctorId, patientId } = req.query;

  // Enforce ownership rules like the real route
  if (userRole === 'patient') { patientId = userId; doctorId = undefined; }
  else if (userRole === 'doctor') { doctorId = userId; }

  try {
    const Appointment = mongoose.models.Appointment;
    if (!Appointment) {
      return res.json({ success: true, message: 'Listado de citas', data: [] });
    }

    const query = {};
    if (patientId) query.patientId = String(patientId);
    if (doctorId) query.doctorId = String(doctorId);

    const statusFilter = normalizeArrayParam(status);
    if (statusFilter && statusFilter.length > 0) query.status = { $in: statusFilter };

    if (from || to) {
      query.scheduledAt = {};
      if (from) query.scheduledAt.$gte = new Date(String(from));
      if (to) query.scheduledAt.$lte = new Date(String(to));
    }

    const results = await Appointment.find(query).sort({ scheduledAt: 1 }).limit(200).lean();
    res.json({ success: true, message: 'Listado de citas', data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener citas', error: error.message });
  }
});

// Ruta para obtener citas próximas del usuario autenticado
app.get('/api/v1/appointments/me/upcoming', async (req, res) => {
  console.log('📅 Upcoming appointments route called');
  try {
    const mongoose = require('mongoose');
    const jwt = require('jsonwebtoken');
    
    // Intentar obtener userId del token de autenticación
    let userId = null;
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const secret = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
        const decoded = jwt.verify(token, secret);
        userId = decoded.userId || decoded.id || decoded._id;
        console.log('✅ User authenticated:', userId);
      } catch (e) {
        console.warn('⚠️ Invalid token in appointments request:', e.message);
        return res.status(401).json({
          success: false,
          message: 'Token de autenticación inválido',
          error: e.message
        });
      }
    } else {
      return res.status(401).json({
        success: false,
        message: 'Token de autenticación requerido'
      });
    }
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'No se pudo identificar al usuario'
      });
    }
    
    // Intentar obtener citas de la base de datos
    let Appointment;
    try {
      Appointment = mongoose.model('Appointment');
    } catch (e) {
      // Si no existe el modelo, usar datos mock
      console.log('⚠️ Appointment model not found, using mock data');
      const now = new Date();
      const mockAppointments = SAMPLE_APPOINTMENTS.filter(
        (appointment) => 
          appointment.patientId === String(userId) &&
          (appointment.status === 'scheduled' || appointment.status === 'rescheduled') &&
          new Date(appointment.scheduledAt) >= now
      ).sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
      
      return res.json({
        success: true,
        data: mockAppointments
      });
    }
    
    // Buscar citas próximas en la base de datos
    const now = new Date();
    const upcomingAppointments = await Appointment.find({
      patientId: userId,
      status: { $in: ['scheduled', 'rescheduled'] },
      scheduledAt: { $gte: now }
    })
      .sort({ scheduledAt: 1 }) // Ordenar por fecha ascendente
      .limit(10) // Limitar a 10 citas
      .lean();
    
    console.log(`✅ Found ${upcomingAppointments.length} upcoming appointments for user ${userId}`);
    
    res.json({
      success: true,
      data: upcomingAppointments
    });
  } catch (error) {
    console.error('❌ Error fetching upcoming appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener citas próximas',
      error: error.message
    });
  }
});

const buildAvailabilitySlots = ({ doctorId, start, end, slotMinutes = 30 }) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const slots = [];

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return slots;
  }

  const busySlots = SAMPLE_APPOINTMENTS.filter(
    (appointment) => appointment.doctorId === doctorId && appointment.status !== 'cancelled',
  ).map((appointment) => {
    const slotStart = new Date(appointment.scheduledAt);
    const slotEnd = new Date(slotStart.getTime() + appointment.durationMinutes * 60 * 1000);
    return { start: slotStart, end: slotEnd };
  });

  for (let cursor = new Date(startDate); cursor < endDate; cursor = new Date(cursor.getTime() + slotMinutes * 60 * 1000)) {
    const slotEnd = new Date(cursor.getTime() + slotMinutes * 60 * 1000);
    if (slotEnd > endDate) {
      break;
    }

    const overlap = busySlots.some(
      (busy) => cursor < busy.end && slotEnd > busy.start,
    );

    slots.push({
      start: cursor.toISOString(),
      end: slotEnd.toISOString(),
      available: !overlap,
    });
  }

  return slots;
};

// Wearables Routes — delegadas completamente a wearableRoutes.ts (cargado al final con ts-node)

app.get('/api/v1/appointments/doctor/:doctorId/availability', (req, res) => {
  const { doctorId } = req.params;
  const { start, end, slotMinutes } = req.query;

  if (!start || !end) {
    return res.status(400).json({
      success: false,
      message: 'Los parámetros start y end son obligatorios',
    });
  }

  const slots = buildAvailabilitySlots({
    doctorId,
    start,
    end,
    slotMinutes: slotMinutes ? Number(slotMinutes) : 30,
  });

  return res.json({
    success: true,
    message: 'Disponibilidad generada (mock)',
    data: slots,
  });
});

// ---------------------------------------------------------------------------
// ML Monitoring proxy endpoints (bridge to AI Services for dev)
// ---------------------------------------------------------------------------

const AI_SERVICE_CANDIDATES = [
  process.env.AI_SERVICE_URL ? process.env.AI_SERVICE_URL.replace(/\/$/, '') : null,
  'http://ai-services:8000/api/v1',
  'http://localhost:8000/api/v1',
].filter(Boolean);

const fetchFromAiService = async (path, options = {}) => {
  let lastError;

  for (const base of AI_SERVICE_CANDIDATES) {
    const url = `${base}${path}`;
    try {
      const response = await axios.get(url, {
        timeout: 8000,
        ...options,
      });
      // AI service returns {success: true, data: {...}}, extract only data
      const result = response.data;
      // Check if result has the expected structure {success: true, data: {...}}
      if (result && typeof result === 'object') {
        if (result.success === true && 'data' in result) {
          // Extract the inner data
          const innerData = result.data;
          // If innerData also has the same structure, extract again
          if (innerData && typeof innerData === 'object' && innerData.success === true && 'data' in innerData) {
            return innerData.data;
          }
          return innerData;
        }
        // If result itself is the data (no wrapper), return it
        if (!('success' in result)) {
          return result;
        }
      }
      return result || {};
    } catch (error) {
      lastError = error;
      console.warn(`AI service request failed for ${url}`, error.message);
    }
  }

  throw lastError;
};

const monitoringRoutes = ['/api/analytics/ml/monitoring', '/api/v1/analytics/ml/monitoring'];
const featureRoutes = ['/api/analytics/ml/features', '/api/v1/analytics/ml/features'];
const fairnessRoutes = ['/api/analytics/ml/fairness', '/api/v1/analytics/ml/fairness'];

app.get(monitoringRoutes, async (req, res) => {
  try {
    const params = {};
    if (req.query.days) {
      params.days = Number(req.query.days);
    }
    
    // Intentar obtener métricas del servicio AI
    try {
      const data = await fetchFromAiService('/ml/monitoring/metrics', { params });
      res.json({ success: true, data });
      return;
    } catch (aiError) {
      console.warn('⚠️ AI service not available, calculating metrics from MongoDB experiments');
    }
    
    // Fallback: Calcular métricas desde experimentos ML en MongoDB
    const mongoose = require('mongoose');
    const isMongoConnected = mongoose.connection.readyState === 1;
    
    if (!isMongoConnected) {
      return res.status(503).json({
        success: false,
        message: 'MongoDB no está conectado. No se pueden calcular métricas.',
        error: 'Database connection unavailable'
      });
    }
    
    // Obtener modelo MLExperiment
    let MLExperiment;
    try {
      MLExperiment = mongoose.model('MLExperiment');
    } catch (e) {
      const MLExperimentSchema = new mongoose.Schema({
        experimentId: { type: String, index: true },
        experimentType: { type: String, index: true },
        modelName: { type: String, index: true },
        status: { type: String, index: true },
        inputs: { type: mongoose.Schema.Types.Mixed },
        outputs: { type: mongoose.Schema.Types.Mixed },
        performance: { type: mongoose.Schema.Types.Mixed }
      }, { timestamps: true, collection: 'mlexperiments' });
      MLExperiment = mongoose.model('MLExperiment', MLExperimentSchema);
    }
    
    const days = params.days || 7;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    // Obtener experimentos completados de los últimos N días
    const experiments = await MLExperiment.find({
      status: 'completed',
      createdAt: { $gte: startDate }
    }).lean();
    
    // Calcular métricas
    let totalPredictions = 0;
    let totalConfidence = 0;
    let lowConfidenceCount = 0;
    const confidenceValues = [];
    const qualityBreakdown = { high: 0, medium: 0, low: 0 };
    
    experiments.forEach(exp => {
      if (exp.outputs && exp.outputs.prediction) {
        totalPredictions++;
        const confidence = exp.outputs.prediction.confidence || 0;
        confidenceValues.push(confidence);
        totalConfidence += confidence;
        
        if (confidence < 0.6) {
          lowConfidenceCount++;
          qualityBreakdown.low++;
        } else if (confidence < 0.8) {
          qualityBreakdown.medium++;
        } else {
          qualityBreakdown.high++;
        }
      }
    });
    
    const avgConfidence = totalPredictions > 0 ? totalConfidence / totalPredictions : 0;
    const lowConfidencePercentage = totalPredictions > 0 ? (lowConfidenceCount / totalPredictions) * 100 : 0;
    
    const data = {
      summary: {
        total_predictions: totalPredictions,
        avg_confidence: avgConfidence,
        low_confidence_predictions: lowConfidenceCount,
        low_confidence_percentage: lowConfidencePercentage
      },
      quality_metrics: {
        high_confidence_rate: totalPredictions > 0 ? (qualityBreakdown.high / totalPredictions) * 100 : 0,
        medium_confidence_rate: totalPredictions > 0 ? (qualityBreakdown.medium / totalPredictions) * 100 : 0,
        low_confidence_rate: totalPredictions > 0 ? (qualityBreakdown.low / totalPredictions) * 100 : 0
      },
      daily_predictions: Array.from({ length: days }, (_, i) => {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const dayExperiments = experiments.filter(exp => {
          const expDate = new Date(exp.createdAt);
          return expDate.toDateString() === date.toDateString();
        });
        const dayPredictions = dayExperiments.filter(exp => exp.outputs && exp.outputs.prediction).length;
        const dayConfidences = dayExperiments
          .filter(exp => exp.outputs && exp.outputs.prediction)
          .map(exp => exp.outputs.prediction.confidence || 0);
        const dayAvgConfidence = dayConfidences.length > 0 
          ? dayConfidences.reduce((a, b) => a + b, 0) / dayConfidences.length 
          : 0;
        
        return {
          date: date.toISOString().split('T')[0],
          count: dayPredictions,
          avg_confidence: dayAvgConfidence
        };
      }),
      model_performance: [
        { model_name: 'XGBoost', predictions: 0, avg_confidence: 0, accuracy: 0 },
        { model_name: 'Random Forest', predictions: 0, avg_confidence: 0, accuracy: 0 },
        { model_name: 'Neural Network', predictions: 0, avg_confidence: 0, accuracy: 0 }
      ]
    };
    
    // Calcular métricas por modelo
    const modelStats = {};
    experiments.forEach(exp => {
      if (exp.outputs && exp.outputs.prediction && exp.modelName) {
        if (!modelStats[exp.modelName]) {
          modelStats[exp.modelName] = { predictions: 0, confidences: [], accuracies: [] };
        }
        modelStats[exp.modelName].predictions++;
        modelStats[exp.modelName].confidences.push(exp.outputs.prediction.confidence || 0);
        if (exp.outputs.metrics && exp.outputs.metrics.accuracy) {
          modelStats[exp.modelName].accuracies.push(exp.outputs.metrics.accuracy);
        }
      }
    });
    
    data.model_performance = data.model_performance.map(model => {
      const stats = modelStats[model.model_name] || { predictions: 0, confidences: [], accuracies: [] };
      return {
        model_name: model.model_name,
        predictions: stats.predictions,
        avg_confidence: stats.confidences.length > 0 
          ? stats.confidences.reduce((a, b) => a + b, 0) / stats.confidences.length 
          : 0,
        accuracy: stats.accuracies.length > 0 
          ? stats.accuracies.reduce((a, b) => a + b, 0) / stats.accuracies.length 
          : 0
      };
    });
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ Error getting ML monitoring metrics:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener métricas de monitoreo',
    });
  }
});

app.get(featureRoutes, async (req, res) => {
  try {
    const params = {};
    if (req.query.top) {
      params.top_n = Number(req.query.top);
    }
    const data = await fetchFromAiService('/ml/monitoring/features', { params });
    res.json({ success: true, data });
  } catch (error) {
    const status = error?.response?.status || 502;
    res.status(status).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Error al obtener contribuciones de características',
    });
  }
});

app.get(fairnessRoutes, async (req, res) => {
  try {
    const params = {};
    if (req.query.groupField) {
      params.group_field = req.query.groupField;
    }
    if (req.query.highConfidenceThreshold) {
      params.high_confidence_threshold = Number(req.query.highConfidenceThreshold);
    }
    const data = await fetchFromAiService('/ml/monitoring/fairness', { params });
    res.json({ success: true, data });
  } catch (error) {
    const status = error?.response?.status || 502;
    res.status(status).json({
      success: false,
      message: error?.response?.data?.detail || error.message || 'Error al obtener métricas de equidad',
    });
  }
});

// GET /api/v1/ml/experiments - Obtener experimentos ML desde MongoDB
app.get('/api/v1/ml/experiments', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (!isMongoConnected) {
      return res.status(503).json({
        success: false,
        message: 'MongoDB no está conectado. No se pueden obtener experimentos ML.',
        error: 'Database connection unavailable'
      });
    }

    const { limit = 5, experimentType, status, modelName } = req.query;
    console.log('🔍 Fetching ML experiments with params:', { limit, experimentType, status, modelName });

    // Obtener modelo MLExperiment
    let MLExperiment;
    try {
      MLExperiment = mongoose.model('MLExperiment');
      console.log('✅ Using existing MLExperiment model');
    } catch (e) {
      // Si no existe, crear el schema inline con el nombre de colección explícito
      console.log('⚠️ MLExperiment model not found, creating inline schema');
      const MLExperimentSchema = new mongoose.Schema({
        experimentId: { type: String, index: true },
        experimentType: { 
          type: String, 
          enum: ['rl_session', 'fl_round', 'automl_pipeline', 'prediction', 'training', 'evaluation'],
          index: true
        },
        modelName: { type: String, index: true },
        modelVersion: String,
        status: {
          type: String,
          enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
          default: 'pending',
          index: true
        },
        metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
        inputs: { type: mongoose.Schema.Types.Mixed, default: {} },
        outputs: { type: mongoose.Schema.Types.Mixed, default: {} },
        logs: { type: [mongoose.Schema.Types.Mixed], default: [] },
        errors: { type: [mongoose.Schema.Types.Mixed], default: [] },
        performance: {
          startTime: { type: Date, default: Date.now },
          endTime: Date,
          durationMs: Number,
          cpuUsage: Number,
          memoryUsage: Number,
          gpuUsage: Number
        },
        results: { type: mongoose.Schema.Types.Mixed }
      }, { 
        timestamps: true,
        collection: 'mlexperiments' // Nombre explícito de la colección
      });
      MLExperiment = mongoose.model('MLExperiment', MLExperimentSchema);
    }

    // Construir filtro
    const filter = {};
    if (experimentType) filter.experimentType = experimentType;
    if (status) filter.status = status;
    if (modelName) filter.modelName = new RegExp(modelName, 'i');

    console.log('🔍 Filter:', filter);

    // Primero verificar cuántos documentos hay en total
    const totalCount = await MLExperiment.countDocuments(filter);
    console.log(`📊 Total ML experiments in database: ${totalCount}`);

    // Buscar experimentos
    const experiments = await MLExperiment.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    console.log(`✅ Found ${experiments.length} ML experiments after filtering`);
    if (experiments.length > 0) {
      console.log('📋 First experiment sample:', {
        _id: experiments[0]._id,
        experimentId: experiments[0].experimentId,
        experimentType: experiments[0].experimentType,
        modelName: experiments[0].modelName,
        status: experiments[0].status,
        createdAt: experiments[0].createdAt
      });
    }

    res.json({
      success: true,
      message: 'Experimentos ML obtenidos correctamente',
      data: experiments,
      total: totalCount
    });
  } catch (error) {
    console.error('❌ Error fetching ML experiments:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error al obtener experimentos ML',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ── Rutas TypeScript (cargadas con ts-node/register) ────────────────────────
// Los módulos .ts no podían cargarse antes porque faltaba ts-node/register.
// Se agrega aquí para no romper los requires JS previos.
try {
  require('ts-node').register({ transpileOnly: true, skipIgnore: true });

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

