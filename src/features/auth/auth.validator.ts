import { z } from 'zod';
const Email = z.string().trim().toLowerCase().pipe(z.email('Please enter a valid email'));
const Password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least  one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');
const name = z
  .string()
  .trim()
  .min(3, 'Name must be at least 3 characters')
  .max(32, 'Name must be at most 32 characters')
  .regex(/^[a-zA-Z ]+$/, 'Alphanumeric only');
export const signupSchema = z.object({
  body: z.object({
    name: name,
    email: Email,
    password: Password,
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: Email,
    password: z.string().min(1, 'password is required'),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    oldPassword: z.string().min(1, 'old password is required'),
    newPassword: Password,
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: name,
  }),
});

export const resendOTPSchema = z.object({
  body: z.object({
    email: Email,
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    email: Email,
    code: z.string().length(6, 'code must be 6 characters long'),
    newPassword: Password,
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: Email,
  }),
});
