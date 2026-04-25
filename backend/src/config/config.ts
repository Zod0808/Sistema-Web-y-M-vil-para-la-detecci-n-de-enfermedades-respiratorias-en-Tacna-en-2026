import dotenv from 'dotenv';
import { AppConfig } from '../types';

// Cargar variables de entorno
dotenv.config();

// Validar variables de entorno requeridas
const requiredEnvVars = [
  'NODE_ENV',
  'PORT',
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'REDIS_URL',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'PUSH_PROVIDER',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Variable de entorno requerida no encontrada: ${envVar}`);
  }
}

const parseCommaSeparated = (value?: string): string[] | undefined => {
  if (!value) {
    return undefined;
  }
  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return items.length ? items : undefined;
};

const parseCriticalRoles = (value?: string): Array<'doctor' | 'admin'> | undefined => {
  const allowed: Array<'doctor' | 'admin'> = ['doctor', 'admin'];
  const roles = parseCommaSeparated(value)?.filter((role): role is 'doctor' | 'admin' =>
    allowed.includes(role as 'doctor' | 'admin')
  );
  return roles && roles.length ? roles : undefined;
};

const parseInterval = (value: string | undefined, fallback: number): number => {
  const parsed = parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const DEFAULT_SCHEDULED_INTERVAL_MS = 30 * 1000;
const DEFAULT_PENDING_INTERVAL_MS = 45 * 1000;

export const config: AppConfig = {
  server: {
    port: parseInt(process.env.PORT || '3001'),
    host: process.env.HOST || 'localhost',
    env: process.env.NODE_ENV || 'development'
  },
  database: {
    mongodb: process.env.MONGODB_URI!,
    redis: process.env.REDIS_URL || 'redis://localhost:6379',
    maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '20'),
    minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '5'),
    maxIdleTimeMS: parseInt(process.env.MONGODB_MAX_IDLE_TIME_MS || '60000'),
    serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || '5000'),
    socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT_MS || '45000')
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    expire: process.env.JWT_EXPIRE || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    refreshExpire: process.env.JWT_REFRESH_EXPIRE || '30d'
  },
  ai: {
    serviceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
    apiKey: process.env.OPENAI_API_KEY || ''
  },
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.FROM_EMAIL || 'noreply@respicare.com'
  },
  push: {
    provider: (process.env.PUSH_PROVIDER as AppConfig['push']['provider']) || 'none',
    apiKey: process.env.PUSH_API_KEY,
    projectId: process.env.PUSH_PROJECT_ID,
  },
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutos
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    internalTokens: parseCommaSeparated(process.env.INTERNAL_SERVICE_TOKENS),
    criticalAlertRoles: parseCriticalRoles(process.env.CRITICAL_ALERT_ROLES),
  },
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8080'
    ]
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log'
  },
  jobs: {
    alerts: {
      scheduledIntervalMs: parseInterval(process.env.ALERTS_SCHEDULED_INTERVAL_MS, DEFAULT_SCHEDULED_INTERVAL_MS),
      pendingIntervalMs: parseInterval(process.env.ALERTS_PENDING_INTERVAL_MS, DEFAULT_PENDING_INTERVAL_MS)
    }
  },
  integrations: {
    drugInteractions: {
      url: process.env.DRUG_INTERACTION_API_URL ?? null,
      apiKey: process.env.DRUG_INTERACTION_API_KEY ?? null,
    },
  }
};
