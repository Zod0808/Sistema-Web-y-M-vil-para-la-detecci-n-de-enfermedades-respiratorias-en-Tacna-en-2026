/**
 * Loaded via jest.config.js `setupFiles` — runs BEFORE any module imports.
 * Must not use Jest globals (jest.mock, describe, etc.).
 */
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.HOST = 'localhost';
process.env.JWT_SECRET = 'test-jwt-secret-0123456789abcdef-32b';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-0123456789abcdef-32b';
process.env.JWT_EXPIRE = '7d';
process.env.JWT_REFRESH_EXPIRE = '30d';
process.env.MONGODB_URI = 'mongodb://localhost:27017/respicare-test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.AI_SERVICE_URL = 'http://localhost:8000';
process.env.AI_SERVICE_API_KEY = 'test-api-key';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX_REQUESTS = '100000';
process.env.INTERNAL_SERVICE_TOKENS = 'internal-test-token';
process.env.CRITICAL_ALERT_ROLES = 'doctor,admin';
process.env.ALERTS_SCHEDULED_INTERVAL_MS = '15000';
process.env.ALERTS_PENDING_INTERVAL_MS = '20000';
// SMTP / email (required by config.ts)
process.env.SMTP_HOST = 'smtp.test.local';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'test@test.local';
process.env.SMTP_PASS = 'test-smtp-pass';
// Push notifications
process.env.PUSH_PROVIDER = 'none';
// Field-level encryption — 32 random bytes as base64 (AES-256 test key)
process.env.FIELD_ENCRYPTION_KEY = 'dGVzdC1lbmNyeXB0aW9uLWtleS10ZXN0LTMyYnl0ZXM=';
// Sentry — disabled in tests
process.env.SENTRY_ENABLED = 'false';
