import { describe, expect, it } from 'vitest';
import { signupSchema } from '../../src/features/auth/auth.validator'; // adjust path

const validBody = {
  name: 'Ahmed',
  email: 'ahmed@example.com',
  password: 'Supersecret123!',
};

describe('signupSchema — password rules', () => {
  it('accepts a password meeting all complexity rules', () => {
    const result = signupSchema.safeParse({ body: validBody });
    expect(result.success).toBe(true);
  });
  it('email transform', () => {
    const result = signupSchema.safeParse({
      body: { ...validBody, email: '   AHMED@Example.Com  ' },
    });
    expect(result.success).toBe(true);
    expect(result.data?.body.email).toBe('ahmed@example.com');
  });
  it('rejects a password shorter than 8 characters', () => {
    const result = signupSchema.safeParse({
      body: { ...validBody, password: 'Ab1!' },
    });
    expect(result.success).toBe(false);
  });
  it.each([
    ['no number', 'Supersecret!'],
    ['no special character', 'Supersecret123'],
    ['no uppercase', 'supersecret123'],
  ])('rejects a password with %s', (_label, password) => {
    const result = signupSchema.safeParse({ body: { ...validBody, password } });
    expect(result.success).toBe(false);
  });
  it.each([
    [' number', 'Supersecret!'],
    [' special character', 'Supersecret123'],
  ])('rejects a name with %s', (_label, name) => {
    const result = signupSchema.safeParse({ body: { ...validBody, name } });
    expect(result.success).toBe(false);
  });
});
