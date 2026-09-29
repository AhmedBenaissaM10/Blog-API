import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { requestContext } from '@utils/requestContext';
declare module 'express' {
  interface Request {
    id: string;
  }
}

export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const id = req.headers['x-request-id']?.toString() || randomUUID();
  req.id = id;
  res.setHeader('X-Request-Id', id);

  requestContext.run({ requestId: id }, () => next());
};
