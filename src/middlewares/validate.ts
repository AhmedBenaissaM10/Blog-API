import { ZodTypeAny, z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import AppError from '../errors/AppError';

export const validate = (schema: ZodTypeAny, target : "Body" | "Query" ="Body" ) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(target === "Body" ? req.body : req.query);
    if (result.success) {
        target === "Body" ? req.body = result.data : req.query = result.data as any
        return next();
    }
    const errors = result.error.issues.map(issue => ({ path: issue.path[0], message: issue.message }));
    return next (new AppError(JSON.stringify(errors), 400))
    
};
const paramsSchema = z.object({
    id: z.uuid("Invalid ID format")
}) 
export const validateId = (req: Request, res: Response, next: NextFunction) => {
    const result = paramsSchema.safeParse(req.params);
    if (!result.success) {
        return next (new AppError('Invalid ID', 400))
    }
    req.params = result.data
    next();
   
};