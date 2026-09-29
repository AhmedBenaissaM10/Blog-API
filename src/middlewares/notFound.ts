import type { RequestHandler } from 'express';
import AppError from '@errors/AppError';

export const notFound: RequestHandler = (_req, _res, next) => {
  next(new AppError('Error 404 - Page Not Found', 404));
};
