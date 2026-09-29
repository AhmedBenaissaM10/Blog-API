import type { RequestHandler } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import redisClient from '@lib/redis';
import logger from '@utils/logger';

const globalLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'global_rate_limiter',
  points: 100,
  duration: 60,
  blockDuration: 60,
  useRedisPackage: true,
});

const authLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'auth_rate_limiter',
  points: 5,
  duration: 60 * 5,
  blockDuration: 60 * 3,
  useRedisPackage: true,
});

const makeMiddleware = (limiter: RateLimiterRedis): RequestHandler => {
  return async (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';

    try {
      const rateLimiterRes = await limiter.consume(ip);
      res.setHeader('X-RateLimit-Limit', limiter.points);
      res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints);
      res.setHeader(
        'X-RateLimit-Reset',
        new Date(Date.now() + rateLimiterRes.msBeforeNext).toUTCString()
      );
      next();
    } catch (err: unknown) {
      if (err instanceof Error) {
        logger.error('Rate limiter error', { error: err.message, path: req.path });
        return next(err);
      }

      const rateLimiterRes = err as { msBeforeNext: number };

      res.setHeader('X-RateLimit-Limit', limiter.points);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader(
        'X-RateLimit-Reset',
        new Date(Date.now() + rateLimiterRes.msBeforeNext).toUTCString()
      );
      res.setHeader('Retry-After', Math.ceil(rateLimiterRes.msBeforeNext / 1000));

      logger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
        ip: req.ip,
        path: req.path,
        method: req.method,
      });

      res.status(429).json({ error: 'Too Many Requests' });
    }
  };
};

export const globalRateLimiter = makeMiddleware(globalLimiter);
export const authRateLimiter = makeMiddleware(authLimiter);
