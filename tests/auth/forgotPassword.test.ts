import { sendOTPEmail } from '@lib/mailer'; // adjust to your real path
import redisClient from '@lib/redis';
import request from 'supertest';
import app from '../../src/app.js';
import { createAuthenticatedUser } from '../helpers/auth.js';

vi.mock('@lib/mailer', () => ({
  sendOTPEmail: vi.fn().mockResolvedValue(undefined),
}));

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('stores a 6-digit OTP in Redis and calls sendOTPEmail for an existing user', async () => {
    // Arrange
    const { user } = await createAuthenticatedUser({ email: 'forgot@example.com' });

    // Act
    const response = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: user.email });

    // Assert — response
    expect(response.status).toBe(200);

    // Assert — Redis side effect
    const storedOtp = await redisClient.get(`reset:${user.id}`);
    expect(storedOtp).not.toBeNull();
    expect(storedOtp).toMatch(/^\d{6}$/);

    // Assert — email was "sent" (mock was called), without actually sending one
    expect(sendOTPEmail).toHaveBeenCalledWith(user.email, storedOtp, expect.any(String));
  });

  it('returns 200 without storing an OTP for a non-existent email (enumeration protection)', async () => {
    // Act
    const response = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@example.com' });

    // Assert — same success response either way, no hint the account doesn't exist
    expect(response.status).toBe(200);
    expect(sendOTPEmail).not.toHaveBeenCalled();
  });
});
