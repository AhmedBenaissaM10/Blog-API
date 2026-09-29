import type { NextFunction, Request, Response } from 'express';
import { env } from '@config/env';
import AppError from '@errors/AppError';
import logger from '@utils/logger';

// --- Normalize any error into an AppError ---
function normalizeError(err: Error): AppError {
  if (err instanceof AppError) return err;

  if (err.name === 'JsonWebTokenError') {
    return new AppError('Invalid token. Please log in again', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return new AppError('Your session has expired. Please log in again', 401);
  }

  // Unknown/programming error — not operational, don't trust the message for prod display
  const unknown = new AppError(err.message || 'Something went wrong', 500, false);
  unknown.stack = err.stack;
  return unknown;
}

// --- Development vs Production response ---
function sendErrorDev(err: AppError, req: Request, res: Response) {
  res.status(err.statusCode).json({
    success: false,
    status: err.status,
    message: err.message,
    requestId: req.id,
    error: err,
    stack: err.stack,
  });
}

function sendErrorProd(err: AppError, req: Request, res: Response) {
  // Operational, trusted error: safe to expose to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
      requestId: req.id,
    });
    return;
  }

  // Programming or unknown error: don't leak details to client
  res.status(500).json({
    success: false,
    status: 'error',
    message: 'Something went wrong. Please try again later.',
    requestId: req.id,
  });
}

const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  const error = normalizeError(err);
  error.statusCode = error.statusCode || 500;
  error.status = error.status || 'error';

  logger.error({
    message: error.message,
    stack: error.stack,
    requestId: req.id,
    url: req.originalUrl,
    method: req.method,
  });

  if (env.NODE_ENV === 'development') {
    sendErrorDev(error, req, res);
  } else {
    sendErrorProd(error, req, res);
  }
};

export default errorHandler;
