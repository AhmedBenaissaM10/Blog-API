import type { RequestHandler } from 'express';
import { unauthorized, forbidden } from '@errors/ErrorIndex';
import { verifyAccessToken } from '@utils/jwtUtils';

export const requireAuth: RequestHandler = (req, _res, next) => {
  const accessToken: string | undefined =
    req.cookies.accessToken || req.headers.authorization?.split(' ')[1];

  if (!accessToken) return next(unauthorized('No token provided'));

  const decoded = verifyAccessToken(accessToken);
  req.user = decoded;
  next();
};

export const authorize = (...roles: string[]): RequestHandler => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(unauthorized('Not authenticated'));
    }
    if (!roles.includes(req.user.role)) {
      return next(forbidden("Access denied, you're not authorized to access this resource"));
    }
    next();
  };
};
