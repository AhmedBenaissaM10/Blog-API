import jwt from 'jsonwebtoken';
import { env } from '@config/env';
import { handleJWTError, handleJWTExpiredError, unauthorized } from '@errors/ErrorIndex';
import crypto from 'crypto';
interface AuthUser extends jwt.JwtPayload {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
}
declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

export const createRefreshToken = (id: string, email: string, role: 'USER' | 'ADMIN'): string => {
  return jwt.sign({ id, email, role, jti: crypto.randomUUID() }, env.REFRESH_TOKEN_SECRET, {
    expiresIn: '7d',
  });
};
export const createAccessToken = (id: string, email: string, role: 'USER' | 'ADMIN'): string => {
  return jwt.sign({ id, email, role }, env.ACCESS_TOKEN_SECRET, {
    expiresIn: '15m',
  });
};

export const verifyAccessToken = (token: string): AuthUser => {
  try {
    return jwt.verify(token, env.ACCESS_TOKEN_SECRET) as AuthUser;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw handleJWTExpiredError();
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw handleJWTError();
    }
    throw unauthorized(error instanceof Error ? error.message : 'Unauthorized');
  }
};
export const verifyRefreshToken = (token: string): AuthUser => {
  try {
    return jwt.verify(token, env.REFRESH_TOKEN_SECRET) as AuthUser;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw handleJWTExpiredError();
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw handleJWTError();
    }
    throw unauthorized(error instanceof Error ? error.message : 'Unauthorized');
  }
};
