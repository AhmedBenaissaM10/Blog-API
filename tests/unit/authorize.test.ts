import { authorize } from '@middlewares/auth';
import type { Request, Response, NextFunction } from 'express';

describe('Authorize middleware', () => {
  it('calls next with a 401 error when req.user is missing', () => {
    // Arrange — fake req with NO user, and a mock next()
    const req = {} as Request;
    const next = vi.fn() as NextFunction;

    // Act — call the middleware directly, no HTTP involved
    authorize('ADMIN')(req, {} as Response, next);

    // Assert
    expect(next).toHaveBeenCalledTimes(1);

    const errorArg = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(errorArg.statusCode).toBe(401);
  });
  it('rejects with 403 when user role is not in the allowed list', () => {
    const req = { user: { role: 'USER' } } as Request;
    const next = vi.fn() as NextFunction;

    authorize('ADMIN')(req, {} as Response, next);

    // Assert
    expect(next).toHaveBeenCalledTimes(1);

    const errorArg = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(errorArg.statusCode).toBe(403);
  });
  it('allows the request through when user role matches an allowed role', () => {
    const req = { user: { role: 'ADMIN' } } as Request;
    const next = vi.fn() as NextFunction;

    authorize('ADMIN')(req, {} as Response, next);

    // Assert
    expect(next).toHaveBeenCalledTimes(1);

    const errorArg = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(errorArg).toBeUndefined();
  });
  it('allows the request through when authorize is given multiple roles and user matches one of them', () => {
    const req = { user: { role: 'USER' } } as Request;
    const next = vi.fn() as NextFunction;

    authorize('ADMIN', 'USER')(req, {} as Response, next);

    // Assert
    expect(next).toHaveBeenCalledTimes(1);

    const errorArg = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(errorArg).toBeUndefined();
  });
});
