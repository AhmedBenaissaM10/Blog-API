import crypto from 'crypto';

/**
 * Strip sensitive fields from a user object before sending it in a response.
 * Use this everywhere a user object touches an API response.
 */
export function sanitizeUser<T extends Record<string, any>>(
  user: T,
  extraFieldsToOmit: string[] = []
): Partial<T> {
  const fieldsToOmit = new Set(['password', 'refreshToken', ...extraFieldsToOmit]);
  const result: Partial<T> = {};

  for (const key in user) {
    if (!fieldsToOmit.has(key)) {
      result[key] = user[key];
    }
  }

  return result;
}

/**
 * Generate a numeric OTP code (default 6 digits).
 * Used for email verification / password reset (tags 5, 6).
 */
export function generateOTP(length = 6): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return crypto.randomInt(min, max + 1).toString();
}

/**
 * Generate a cryptographically secure random token (hex string).
 * Useful for refresh tokens, reset tokens, etc.
 */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Hash a token/OTP before storing it (in Redis or DB).
 * Never store raw tokens/OTPs — hash them, compare hashes on verification.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Pick specific keys from an object.
 */
export function pick<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) result[key] = obj[key];
  }
  return result;
}

/**
 * Omit specific keys from an object.
 */
export function omit<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

/**
 * Simple async sleep — useful for tests, retry backoff, etc.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if a value is a plain, non-empty object.
 */
export function isEmptyObject(obj: unknown): boolean {
  return (
    typeof obj === 'object' && obj !== null && !Array.isArray(obj) && Object.keys(obj).length === 0
  );
}
