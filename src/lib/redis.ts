import { createClient } from 'redis';
import { env } from '@config/env';
import logger from '@utils/logger';

const redisClient = createClient({
  url: env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error('Redis: max reconnect attempts reached');
        return new Error('Redis reconnect failed');
      }
      return Math.min(retries * 200, 2000);
    },
  },
});

redisClient.on('error', (err) => {
  logger.error('Redis error:', { error: err });
});

export const connectRedis = async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
      logger.info('✅ Redis Connected');
    }
  } catch (error) {
    logger.error('Redis connection failed:', error);
    process.exit(1);
  }
};

export const disconnectRedis = async () => {
  try {
    if (redisClient.isOpen) {
      await redisClient.quit();
      logger.info('✅ Redis Disconnected');
    }
  } catch (error) {
    logger.error('Redis disconnection failed:', error);
  }
};

export default redisClient;
