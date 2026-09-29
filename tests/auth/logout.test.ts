import request from 'supertest';
import app from '../../src/app.js';
import { createAuthenticatedUser } from '../helpers/auth.js';
import setCookie from 'set-cookie-parser';
import redisClient from '@lib/redis';

describe('POST /api/auth/logout', () => {
  it('clears cookies and deletes the refresh token from Redis', async () => {
    // Arrange
    const { user, accessToken, refreshToken } = await createAuthenticatedUser();

    // Act
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', [`accessToken=${accessToken}`, `refreshToken=${refreshToken}`]);

    // Assert
    expect(response.status).toBe(200);

    const cookies = setCookie.parse(response, { map: true });
    expect(new Date(cookies.accessToken.expires!).getTime()).toBeLessThan(Date.now());
    expect(new Date(cookies.refreshToken.expires!).getTime()).toBeLessThan(Date.now());

    const storedToken = await redisClient.get(`refresh:${user.id}`);
    expect(storedToken).toBeNull();
  });

  it('rejects an invalid/malformed refresh token', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', ['refreshToken=not-a-real-jwt']);

    expect(response.status).toBe(401);
  });
});
