import request from 'supertest';
import type { Express } from 'express';

interface LoadOptions {
  serverEnv?: string;
  redisClient?: any;
  redisInitReject?: boolean;
  mongooseReadyState?: number;
  mongooseConnectReject?: boolean;
}

interface LoadedApp {
  appModule: any;
  expressApp: Express;
  config: any;
  initializeRedisMock: jest.Mock;
  getRedisClientMock: jest.Mock;
  loggerInfo: jest.Mock;
  loggerError: jest.Mock;
  loggerWarn: jest.Mock;
  morganMock: jest.Mock;
  mongooseConnectSpy: jest.Mock;
  mongooseConnectionState: { readyState: number };
}

const PROCESS_EVENTS = ['uncaughtException', 'unhandledRejection', 'SIGTERM', 'SIGINT'] as const;
const baseListeners: Record<string, Function[]> = {};

beforeAll(() => {
  for (const event of PROCESS_EVENTS) {
    baseListeners[event] = process.listeners(event as NodeJS.Signals | 'uncaughtException' | 'unhandledRejection');
  }
});

afterEach(() => {
  for (const event of PROCESS_EVENTS) {
    const current = process.listeners(event as NodeJS.Signals | 'uncaughtException' | 'unhandledRejection');
    current.slice(baseListeners[event].length).forEach((listener) => {
      process.removeListener(event as NodeJS.Signals | 'uncaughtException' | 'unhandledRejection', listener);
    });
  }
  jest.restoreAllMocks();
  process.env.NODE_ENV = 'test';
});

afterAll(() => {
  process.env.NODE_ENV = 'test';
  for (const event of PROCESS_EVENTS) {
    const current = process.listeners(event as NodeJS.Signals | 'uncaughtException' | 'unhandledRejection');
    current.slice(baseListeners[event].length).forEach((listener) => {
      process.removeListener(event as NodeJS.Signals | 'uncaughtException' | 'unhandledRejection', listener);
    });
  }
});

const loadApp = async (options: LoadOptions = {}): Promise<LoadedApp> => {
  jest.resetModules();

  const actualConfigModule = jest.requireActual('../../src/config/config');
  const effectiveConfig = {
    ...actualConfigModule.config,
    server: {
      ...actualConfigModule.config.server,
      env: options.serverEnv ?? actualConfigModule.config.server.env
    }
  };

  jest.doMock('../../src/config/config', () => ({
    config: effectiveConfig
  }));

  const initializeRedisMock = jest.fn().mockImplementation(() => {
    if (options.redisInitReject) {
      return Promise.reject(new Error('Redis init failure'));
    }
    return Promise.resolve();
  });

  const providedRedisClient = Object.prototype.hasOwnProperty.call(options, 'redisClient')
    ? options.redisClient
    : {
        ping: jest.fn().mockResolvedValue('PONG'),
        status: 'ready'
      };

  const getRedisClientMock = jest.fn().mockReturnValue(providedRedisClient);
  const disconnectRedisMock = jest.fn().mockResolvedValue(undefined);

  jest.doMock('../../src/config/redisClient', () => ({
    initializeRedis: initializeRedisMock,
    disconnectRedis: disconnectRedisMock,
    getRedisClient: getRedisClientMock
  }));

  const loggerInfo = jest.fn();
  const loggerError = jest.fn();
  const loggerWarn = jest.fn();

  jest.doMock('../../src/utils/logger', () => ({
    logger: {
      info: loggerInfo,
      error: loggerError,
      warn: loggerWarn,
      debug: jest.fn()
    }
  }));

  const morganMock = jest.fn().mockReturnValue((_req: any, _res: any, next: Function) => next());
  jest.doMock('morgan', () => ({
    __esModule: true,
    default: morganMock
  }));

  // `jest.isolateModulesAsync` gives `src/index.ts` a fresh, sandboxed copy of
  // every module it requires. `src/models/*.ts` need a *real*, fully
  // functional `mongoose` (Schema, model registration, etc.), so we can't
  // substitute a bare stub — but we also must not share the real globally
  // connected singleton used by mongodb-memory-server (doing so let tests
  // close/reopen the shared connection and hang other suites). Instead,
  // `jest.requireActual` a fresh mongoose instance scoped to this sandbox
  // (safe because `jest.resetModules()` above guarantees it's disconnected
  // from Node's module cache) and patch `connect`/`connection.readyState` on
  // that instance directly, so the doMock factory returns the very object
  // already carrying our spy — guaranteeing identity with what `src/index.ts`
  // calls.
  const freshMongoose = jest.requireActual('mongoose');

  const mongooseConnectSpy = jest.fn().mockImplementation(() =>
    options.mongooseConnectReject
      ? Promise.reject(new Error('Mongo connection failure'))
      : Promise.resolve(undefined as any)
  );
  freshMongoose.connect = mongooseConnectSpy;

  const mongooseConnectionState = { readyState: options.mongooseReadyState ?? 0 };
  Object.defineProperty(freshMongoose.connection, 'readyState', {
    configurable: true,
    get: () => mongooseConnectionState.readyState
  });
  // When readyState is faked as already-connected (1), mongoose's
  // NativeCollection eagerly opens each model's collection via
  // `this.conn.db.collection(name)` as soon as it's compiled (e.g. when
  // `src/models/User.ts` runs `mongoose.model(...)` during route imports).
  // Since this sandboxed connection never actually connects, `.db` would be
  // undefined and crash that eager open — provide a harmless stub.
  freshMongoose.connection.db = { collection: (name: string) => ({ collectionName: name }) };

  jest.doMock('mongoose', () => freshMongoose);

  let importedModule: any;
  await jest.isolateModulesAsync(async () => {
    importedModule = await import('../../src/index');
  });
  await new Promise<void>((resolve) => setImmediate(resolve));

  return {
    appModule: importedModule.default,
    expressApp: importedModule.default.app,
    config: effectiveConfig,
    initializeRedisMock,
    getRedisClientMock,
    loggerInfo,
    loggerError: loggerError,
    loggerWarn,
    morganMock,
    mongooseConnectSpy,
    mongooseConnectionState
  };
};

describe('App initialization coverage', () => {
  it('usa morgan en modo dev cuando la configuración es development', async () => {
    const { morganMock } = await loadApp({ serverEnv: 'development' });
    expect(morganMock).toHaveBeenCalledWith('dev');
  });

  it('marca redis como desconectado cuando no hay cliente y NODE_ENV=production', async () => {
    const { expressApp } = await loadApp({ redisClient: undefined });
    process.env.NODE_ENV = 'production';

    const response = await request(expressApp).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.dependencies.redis.status).toBe('disconnected');
  });

  it('omite reconexión de Mongo cuando la conexión ya está activa', async () => {
    const { mongooseConnectSpy } = await loadApp({ mongooseReadyState: 1 });
    expect(mongooseConnectSpy).not.toHaveBeenCalled();
  });

  it('registra el error de conexión a Mongo y detiene el proceso fuera de test', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as any);

    const { loggerError, appModule, mongooseConnectSpy, mongooseConnectionState } = await loadApp({
      serverEnv: 'test',
      mongooseReadyState: 0
    });
    const mongoError = new Error('Mongo mocked failure');

    try {
      mongooseConnectionState.readyState = 0;
      mongooseConnectSpy.mockRejectedValueOnce(mongoError);
      process.env.NODE_ENV = 'development';

      await expect((appModule as any).initializeDatabase()).resolves.toBeUndefined();
      await new Promise<void>((resolve) => setTimeout(resolve, 20));

      expect(mongooseConnectSpy).toHaveBeenCalled();
      expect(loggerError).toHaveBeenCalledWith('❌ Error conectando a MongoDB:', mongoError);
      expect(exitSpy).toHaveBeenCalledWith(1);
    } finally {
      exitSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('registra un mensaje de error si initializeRedis falla', async () => {
    process.env.NODE_ENV = 'test';
    const { loggerError } = await loadApp({ redisInitReject: true, serverEnv: 'test' });

    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(loggerError).toHaveBeenCalledWith(
      '❌ Error inicializando Redis:',
      expect.any(Error)
    );
  });

  it('listen() utiliza la configuración declarada para iniciar el servidor', async () => {
    const loaded = await loadApp();
    const { appModule, loggerInfo, config } = loaded;

    // `appModule.listen()` (App.listen()) is a zero-arg wrapper that reads
    // config internally and delegates to the private `httpServer.listen`.
    // Spy on that inner call (rather than the zero-arg wrapper itself) so the
    // real port/host resolution and logging still execute.
    const listenSpy = jest
      .spyOn((appModule as any).httpServer, 'listen')
      .mockImplementation((_port: number, _host: string, callback?: () => void) => {
        callback?.();
        return { close: jest.fn() } as any;
      });

    appModule.listen();

    expect(listenSpy).toHaveBeenCalledWith(
      config.server.port,
      config.server.host,
      expect.any(Function)
    );
    expect(loggerInfo).toHaveBeenCalledWith(
      expect.stringContaining(`http://${config.server.host}:${config.server.port}`)
    );

    listenSpy.mockRestore();
  });
});

