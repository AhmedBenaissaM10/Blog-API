import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { badRequest } from '../errors/ErrorIndex';
import { googleAuthService } from '../features/auth/auth.service';
import { env } from './env';

passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: env.GOOGLE_CALLBACK_URL,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(badRequest('No email found in Google profile'));
        }
        const user = await googleAuthService(email, profile.id, profile.displayName);
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);
export default passport;
