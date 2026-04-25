/**
 * Jest test setup configuration
 * IMPORTANT: Environment variables must be set BEFORE any imports
 */

// ============================================
// SET ENVIRONMENT VARIABLES FIRST (before any imports)
// ============================================
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.HOST = 'localhost';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
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

// ============================================
// NOW WE CAN IMPORT MODULES
// ============================================
type RedisEntry = { value: string; expiresAt?: number };
const redisStore = new Map<string, RedisEntry>();

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const matchesPattern = (key: string, pattern: string): boolean => {
  if (pattern === '*') {
    return true;
  }
  const regex = new RegExp(`^${pattern.split('*').map(escapeRegex).join('.*')}$`);
  return regex.test(key);
};

const isExpired = (entry: RedisEntry | undefined): boolean =>
  !!entry?.expiresAt && entry.expiresAt <= Date.now();

jest.mock('redis', () => {
  const createClient = jest.fn(() => {
    const client = {
      connect: jest.fn(async () => client),
      disconnect: jest.fn(async () => undefined),
      on: jest.fn(),
      get: jest.fn(async (key: string) => {
        const entry = redisStore.get(key);
        if (!entry || isExpired(entry)) {
          redisStore.delete(key);
          return null;
        }
        return entry.value;
      }),
      set: jest.fn(async (key: string, value: string, options?: { EX?: number }) => {
        const payload = typeof value === 'string' ? value : JSON.stringify(value);
        const expiresAt = options?.EX ? Date.now() + options.EX * 1000 : undefined;
        redisStore.set(key, { value: payload, expiresAt });
        return 'OK';
      }),
      del: jest.fn(async (keys: string | string[]) => {
        const list = Array.isArray(keys) ? keys : [keys];
        let removed = 0;
        for (const key of list) {
          if (redisStore.delete(key)) {
            removed++;
          }
        }
        return removed;
      }),
      scanIterator: jest.fn(async function* ({ MATCH = '*' }: { MATCH?: string } = {}) {
        for (const key of redisStore.keys()) {
          if (matchesPattern(key, MATCH)) {
            yield key;
          }
        }
      }),
      incr: jest.fn(async (key: string) => {
        const entry = redisStore.get(key);
        const base = !entry || isExpired(entry) ? 0 : parseInt(entry.value, 10) || 0;
        const next = base + 1;
        redisStore.set(key, {
          value: String(next),
          expiresAt: entry?.expiresAt
        });
        return next;
      }),
      expire: jest.fn(async (key: string, seconds: number) => {
        const entry = redisStore.get(key);
        if (!entry) {
          return 0;
        }
        redisStore.set(key, {
          value: entry.value,
          expiresAt: Date.now() + seconds * 1000
        });
        return 1;
      }),
      ttl: jest.fn(async (key: string) => {
        const entry = redisStore.get(key);
        if (!entry) {
          return -2;
        }
        if (!entry.expiresAt) {
          return -1;
        }
        const remaining = Math.ceil((entry.expiresAt - Date.now()) / 1000);
        return remaining > 0 ? remaining : -2;
      })
    };
    return client;
  });

  return {
    createClient
  };
});

const redisMockHelpers = {
  reset: () => redisStore.clear(),
  setValue: (key: string, value: string, ttlSeconds?: number) => {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    redisStore.set(key, { value, expiresAt });
  },
  getValue: (key: string) => {
    const entry = redisStore.get(key);
    if (!entry || isExpired(entry)) {
      redisStore.delete(key);
      return null;
    }
    return entry.value;
  }
};

import superagent from 'superagent';

if (!(superagent as any).__noCompressionPatched) {
  const originalEnd = superagent.Request.prototype.end;
  superagent.Request.prototype.end = function patchedEnd(this: superagent.Request, fn?: any) {
    const requestAny = this as any;
    requestAny._header = requestAny._header || {};
    const acceptEncodingHeader = requestAny._header['accept-encoding'];
    const hasAcceptEncoding = typeof acceptEncodingHeader === 'string' && acceptEncodingHeader.length > 0;

    if (!hasAcceptEncoding) {
      this.set('Accept-Encoding', 'identity');
    }

    const finalAcceptEncoding = requestAny._header['accept-encoding'];
    const disablesCompression =
      !hasAcceptEncoding || /identity/i.test(String(finalAcceptEncoding ?? ''));

    if (!requestAny._header['x-no-compression'] && disablesCompression) {
      this.set('X-No-Compression', 'true');
    }
    return originalEnd.call(this, fn);
  };
  (superagent as any).__noCompressionPatched = true;
}

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Extend Jest matchers (optional, comment out if not installed)
try {
  require('jest-extended');
} catch (e) {
  // jest-extended is optional
}

// Global test variables
declare global {
  var __MONGOD: MongoMemoryServer | undefined;
  var __MONGO_URI: string | undefined;
  var __redisMock:
    | {
        reset: () => void;
        setValue: (key: string, value: string, ttlSeconds?: number) => void;
        getValue: (key: string) => string | null;
      }
    | undefined;
}

globalThis.__redisMock = redisMockHelpers;

// Mock external services
jest.mock('nodemailer');
jest.mock('sharp');

// Global test setup
beforeAll(async () => {
  // Setup MongoDB Memory Server only if not already set
  if (!globalThis.__MONGOD) {
    globalThis.__MONGOD = await MongoMemoryServer.create();
    globalThis.__MONGO_URI = globalThis.__MONGOD.getUri();
  }
  
  // Connect to test database only if not already connected
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(globalThis.__MONGO_URI || 'mongodb://localhost:27017/respicare-test');
  } else if (mongoose.connection.readyState === 1) {
    // Already connected, use existing connection
    // But we need to switch to test database
    // For now, just use the existing connection
  }
});

// Global test teardown
afterAll(async () => {
  // Close database connections
  await mongoose.connection.close();
  if (globalThis.__MONGOD) {
    await globalThis.__MONGOD.stop();
  }
});

// Clean up after each test
afterEach(async () => {
  // Clear all collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
  
  globalThis.__redisMock?.reset();

  // Clear all mocks
  jest.clearAllMocks();
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Mock console methods in test environment
const originalConsole = console;
beforeAll(() => {
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
});

afterAll(() => {
  global.console = originalConsole;
});

// Custom test utilities
export const testUtils = {
  // Generate test JWT token
  generateTestToken: (payload: any = {}) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { 
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'doctor',
        ...payload 
      },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );
  },
  
  // Generate test user data
  generateTestUser: (overrides: any = {}) => ({
    name: 'Test User',
    email: 'test@example.com',
    password: 'Password123!',
    role: 'doctor',
    ...overrides
  }),
  
  // Generate test medical history data
  generateTestMedicalHistory: (overrides: any = {}) => ({
    patientId: 'test-patient-id',
    doctorId: 'test-doctor-id',
    patientName: 'Test Patient',
    age: 45,
    diagnosis: 'Test Diagnosis',
    symptoms: [
      { name: 'tos', severity: 'moderate', duration: '2 weeks' },
      { name: 'fiebre', severity: 'mild', duration: '3 days' }
    ],
    description: 'Test medical history description',
    date: new Date(),
    ...overrides
  }),
  
  // Wait for async operations
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Clean test data
  cleanTestData: async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
    },

  // Redis mock helpers (HIT/MISS control)
  redis: {
    set: (key: string, value: string, ttlSeconds?: number) =>
      globalThis.__redisMock?.setValue(key, value, ttlSeconds),
    get: (key: string) => globalThis.__redisMock?.getValue(key) ?? null,
    reset: () => globalThis.__redisMock?.reset()
  }
};

// Export test utilities globally
global.testUtils = testUtils;
