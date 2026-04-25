import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
const hpp = require('hpp');
const xss = require('xss-clean');
import mongoose from 'mongoose';
const swaggerUi = require('swagger-ui-express');
import 'express-async-errors';

// Importar rutas de Clean Architecture
import authRoutes from './interface-adapters/routes/AuthRoutes';
import medicalHistoryRoutes from './interface-adapters/routes/MedicalHistoryRoutes';

// Importar middleware
import { errorHandler, notFound } from './middleware/errorHandler';
import { logger } from './utils/logger';

// Importar configuración
import { config } from './config/config';
import { swaggerSpec } from './config/swagger';

class App {
  public app: express.Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeDatabase();
  }

  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: config.cors.origins,
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.security.rateLimitWindow,
      max: config.security.rateLimitMax,
      message: {
        success: false,
        message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde'
      },
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use('/api/', limiter);

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Data sanitization
    this.app.use(mongoSanitize());
    this.app.use(xss());
    this.app.use(hpp());

    // Compression
    this.app.use(compression());

    // Logging
    if (config.server.env === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined'));
    }

    // Swagger documentation
    this.app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'RespiCare API Documentation - Clean Architecture'
    }));

    // Health check endpoint
    this.app.get('/health', (_req, res) => {
      res.status(200).json({
        success: true,
        message: 'RespiCare Backend API está funcionando con Clean Architecture',
        timestamp: new Date().toISOString(),
        environment: config.server.env,
        version: '2.0.0',
        architecture: 'Clean Architecture'
      });
    });
  }

  private initializeRoutes(): void {
    // API routes con Clean Architecture
    this.app.use('/api/v1/auth', authRoutes);
    this.app.use('/api/v1/medical-histories', medicalHistoryRoutes);

    // Root endpoint
    this.app.get('/', (_req, res) => {
      res.status(200).json({
        success: true,
        message: 'Bienvenido a RespiCare Backend API - Clean Architecture',
        version: '2.0.0',
        architecture: 'Clean Architecture',
        documentation: '/api/docs',
        health: '/health',
        endpoints: {
          auth: '/api/v1/auth',
          medicalHistories: '/api/v1/medical-histories'
        },
        layers: {
          domain: 'Entidades, Casos de Uso, Repositorios',
          application: 'Servicios de Aplicación',
          infrastructure: 'Implementaciones concretas (MongoDB, JWT, etc.)',
          interface: 'Controladores, DTOs, Rutas'
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
    try {
      await mongoose.connect(config.database.mongodb, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      logger.info('✅ Conectado a MongoDB');
      logger.info('✅ Clean Architecture inicializada correctamente');
    } catch (error) {
      logger.error('❌ Error conectando a MongoDB:', error);
      process.exit(1);
    }
  }

  public listen(): void {
    const port = config.server.port;
    const host = config.server.host;

    this.app.listen(port, host, () => {
      logger.info(`🚀 Servidor ejecutándose en http://${host}:${port}`);
      logger.info(`📚 Documentación disponible en http://${host}:${port}/api/docs`);
      logger.info(`🏥 Health check disponible en http://${host}:${port}/health`);
      logger.info(`🌍 Entorno: ${config.server.env}`);
      logger.info(`🏗️ Arquitectura: Clean Architecture`);
      logger.info(`📦 Capas implementadas:`);
      logger.info(`   - Dominio: Entidades, Casos de Uso, Repositorios`);
      logger.info(`   - Aplicación: Servicios de Aplicación`);
      logger.info(`   - Infraestructura: MongoDB, JWT, Hash`);
      logger.info(`   - Interfaz: Controladores, DTOs, Rutas`);
    });
  }
}

// Crear instancia de la aplicación
const app = new App();

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
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT recibido. Cerrando servidor...');
  process.exit(0);
});

// Iniciar servidor
app.listen();

export default app;
