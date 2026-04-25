import { createClient } from 'redis';
type RedisClientType = ReturnType<typeof createClient>;
import { config } from './config';
import { logger } from '../utils/logger';

let redisClient: RedisClientType | null = null;
let isConnecting = false;

export const initializeRedis = async (): Promise<RedisClientType | null> => {
  if (redisClient) {
    return redisClient;
  }

  if (process.env.NODE_ENV === 'test') {
    logger.info('🧪 Redis initialization skipped in test environment');
    return null;
  }

  if (isConnecting) {
    return redisClient;
  }

  try {
    isConnecting = true;
    const client = createClient({
      url: config.database.redis
    });

    client.on('error', (error) => {
      logger.error('❌ Error en Redis', { error });
    });

    client.on('reconnecting', () => {
      logger.warn('♻️ Intentando reconectar a Redis...');
    });

    await client.connect();
    redisClient = client;
    logger.info('✅ Conectado a Redis');
    return redisClient;
  } catch (error) {
    logger.error('❌ No se pudo conectar a Redis', { error });
    redisClient = null;
    return null;
  } finally {
    isConnecting = false;
  }
};

export const getRedisClient = (): RedisClientType | null => redisClient;

export const disconnectRedis = async (): Promise<void> => {
  if (!redisClient) {
    return;
  }

  try {
    await redisClient.disconnect();
    logger.info('🛑 Conexión de Redis cerrada correctamente');
  } catch (error) {
    logger.error('⚠️ Error al cerrar la conexión de Redis', { error });
  } finally {
    redisClient = null;
  }
};

