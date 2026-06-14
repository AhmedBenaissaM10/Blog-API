import jwt, { JwtPayload } from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import {unauthorized, forbidden} from '../errors/ErrorIndex';
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

export const protect = (req: Request, _res: Response, next: NextFunction): void => {
    const token: string | undefined = req.cookies.jwt;

    if (!token) {
        return next(unauthorized("No token provided"));
    }

    try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
        req.user = decoded;
        next();
    } catch (error) {
        return next(unauthorized("Invalid token"));
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