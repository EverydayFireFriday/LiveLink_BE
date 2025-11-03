import { Request, Response, NextFunction } from 'express';
import {
  CURRENT_TERMS_VERSION,
  CURRENT_PRIVACY_VERSION,
  PolicyType,
} from '../../config/terms';
import logger from '../../utils/logger/logger';
import { UserService } from '../../services/auth/userService';
import { TermsConsent } from '../../models/auth/user';

/**
 * 약관 동의 조회 헬퍼 함수
 */
const findConsent = (
  consents: TermsConsent[],
  type: string,
): TermsConsent | undefined => {
  return consents.find((c) => c.type === type);
};

/**
 * 약관 버전 체크 미들웨어
 * 사용자가 최신 약관에 동의했는지 확인하고, 그렇지 않으면 응답 헤더에 표시합니다.
 * 이 미들웨어는 요청을 차단하지 않고, 클라이언트에게 약관 업데이트가 필요함을 알립니다.
 */
export const checkTermsVersion = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // 로그인하지 않은 사용자는 체크하지 않음
    if (!req.session.user) {
      return next();
    }

    const userService = new UserService();
    const user = await userService.findByEmail(req.session.user.email);

    if (!user) {
      return next();
    }

    const consents = user.termsConsents || [];

    // 각 약관 타입별 동의 정보 조회
    const termsConsent = findConsent(consents, PolicyType.TERMS);
    const privacyConsent = findConsent(consents, PolicyType.PRIVACY);

    // 약관 버전 체크
    const needsTermsUpdate =
      !termsConsent || termsConsent.version !== CURRENT_TERMS_VERSION;
    const needsPrivacyUpdate =
      !privacyConsent || privacyConsent.version !== CURRENT_PRIVACY_VERSION;

    // 업데이트가 필요하면 응답 헤더에 표시
    if (needsTermsUpdate || needsPrivacyUpdate) {
      res.setHeader('X-Terms-Update-Required', 'true');
      res.setHeader(
        'X-Terms-Update-Reason',
        JSON.stringify({
          needsTermsUpdate,
          needsPrivacyUpdate,
          currentTermsVersion: CURRENT_TERMS_VERSION,
          currentPrivacyVersion: CURRENT_PRIVACY_VERSION,
          userTermsVersion: termsConsent?.version || null,
          userPrivacyVersion: privacyConsent?.version || null,
        }),
      );

      logger.info(
        `[Terms] User ${user.email} needs to update terms consent: ` +
          `terms=${needsTermsUpdate}, privacy=${needsPrivacyUpdate}`,
      );
    }

    next();
  } catch (error) {
    logger.error('[Terms] Error checking terms version:', error);
    // 에러가 발생해도 요청을 차단하지 않음
    next();
  }
};

/**
 * 약관 동의 필수 미들웨어
 * 사용자가 최신 약관에 동의하지 않았으면 요청을 차단합니다.
 * 중요한 작업(결제, 민감한 정보 처리 등)에 사용할 수 있습니다.
 */
export const requireLatestTerms = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // 로그인하지 않은 사용자는 인증 미들웨어에서 처리
    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        message: '로그인이 필요합니다.',
      });
    }

    const userService = new UserService();
    const user = await userService.findByEmail(req.session.user.email);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.',
      });
    }

    const consents = user.termsConsents || [];

    // 각 약관 타입별 동의 정보 조회
    const termsConsent = findConsent(consents, PolicyType.TERMS);
    const privacyConsent = findConsent(consents, PolicyType.PRIVACY);

    // 약관 버전 체크
    const needsTermsUpdate =
      !termsConsent || termsConsent.version !== CURRENT_TERMS_VERSION;
    const needsPrivacyUpdate =
      !privacyConsent || privacyConsent.version !== CURRENT_PRIVACY_VERSION;

    if (needsTermsUpdate || needsPrivacyUpdate) {
      logger.warn(
        `[Terms] User ${user.email} attempted action without latest terms consent`,
      );

      return res.status(403).json({
        success: false,
        message: '최신 약관에 동의해야 이 기능을 사용할 수 있습니다.',
        requiresTermsUpdate: true,
        details: {
          needsTermsUpdate,
          needsPrivacyUpdate,
          currentTermsVersion: CURRENT_TERMS_VERSION,
          currentPrivacyVersion: CURRENT_PRIVACY_VERSION,
        },
      });
    }

    next();
  } catch (error) {
    logger.error('[Terms] Error requiring latest terms:', error);
    return res.status(500).json({
      success: false,
      message: '서버 에러가 발생했습니다.',
    });
  }
};
