describe('App lifecycle integration', () => {
  const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV;
    delete process.env.MONGODB_MAX_POOL_SIZE;
    delete process.env.MONGODB_MIN_POOL_SIZE;
    delete process.env.MONGODB_MAX_IDLE_TIME_MS;
    delete process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS;
    delete process.env.MONGODB_SOCKET_TIMEOUT_MS;
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('conecta a MongoDB con parámetros de pool cuando el entorno no es test', async () => {
    process.env.MONGODB_MAX_POOL_SIZE = '42';
    process.env.MONGODB_MIN_POOL_SIZE = '7';
    process.env.MONGODB_MAX_IDLE_TIME_MS = '120000';
    process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS = '4000';
    process.env.MONGODB_SOCKET_TIMEOUT_MS = '30000';

    const connectMock = jest.fn().mockResolvedValue(undefined);
    const connectionState = { readyState: 0 };
    const initializeRedisMock = jest.fn().mockResolvedValue(undefined);
    const loggerMock = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    let appModule: any;

    await jest.isolateModulesAsync(async () => {
      const actualMongoose = jest.requireActual('mongoose');
      jest.doMock('mongoose', () => {
        const mocked = {
          ...actualMongoose,
          connection: connectionState,
          connect: connectMock
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
        initializeRedis: initializeRedisMock,
        disconnectRedis: jest.fn().mockResolvedValue(undefined),
        getRedisClient: jest.fn()
      }));

      appModule = await import('../../src/index');
    });

    const appInstance = appModule.default;

    process.env.NODE_ENV = 'development';
    await appInstance['initializeDatabase']();

    expect(connectMock).toHaveBeenCalledWith(
      process.env.MONGODB_URI,
      expect.objectContaining({
        maxPoolSize: 42,
        minPoolSize: 7,
        maxIdleTimeMS: 120000,
        serverSelectionTimeoutMS: 4000,
        socketTimeoutMS: 30000
      })
    );
  });

  it('registra errores al inicializar Redis cuando initializeRedis rechaza', async () => {
    const connectMock = jest.fn().mockResolvedValue(undefined);
    const initializeRedisMock = jest.fn().mockRejectedValue(new Error('Redis failure'));
    const loggerMock = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    await jest.isolateModulesAsync(async () => {
      const actualMongoose = jest.requireActual('mongoose');
      jest.doMock('mongoose', () => {
        const mocked = {
          ...actualMongoose,
          connection: { readyState: 1 },
          connect: connectMock
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
        initializeRedis: initializeRedisMock,
        disconnectRedis: jest.fn().mockResolvedValue(undefined),
        getRedisClient: jest.fn()
      }));

      await import('../../src/index');
    });

    await new Promise((resolve) => setImmediate(resolve));

    expect(initializeRedisMock).toHaveBeenCalled();
    expect(loggerMock.error).toHaveBeenCalledWith(
      '❌ Error inicializando Redis:',
      expect.any(Error)
    );
  });

  it('maneja señales SIGTERM y SIGINT cerrando Redis y finalizando el proceso', async () => {
    const initializeRedisMock = jest.fn().mockResolvedValue(undefined);
    const disconnectRedisMock = jest.fn().mockResolvedValue(undefined);
    const loggerMock = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    const originalSigtermListeners = process.listeners('SIGTERM');
    const originalSigintListeners = process.listeners('SIGINT');

    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

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
        initializeRedis: initializeRedisMock,
        disconnectRedis: disconnectRedisMock,
        getRedisClient: jest.fn()
      }));

      await import('../../src/index');
    });

    const sigtermListeners = process
      .listeners('SIGTERM')
      .filter((listener) => !originalSigtermListeners.includes(listener));
    const sigintListeners = process
      .listeners('SIGINT')
      .filter((listener) => !originalSigintListeners.includes(listener));

    expect(sigtermListeners).toHaveLength(1);
    expect(sigintListeners).toHaveLength(1);

    sigtermListeners[0]!();
    await new Promise((resolve) => setImmediate(resolve));

    expect(disconnectRedisMock).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(0);

    exitSpy.mockClear();
    sigintListeners[0]!();
    await new Promise((resolve) => setImmediate(resolve));

    expect(disconnectRedisMock).toHaveBeenCalledTimes(2);
    expect(exitSpy).toHaveBeenCalledWith(0);

    sigtermListeners.forEach((listener) => process.removeListener('SIGTERM', listener));
    sigintListeners.forEach((listener) => process.removeListener('SIGINT', listener));
    exitSpy.mockRestore();
  });
});


