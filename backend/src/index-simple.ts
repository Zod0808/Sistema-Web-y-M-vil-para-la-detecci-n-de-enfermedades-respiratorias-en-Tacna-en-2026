/**
 * RespiCare Backend API - Simplified Version for Development
 * Temporary version while fixing TypeScript errors
 */

import express, { Request, Response, Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

// Initialize express app
const app: Application = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'RespiCare Backend API',
    version: '1.0.0',
    status: 'running',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API info endpoint
app.get('/api', (req: Request, res: Response) => {
  res.json({
    message: 'RespiCare API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      docs: '/api-docs (coming soon)',
      auth: '/api/auth (coming soon)',
      patients: '/api/patients (coming soon)',
      medical_history: '/api/medical-history (coming soon)'
    }
  });
});

// Temporary auth endpoints
app.post('/api/auth/login', (req: Request, res: Response) => {
  res.json({
    message: 'Login endpoint - implementation in progress',
    status: 'placeholder'
  });
});

app.post('/api/auth/register', (req: Request, res: Response) => {
  res.json({
    message: 'Register endpoint - implementation in progress',
    status: 'placeholder'
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 RespiCare Backend API`);
  console.log(`📍 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API URL: http://localhost:${PORT}`);
  console.log(`❤️  Health check: http://localhost:${PORT}/api/health\n`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  process.exit(0);
});

export default app;

