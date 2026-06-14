import AppError from './AppError';

export const notFound = (ressource: string = "Resource") => new AppError( ressource + " not found", 404);

export const unauthorized = (message: string = "Unauthorized") => new AppError( message, 401);

export const forbidden = (message: string = "Forbidden") => new AppError( message, 403);

export const badRequest = (message: string = "Bad Request") => new AppError( message, 400);

export const conflict = (message: string = "Conflict") => new AppError( message, 409);

export const internalServerError = (message: string = "Internal Server Error") => new AppError( message, 500);