/**
 * Tests for Redis client configuration utilities
 */

import type { RedisClientType } from 'redis';

type CreateModuleReturn = {
  initializeRedis: () => Promise<RedisClientType | null>;
  getRedisClient: () => RedisClientType | null;
  disconnectRedis: () => Promise<void>;
  createClientMock: jest.Mock;
  loggerMock: { info: jest.Mock; warn: jest.Mock; error: jest.Mock };
  mockClient: RedisClientType & {
    connect: jest.Mock;
    disconnect: jest.Mock;
    on: jest.Mock;
  };
};

const originalNodeEnv = process.env.NODE_ENV;

const createRedisMockClient = () => {
  const client = {
    connect: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn()
  };

  client.on.mockReturnValue(client);
  client.connect.mockResolvedValue(undefined);
  client.disconnect.mockResolvedValue(undefined);

  return client as unknown as RedisClientType & {
    connect: jest.Mock;
    disconnect: jest.Mock;
    on: jest.Mock;
  };
};

const loadRedisClientModule = (options: { nodeEnv?: string; mockClient?: any } = {}): CreateModuleReturn => {
  jest.resetModules();

  process.env.NODE_ENV = options.nodeEnv ?? 'development';

  const mockClient = options.mockClient ?? createRedisMockClient();
  const createClientMock = jest.fn(() => mockClient);

  const loggerMock = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };

  jest.doMock('redis', () => ({
    createClient: createClientMock
  }));

  jest.doMock('../../../src/config/config', () => ({
    config: {
      database: {
        redis: 'redis://localhost:6379'
      }
    }
  }));

  jest.doMock('../../../src/utils/logger', () => ({
    logger: loggerMock
  }));

  const module = require('../../../src/config/redisClient') as typeof import('../../../src/config/redisClient');

  return {
    ...module,
    createClientMock,
    loggerMock,
    mockClient
  };
};

describe('redisClient configuration helpers', () => {
  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('skips initialization in test environment', async () => {
    const { initializeRedis, createClientMock, loggerMock, getRedisClient } = loadRedisClientModule({
      nodeEnv: 'test'
    });

    const client = await initializeRedis();

    expect(client).toBeNull();
    expect(getRedisClient()).toBeNull();
    expect(createClientMock).not.toHaveBeenCalled();
    expect(loggerMock.info).toHaveBeenCalledWith('🧪 Redis initialization skipped in test environment');
  });

  it('initializes and caches the Redis client successfully', async () => {
    const mockClient = createRedisMockClient();
    const { initializeRedis, getRedisClient, disconnectRedis, createClientMock, loggerMock } = loadRedisClientModule({
      nodeEnv: 'development',
      mockClient
    });

    const client = await initializeRedis();

    expect(createClientMock).toHaveBeenCalledWith({ url: 'redis://localhost:6379' });
    expect(mockClient.connect).toHaveBeenCalledTimes(1);
    expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(mockClient.on).toHaveBeenCalledWith('reconnecting', expect.any(Function));

    const errorHandler = mockClient.on.mock.calls.find(call => call[0] === 'error')?.[1];
    const reconnectHandler = mockClient.on.mock.calls.find(call => call[0] === 'reconnecting')?.[1];

    expect(errorHandler).toBeInstanceOf(Function);
    expect(reconnectHandler).toBeInstanceOf(Function);

    const error = new Error('Redis connection lost');
    errorHandler(error);
    expect(loggerMock.error).toHaveBeenCalledWith('❌ Error en Redis', { error });

    reconnectHandler();
    expect(loggerMock.warn).toHaveBeenCalledWith('♻️ Intentando reconectar a Redis...');
    expect(loggerMock.info).toHaveBeenCalledWith('✅ Conectado a Redis');
    expect(client).toBe(mockClient);
    expect(getRedisClient()).toBe(mockClient);

    // Subsequent initialization should reuse cached client
    await initializeRedis();
    expect(createClientMock).toHaveBeenCalledTimes(1);

    await disconnectRedis();
    expect(mockClient.disconnect).toHaveBeenCalledTimes(1);
    expect(loggerMock.info).toHaveBeenCalledWith('🛑 Conexión de Redis cerrada correctamente');
    expect(getRedisClient()).toBeNull();
  });

  it('handles connection failures gracefully', async () => {
    const mockClient = createRedisMockClient();
    mockClient.connect.mockRejectedValueOnce(new Error('connection error'));

    const { initializeRedis, loggerMock, getRedisClient } = loadRedisClientModule({
      nodeEnv: 'development',
      mockClient
    });

    const client = await initializeRedis();

    expect(client).toBeNull();
    expect(getRedisClient()).toBeNull();
    expect(loggerMock.error).toHaveBeenCalledWith('❌ No se pudo conectar a Redis', { error: expect.any(Error) });
  });

  it('disconnectRedis is a no-op when client was not initialized', async () => {
    const { disconnectRedis, getRedisClient } = loadRedisClientModule({
      nodeEnv: 'development'
    });

    expect(getRedisClient()).toBeNull();
    await expect(disconnectRedis()).resolves.toBeUndefined();
  });
});

