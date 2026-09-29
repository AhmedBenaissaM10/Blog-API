import redisClient from '@lib/redis';
import setCookie from 'set-cookie-parser';
import request from 'supertest';
import app from '../../src/app';

const testUser = {
  name: 'Ahmed',
  email: 'ahmed@example.com',
  password: 'Supersecret123!',
};

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    // Arrange: a user must already exist to log in
    await request(app).post('/api/auth/signup').send(testUser);
  });

  it('logs in with correct credentials and returns 200 with user data', async () => {
    // Act
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    // Assert — response
    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe(testUser.email);

    // Assert — cookies
    const cookies = setCookie.parse(response, { map: true });
    expect(cookies.accessToken).toBeDefined();
    expect(cookies.accessToken.httpOnly).toBe(true);
    expect(cookies.refreshToken).toBeDefined();
    expect(cookies.refreshToken.httpOnly).toBe(true);

    // Assert — Redis matches the issued token
    const userId = response.body.data.user.id;
    const storedToken = await redisClient.get(`refresh:${userId}`);
    expect(storedToken).toBe(cookies.refreshToken.value);
  });

  it('returns 400 with a generic message for a wrong password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: 'WrongPassword1!' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid credentials');
  });

  it('returns 400 with the same generic message for a non-existent email', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'Whatever123!' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid credentials'); // same message as wrong password — enumeration protection
  });

  it('rotates the refresh token on second login, invalidating the first', async () => {
    // Arrange: first login
    const firstLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    const firstCookies = setCookie.parse(firstLogin, { map: true });
    const firstRefreshToken = firstCookies.refreshToken.value;

    // Act: second login (e.g. simulating a login from another device)
    const secondLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    const secondCookies = setCookie.parse(secondLogin, { map: true });
    const secondRefreshToken = secondCookies.refreshToken.value;

    // Assert: tokens are different
    expect(secondRefreshToken).not.toBe(firstRefreshToken);

    // Assert: Redis now holds ONLY the second token — first is gone/orphaned
    const userId = secondLogin.body.data.user.id;
    const storedToken = await redisClient.get(`refresh:${userId}`);
    expect(storedToken).toBe(secondRefreshToken);
    expect(storedToken).not.toBe(firstRefreshToken);
  });
});
