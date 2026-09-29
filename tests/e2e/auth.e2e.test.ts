import request from 'supertest';
import app from '../../src/app.js';
import redisClient from '@lib/redis';
import { prisma } from '../helpers/db.js';
describe('E2E: auth lifecycle flows', () => {
  it('path 1: signup -> get profile -> update profile -> logout', async () => {
    const payload = {
      name: 'Ahmed',
      email: 'e2e1@example.com',
      password: 'Supersecret123!',
    };

    // Signup
    const signupRes = await request(app).post('/api/auth/signup').send(payload);
    expect(signupRes.status).toBe(201);
    const cookies = signupRes.headers['set-cookie'] as unknown as string[];

    // Get profile
    const profileRes = await request(app).get('/api/auth/profile').set('Cookie', cookies);
    expect(profileRes.status).toBe(200);
    expect(profileRes.body.data.email).toBe(payload.email);

    // Update profile
    const updateRes = await request(app)
      .patch('/api/auth/profile')
      .set('Cookie', cookies)
      .send({ name: 'Ahmed Updated' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.name).toBe('Ahmed Updated');

    // Confirm the update persisted via a fresh profile fetch
    const profileAfterRes = await request(app).get('/api/auth/profile').set('Cookie', cookies);
    expect(profileAfterRes.body.data.name).toBe('Ahmed Updated');

    // Logout
    const logoutRes = await request(app).post('/api/auth/logout').set('Cookie', cookies);
    expect(logoutRes.status).toBe(200);

    const storedToken = await redisClient.get(`refresh:${profileRes.body.data.id}`);
    expect(storedToken).toBeNull();
  });

  it('path 2: login -> change password -> logout -> login old (fail) -> login new (success)', async () => {
    const payload = {
      name: 'Bob',
      email: 'e2e2@example.com',
      password: 'OldPassword123!',
    };
    await request(app).post('/api/auth/signup').send(payload);

    // Login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: payload.email, password: payload.password });
    expect(loginRes.status).toBe(200);
    const cookies = loginRes.headers['set-cookie'] as unknown as string[];

    // Change password
    const changeRes = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', cookies)
      .send({ oldPassword: payload.password, newPassword: 'NewPassword123!' });
    expect(changeRes.status).toBe(200);

    // Logout
    await request(app).post('/api/auth/logout').set('Cookie', cookies);

    // Login with old password should fail
    const oldLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: payload.email, password: payload.password });
    expect(oldLoginRes.status).toBe(400);

    // Login with new password should succeed
    const newLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: payload.email, password: 'NewPassword123!' });
    expect(newLoginRes.status).toBe(200);
  });

  it('path 3: login fail -> forgot password -> reset -> login', async () => {
    const payload = {
      name: 'Carol',
      email: 'e2e3@example.com',
      password: 'OriginalPass123!',
    };
    await request(app).post('/api/auth/signup').send(payload);

    // Failed login attempt
    const failedLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: payload.email, password: 'WrongPassword1!' });
    expect(failedLoginRes.status).toBe(400);

    // Forgot password
    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: payload.email });
    expect(forgotRes.status).toBe(200);

    // Retrieve the OTP directly from Redis (this test isn't asserting on email delivery)
    const user = await prisma.user.findUnique({ where: { email: payload.email } });
    const otp = await redisClient.get(`reset:${user!.id}`);
    expect(otp).not.toBeNull();

    // Reset password
    const resetRes = await request(app).post('/api/auth/reset-password').send({
      email: payload.email,
      code: otp,
      newPassword: 'BrandNewPass123!',
    });
    expect(resetRes.status).toBe(200);

    // Login with new password
    const finalLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: payload.email, password: 'BrandNewPass123!' });
    expect(finalLoginRes.status).toBe(200);
  });

  it('path 4: signup -> refresh -> access protected route -> logout -> old refresh token rejected', async () => {
    const payload = {
      name: 'Dave',
      email: 'e2e4@example.com',
      password: 'Supersecret123!',
    };

    const signupRes = await request(app).post('/api/auth/signup').send(payload);
    const originalCookies = signupRes.headers['set-cookie'] as unknown as string[];
    const originalRefreshCookie = originalCookies.find((c) => c.startsWith('refreshToken='))!;

    // Refresh — rotates both tokens
    const refreshRes = await request(app)
      .post('/api/auth/refresh-token')
      .set('Cookie', originalCookies);
    expect(refreshRes.status).toBe(200);
    const newCookies = refreshRes.headers['set-cookie'] as unknown as string[];

    // Access a protected route with the new access token
    const profileRes = await request(app).get('/api/auth/profile').set('Cookie', newCookies);
    expect(profileRes.status).toBe(200);

    // Logout
    await request(app).post('/api/auth/logout').set('Cookie', newCookies);

    // Old (pre-rotation) refresh token should now be rejected too
    const staleRefreshRes = await request(app)
      .post('/api/auth/refresh-token')
      .set('Cookie', [originalRefreshCookie]);
    expect(staleRefreshRes.status).toBe(401);
  });
});
