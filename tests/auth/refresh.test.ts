import request from 'supertest';
import setCookie from 'set-cookie-parser';
import app from '../../src/app';
import redisClient from '@lib/redis';

const testUser = {
  name: 'Ahmed',
  email: 'ahmed@example.com',
  password: 'Supersecret123!',
};

describe('POST /api/auth/refresh-token', () => {
  it('returns 401 when no refresh token cookie is provided', async () => {
    const response = await request(app).post('/api/auth/refresh-token');

    expect(response.status).toBe(401);
  });

  it('returns 401 for a malformed/invalid refresh token', async () => {
    const response = await request(app)
      .post('/api/auth/refresh-token')
      .set('Cookie', ['refreshToken=not-a-real-jwt']);

    expect(response.status).toBe(401);
  });

  it('returns 401 when the refresh token does not match what is stored in Redis', async () => {
    // Arrange: real signup gives a valid, signature-correct refresh token,
    // but we overwrite Redis afterward so it no longer matches
    const signupRes = await request(app).post('/api/auth/signup').send(testUser);
    const cookies = setCookie.parse(signupRes, { map: true });
    const staleRefreshToken = cookies.refreshToken.value;

    const userId = signupRes.body.data.user.id;
    await redisClient.set(`refresh:${userId}`, 'some-other-token-value');

    const response = await request(app)
      .post('/api/auth/refresh-token')
      .set('Cookie', [`refreshToken=${staleRefreshToken}`]);

    expect(response.status).toBe(401);
  });

  it('issues new access + refresh tokens and rotates Redis when the token is valid', async () => {
    const signupRes = await request(app).post('/api/auth/signup').send(testUser);
    const signupCookies = setCookie.parse(signupRes, { map: true });
    const oldRefreshToken = signupCookies.refreshToken.value;
    const userId = signupRes.body.data.user.id;

    const response = await request(app)
      .post('/api/auth/refresh-token')
      .set('Cookie', [`refreshToken=${oldRefreshToken}`]);

    expect(response.status).toBe(200);

    const newCookies = setCookie.parse(response, { map: true });
    expect(newCookies.accessToken).toBeDefined();
    expect(newCookies.refreshToken).toBeDefined();
    expect(newCookies.refreshToken.value).not.toBe(oldRefreshToken);

    const storedToken = await redisClient.get(`refresh:${userId}`);
    expect(storedToken).toBe(newCookies.refreshToken.value);
  });

  it('rejects reuse of the old refresh token after rotation', async () => {
    const signupRes = await request(app).post('/api/auth/signup').send(testUser);
    const signupCookies = setCookie.parse(signupRes, { map: true });
    const oldRefreshToken = signupCookies.refreshToken.value;

    // First refresh rotates the token
    await request(app)
      .post('/api/auth/refresh-token')
      .set('Cookie', [`refreshToken=${oldRefreshToken}`]);

    // Reusing the now-stale old token should fail
    const response = await request(app)
      .post('/api/auth/refresh-token')
      .set('Cookie', [`refreshToken=${oldRefreshToken}`]);

    expect(response.status).toBe(401);
  });
});
