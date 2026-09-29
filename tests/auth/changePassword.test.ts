import request from 'supertest';
import app from '../../src/app.js';
import { createAuthenticatedUser } from '../helpers/auth.js';

describe('PATCH /api/auth/change-password', () => {
  const oldPassword = 'SuperSecret123!';
  const newPassword = 'EvenMoreSecret456!';

  it('changes the password and the old password stops working', async () => {
    // Arrange
    const { accessToken, user } = await createAuthenticatedUser({
      email: 'changepw@example.com',
      password: oldPassword,
    });

    // Act — change the password
    const changeResponse = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', `accessToken=${accessToken}`)
      .send({ oldPassword, newPassword });

    // Assert — the change itself succeeded
    expect(changeResponse.status).toBe(200);

    // Assert — logging in with the OLD password now fails
    const oldLoginAttempt = await request(app).post('/api/auth/login').send({
      email: user.email,
      password: oldPassword,
    });
    expect(oldLoginAttempt.status).toBe(400);

    // Assert — logging in with the NEW password now succeeds
    const newLoginAttempt = await request(app).post('/api/auth/login').send({
      email: user.email,
      password: newPassword,
    });
    expect(newLoginAttempt.status).toBe(200);
  });

  it('returns 400 when oldPassword is incorrect', async () => {
    const { accessToken } = await createAuthenticatedUser({ email: 'changepw2@example.com' });

    const response = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', `accessToken=${accessToken}`)
      .send({ oldPassword: 'WrongOldPassword!', newPassword: 'DoesntMatter123!' });
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Current password is incorrect, please try again');
  });
});
