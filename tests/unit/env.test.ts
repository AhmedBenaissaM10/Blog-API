import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const VALID_ENV = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  REFRESH_TOKEN_SECRET: 'refresh-secret',
  ACCESS_TOKEN_SECRET: 'access-secret',
  EMAIL_USER: 'test@example.com',
  EMAIL_PASSWORD: 'password',
  GOOGLE_CLIENT_ID: 'client-id',
  GOOGLE_CLIENT_SECRET: 'client-secret',
  GOOGLE_CALLBACK_URL: 'http://localhost:3000/auth/google/callback',
};

describe('env config validation', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.resetModules(); // forget the cached env.ts module
    process.env = { ...ORIGINAL_ENV }; // start from a clean, known baseline
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV; // restore the real env for the rest of the suite
  });

  it('loads successfully and applies defaults when all required vars are present', async () => {
    process.env = { ...process.env, ...VALID_ENV };

    const { env } = await import('@config/env'); // dynamic import re-runs the module fresh

    expect(env.DATABASE_URL).toBe(VALID_ENV.DATABASE_URL);
    expect(env.PORT).toBe(3000); // default applied
    expect(env.NODE_ENV).toBe('test'); // default applied
  });

  it('exits the process when a required variable is missing', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never); // process.exit's real type returns `never` — this satisfies TS

    process.env = { ...process.env, ...VALID_ENV, DATABASE_URL: '' }; // invalid: not a URL

    await expect(import('@config/env')).rejects.toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
  });

  it('exits the process when EMAIL_USER is not a valid email', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never);

    process.env = { ...process.env, ...VALID_ENV, EMAIL_USER: 'not-an-email' };

    await expect(import('@config/env')).rejects.toThrow('process.exit called');

    exitSpy.mockRestore();
  });
});
