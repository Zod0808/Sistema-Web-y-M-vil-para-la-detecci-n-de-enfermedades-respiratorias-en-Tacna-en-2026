/**
 * Feature Flag Service
 * 
 * Sistema de feature flags para habilitar/deshabilitar funcionalidades dinámicamente
 * Soporta múltiples proveedores: LaunchDarkly, in-memory, Redis
 * Incluye soporte para targeting, variaciones y experimentos A/B
 */

import { logger } from '../utils/logger';
import { getRedisClient } from '../config/redisClient';
import { AppError } from '../utils/AppError';
import axios, { AxiosInstance } from 'axios';

// Tipos y interfaces
export type FeatureFlagProvider = 'launchdarkly' | 'memory' | 'redis';

export type FeatureFlagValue = boolean | string | number | object;

export interface FeatureFlagConfig {
  provider?: FeatureFlagProvider;
  launchDarklySdkKey?: string;
  launchDarklyBaseUrl?: string;
  enableCaching?: boolean;
  cacheTTL?: number;
  defaultFlags?: Record<string, FeatureFlagValue>;
}

export interface UserContext {
  key: string;
  email?: string;
  name?: string;
  role?: string;
  custom?: Record<string, string | number | boolean>;
}

export interface FeatureFlag {
  key: string;
  value: FeatureFlagValue;
  enabled: boolean;
  variation?: string;
  reason?: string;
  version?: number;
}

export interface TargetingRule {
  attribute: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan';
  value: string | number | boolean;
}

export interface FeatureFlagDefinition {
  key: string;
  enabled: boolean;
  defaultValue: FeatureFlagValue;
  targetingRules?: TargetingRule[];
  variations?: FeatureFlagValue[];
  rolloutPercentage?: number;
  description?: string;
}

/**
 * Servicio de Feature Flags
 */
export class FeatureFlagService {
  private provider: FeatureFlagProvider;
  private launchDarklyClient: AxiosInstance | null = null;
  private memoryFlags: Map<string, FeatureFlagDefinition> = new Map();
  private config: FeatureFlagConfig & { provider: FeatureFlagProvider };
  private cache: Map<string, { value: FeatureFlag; expires: number }> = new Map();

  constructor(config: FeatureFlagConfig = {}) {
    this.config = {
      provider: config.provider || (process.env.FEATURE_FLAG_PROVIDER as FeatureFlagProvider) || 'memory',
      launchDarklySdkKey: config.launchDarklySdkKey || process.env.LAUNCHDARKLY_SDK_KEY,
      launchDarklyBaseUrl: config.launchDarklyBaseUrl || 'https://app.launchdarkly.com',
      enableCaching: config.enableCaching ?? true,
      cacheTTL: config.cacheTTL || 60000, // 1 minuto por defecto
      defaultFlags: config.defaultFlags || {},
    };

    this.provider = this.config.provider;

    // Inicializar proveedor
    this.initializeProvider();

    // Cargar flags por defecto
    if (this.config.defaultFlags) {
      Object.entries(this.config.defaultFlags).forEach(([key, value]) => {
        this.setFlag(key, {
          key,
          enabled: Boolean(value),
          defaultValue: value,
        });
      });
    }

    logger.info('FeatureFlagService initialized', {
      provider: this.provider,
      flagsCount: this.memoryFlags.size,
    });
  }

  private initializeProvider(): void {
    switch (this.provider) {
      case 'launchdarkly':
        if (!this.config.launchDarklySdkKey) {
          logger.warn('LaunchDarkly SDK key not provided, falling back to memory provider');
          this.provider = 'memory';
          return;
        }
        this.launchDarklyClient = axios.create({
          baseURL: `${this.config.launchDarklyBaseUrl}/api/v2`,
          headers: {
            'Authorization': this.config.launchDarklySdkKey,
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        });
        logger.info('LaunchDarkly provider initialized');
        break;

      case 'redis':
        if (!getRedisClient()) {
          logger.warn('Redis client not available, falling back to memory provider');
          this.provider = 'memory';
        } else {
          logger.info('Redis provider initialized');
        }
        break;

      case 'memory':
      default:
        logger.info('Memory provider initialized');
        break;
    }
  }

  /**
   * Obtener valor de un feature flag
   */
  async getFlag(
    key: string,
    userContext?: UserContext,
    defaultValue: FeatureFlagValue = false
  ): Promise<FeatureFlag> {
    const cacheKey = userContext ? `${key}:${userContext.key}` : key;

    // Verificar cache
    if (this.config.enableCaching) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        return cached.value;
      }
    }

    let flag: FeatureFlag;

    try {
      switch (this.provider) {
        case 'launchdarkly':
          flag = await this.getFlagFromLaunchDarkly(key, userContext, defaultValue);
          break;

        case 'redis':
          flag = await this.getFlagFromRedis(key, userContext, defaultValue);
          break;

        case 'memory':
        default:
          flag = await this.getFlagFromMemory(key, userContext, defaultValue);
          break;
      }

      // Guardar en cache
      if (this.config.enableCaching) {
        this.cache.set(cacheKey, {
          value: flag,
          expires: Date.now() + this.config.cacheTTL!,
        });
      }

      return flag;
    } catch (error) {
      logger.error('Error getting feature flag', { key, error, provider: this.provider });
      // Retornar valor por defecto en caso de error
      return {
        key,
        value: defaultValue,
        enabled: Boolean(defaultValue),
        reason: 'error_fallback',
      };
    }
  }

  /**
   * Obtener flag desde LaunchDarkly
   */
  private async getFlagFromLaunchDarkly(
    key: string,
    userContext?: UserContext,
    defaultValue: FeatureFlagValue = false
  ): Promise<FeatureFlag> {
    if (!this.launchDarklyClient) {
      throw new AppError('LaunchDarkly client not initialized', 500);
    }

    try {
      // LaunchDarkly usa evaluación server-side
      // En producción, usaría el SDK de LaunchDarkly Node.js
      // Por ahora, simulamos una llamada HTTP
      const response = await this.launchDarklyClient.post(
        `/flags/${key}/evaluate`,
        {
          user: userContext ? {
            key: userContext.key,
            email: userContext.email,
            name: userContext.name,
            custom: userContext.custom,
          } : { key: 'anonymous' },
          defaultValue,
        },
        { timeout: 3000 }
      );

      return {
        key,
        value: response.data.value ?? defaultValue,
        enabled: Boolean(response.data.value),
        variation: response.data.variation,
        reason: response.data.reason,
        version: response.data.version,
      };
    } catch (error: any) {
      // Si LaunchDarkly falla, usar valor por defecto
      logger.warn('LaunchDarkly request failed, using default', { key, error: error.message });
      return {
        key,
        value: defaultValue,
        enabled: Boolean(defaultValue),
        reason: 'error_fallback',
      };
    }
  }

  /**
   * Obtener flag desde Redis
   */
  private async getFlagFromRedis(
    key: string,
    userContext?: UserContext,
    defaultValue: FeatureFlagValue = false
  ): Promise<FeatureFlag> {
    const client = getRedisClient();
    if (!client) {
      throw new AppError('Redis client not available', 500);
    }

    try {
      const redisKey = userContext ? `feature_flag:${key}:${userContext.key}` : `feature_flag:${key}`;
      const cached = await client.get(redisKey);

      if (cached) {
        const flag = JSON.parse(cached) as FeatureFlag;
        return flag;
      }

      // Si no está en Redis, buscar en memoria como fallback
      return await this.getFlagFromMemory(key, userContext, defaultValue);
    } catch (error) {
      logger.error('Error getting flag from Redis', { key, error });
      return await this.getFlagFromMemory(key, userContext, defaultValue);
    }
  }

  /**
   * Obtener flag desde memoria
   */
  private async getFlagFromMemory(
    key: string,
    userContext?: UserContext,
    defaultValue: FeatureFlagValue = false
  ): Promise<FeatureFlag> {
    const definition = this.memoryFlags.get(key);

    if (!definition) {
      return {
        key,
        value: defaultValue,
        enabled: Boolean(defaultValue),
        reason: 'not_found',
      };
    }

    if (!definition.enabled) {
      return {
        key,
        value: definition.defaultValue,
        enabled: false,
        reason: 'disabled',
      };
    }

    // Aplicar targeting rules si existen
    if (definition.targetingRules && userContext) {
      const matches = definition.targetingRules.every((rule) => {
        const userValue = this.getUserAttribute(userContext, rule.attribute);
        return this.evaluateRule(userValue, rule.operator, rule.value);
      });

      if (!matches) {
        return {
          key,
          value: definition.defaultValue,
          enabled: false,
          reason: 'targeting_mismatch',
        };
      }
    }

    // Aplicar rollout percentage si existe
    if (definition.rolloutPercentage !== undefined && definition.rolloutPercentage < 100) {
      const hash = this.hashUserKey(userContext?.key || 'anonymous', key);
      const percentage = (hash % 100) + 1;
      if (percentage > definition.rolloutPercentage) {
        return {
          key,
          value: definition.defaultValue,
          enabled: false,
          reason: 'rollout_excluded',
        };
      }
    }

    // Seleccionar variación si existe
    let value = definition.defaultValue;
    if (definition.variations && definition.variations.length > 0) {
      const hash = this.hashUserKey(userContext?.key || 'anonymous', key);
      const index = hash % definition.variations.length;
      value = definition.variations[index];
    }

    return {
      key,
      value,
      enabled: true,
      variation: definition.variations ? String(this.hashUserKey(userContext?.key || 'anonymous', key) % definition.variations.length) : undefined,
      reason: 'enabled',
    };
  }

  /**
   * Establecer o actualizar un feature flag
   */
  async setFlag(key: string, definition: FeatureFlagDefinition): Promise<void> {
    this.memoryFlags.set(key, definition);

    // Sincronizar con Redis si está disponible
    if (this.provider === 'redis') {
      const client = getRedisClient();
      if (client) {
        try {
          await client.set(
            `feature_flag:${key}`,
            JSON.stringify(definition),
            { EX: Math.floor(this.config.cacheTTL! / 1000) }
          );
        } catch (error) {
          logger.error('Error setting flag in Redis', { key, error });
        }
      }
    }

    // Limpiar cache
    this.clearCache(key);

    logger.info('Feature flag updated', { key, enabled: definition.enabled });
  }

  /**
   * Habilitar un feature flag
   */
  async enableFlag(key: string): Promise<void> {
    const definition = this.memoryFlags.get(key);
    if (definition) {
      definition.enabled = true;
      await this.setFlag(key, definition);
    } else {
      await this.setFlag(key, {
        key,
        enabled: true,
        defaultValue: true,
      });
    }
  }

  /**
   * Deshabilitar un feature flag
   */
  async disableFlag(key: string): Promise<void> {
    const definition = this.memoryFlags.get(key);
    if (definition) {
      definition.enabled = false;
      await this.setFlag(key, definition);
    } else {
      await this.setFlag(key, {
        key,
        enabled: false,
        defaultValue: false,
      });
    }
  }

  /**
   * Obtener todos los flags
   */
  async getAllFlags(userContext?: UserContext): Promise<Record<string, FeatureFlag>> {
    const flags: Record<string, FeatureFlag> = {};

    for (const key of this.memoryFlags.keys()) {
      flags[key] = await this.getFlag(key, userContext);
    }

    return flags;
  }

  /**
   * Verificar si un flag está habilitado (método de conveniencia)
   */
  async isEnabled(key: string, userContext?: UserContext, defaultValue = false): Promise<boolean> {
    const flag = await this.getFlag(key, userContext, defaultValue);
    return flag.enabled && Boolean(flag.value);
  }

  /**
   * Obtener valor de un flag (método de conveniencia)
   */
  async getValue<T extends FeatureFlagValue>(
    key: string,
    userContext?: UserContext,
    defaultValue: T = false as T
  ): Promise<T> {
    const flag = await this.getFlag(key, userContext, defaultValue);
    return flag.value as T;
  }

  /**
   * Limpiar cache de un flag
   */
  private clearCache(key: string): void {
    const keysToDelete: string[] = [];
    for (const cacheKey of this.cache.keys()) {
      if (cacheKey.startsWith(key)) {
        keysToDelete.push(cacheKey);
      }
    }
    keysToDelete.forEach((k) => this.cache.delete(k));
  }

  /**
   * Obtener atributo del usuario
   */
  private getUserAttribute(userContext: UserContext, attribute: string): string | number | boolean | undefined {
    switch (attribute) {
      case 'key':
        return userContext.key;
      case 'email':
        return userContext.email;
      case 'name':
        return userContext.name;
      case 'role':
        return userContext.role;
      default:
        return userContext.custom?.[attribute];
    }
  }

  /**
   * Evaluar regla de targeting
   */
  private evaluateRule(
    userValue: string | number | boolean | undefined,
    operator: TargetingRule['operator'],
    ruleValue: string | number | boolean
  ): boolean {
    if (userValue === undefined) {
      return false;
    }

    switch (operator) {
      case 'equals':
        return userValue === ruleValue;
      case 'contains':
        return String(userValue).includes(String(ruleValue));
      case 'startsWith':
        return String(userValue).startsWith(String(ruleValue));
      case 'endsWith':
        return String(userValue).endsWith(String(ruleValue));
      case 'greaterThan':
        return Number(userValue) > Number(ruleValue);
      case 'lessThan':
        return Number(userValue) < Number(ruleValue);
      default:
        return false;
    }
  }

  /**
   * Hash de clave de usuario para rollout consistente
   */
  private hashUserKey(userKey: string, flagKey: string): number {
    const combined = `${userKey}:${flagKey}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

// Instancia singleton
let featureFlagServiceInstance: FeatureFlagService | null = null;

/**
 * Obtener instancia del servicio de feature flags
 */
export const getFeatureFlagService = (config?: FeatureFlagConfig): FeatureFlagService => {
  if (!featureFlagServiceInstance) {
    featureFlagServiceInstance = new FeatureFlagService(config);
  }
  return featureFlagServiceInstance;
};

/**
 * Helper functions para uso en código
 */
export const isFeatureEnabled = async (
  key: string,
  userContext?: UserContext,
  defaultValue = false
): Promise<boolean> => {
  const service = getFeatureFlagService();
  return service.isEnabled(key, userContext, defaultValue);
};

export const getFeatureValue = async <T extends FeatureFlagValue>(
  key: string,
  userContext?: UserContext,
  defaultValue: T = false as T
): Promise<T> => {
  const service = getFeatureFlagService();
  return service.getValue(key, userContext, defaultValue);
};

export default getFeatureFlagService;

