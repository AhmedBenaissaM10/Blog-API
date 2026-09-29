import { env } from '@config/env';
import app from './app';
import logger from '@utils/logger';
import { prisma } from '@lib/prisma';
import { connectRedis, disconnectRedis } from '@lib/redis';

const PORT = env.PORT;

type HttpServerWithClose = ReturnType<typeof app.listen> & {
  close(callback?: (err?: Error) => void): void;
};

process.on('uncaughtException', (err: Error) => {
  logger.error('💥 UNCAUGHT EXCEPTION! Shutting down...');
  logger.error(err.name, err.message);
  process.exit(1);
});

const start = async () => {
  await prisma.$connect();
  logger.info('Prisma connected to database');
  await connectRedis();
  logger.info('Redis connected');
  const server = app.listen(PORT, () => {
    logger.info(`🚀 Server running on http://localhost:${PORT}`);
  }) as HttpServerWithClose;
  const shutdown = async (signal: string) => {
    logger.warn(`${signal} received. Shutting down...`);
    server.close(async () => {
      await prisma.$disconnect();
      await disconnectRedis();
      logger.warn('Process terminated.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (err: Error) => {
    logger.error('💥 UNHANDLED REJECTION!', { name: err.name, message: err.message });
    shutdown('unhandledRejection');
  });
};

start().catch((err) => {
  logger.error('Error starting the server:', { error: err });
  process.exit(1);
});
