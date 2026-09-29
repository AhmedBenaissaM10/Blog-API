// src/types/auth.types.ts
export interface JwtPayload {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  createdAt: Date;
}
