/**
 * Tests for smartRateLimiter middleware
 */

import type { Request, Response, NextFunction } from 'express';

type RedisMock = {
  incr: jest.Mock<any, any>;
  expire: jest.Mock<any, any>;
  ttl: jest.Mock<any, any>;
};

type MockResponse = Response & {
  statusCode?: number;
  body?: any;
  headers?: Record<string, any>;
  __fallbackCalled?: boolean;
};

const createRedisMock = (): RedisMock & Record<string, any> => ({
  incr: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn().mockResolvedValue(0)
});

const createMockResponse = (): MockResponse => {
  const res: Partial<MockResponse> = {
    headersSent: false,
    headers: {},
    statusCode: 200,
    setHeader: jest.fn(function (this: MockResponse, key: string, value: any) {
      this.headers![key] = value;
    }),
    getHeader: jest.fn(function (this: MockResponse, key: string) {
      return this.headers![key];
    }),
    status: jest.fn(function (this: MockResponse, code: number) {
      this.statusCode = code;
      return this;
    }),
    json: jest.fn(function (this: MockResponse, payload: unknown) {
      this.body = payload;
      return this;
    })
  };

  return res as MockResponse;
};

const createMockRequest = (overrides: Partial<Request> = {}): Request & { user?: any } => ({
  path: '/api/v1/medical-histories',
  ip: '127.0.0.1',
  user: { _id: 'doctor-1', role: 'doctor' },
  ...overrides
} as Request & { user?: any });

const createNext = (): NextFunction => jest.fn();

const loadRateLimiter = (redisClient: RedisMock | null) => {
  jest.resetModules();

  const fallbackHandler = jest.fn((req: Request, res: MockResponse, next: NextFunction) => {
    res.__fallbackCalled = true;
    next();
  });

  const rateLimitMock = jest.fn(() => fallbackHandler);

  const loggerMock = {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
  };

  const getRedisClientMock = jest.fn(() => redisClient);

  jest.doMock('../../../src/config/config', () => ({
    config: {
      security: {
        rateLimitWindow: 1000,
        rateLimitMax: 3
      }
    }
  }));

  jest.doMock('../../../src/config/redisClient', () => ({
    getRedisClient: getRedisClientMock
  }));

  jest.doMock('express-rate-limit', () => rateLimitMock);

  jest.doMock('../../../src/utils/logger', () => ({
    logger: loggerMock
  }));

  const { smartRateLimiter } = require('../../../src/middleware/rateLimiter') as typeof import('../../../src/middleware/rateLimiter');

  return {
    smartRateLimiter,
    rateLimitMock,
    fallbackHandler,
    loggerMock,
    getRedisClientMock
  };
};

describe('smartRateLimiter middleware', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('allows the request when usage is under the limit', async () => {
    const redisMock = createRedisMock();
    redisMock.incr.mockResolvedValue(1);
    redisMock.expire.mockResolvedValue(true);

    const { smartRateLimiter, fallbackHandler, getRedisClientMock } = loadRateLimiter(redisMock);

    const req = createMockRequest();
    const res = createMockResponse();
    const next = createNext();

    await smartRateLimiter(req, res, next);

    expect(getRedisClientMock).toHaveBeenCalled();
    expect(redisMock.incr).toHaveBeenCalledWith(expect.stringContaining('doctor'));
    expect(redisMock.expire).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', expect.any(String));
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String));
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-WindowMS', '1000');
    expect(next).toHaveBeenCalledTimes(1);
    expect(fallbackHandler).not.toHaveBeenCalled();
  });

  it('falls back to express-rate-limit when Redis client is unavailable', async () => {
    const { smartRateLimiter, fallbackHandler } = loadRateLimiter(null);

    const req = createMockRequest({ path: '/api/v1/auth/login', user: undefined });
    const res = createMockResponse();
    const next = createNext();

    await smartRateLimiter(req, res, next);

    expect(fallbackHandler).toHaveBeenCalledTimes(1);
    expect(res.__fallbackCalled).toBe(true);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('returns 429 when the request exceeds the rate limit', async () => {
    const redisMock = createRedisMock();
    redisMock.incr.mockResolvedValue(5); // above max (3)
    redisMock.ttl.mockResolvedValue(42);

    const { smartRateLimiter, loggerMock } = loadRateLimiter(redisMock);

    const req = createMockRequest();
    const res = createMockResponse();
    const next = createNext();

    await smartRateLimiter(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      limit: expect.any(Number),
      scope: 'doctor'
    }));
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '42');
    expect(loggerMock.warn).toHaveBeenCalledWith('Rate limit exceeded', expect.objectContaining({
      scope: 'doctor',
      windowMs: 1000
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('setea cabeceras coherentes cuando se alcanza exactamente el límite', async () => {
    const redisMock = createRedisMock();
    redisMock.incr.mockResolvedValue(3); // igual al límite

    const { smartRateLimiter } = loadRateLimiter(redisMock);

    const req = createMockRequest();
    const res = createMockResponse();
    const next = createNext();

    await smartRateLimiter(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '3');
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-WindowMS', '1000');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('usa el fallback cuando Redis falla durante el proceso', async () => {
    const redisMock = createRedisMock();
    redisMock.incr.mockRejectedValue(new Error('redis down'));

    const { smartRateLimiter, fallbackHandler, loggerMock } = loadRateLimiter(redisMock);

    const req = createMockRequest();
    const res = createMockResponse();
    const next = createNext();

    await smartRateLimiter(req, res, next);

    expect(loggerMock.warn).toHaveBeenCalledWith(
      'Fallo al aplicar rate limit inteligente, utilizando fallback',
      expect.objectContaining({ error: expect.any(Error) })
    );
    expect(fallbackHandler).toHaveBeenCalledTimes(1);
    expect(res.__fallbackCalled).toBe(true);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

