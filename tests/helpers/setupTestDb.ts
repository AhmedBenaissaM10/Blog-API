import { clearDatabase, prisma } from './db';
import redisClient, { connectRedis, disconnectRedis } from '@lib/redis';

beforeAll(async () => {
  await connectRedis();
});

beforeEach(async () => {
  await clearDatabase();
  await redisClient.flushDb();
});

afterAll(async () => {
  await prisma.$disconnect();
  await disconnectRedis();
});
