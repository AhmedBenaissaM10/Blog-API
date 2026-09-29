// tests/mocks/rateLimiter.ts
import type { RequestHandler } from 'express';

const passthrough: RequestHandler = (_req, _res, next) => next();

export const globalRateLimiter = passthrough;
export const authRateLimiter = passthrough;
