import { Request, Response } from 'express';
import {
  CURRENT_TERMS_VERSION,
  CURRENT_PRIVACY_VERSION,
  CURRENT_MARKETING_VERSION,
} from '../../config/terms';
import { ResponseBuilder } from '../../utils/response/apiResponse';
import logger from '../../utils/logger/logger';
import { UserService } from '../../services/auth/userService';

/**
 * 약관 동의 상태 조회
 * GET /users/me/terms-consent
 */
export const getMyTermsConsent = async (req: Request, res: Response) => {
  try {
    if (!req.session.user) {
      return ResponseBuilder.unauthorized(res, '로그인이 필요합니다.');
    }

    const userService = new UserService();
    const user = await userService.findByEmail(req.session.user.email);

    if (!user) {
      return ResponseBuilder.notFound(res, '사용자를 찾을 수 없습니다.');
    }

    // 약관 버전 비교
    const needsTermsUpdate = user.termsVersion !== CURRENT_TERMS_VERSION;
    const needsPrivacyUpdate =
      !user.privacyVersion || user.privacyVersion !== CURRENT_PRIVACY_VERSION;

    return ResponseBuilder.success(res, '약관 동의 상태 조회 성공', {
      terms: {
        isAgreed: user.isTermsAgreed,
        version: user.termsVersion,
        agreedAt: user.termsAgreedAt,
        needsUpdate: needsTermsUpdate,
        currentVersion: CURRENT_TERMS_VERSION,
      },
      privacy: {
        isAgreed: user.isPrivacyAgreed || false,
        version: user.privacyVersion || null,
        agreedAt: user.privacyAgreedAt,
        needsUpdate: needsPrivacyUpdate,
        currentVersion: CURRENT_PRIVACY_VERSION,
      },
      marketing: {
        isConsented: user.marketingConsent || false,
        consentedAt: user.marketingConsentAt,
        currentVersion: CURRENT_MARKETING_VERSION,
      },
      requiresAction: needsTermsUpdate || needsPrivacyUpdate,
    });
  } catch (error) {
    logger.error('약관 동의 상태 조회 에러:', error);
    return ResponseBuilder.internalError(res, '약관 동의 상태 조회 실패');
  }
};

/**
 * 약관 재동의 (업데이트)
 * PUT /users/me/terms-consent
 */
export const updateTermsConsent = async (req: Request, res: Response) => {
  try {
    if (!req.session.user) {
      return ResponseBuilder.unauthorized(res, '로그인이 필요합니다.');
    }

    const {
      isTermsAgreed,
      isPrivacyAgreed,
      marketingConsent,
    }: {
      isTermsAgreed?: boolean;
      isPrivacyAgreed?: boolean;
      marketingConsent?: boolean;
    } = req.body;

    // 필수 약관 동의 검증
    if (isTermsAgreed === false || isPrivacyAgreed === false) {
      return ResponseBuilder.badRequest(
        res,
        '필수 약관에는 반드시 동의해야 합니다.',
      );
    }

    const userService = new UserService();
    const user = await userService.findByEmail(req.session.user.email);

    if (!user) {
      return ResponseBuilder.notFound(res, '사용자를 찾을 수 없습니다.');
    }

    const now = new Date();
    const updateData: Record<string, unknown> = {};

    // 이용약관 업데이트
    if (isTermsAgreed !== undefined) {
      updateData.isTermsAgreed = isTermsAgreed;
      updateData.termsVersion = CURRENT_TERMS_VERSION;
      updateData.termsAgreedAt = now;
    }

    // 개인정보처리방침 업데이트
    if (isPrivacyAgreed !== undefined) {
      updateData.isPrivacyAgreed = isPrivacyAgreed;
      updateData.privacyVersion = CURRENT_PRIVACY_VERSION;
      updateData.privacyAgreedAt = now;
    }

    // 마케팅 동의 업데이트
    if (marketingConsent !== undefined) {
      updateData.marketingConsent = marketingConsent;
      updateData.marketingConsentAt = marketingConsent ? now : undefined;
    }

    // 사용자 정보 업데이트
    const updatedUser = await userService.updateUser(
      user._id!.toString(),
      updateData,
    );

    if (!updatedUser) {
      return ResponseBuilder.internalError(res, '약관 동의 업데이트 실패');
    }

    logger.info(
      `[Terms] User ${user.email} updated terms consent: ` +
        JSON.stringify(updateData),
    );

    return ResponseBuilder.success(res, '약관 동의가 업데이트되었습니다.', {
      terms: {
        isAgreed: updatedUser.isTermsAgreed,
        version: updatedUser.termsVersion,
        agreedAt: updatedUser.termsAgreedAt,
      },
      privacy: {
        isAgreed: updatedUser.isPrivacyAgreed || false,
        version: updatedUser.privacyVersion || null,
        agreedAt: updatedUser.privacyAgreedAt,
      },
      marketing: {
        isConsented: updatedUser.marketingConsent || false,
        consentedAt: updatedUser.marketingConsentAt,
      },
    });
  } catch (error) {
    logger.error('약관 동의 업데이트 에러:', error);
    return ResponseBuilder.internalError(res, '약관 동의 업데이트 실패');
  }
};
