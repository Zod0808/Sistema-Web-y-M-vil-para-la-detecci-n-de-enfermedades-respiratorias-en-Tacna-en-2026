/**
 * SMS Rate Limiter
 * Gestiona límites de envío de SMS basado en límites de proveedores
 */

import { logger } from '../utils/logger';
import { getRedisClient } from '../config/redisClient';
import { AppError } from '../utils/AppError';

export interface RateLimitConfig {
  perMinute?: number;
  perHour?: number;
  perDay?: number;
  burst?: number; // Permite ráfagas cortas
}

// Límites por defecto según proveedor
const PROVIDER_LIMITS: { [key: string]: RateLimitConfig } = {
  twilio: {
    perMinute: 60, // 60 SMS por minuto
    perHour: 1000, // 1000 SMS por hora
    perDay: 10000, // 10000 SMS por día
    burst: 10, // Permite 10 SMS en ráfaga
  },
  aws_sns: {
    perMinute: 200, // 200 SMS por minuto
    perHour: 10000, // 10000 SMS por hora
    perDay: 100000, // 100000 SMS por día
    burst: 20,
  },
  messagebird: {
    perMinute: 100, // 100 SMS por minuto
    perHour: 5000, // 5000 SMS por hora
    perDay: 50000, // 50000 SMS por día
    burst: 15,
  },
  mock: {
    perMinute: 1000, // Sin límites reales en mock
    perHour: 100000,
    perDay: 1000000,
    burst: 100,
  },
};

class SMSRateLimiter {
  private readonly RATE_LIMIT_KEY = 'sms:ratelimit';

  /**
   * Verificar si se puede enviar un SMS
   */
  async checkRateLimit(provider: string, customLimits?: RateLimitConfig): Promise<{
    allowed: boolean;
    retryAfter?: number; // Segundos hasta que se pueda enviar
    limits: {
      minute: { current: number; limit: number };
      hour: { current: number; limit: number };
      day: { current: number; limit: number };
    };
  }> {
    const client = getRedisClient();
    if (!client) {
      // Si Redis no está disponible, permitir envío (fallback)
      logger.warn('Redis no disponible, rate limiting deshabilitado');
      return {
        allowed: true,
        limits: {
          minute: { current: 0, limit: 1000 },
          hour: { current: 0, limit: 10000 },
          day: { current: 0, limit: 100000 },
        },
      };
    }

    const limits = customLimits || PROVIDER_LIMITS[provider] || PROVIDER_LIMITS.mock;
    const now = Date.now();
    const minuteKey = `${this.RATE_LIMIT_KEY}:${provider}:minute:${Math.floor(now / 60000)}`;
    const hourKey = `${this.RATE_LIMIT_KEY}:${provider}:hour:${Math.floor(now / 3600000)}`;
    const dayKey = `${this.RATE_LIMIT_KEY}:${provider}:day:${Math.floor(now / 86400000)}`;

    try {
      // Obtener contadores actuales
      const [minuteCount, hourCount, dayCount] = await Promise.all([
        client.get(minuteKey).then((v) => parseInt(v || '0')),
        client.get(hourKey).then((v) => parseInt(v || '0')),
        client.get(dayKey).then((v) => parseInt(v || '0')),
      ]);

      const limitsData = {
        minute: { current: minuteCount, limit: limits.perMinute || 1000 },
        hour: { current: hourCount, limit: limits.perHour || 10000 },
        day: { current: dayCount, limit: limits.perDay || 100000 },
      };

      // Verificar límites
      const exceededMinute = limits.perMinute && minuteCount >= limits.perMinute;
      const exceededHour = limits.perHour && hourCount >= limits.perHour;
      const exceededDay = limits.perDay && dayCount >= limits.perDay;

      if (exceededMinute || exceededHour || exceededDay) {
        // Calcular tiempo de espera
        let retryAfter = 0;
        if (exceededMinute) {
          retryAfter = 60 - ((now / 1000) % 60); // Segundos restantes del minuto
        } else if (exceededHour) {
          retryAfter = 3600 - ((now / 1000) % 3600); // Segundos restantes de la hora
        } else if (exceededDay) {
          retryAfter = 86400 - ((now / 1000) % 86400); // Segundos restantes del día
        }

        return {
          allowed: false,
          retryAfter: Math.ceil(retryAfter),
          limits: limitsData,
        };
      }

      // Incrementar contadores
      await Promise.all([
        client.incr(minuteKey),
        client.expire(minuteKey, 120), // Expirar después de 2 minutos
        client.incr(hourKey),
        client.expire(hourKey, 7200), // Expirar después de 2 horas
        client.incr(dayKey),
        client.expire(dayKey, 172800), // Expirar después de 2 días
      ]);

      return {
        allowed: true,
        limits: limitsData,
      };
    } catch (error: any) {
      logger.error(`Error al verificar rate limit: ${error.message}`, {
        provider,
        error: error.message,
      });
      // En caso de error, permitir envío (fail-open)
      return {
        allowed: true,
        limits: {
          minute: { current: 0, limit: limits.perMinute || 1000 },
          hour: { current: 0, limit: limits.perHour || 10000 },
          day: { current: 0, limit: limits.perDay || 100000 },
        },
      };
    }
  }

  /**
   * Verificar límite de ráfaga (burst)
   */
  async checkBurstLimit(provider: string, burstLimit?: number): Promise<boolean> {
    const client = getRedisClient();
    if (!client) {
      return true; // Permitir si Redis no está disponible
    }

    const limits = PROVIDER_LIMITS[provider] || PROVIDER_LIMITS.mock;
    const burst = burstLimit || limits.burst || 10;
    const now = Date.now();
    const burstKey = `${this.RATE_LIMIT_KEY}:${provider}:burst:${Math.floor(now / 1000)}`;

    try {
      const count = await client.incr(burstKey);
      await client.expire(burstKey, 2); // Expirar después de 2 segundos

      return count <= burst;
    } catch (error: any) {
      logger.error(`Error al verificar burst limit: ${error.message}`, {
        provider,
        error: error.message,
      });
      return true; // Permitir en caso de error
    }
  }

  /**
   * Obtener estadísticas de rate limiting
   */
  async getRateLimitStats(provider: string): Promise<{
    current: {
      minute: number;
      hour: number;
      day: number;
    };
    limits: RateLimitConfig;
  }> {
    const client = getRedisClient();
    if (!client) {
      return {
        current: { minute: 0, hour: 0, day: 0 },
        limits: PROVIDER_LIMITS[provider] || PROVIDER_LIMITS.mock,
      };
    }

    const limits = PROVIDER_LIMITS[provider] || PROVIDER_LIMITS.mock;
    const now = Date.now();
    const minuteKey = `${this.RATE_LIMIT_KEY}:${provider}:minute:${Math.floor(now / 60000)}`;
    const hourKey = `${this.RATE_LIMIT_KEY}:${provider}:hour:${Math.floor(now / 3600000)}`;
    const dayKey = `${this.RATE_LIMIT_KEY}:${provider}:day:${Math.floor(now / 86400000)}`;

    try {
      const [minuteCount, hourCount, dayCount] = await Promise.all([
        client.get(minuteKey).then((v) => parseInt(v || '0')),
        client.get(hourKey).then((v) => parseInt(v || '0')),
        client.get(dayKey).then((v) => parseInt(v || '0')),
      ]);

      return {
        current: {
          minute: minuteCount,
          hour: hourCount,
          day: dayCount,
        },
        limits,
      };
    } catch (error: any) {
      logger.error(`Error al obtener estadísticas de rate limit: ${error.message}`, {
        provider,
        error: error.message,
      });
      return {
        current: { minute: 0, hour: 0, day: 0 },
        limits,
      };
    }
  }

  /**
   * Resetear contadores (útil para testing)
   */
  async resetCounters(provider: string): Promise<void> {
    const client = getRedisClient();
    if (!client) {
      return;
    }

    try {
      const keys = await client.keys(`${this.RATE_LIMIT_KEY}:${provider}:*`);
      if (keys.length > 0) {
        await client.del(keys);
      }
      logger.info(`Contadores de rate limit reseteados para ${provider}`);
    } catch (error: any) {
      logger.error(`Error al resetear contadores: ${error.message}`, {
        provider,
        error: error.message,
      });
    }
  }
}

export const smsRateLimiter = new SMSRateLimiter();

