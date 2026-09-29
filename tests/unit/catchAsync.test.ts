import catchAsync from '@utils/catchAsync'; // adjust path
import type { Request, Response, NextFunction } from 'express';

describe('catchAsync', () => {
  it('forwards a rejected promise error to next', async () => {
    const error = new Error('boom');
    const failingHandler = vi.fn().mockRejectedValue(error);
    const next = vi.fn() as NextFunction;

    await catchAsync(failingHandler)({} as Request, {} as Response, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('does NOT forward a synchronous throw to next', () => {
    const error = new Error('sync boom');
    const throwingHandler = vi.fn(() => {
      throw error;
    });
    const next = vi.fn() as NextFunction;

    expect(() => catchAsync(throwingHandler)({} as Request, {} as Response, next)).toThrow(
      'sync boom'
    );

    expect(next).not.toHaveBeenCalled();
  });
});
