import { PassportStatic } from 'passport';
import {
  Strategy as GoogleStrategy,
  Profile as GoogleProfile,
  VerifyCallback,
} from 'passport-google-oauth20';
import AppleStrategy from 'passport-apple';
import { UserModel, User } from '../../models/auth/user';
import { OAuthService } from '../../services/auth/oauthService';
import logger from '../../utils/logger/logger';

// OAuth 프로필 타입 정의
interface GoogleProfileExtended extends GoogleProfile {
  emails?: Array<{ value: string; verified: boolean }>;
  photos?: Array<{ value: string }>;
}

interface AppleProfile {
  id: string;
  email?: string;
  name?: {
    firstName?: string;
    lastName?: string;
  };
}

type AppleVerifyCallback = (error?: Error | null, user?: User | false) => void;

export const configurePassport = (passport: PassportStatic) => {
  const userModel = new UserModel();
  const oauthService = new OAuthService();

  // Passport.js 직렬화 및 역직렬화
  passport.serializeUser((user, done) => {
    done(null, (user as User)._id?.toHexString());
  });

  passport.deserializeUser((id: string, done) => {
    void (async () => {
      try {
        const user = await userModel.findById(id);
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    })();
  });

  // Google OAuth 2.0 전략 설정
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: '/api/auth/google/callback',
          scope: ['profile', 'email'],
        },
        (
          accessToken: string,
          refreshToken: string,
          profile: GoogleProfileExtended,
          done: VerifyCallback,
        ) => {
          void (async () => {
            try {
              const user = await oauthService.findOrCreateUser({
                provider: 'google',
                socialId: profile.id,
                email: profile.emails?.[0]?.value,
                username: profile.displayName,
                profileImage: profile.photos?.[0]?.value,
                emailVerified: profile.emails?.[0]?.verified ?? false,
              });

              if (!user) {
                return done(new Error('Failed to authenticate with Google'));
              }

              return done(null, user);
            } catch (error) {
              logger.error('Error in Google OAuth strategy:', error);
              return done(error as Error);
            }
          })();
        },
      ),
    );
  } else {
    logger.warn(
      'Google OAuth is not configured. Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.',
    );
  }

  // Apple OAuth 2.0 전략 설정
  if (
    process.env.APPLE_CLIENT_ID &&
    process.env.APPLE_TEAM_ID &&
    process.env.APPLE_KEY_ID &&
    process.env.APPLE_PRIVATE_KEY
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call
    passport.use(
      new AppleStrategy(
        {
          clientID: process.env.APPLE_CLIENT_ID,
          teamID: process.env.APPLE_TEAM_ID,
          keyID: process.env.APPLE_KEY_ID,
          privateKeyString: process.env.APPLE_PRIVATE_KEY.replace(/\n/g, '\n'),
          callbackURL: '/api/auth/apple/callback',
          scope: ['name', 'email'],
          passReqToCallback: false,
        },
        (
          accessToken: string,
          refreshToken: string,
          idToken: string,
          profile: AppleProfile,
          done: AppleVerifyCallback,
        ) => {
          void (async () => {
            try {
              const user = await oauthService.findOrCreateUser({
                provider: 'apple',
                socialId: profile.id,
                email: profile.email,
                username: profile.name
                  ? `${profile.name.firstName}${profile.name.lastName}`
                  : undefined,
                emailVerified: true, // Apple always verifies emails
              });

              if (!user) {
                return done(new Error('Failed to authenticate with Apple'));
              }

              return done(null, user);
            } catch (error) {
              logger.error('Error in Apple OAuth strategy:', error);
              return done(error as Error);
            }
          })();
        },
      ),
    );
  } else {
    logger.warn(
      'Apple OAuth is not configured. Missing required environment variables.',
    );
  }
};
