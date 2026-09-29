import type { Request, RequestHandler } from 'express';
import { ZodTypeAny } from 'zod';

export const validate =
  (schema: ZodTypeAny): RequestHandler =>
  (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      res.status(400).json({
        success: false,
        status: 'fail',
        message: `${errors[0].path.split('.')[1]} : ${errors[0].message}`,
        errors,
      });
      return;
    }

    const { body, query, params } = result.data as {
      body?: Request['body'];
      query?: Request['query'];
      params?: Request['params'];
    };

    if (body !== undefined) req.body = body;
    if (query !== undefined) {
      Object.defineProperty(req, 'query', {
        value: query,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
    if (params !== undefined) req.params = params;

    next();
  };
