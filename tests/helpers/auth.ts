import request from 'supertest';
import bcrypt from 'bcrypt';
import setCookie from 'set-cookie-parser';
import app from '../../src/app.js';
import { prisma } from './db.js';

export async function createAuthenticatedUser(overrides?: {
  name?: string;
  email?: string;
  password?: string;
}) {
  const payload = {
    name: overrides?.name ?? 'Alice',
    email: overrides?.email ?? 'alice@example.com',
    password: overrides?.password ?? 'SuperSecret123!',
  };

  const response = await request(app).post('/api/auth/signup').send(payload);
  const cookies = setCookie.parse(response, { map: true });
  const accessToken = cookies.accessToken;
  const refreshToken = cookies.refreshToken;
  return {
    user: response.body.data.user as { id: string; email: string; role: string },
    accessToken: accessToken.value,
    refreshToken: refreshToken.value,
  };
}

export async function createAuthenticatedAdmin(overrides?: { email?: string; password?: string }) {
  const password = overrides?.password ?? 'SuperSecret123!';
  const email = overrides?.email ?? 'admin@example.com';
  const hashed = await bcrypt.hash(password, 10);

  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin User',
      email,
      password: hashed,
      role: 'ADMIN',
    },
  });

  const response = await request(app).post('/api/auth/login').send({ email, password });
  const cookies = setCookie.parse(response, { map: true });
  const accessToken = cookies.accessToken;
  const refreshToken = cookies.refreshToken;
  return { user: adminUser, accessToken: accessToken.value, refreshToken: refreshToken.value };
}
