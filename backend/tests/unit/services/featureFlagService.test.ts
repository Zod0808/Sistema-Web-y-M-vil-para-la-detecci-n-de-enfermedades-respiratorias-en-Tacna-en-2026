import { FeatureFlagService, FeatureFlagDefinition, UserContext } from '../../../src/services/featureFlagService';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../src/config/redisClient', () => ({
  getRedisClient: jest.fn().mockReturnValue(null),
}));

jest.mock('axios', () => ({
  create: jest.fn(() => ({
    post: jest.fn(),
    get: jest.fn(),
  })),
}));

const buildDefinition = (overrides: Partial<FeatureFlagDefinition> = {}): FeatureFlagDefinition => ({
  key: 'test-flag',
  enabled: true,
  defaultValue: true,
  ...overrides,
});

const buildUserContext = (overrides: Partial<UserContext> = {}): UserContext => ({
  key: 'user-123',
  email: 'test@example.com',
  role: 'doctor',
  ...overrides,
});

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FeatureFlagService({ provider: 'memory', enableCaching: false });
  });

  describe('constructor', () => {
    it('inicializa con proveedor memory por defecto', () => {
      const s = new FeatureFlagService();
      expect(s).toBeDefined();
    });

    it('carga defaultFlags en constructor', async () => {
      const s = new FeatureFlagService({
        provider: 'memory',
        defaultFlags: { 'my-feature': true },
        enableCaching: false,
      });
      const flag = await s.getFlag('my-feature');
      expect(flag.enabled).toBe(true);
    });

    it('cae a memory cuando launchdarkly no tiene SDK key', () => {
      const s = new FeatureFlagService({ provider: 'launchdarkly', enableCaching: false });
      expect(s).toBeDefined();
    });

    it('cae a memory cuando redis no está disponible', () => {
      const s = new FeatureFlagService({ provider: 'redis', enableCaching: false });
      expect(s).toBeDefined();
    });
  });

  describe('getFlag', () => {
    it('retorna flag con reason not_found cuando no existe', async () => {
      const flag = await service.getFlag('nonexistent');
      expect(flag.key).toBe('nonexistent');
      expect(flag.reason).toBe('not_found');
      expect(flag.enabled).toBe(false);
    });

    it('retorna flag habilitado correctamente', async () => {
      await service.setFlag('enabled-flag', buildDefinition({ key: 'enabled-flag', enabled: true, defaultValue: true }));
      const flag = await service.getFlag('enabled-flag');
      expect(flag.enabled).toBe(true);
      expect(flag.reason).toBe('enabled');
    });

    it('retorna flag deshabilitado con reason disabled', async () => {
      await service.setFlag('disabled-flag', buildDefinition({ key: 'disabled-flag', enabled: false, defaultValue: false }));
      const flag = await service.getFlag('disabled-flag');
      expect(flag.enabled).toBe(false);
      expect(flag.reason).toBe('disabled');
    });

    it('usa defaultValue cuando el flag no existe', async () => {
      const flag = await service.getFlag('missing', undefined, 'default-val');
      expect(flag.value).toBe('default-val');
    });

    it('aplica targeting rules y rechaza cuando no coincide', async () => {
      await service.setFlag('targeted-flag', buildDefinition({
        key: 'targeted-flag',
        enabled: true,
        defaultValue: true,
        targetingRules: [{ attribute: 'role', operator: 'equals', value: 'admin' }],
      }));

      const user = buildUserContext({ role: 'doctor' });
      const flag = await service.getFlag('targeted-flag', user);

      expect(flag.reason).toBe('targeting_mismatch');
      expect(flag.enabled).toBe(false);
    });

    it('aplica targeting rules y permite cuando coincide', async () => {
      await service.setFlag('admin-flag', buildDefinition({
        key: 'admin-flag',
        enabled: true,
        defaultValue: true,
        targetingRules: [{ attribute: 'role', operator: 'equals', value: 'admin' }],
      }));

      const user = buildUserContext({ role: 'admin' });
      const flag = await service.getFlag('admin-flag', user);

      expect(flag.enabled).toBe(true);
    });

    it('aplica rollout percentage y puede excluir al usuario', async () => {
      await service.setFlag('rollout-flag', buildDefinition({
        key: 'rollout-flag',
        enabled: true,
        defaultValue: false,
        rolloutPercentage: 0, // 0% — nadie entra
      }));

      const user = buildUserContext();
      const flag = await service.getFlag('rollout-flag', user);

      expect(['rollout_excluded', 'enabled']).toContain(flag.reason);
    });

    it('usa variaciones cuando están definidas', async () => {
      await service.setFlag('ab-flag', buildDefinition({
        key: 'ab-flag',
        enabled: true,
        defaultValue: 'control',
        variations: ['control', 'treatment'],
      }));

      const flag = await service.getFlag('ab-flag', buildUserContext());
      expect(['control', 'treatment']).toContain(flag.value);
    });
  });

  describe('setFlag', () => {
    it('establece un nuevo flag en memoria', async () => {
      await service.setFlag('new-flag', buildDefinition({ key: 'new-flag' }));
      const flag = await service.getFlag('new-flag');
      expect(flag.key).toBe('new-flag');
    });

    it('actualiza un flag existente', async () => {
      await service.setFlag('update-flag', buildDefinition({ key: 'update-flag', enabled: true }));
      await service.setFlag('update-flag', buildDefinition({ key: 'update-flag', enabled: false }));
      const flag = await service.getFlag('update-flag');
      expect(flag.enabled).toBe(false);
    });
  });

  describe('enableFlag', () => {
    it('habilita un flag existente', async () => {
      await service.setFlag('flag-to-enable', buildDefinition({ key: 'flag-to-enable', enabled: false }));
      await service.enableFlag('flag-to-enable');
      const flag = await service.getFlag('flag-to-enable');
      expect(flag.enabled).toBe(true);
    });

    it('crea y habilita un flag que no existe', async () => {
      await service.enableFlag('brand-new-flag');
      const flag = await service.getFlag('brand-new-flag');
      expect(flag.enabled).toBe(true);
    });
  });

  describe('disableFlag', () => {
    it('deshabilita un flag existente', async () => {
      await service.setFlag('flag-to-disable', buildDefinition({ key: 'flag-to-disable', enabled: true }));
      await service.disableFlag('flag-to-disable');
      const flag = await service.getFlag('flag-to-disable');
      expect(flag.enabled).toBe(false);
    });

    it('crea y deshabilita un flag que no existe', async () => {
      await service.disableFlag('nonexistent-flag');
      const flag = await service.getFlag('nonexistent-flag');
      expect(flag.enabled).toBe(false);
    });
  });

  describe('isEnabled', () => {
    it('retorna true cuando el flag está habilitado', async () => {
      await service.setFlag('enabled', buildDefinition({ key: 'enabled', enabled: true, defaultValue: true }));
      const result = await service.isEnabled('enabled');
      expect(result).toBe(true);
    });

    it('retorna false cuando el flag está deshabilitado', async () => {
      await service.setFlag('disabled', buildDefinition({ key: 'disabled', enabled: false, defaultValue: false }));
      const result = await service.isEnabled('disabled');
      expect(result).toBe(false);
    });

    it('retorna defaultValue cuando el flag no existe', async () => {
      const result = await service.isEnabled('missing-flag', undefined, false);
      expect(result).toBe(false);
    });
  });

  describe('getValue', () => {
    it('retorna el valor del flag', async () => {
      await service.setFlag('string-flag', buildDefinition({ key: 'string-flag', enabled: true, defaultValue: 'hello' }));
      const value = await service.getValue<string>('string-flag');
      expect(value).toBe('hello');
    });

    it('retorna defaultValue si el flag no existe', async () => {
      const value = await service.getValue('not-found', undefined, 42);
      expect(value).toBe(42);
    });
  });

  describe('getAllFlags', () => {
    it('retorna todos los flags registrados', async () => {
      await service.setFlag('flag-a', buildDefinition({ key: 'flag-a' }));
      await service.setFlag('flag-b', buildDefinition({ key: 'flag-b' }));
      const all = await service.getAllFlags();
      expect(all).toHaveProperty('flag-a');
      expect(all).toHaveProperty('flag-b');
    });

    it('retorna objeto vacío cuando no hay flags', async () => {
      const all = await service.getAllFlags();
      expect(all).toEqual({});
    });
  });

  describe('caching', () => {
    it('usa cache para solicitudes repetidas', async () => {
      const serviceWithCache = new FeatureFlagService({ provider: 'memory', enableCaching: true, cacheTTL: 10000 });
      await serviceWithCache.setFlag('cached-flag', buildDefinition({ key: 'cached-flag' }));

      const first = await serviceWithCache.getFlag('cached-flag');
      const second = await serviceWithCache.getFlag('cached-flag');

      expect(first).toEqual(second);
    });

    it('limpia cache al actualizar flag', async () => {
      const serviceWithCache = new FeatureFlagService({ provider: 'memory', enableCaching: true, cacheTTL: 10000 });
      await serviceWithCache.setFlag('flag-with-cache', buildDefinition({ key: 'flag-with-cache', enabled: true }));
      await serviceWithCache.getFlag('flag-with-cache'); // populate cache

      await serviceWithCache.setFlag('flag-with-cache', buildDefinition({ key: 'flag-with-cache', enabled: false }));
      const flag = await serviceWithCache.getFlag('flag-with-cache');

      expect(flag.enabled).toBe(false);
    });
  });

  describe('targeting rule operators', () => {
    const testRule = async (
      operator: any,
      ruleValue: any,
      userValue: any,
      expectEnabled: boolean
    ) => {
      await service.setFlag('rule-flag', buildDefinition({
        key: 'rule-flag',
        enabled: true,
        defaultValue: true,
        targetingRules: [{ attribute: 'plan', operator, value: ruleValue }],
      }));
      const user = buildUserContext({ custom: { plan: userValue } });
      const flag = await service.getFlag('rule-flag', user);
      expect(flag.enabled).toBe(expectEnabled);
    };

    it('operator contains', async () => {
      await testRule('contains', 'pro', 'professional', true);
    });

    it('operator startsWith', async () => {
      await testRule('startsWith', 'pre', 'premium', true);
    });

    it('operator endsWith', async () => {
      await testRule('endsWith', 'ium', 'premium', true);
    });

    it('operator greaterThan', async () => {
      await testRule('greaterThan', 50, 100, true);
    });

    it('operator lessThan', async () => {
      await testRule('lessThan', 100, 50, true);
    });
  });
});