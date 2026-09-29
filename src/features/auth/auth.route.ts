import { requireAuth } from '@middlewares/auth';
import { authRateLimiter } from '@middlewares/rateLimiter';
import { validate } from '@middlewares/validate';
import { RequestHandler, Router } from 'express';
import * as AuthController from './auth.controller';
import * as AuthValidator from './auth.validator';
import passport from '@config/passport';

const router = Router();

router.post(
  '/signup',
  authRateLimiter,
  validate(AuthValidator.signupSchema),
  AuthController.signup as RequestHandler
);

router.post(
  '/login',
  authRateLimiter,
  validate(AuthValidator.loginSchema),
  AuthController.login as RequestHandler
);

router.post('/refresh-token', authRateLimiter, AuthController.refresh as RequestHandler);

router.post('/logout', requireAuth, AuthController.logout as RequestHandler);

router.get('/profile', requireAuth, AuthController.getProfile as RequestHandler);

router.patch('/profile', requireAuth, AuthController.updateProfile as RequestHandler);

router.post(
  '/change-password',
  authRateLimiter,
  requireAuth,
  validate(AuthValidator.changePasswordSchema),
  AuthController.changePassword as RequestHandler
);

router.post(
  '/forgot-password',
  authRateLimiter,
  validate(AuthValidator.forgotPasswordSchema),
  AuthController.forgotPassword as RequestHandler
);

router.post(
  '/reset-password',
  authRateLimiter,
  validate(AuthValidator.resetPasswordSchema),
  AuthController.resetPassword as RequestHandler
);

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  AuthController.googleCallBack as RequestHandler
);

export default router;
