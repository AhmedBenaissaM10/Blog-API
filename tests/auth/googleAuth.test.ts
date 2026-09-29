import { describe, it, expect } from 'vitest';
import bcrypt from 'bcrypt';
import { prisma } from '../../src/lib/prisma';
import { googleAuthService } from '../../src/features/auth/auth.service';

describe('googleAuthService', () => {
  it('returns the existing user when googleId already matches', async () => {
    const existing = await prisma.user.create({
      data: {
        email: 'already.linked@example.com',
        googleId: 'google-123',
        provider: 'google',
        name: 'Already Linked',
        password: '',
      },
    });

    const result = await googleAuthService(
      'already.linked@example.com',
      'google-123',
      'Already Linked'
    );

    expect(result.id).toBe(existing.id);
  });

  it('links googleId to an existing local account with the same email', async () => {
    const localUser = await prisma.user.create({
      data: {
        email: 'local.user@example.com',
        password: await bcrypt.hash('somepassword', 10),
        name: 'Local User',
        provider: 'local',
      },
    });

    const result = await googleAuthService('local.user@example.com', 'google-456', 'Local User');

    expect(result.id).toBe(localUser.id);
    expect(result.googleId).toBe('google-456');
    expect(result.provider).toBe('google');
  });

  it('creates a brand new user when neither googleId nor email exist', async () => {
    const result = await googleAuthService('brand.new@example.com', 'google-789', 'Brand New');

    expect(result.email).toBe('brand.new@example.com');
    expect(result.googleId).toBe('google-789');
    expect(result.provider).toBe('google');
    expect(result.password).toBe('');
  });
});
