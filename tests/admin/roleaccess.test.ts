// tests/admin/roleAccess.test.ts
import request from 'supertest';
import app from '../../src/app.js';
import { createAuthenticatedUser, createAuthenticatedAdmin } from '../helpers/auth.js';

describe('GET /api/admin/users — role-based access', () => {
  it('allows access for an ADMIN user', async () => {
    const { accessToken } = await createAuthenticatedAdmin();

    const response = await request(app)
      .get('/api/admin/users')
      .set('Cookie', `accessToken=${accessToken}`);

    expect(response.status).toBe(200);
  });

  it('returns 403 for an authenticated but non-admin (USER) role', async () => {
    const { accessToken } = await createAuthenticatedUser();

    const response = await request(app)
      .get('/api/admin/users')
      .set('Cookie', `accessToken=${accessToken}`);

    expect(response.status).toBe(403);
  });

  it('returns 401 for an unauthenticated request', async () => {
    const response = await request(app).get('/api/admin/users');

    expect(response.status).toBe(401);
  });
});
