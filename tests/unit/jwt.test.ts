import jwt from 'jsonwebtoken';
import { env } from '@config/env';
import { verifyAccessToken, verifyRefreshToken } from '@utils/jwtUtils';

const payload = { id: 'user-123', email: 'ahmed@example.com', role: 'ADMIN' as const };

describe('verifyAccessToken', () => {
  it('returns the decoded payload for a valid token', () => {
    // Arrange
    const token = jwt.sign(payload, env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });

    // Act
    const decoded = verifyAccessToken(token);

    // Assert
    expect(decoded.id).toBe(payload.id);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
  });

  it('throws a 401 error for an expired token', () => {
    // Arrange — negative expiresIn produces an already-expired token
    const expiredToken = jwt.sign(payload, env.ACCESS_TOKEN_SECRET, { expiresIn: '-10s' });

    // Act + Assert
    expect(() => verifyAccessToken(expiredToken)).toThrow();
    try {
      verifyAccessToken(expiredToken);
    } catch (error) {
      expect((error as { statusCode: number }).statusCode).toBe(401);
    }
  });

  it('throws a 401 error for a malformed token', () => {
    // Arrange — not a real JWT at all
    const garbageToken = 'this.is.not.a.valid.jwt';

    // Act + Assert
    expect(() => verifyAccessToken(garbageToken)).toThrow();
    try {
      verifyAccessToken(garbageToken);
    } catch (error) {
      expect((error as { statusCode: number }).statusCode).toBe(401);
    }
  });

  it('throws when a token is signed with a different secret', () => {
    // Arrange — valid JWT structurally, but wrong signature for this secret
    const wrongSecretToken = jwt.sign(payload, 'some-other-secret', { expiresIn: '15m' });

    // Act + Assert
    expect(() => verifyAccessToken(wrongSecretToken)).toThrow();
  });
});

describe('verifyRefreshToken', () => {
  it('returns the decoded payload for a valid refresh token', () => {
    const token = jwt.sign(payload, env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

    const decoded = verifyRefreshToken(token);

    expect(decoded.id).toBe(payload.id);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
  });

  it('throws a 401 error for an expired refresh token', () => {
    const expiredToken = jwt.sign(payload, env.REFRESH_TOKEN_SECRET, { expiresIn: '-10s' });

    expect(() => verifyRefreshToken(expiredToken)).toThrow();
  });
});
