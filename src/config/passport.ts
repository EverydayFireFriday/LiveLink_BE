import { PassportStatic } from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { UserModel, User } from '../models/auth/user';
import logger from '../utils/logger';

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
        async (accessToken, refreshToken, profile, done) => {
          try {
            const socialId = profile.id;
            const provider = 'google';

            // 1. 소셜 ID로 기존 사용자 찾기
            let user = await userModel.findByProviderAndSocialId(provider, socialId);

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
                const updatedUser = await userModel.updateUser(user._id!, { provider, socialId });
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
            };

            // username 중복 체크
            const existingUser = await userModel.findByUsername(newUser.username!);
            if (existingUser) {
              newUser.username = `${newUser.username}_${Date.now()}`;
            }

            const createdUser = await userModel.createUser(newUser as any);
            return done(null, createdUser);

          } catch (error) {
            logger.error('Error in Google OAuth strategy:', error);
            return done(error as Error);
          }
        }
      )
    );
  } else {
    logger.warn('Google OAuth is not configured. Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.');
  }
};
