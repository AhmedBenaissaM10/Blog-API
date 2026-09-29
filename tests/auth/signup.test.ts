import request from 'supertest';
import setCookie from 'set-cookie-parser';
import app from '../../src/app';
import redisClient from '@lib/redis';

describe('POST /api/auth/signup', () => {
  it('creates a new user and returns 201 with user data', async () => {
    const payload = {
      name: 'Ahmed',
      email: 'ahmed@example.com',
      password: 'Supersecret123!',
    };

    // Act
    const response = await request(app).post('/api/auth/signup').send(payload);

    // Assert — response body
    expect(response.status).toBe(201);
    expect(response.body.data.user.email).toBe(payload.email);
    expect(response.body.data.user.password).toBeUndefined();

    // Assert — cookies exist and have correct security attributes
    const cookies = setCookie.parse(response, { map: true });

    expect(cookies.accessToken).toBeDefined();
    expect(cookies.accessToken.httpOnly).toBe(true);
    expect(cookies.accessToken.sameSite).toBe('Strict');

    expect(cookies.refreshToken).toBeDefined();
    expect(cookies.refreshToken.httpOnly).toBe(true);
    expect(cookies.refreshToken.sameSite).toBe('Strict');

    // Assert — refresh token side effect actually happened in Redis
    const storedToken = await redisClient.get(`refresh:${response.body.data.user.id}`);
    expect(storedToken).not.toBeNull();
  });

  it('returns 400 when the email is already in use', async () => {
    // Arrange
    const payload = {
      name: 'Ahmed',
      email: 'ahmed@example.com',
      password: 'Supersecret123!',
    };
    await request(app).post('/api/auth/signup').send(payload);

    // Act
    const response = await request(app).post('/api/auth/signup').send(payload);

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Email already in use');
  });

  it('returns 400 when a required field (password) is missing', async () => {
    // Arrange
    const payload = {
      name: 'Ahmed',
      email: 'ahmed@example.com',
      // password intentionally omitted
    };

    // Act
    const response = await request(app).post('/api/auth/signup').send(payload);

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);

    // Assert structure: some error entry targets the "password" field specifically
    const passwordError = response.body.errors.find(
      (e: { path: string }) => e.path === 'body.password'
    );
    expect(passwordError).toBeDefined();
  });
});
