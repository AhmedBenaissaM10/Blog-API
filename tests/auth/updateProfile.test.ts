import request from 'supertest';
import app from '../../src/app.js';
import { createAuthenticatedUser } from '../helpers/auth.js';

describe('PATCH /api/auth/profile', () => {
  it("updates the user's name", async () => {
    const { accessToken } = await createAuthenticatedUser({ name: 'Original Name' });

    const response = await request(app)
      .patch('/api/auth/profile')
      .set('Cookie', `accessToken=${accessToken}`)
      .send({ name: 'Updated Name' });

    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe('Updated Name');
  });
});
