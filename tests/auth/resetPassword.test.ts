import redisClient from '@lib/redis';
import request from 'supertest';
import app from '../../src/app.js';
import { createAuthenticatedUser } from '../helpers/auth.js';

describe('POST /api/auth/reset-password', () => {
  it('resets the password when given a valid, matching code', async () => {
    // Arrange
    const { user } = await createAuthenticatedUser({ email: 'reset@example.com' });
    await redisClient.set(`reset:${user.id}`, '123456', { EX: 600 });

    // Act
    const response = await request(app).post('/api/auth/reset-password').send({
      email: user.email,
      code: '123456',
      newPassword: 'NewSuperSecret123!',
    });

    // Assert — response
    expect(response.status).toBe(200);

    // Assert — password actually changed (new password logs in successfully)
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'NewSuperSecret123!' });
    expect(loginResponse.status).toBe(200);

    // Assert — old password no longer works
    const oldLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'SuperSecret123!' });
    expect(oldLoginResponse.status).toBe(400);

    // Assert — reset code is consumed (can't be reused)
    const storedCode = await redisClient.get(`reset:${user.id}`);
    expect(storedCode).toBeNull();
  });

  it('returns 400 when the reset code has expired or was never requested', async () => {
    const { user } = await createAuthenticatedUser({ email: 'noreset@example.com' });

    const response = await request(app).post('/api/auth/reset-password').send({
      email: user.email,
      code: '123456',
      newPassword: 'NewSuperSecret123!',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Reset code expired');
  });

  it('returns 400 when the reset code does not match', async () => {
    const { user } = await createAuthenticatedUser({ email: 'wrongcode@example.com' });
    await redisClient.set(`reset:${user.id}`, '123456', { EX: 600 });

    const response = await request(app).post('/api/auth/reset-password').send({
      email: user.email,
      code: '999999',
      newPassword: 'NewSuperSecret123!',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid reset code');
  });

  it('returns 200 for a non-existent email without revealing that (enumeration protection)', async () => {
    const response = await request(app).post('/api/auth/reset-password').send({
      email: 'nobody@example.com',
      code: '123456',
      newPassword: 'NewSuperSecret123!',
    });

    expect(response.status).toBe(200);
  });

  it('a reset code cannot be reused after a successful reset', async () => {
    const { user } = await createAuthenticatedUser({ email: 'reuse@example.com' });
    await redisClient.set(`reset:${user.id}`, '123456', { EX: 600 });

    await request(app).post('/api/auth/reset-password').send({
      email: user.email,
      code: '123456',
      newPassword: 'FirstNewPassword123!',
    });

    // Try reusing the same code again
    const response = await request(app).post('/api/auth/reset-password').send({
      email: user.email,
      code: '123456',
      newPassword: 'SecondNewPassword123!',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Reset code expired');
  });
});
