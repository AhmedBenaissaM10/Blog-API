import type { Response } from 'express';

interface Meta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  [key: string]: unknown;
}
interface SuccessOptions<T> {
  data: T;
  statusCode?: number;
  message?: string;
  meta?: Meta;
}

export const sendSuccess = <T>(res: Response, options: SuccessOptions<T>) => {
  const { data, statusCode = 200, message, meta } = options;
  return res.status(statusCode).json({
    success: true,
    ...(message && { message }),
    data,
    ...(meta && { meta }),
  });
};
