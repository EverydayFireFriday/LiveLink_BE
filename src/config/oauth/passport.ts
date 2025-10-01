import { PassportStatic } from 'passport';
import {
  Strategy as GoogleStrategy,
  Profile as GoogleProfile,
  VerifyCallback,
} from 'passport-google-oauth20';
import { Strategy as AppleStrategy } from 'passport-apple';
import { UserModel, User } from '../../models/auth/user';
import logger from '../../utils/logger/logger';

// OAuth 프로필 타입 정의
interface GoogleProfileExtended extends GoogleProfile {
  emails?: Array<{ value: string; verified: boolean }>;
  photos?: Array<{ value: string }>;
}

// Apple Profile 타입 정의
interface AppleProfileData {
  id: string;
  email?: string;
  name?: {
    firstName?: string;
    lastName?: string;
  };
}

// Apple Verify Callback 타입
type AppleVerifyCallbackType = (
  error: Error | null | undefined,
  user?: User | false,
  info?: unknown,
) => void;

export const configurePassport = (passport: PassportStatic) => {
  const userModel = new UserModel();

  // Passport.js 직렬화 및 역직렬화
  passport.serializeUser((user, done) => {
    done(null, (user as User)._id?.toHexString());
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await userModel.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Google OAuth 2.0 전략 설정
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: '/api/auth/google/callback',
          scope: ['profile', 'email'],
        },
        async (
          accessToken: string,
          refreshToken: string,
          profile: GoogleProfileExtended,
          done: VerifyCallback,
        ) => {
          try {
            const socialId = profile.id;
            const provider = 'google';

            // 1. 소셜 ID로 기존 사용자 찾기
            let user = await userModel.findByProviderAndSocialId(
              provider,
              socialId,
            );

            if (user) {
              return done(null, user);
            }

            // 2. 이메일로 기존 사용자 찾기 (다른 방식으로 가입했을 경우)
            if (profile.emails && profile.emails.length > 0) {
              const email = profile.emails[0].value;
              user = await userModel.findByEmail(email);

              if (user) {
                // 소셜 정보 업데이트 후 반환
                user.provider = provider;
                user.socialId = socialId;
                const updatedUser = await userModel.updateUser(user._id!, {
                  provider,
                  socialId,
                });
                if (!updatedUser) {
                  return done(new Error('Failed to link Google account.'));
                }
                return done(null, updatedUser);
              }
            }

            // 3. 신규 사용자 생성
            const newUser: Partial<User> = {
              email: profile.emails?.[0].value,
              username: profile.displayName || `${provider}_${socialId}`,
              provider,
              socialId,
              profileImage: profile.photos?.[0].value,
              isTermsAgreed: false,
              termsVersion: '1.0',
            };

            // username 중복 체크
            const existingUser = await userModel.findByUsername(
              newUser.username!,
            );
            if (existingUser) {
              newUser.username = `${newUser.username}_${Date.now()}`;
            }

            const createdUser = await userModel.createUser(
              newUser as Omit<User, '_id' | 'createdAt' | 'updatedAt'>,
            );
            return done(null, createdUser);
          } catch (error) {
            logger.error('Error in Google OAuth strategy:', error);
            return done(error as Error);
          }
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
    passport.use(
      new AppleStrategy(
        {
          clientID: process.env.APPLE_CLIENT_ID,
          teamID: process.env.APPLE_TEAM_ID,
          keyID: process.env.APPLE_KEY_ID,
          privateKeyString: process.env.APPLE_PRIVATE_KEY.replace(/\n/g, '\n'),
          callbackURL: '/api/auth/apple/callback',
          scope: ['name', 'email'],
        },
        async (
          accessToken: string,
          refreshToken: string,
          idToken: unknown,
          profile: AppleProfileData,
          done: AppleVerifyCallbackType,
        ) => {
          try {
            const socialId = profile.id;
            const provider = 'apple';

            // 1. 소셜 ID로 기존 사용자 찾기
            let user = await userModel.findByProviderAndSocialId(
              provider,
              socialId,
            );

            if (user) {
              return done(null, user);
            }

            // 2. 이메일로 기존 사용자 찾기 (다른 방식으로 가입했을 경우)
            if (profile.email) {
              user = await userModel.findByEmail(profile.email);

              if (user) {
                // 소셜 정보 업데이트 후 반환
                user.provider = provider;
                user.socialId = socialId;
                const updatedUser = await userModel.updateUser(user._id!, {
                  provider,
                  socialId,
                });
                if (!updatedUser) {
                  return done(new Error('Failed to link Apple account.'));
                }
                return done(null, updatedUser);
              }
            }

            // 3. 신규 사용자 생성
            const newUser: Partial<User> = {
              email: profile.email,
              username: profile.name
                ? `${profile.name.firstName}${profile.name.lastName}`
                : `${provider}_${socialId}`,
              provider,
              socialId,
              isTermsAgreed: false,
              termsVersion: '1.0',
            };

            // username 중복 체크
            const existingUser = await userModel.findByUsername(
              newUser.username!,
            );
            if (existingUser) {
              newUser.username = `${newUser.username}_${Date.now()}`;
            }

            const createdUser = await userModel.createUser(
              newUser as Omit<User, '_id' | 'createdAt' | 'updatedAt'>,
            );
            return done(null, createdUser);
          } catch (error) {
            logger.error('Error in Apple OAuth strategy:', error);
            return done(error as Error);
          }
        },
      ),
    );
  } else {
    logger.warn(
      'Apple OAuth is not configured. Missing required environment variables.',
    );
  }
};
