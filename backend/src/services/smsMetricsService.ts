/**
 * SMS Metrics Service
 * Gestiona métricas de envío de SMS (tasa de éxito, costos, etc.)
 */

import { logger } from '../utils/logger';
import { getRedisClient } from '../config/redisClient';

export interface SMSMetrics {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalPending: number;
  successRate: number; // Porcentaje
  averageCost: number; // Costo promedio por SMS
  totalCost: number; // Costo total
  byProvider: {
    [provider: string]: {
      sent: number;
      delivered: number;
      failed: number;
      cost: number;
    };
  };
  byStatus: {
    [status: string]: number;
  };
  last24Hours: {
    sent: number;
    delivered: number;
    failed: number;
  };
}

export interface SMSCost {
  provider: string;
  messageId: string;
  cost: number;
  currency: string;
  timestamp: Date;
}

// Costos estimados por proveedor (en USD)
const PROVIDER_COSTS: { [key: string]: number } = {
  twilio: 0.0075, // ~$0.0075 por SMS en promedio
  aws_sns: 0.00645, // ~$0.00645 por SMS
  messagebird: 0.005, // ~$0.005 por SMS
  mock: 0, // Sin costo en modo mock
};

class SMSMetricsService {
  private readonly METRICS_KEY = 'sms:metrics';
  private readonly COSTS_KEY = 'sms:costs';
  private readonly DAILY_STATS_KEY = 'sms:daily';

  /**
   * Registrar envío de SMS
   */
  async recordSMS(
    provider: string,
    messageId: string,
    status: 'sent' | 'delivered' | 'failed' | 'pending',
    cost?: number
  ): Promise<void> {
    const client = getRedisClient();
    if (!client) {
      logger.warn('Redis no disponible, métricas no se guardarán');
      return;
    }

    try {
      const timestamp = Date.now();
      const costValue = cost ?? PROVIDER_COSTS[provider] ?? 0;

      // Actualizar contadores generales
      await client.hIncrBy(`${this.METRICS_KEY}:total`, 'sent', 1);
      await client.hIncrBy(`${this.METRICS_KEY}:total`, status, 1);

      // Actualizar contadores por proveedor
      await client.hIncrBy(`${this.METRICS_KEY}:provider:${provider}`, 'sent', 1);
      await client.hIncrBy(`${this.METRICS_KEY}:provider:${provider}`, status, 1);

      // Registrar costo
      if (costValue > 0) {
        await client.hIncrByFloat(`${this.METRICS_KEY}:costs`, 'total', costValue);
        await client.hIncrByFloat(`${this.METRICS_KEY}:costs`, `provider:${provider}`, costValue);

        // Guardar registro de costo individual
        const costRecord: SMSCost = {
          provider,
          messageId,
          cost: costValue,
          currency: 'USD',
          timestamp: new Date(),
        };
        await client.lPush(`${this.COSTS_KEY}:${provider}`, JSON.stringify(costRecord));
        await client.lTrim(`${this.COSTS_KEY}:${provider}`, 0, 999); // Mantener últimos 1000
      }

      // Actualizar estadísticas diarias
      const today = new Date().toISOString().split('T')[0];
      await client.hIncrBy(`${this.DAILY_STATS_KEY}:${today}`, 'sent', 1);
      await client.hIncrBy(`${this.DAILY_STATS_KEY}:${today}`, status, 1);
      await client.expire(`${this.DAILY_STATS_KEY}:${today}`, 86400 * 30); // 30 días

      // Actualizar estado del mensaje
      await client.setEx(
        `${this.METRICS_KEY}:message:${messageId}`,
        86400 * 7, // 7 días
        JSON.stringify({ provider, status, cost: costValue, timestamp })
      );
    } catch (error: any) {
      logger.error(`Error al registrar métricas SMS: ${error.message}`, {
        provider,
        messageId,
        error: error.message,
      });
    }
  }

  /**
   * Actualizar estado de mensaje (desde webhook)
   */
  async updateMessageStatus(
    messageId: string,
    status: 'delivered' | 'failed' | 'undelivered',
    cost?: number
  ): Promise<void> {
    const client = getRedisClient();
    if (!client) {
      return;
    }

    try {
      const messageData = await client.get(`${this.METRICS_KEY}:message:${messageId}`);
      if (!messageData) {
        logger.warn(`Mensaje no encontrado en métricas: ${messageId}`);
        return;
      }

      const message = JSON.parse(messageData);
      const provider = message.provider;

      // Actualizar contadores
      await client.hIncrBy(`${this.METRICS_KEY}:total`, message.status, -1); // Remover estado anterior
      await client.hIncrBy(`${this.METRICS_KEY}:total`, status, 1);
      await client.hIncrBy(`${this.METRICS_KEY}:provider:${provider}`, message.status, -1);
      await client.hIncrBy(`${this.METRICS_KEY}:provider:${provider}`, status, 1);

      // Actualizar costo si se proporciona
      if (cost !== undefined && cost !== message.cost) {
        const costDiff = cost - message.cost;
        await client.hIncrByFloat(`${this.METRICS_KEY}:costs`, 'total', costDiff);
        await client.hIncrByFloat(`${this.METRICS_KEY}:costs`, `provider:${provider}`, costDiff);
      }

      // Actualizar registro del mensaje
      await client.setEx(
        `${this.METRICS_KEY}:message:${messageId}`,
        86400 * 7,
        JSON.stringify({ ...message, status, cost: cost ?? message.cost, updatedAt: new Date() })
      );
    } catch (error: any) {
      logger.error(`Error al actualizar estado de mensaje: ${error.message}`, {
        messageId,
        error: error.message,
      });
    }
  }

  /**
   * Obtener métricas generales
   */
  async getMetrics(provider?: string): Promise<SMSMetrics> {
    const client = getRedisClient();
    if (!client) {
      return this.getEmptyMetrics();
    }

    try {
      const totalData = await client.hGetAll(`${this.METRICS_KEY}:total`);
      const costsData = await client.hGetAll(`${this.METRICS_KEY}:costs`);

      const totalSent = parseInt(totalData.sent || '0');
      const totalDelivered = parseInt(totalData.delivered || '0');
      const totalFailed = parseInt(totalData.failed || '0');
      const totalPending = parseInt(totalData.pending || '0');
      const totalMessages = totalSent || 1; // Evitar división por cero

      const successRate = (totalDelivered / totalMessages) * 100;
      const totalCost = parseFloat(costsData.total || '0');
      const averageCost = totalSent > 0 ? totalCost / totalSent : 0;

      // Obtener estadísticas por proveedor
      const byProvider: { [key: string]: any } = {};
      if (provider) {
        const providerData = await client.hGetAll(`${this.METRICS_KEY}:provider:${provider}`);
        byProvider[provider] = {
          sent: parseInt(providerData.sent || '0'),
          delivered: parseInt(providerData.delivered || '0'),
          failed: parseInt(providerData.failed || '0'),
          cost: parseFloat(costsData[`provider:${provider}`] || '0'),
        };
      } else {
        // Obtener todos los proveedores
        const keys = await client.keys(`${this.METRICS_KEY}:provider:*`);
        for (const key of keys) {
          const providerName = key.split(':').pop() || 'unknown';
          const providerData = await client.hGetAll(key);
          byProvider[providerName] = {
            sent: parseInt(providerData.sent || '0'),
            delivered: parseInt(providerData.delivered || '0'),
            failed: parseInt(providerData.failed || '0'),
            cost: parseFloat(costsData[`provider:${providerName}`] || '0'),
          };
        }
      }

      // Obtener estadísticas de últimas 24 horas
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const todayData = await client.hGetAll(`${this.DAILY_STATS_KEY}:${today}`);
      const yesterdayData = await client.hGetAll(`${this.DAILY_STATS_KEY}:${yesterday}`);

      const last24Hours = {
        sent: parseInt(todayData.sent || '0') + parseInt(yesterdayData.sent || '0'),
        delivered: parseInt(todayData.delivered || '0') + parseInt(yesterdayData.delivered || '0'),
        failed: parseInt(todayData.failed || '0') + parseInt(yesterdayData.failed || '0'),
      };

      return {
        totalSent,
        totalDelivered,
        totalFailed,
        totalPending,
        successRate: Math.round(successRate * 100) / 100,
        averageCost: Math.round(averageCost * 10000) / 10000, // 4 decimales
        totalCost: Math.round(totalCost * 100) / 100, // 2 decimales
        byProvider,
        byStatus: {
          sent: totalSent,
          delivered: totalDelivered,
          failed: totalFailed,
          pending: totalPending,
        },
        last24Hours,
      };
    } catch (error: any) {
      logger.error(`Error al obtener métricas SMS: ${error.message}`, {
        error: error.message,
      });
      return this.getEmptyMetrics();
    }
  }

  /**
   * Obtener costos por período
   */
  async getCosts(
    startDate?: Date,
    endDate?: Date,
    provider?: string
  ): Promise<{ total: number; byProvider: { [key: string]: number }; records: SMSCost[] }> {
    const client = getRedisClient();
    if (!client) {
      return { total: 0, byProvider: {}, records: [] };
    }

    try {
      const providers = provider ? [provider] : ['twilio', 'aws_sns', 'messagebird'];
      const records: SMSCost[] = [];
      const byProvider: { [key: string]: number } = {};

      for (const prov of providers) {
        const costRecords = await client.lRange(`${this.COSTS_KEY}:${prov}`, 0, -1);
        let providerTotal = 0;

        for (const recordStr of costRecords) {
          const record: SMSCost = JSON.parse(recordStr);
          const recordDate = new Date(record.timestamp);

          // Filtrar por fecha si se proporciona
          if (startDate && recordDate < startDate) continue;
          if (endDate && recordDate > endDate) continue;

          records.push(record);
          providerTotal += record.cost;
        }

        byProvider[prov] = Math.round(providerTotal * 100) / 100;
      }

      const total = Object.values(byProvider).reduce((sum, cost) => sum + cost, 0);

      return {
        total: Math.round(total * 100) / 100,
        byProvider,
        records: records.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
      };
    } catch (error: any) {
      logger.error(`Error al obtener costos SMS: ${error.message}`, {
        error: error.message,
      });
      return { total: 0, byProvider: {}, records: [] };
    }
  }

  /**
   * Obtener métricas vacías
   */
  private getEmptyMetrics(): SMSMetrics {
    return {
      totalSent: 0,
      totalDelivered: 0,
      totalFailed: 0,
      totalPending: 0,
      successRate: 0,
      averageCost: 0,
      totalCost: 0,
      byProvider: {},
      byStatus: {},
      last24Hours: {
        sent: 0,
        delivered: 0,
        failed: 0,
      },
    };
  }

  /**
   * Limpiar métricas antiguas (más de 30 días)
   */
  async cleanupOldMetrics(daysToKeep: number = 30): Promise<void> {
    const client = getRedisClient();
    if (!client) {
      return;
    }

    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 86400000);
      const keys = await client.keys(`${this.DAILY_STATS_KEY}:*`);

      for (const key of keys) {
        const dateStr = key.split(':').pop();
        if (!dateStr) continue;

        const date = new Date(dateStr);
        if (date < cutoffDate) {
          await client.del(key);
        }
      }

      logger.info(`Métricas SMS limpiadas: ${keys.length} claves procesadas`);
    } catch (error: any) {
      logger.error(`Error al limpiar métricas SMS: ${error.message}`, {
        error: error.message,
      });
    }
  }
}

export const smsMetricsService = new SMSMetricsService();

