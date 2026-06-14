import type { Request, Response, NextFunction } from 'express';
import AppError from '../errors/AppError';
import logger from '../utils/logger';


function handleJWTError() {
  return new AppError('Invalid token. Please log in again.', 401);
}

function handleJWTExpiredError() {
  return new AppError('Your token has expired. Please log in again.', 401);
}
// --- Development vs Production response ---
function sendErrorDev(err: AppError, res: Response) {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack, 
  });
}

function sendErrorProd(err: AppError, res: Response) {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    // Programming or unknown error: don't leak details
    logger.error({ message: err.message, stack: err.stack, url: res.req?.originalUrl });
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong. Please try again later.',
    });
  }
}

const errorHandler = (err: AppError, _req: Request, res: Response, next: NextFunction) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
    if (process.env.NODE_ENV === 'development') {
        logger.error(err.message || 'Server Error');
        sendErrorDev(err, res);
    } else {
        let error = Object.assign(Object.create(Object.getPrototypeOf(err)), err);

        if (error.name === 'JsonWebTokenError') error = handleJWTError();
        if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

        sendErrorProd(error, res);
    }
};
export default errorHandler;