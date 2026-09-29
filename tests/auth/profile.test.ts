import request from 'supertest';
import app from '../../src/app.js';
import { createAuthenticatedUser } from '../helpers/auth.js';

describe('GET /api/auth/profile', () => {
  it("returns the authenticated user's own profile", async () => {
    const { accessToken, user } = await createAuthenticatedUser({
      email: 'profileuser@example.com',
    });

    const response = await request(app)
      .get('/api/auth/profile')
      .set('Cookie', `accessToken=${accessToken}`);

    expect(response.status).toBe(200);

    expect(response.body.data.id).toBe(user.id);
    expect(response.body.data.email).toBe('profileuser@example.com');
    expect(response.body.data.password).toBeUndefined();
  });

  it('returns 401 without authentication', async () => {
    const response = await request(app).get('/api/auth/profile');

    expect(response.status).toBe(401);
  });
});
