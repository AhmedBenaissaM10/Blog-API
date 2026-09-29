import type { NextFunction, Request, Response } from 'express';
import catchAsync from '@utils/catchAsync';
import { sendSuccess } from '@utils/response';
import * as authService from './auth.service';
import logger from '@utils/logger';
import { setAuthCookies, clearAuthCookies } from '@utils/cookie';
import { unauthorized } from '@errors/ErrorIndex';
import * as errors from '@errors/ErrorIndex';
// POST /signup
export const signup = catchAsync(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  const { user, accessToken, refreshToken } = await authService.createUser(email, name, password);
  setAuthCookies(res, accessToken, refreshToken);
  logger.info(`User ${user.email} created`, { userId: user.id });
  sendSuccess(res, {
    data: { user },
    statusCode: 201,
    message: 'User created',
  });
});

// POST /login
export const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const { user, accessToken, refreshToken } = await authService.login(email, password);
  setAuthCookies(res, accessToken, refreshToken);
  logger.info(`User ${user.email} logged in`, { userId: user.id });
  sendSuccess(res, {
    data: { user: { id: user.id, email: user.email, name: user.name } },
    message: 'Logged in successfully',
  });
});

// POST /logout
export const logout = catchAsync(async (req: Request, res: Response) => {
  const refreshToken: string | undefined = req.cookies.refreshToken;
  if (refreshToken) {
    const { id, email } = await authService.logout(refreshToken);
    logger.info(`User ${email} logged out`, { id });
  }
  clearAuthCookies(res);
  sendSuccess(res, { statusCode: 200, data: null, message: 'User logged out' });
});

// POST /refresh-token
export const refresh = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const refreshToken: string | undefined = req.cookies.refreshToken;
  if (!refreshToken) return next(unauthorized('No token provided'));

  const { email, accessToken, newRefreshToken } = await authService.refresh(refreshToken);
  setAuthCookies(res, accessToken, newRefreshToken);
  logger.info(`${email} created a new access token`);
  sendSuccess(res, { statusCode: 200, data: null, message: 'Access Token created' });
});

// GET /profile
export const getProfile = catchAsync(async (req: Request, res: Response) => {
  const user = await authService.getProfile(req.user!.id);

  sendSuccess(res, { data: user, message: 'Profile retrieved successfully' });
});

// PATCH /profile
export const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const data = req.body;
  const user = await authService.updateProfile(req.user!.id, data);

  sendSuccess(res, { data: user, message: 'Profile updated successfully' });
});
// POST /change-password
export const changePassword = catchAsync(async (req: Request, res: Response) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user!.id;
  await authService.changePassword(userId, oldPassword, newPassword);
  logger.info(`User ${req.user!.email} changed their password`);
  sendSuccess(res, { data: null, message: 'Password changed successfully' });
});
// POST /forgot-password
export const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;
  await authService.forgotPassword(email);
  logger.info(`User ${email} requested a password reset OTP`);
  sendSuccess(res, { data: null, message: 'OTP sent to your email' });
});
// POST /reset-password
export const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const { email, code, newPassword } = req.body || {};
  await authService.resetPassword(email, code, newPassword);
  logger.info(`User ${email} reset their password`);
  sendSuccess(res, { data: null, message: 'Password reset successfully' });
});

// GET /auth/goog  const code = req.query.code as string;
export const googleCallBack = catchAsync(async (req: Request, res: Response) => {
  const code = req.query.code as string;
  if (!code) throw errors.badRequest('No code provided');
  if (!req.user) throw errors.unauthorized('User not authenticated');
  const { accessToken, refreshToken } = await authService.createTokens(
    req.user.id,
    req.user.email,
    req.user.role
  );
  setAuthCookies(res, accessToken, refreshToken);
  logger.info(`User ${req.user!.email} logged in via Google`);
  res.redirect('http://localhost:5173/home'); // redirect to your frontend
});
