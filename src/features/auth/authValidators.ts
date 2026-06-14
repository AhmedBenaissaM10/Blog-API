import {z} from 'zod';

export const signupSchema = z.object({
    name: z.string()
    .min(3, "Name must be at least 3 characters")
    .max(32, "Name must be at most 32 characters")
    .trim(),
    
    email: z.string()
    .email("Please enter a valid email")
    .toLowerCase(),
    role: z.enum(["user", "admin"]).default("user"),
    password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least  one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character")
    
})

export const loginSchema = z.object({
    email: z.email("Please enter a valid email"),
    password: z.string().min(1, "password is required"),
    rememberMe: z.boolean().optional().default(false)
    
})

