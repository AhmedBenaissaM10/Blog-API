import jwt, { JwtPayload } from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import {unauthorized, forbidden} from '../errors/ErrorIndex';
import { createAccessToken } from '../utils/authUtils';

interface AuthUser {
    id: string,
    email: string,
    role: string
}
declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}

export const protect = (req: Request, res: Response, next: NextFunction): void => {
    const accessToken: string | undefined = req.cookies.accessToken;
    if(!accessToken) return next(unauthorized("No access token provided"))
    try {
        const decoded = jwt.verify(accessToken, env.ACCESS_TOKEN) as AuthUser;
        req.user = decoded;
        next();
    } catch (error) {
        return next(unauthorized("Invalid or expired token"));
    }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user?.role || !roles.includes(req.user.role)) {
      return next(forbidden("Access denied"));
    }
    next();
  };
};