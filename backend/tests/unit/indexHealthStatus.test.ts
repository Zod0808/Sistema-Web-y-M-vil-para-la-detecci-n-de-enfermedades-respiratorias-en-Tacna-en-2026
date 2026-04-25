import request from 'supertest';

describe('index health route (unit)', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    jest.resetModules();
    process.env.NODE_ENV = originalEnv;
  });

  const createLoggerMock = () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  });

  it('reporta estado healthy cuando Mongo y Redis responden correctamente', async () => {
    const loggerMock = createLoggerMock();
    const redisClientMock = {
      ping: jest.fn().mockResolvedValue('PONG')
    };

    let app: any;

    await jest.isolateModulesAsync(async () => {
      const actualMongoose = jest.requireActual('mongoose');
      jest.doMock('mongoose', () => {
        const mocked = {
          ...actualMongoose,
          connection: { readyState: 1 },
          connect: jest.fn()
        };
        return {
          __esModule: true,
          ...mocked,
          default: mocked
        };
      });

      jest.doMock('../../src/utils/logger', () => ({
        logger: loggerMock
      }));

      jest.doMock('../../src/config/redisClient', () => ({
        initializeRedis: jest.fn().mockResolvedValue(undefined),
        disconnectRedis: jest.fn().mockResolvedValue(undefined),
        getRedisClient: jest.fn(() => redisClientMock)
      }));

      const module = await import('../../src/index');
      app = module.default.app;
    });

    const response = await request(app).get('/health').expect(200);
    expect(response.body.status).toBe('healthy');
    expect(response.body.dependencies.redis.status).toBe('connected');
    expect(redisClientMock.ping).toHaveBeenCalled();
  });

  it('reporta estado degraded cuando Redis falla durante el ping', async () => {
    const loggerMock = createLoggerMock();
    const redisClientMock = {
      ping: jest.fn().mockRejectedValue(new Error('Redis down'))
    };

    let app: any;

    await jest.isolateModulesAsync(async () => {
      const actualMongoose = jest.requireActual('mongoose');
      jest.doMock('mongoose', () => {
        const mocked = {
          ...actualMongoose,
          connection: { readyState: 1 },
          connect: jest.fn()
        };
        return {
          __esModule: true,
          ...mocked,
          default: mocked
        };
      });

      jest.doMock('../../src/utils/logger', () => ({
        logger: loggerMock
      }));

      jest.doMock('../../src/config/redisClient', () => ({
        initializeRedis: jest.fn().mockResolvedValue(undefined),
        disconnectRedis: jest.fn().mockResolvedValue(undefined),
        getRedisClient: jest.fn(() => redisClientMock)
      }));

      const module = await import('../../src/index');
      app = module.default.app;
    });

    const response = await request(app).get('/health').expect(200);
    expect(response.body.status).toBe('degraded');
    expect(response.body.dependencies.redis.status).toBe('error');
    expect(loggerMock.error).toHaveBeenCalledWith(
      '❌ Error verificando estado de Redis',
      expect.any(Object)
    );
  });
});


