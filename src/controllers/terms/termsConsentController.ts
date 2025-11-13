import { Request, Response } from 'express';
import {
  CURRENT_TERMS_VERSION,
  CURRENT_PRIVACY_VERSION,
  CURRENT_MARKETING_VERSION,
  PolicyType,
} from '../../config/terms';
import { ResponseBuilder } from '../../utils/response/apiResponse';
import logger from '../../utils/logger/logger';
import { UserService } from '../../services/auth/userService';
import { TermsConsent } from '../../models/auth/user';
import { ErrorCodes } from '../../utils/errors/errorCodes';
import {
  AppError,
  UnauthorizedError,
  NotFoundError,
  BadRequestError,
  InternalServerError,
} from '../../utils/errors/customErrors';

/**
 * 약관 동의 상태 조회 헬퍼 함수
 */
const findConsent = (
  consents: TermsConsent[],
  type: string,
): TermsConsent | undefined => {
  return consents.find((c) => c.type === type);
};

/**
 * 약관 동의 상태 조회
 * GET /users/me/terms-consent
 */
export const getMyTermsConsent = async (req: Request, res: Response) => {
  if (!req.session.user) {
    throw new UnauthorizedError(
      '로그인이 필요합니다.',
      ErrorCodes.AUTH_UNAUTHORIZED,
    );
  }

  try {
    const userService = new UserService();
    const user = await userService.findByEmail(req.session.user.email);

    if (!user) {
      throw new NotFoundError(
        '사용자를 찾을 수 없습니다.',
        ErrorCodes.USER_NOT_FOUND,
      );
    }

    const consents = user.termsConsents || [];

    // 각 약관 타입별 동의 정보 조회
    const termsConsent = findConsent(consents, PolicyType.TERMS);
    const privacyConsent = findConsent(consents, PolicyType.PRIVACY);
    const marketingConsent = findConsent(consents, PolicyType.MARKETING);

    // 약관 버전 비교
    const needsTermsUpdate =
      !termsConsent || termsConsent.version !== CURRENT_TERMS_VERSION;
    const needsPrivacyUpdate =
      !privacyConsent || privacyConsent.version !== CURRENT_PRIVACY_VERSION;

    return ResponseBuilder.success(res, '약관 동의 상태 조회 성공', {
      terms: {
        isAgreed: termsConsent?.isAgreed || false,
        version: termsConsent?.version || null,
        agreedAt: termsConsent?.agreedAt,
        needsUpdate: needsTermsUpdate,
        currentVersion: CURRENT_TERMS_VERSION,
      },
      privacy: {
        isAgreed: privacyConsent?.isAgreed || false,
        version: privacyConsent?.version || null,
        agreedAt: privacyConsent?.agreedAt,
        needsUpdate: needsPrivacyUpdate,
        currentVersion: CURRENT_PRIVACY_VERSION,
      },
      marketing: {
        isConsented: marketingConsent?.isAgreed || false,
        consentedAt: marketingConsent?.agreedAt,
        currentVersion: CURRENT_MARKETING_VERSION,
      },
      requiresAction: needsTermsUpdate || needsPrivacyUpdate,
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('약관 동의 상태 조회 에러:', error);
    throw new InternalServerError(
      '약관 동의 상태 조회 실패',
      ErrorCodes.SYS_INTERNAL_ERROR,
    );
  }
};

/**
 * 약관 재동의 (업데이트)
 * PUT /users/me/terms-consent
 */
export const updateTermsConsent = async (req: Request, res: Response) => {
  if (!req.session.user) {
    throw new UnauthorizedError(
      '로그인이 필요합니다.',
      ErrorCodes.AUTH_UNAUTHORIZED,
    );
  }

  try {
    const { termsConsents }: { termsConsents?: TermsConsent[] } = req.body;

    // 요청 검증
    if (!termsConsents || !Array.isArray(termsConsents)) {
      throw new BadRequestError(
        'termsConsents 배열이 필요합니다.',
        ErrorCodes.VAL_MISSING_FIELD,
      );
    }

    // 필수 약관 동의 검증
    const termsConsent = termsConsents.find((c) => c.type === 'terms');
    const privacyConsent = termsConsents.find((c) => c.type === 'privacy');

    if (termsConsent && termsConsent.isAgreed === false) {
      throw new BadRequestError(
        '이용약관에는 반드시 동의해야 합니다.',
        ErrorCodes.AUTH_TERMS_NOT_AGREED,
      );
    }

    if (privacyConsent && privacyConsent.isAgreed === false) {
      throw new BadRequestError(
        '개인정보처리방침에는 반드시 동의해야 합니다.',
        ErrorCodes.AUTH_TERMS_NOT_AGREED,
      );
    }

    const userService = new UserService();
    const user = await userService.findByEmail(req.session.user.email);

    if (!user) {
      throw new NotFoundError(
        '사용자를 찾을 수 없습니다.',
        ErrorCodes.USER_NOT_FOUND,
      );
    }

    const now = new Date();
    const updatedConsents = [...(user.termsConsents || [])];

    // 요청받은 약관 동의 정보로 업데이트
    termsConsents.forEach((requestConsent) => {
      const existingIndex = updatedConsents.findIndex(
        (c) => c.type === requestConsent.type,
      );

      // 버전 결정
      let version = requestConsent.version;
      if (!version) {
        if (requestConsent.type === 'terms') {
          version = CURRENT_TERMS_VERSION;
        } else if (requestConsent.type === 'privacy') {
          version = CURRENT_PRIVACY_VERSION;
        } else if (requestConsent.type === 'marketing') {
          version = CURRENT_MARKETING_VERSION;
        } else {
          version = '1.0.0';
        }
      }

      const newConsent: TermsConsent = {
        type: requestConsent.type,
        isAgreed: requestConsent.isAgreed,
        version,
        agreedAt: requestConsent.isAgreed ? now : undefined,
      };

      if (existingIndex >= 0) {
        updatedConsents[existingIndex] = newConsent;
      } else {
        updatedConsents.push(newConsent);
      }
    });

    // 사용자 정보 업데이트
    const updatedUser = await userService.updateUser(user._id!.toString(), {
      termsConsents: updatedConsents,
    });

    if (!updatedUser) {
      throw new InternalServerError(
        '약관 동의 업데이트 실패',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }

    logger.info(
      `[Terms] User ${user.email} updated terms consent: ` +
        JSON.stringify(updatedConsents),
    );

    // 응답 데이터 생성
    const responseTermsConsent = findConsent(updatedConsents, PolicyType.TERMS);
    const responsePrivacyConsent = findConsent(
      updatedConsents,
      PolicyType.PRIVACY,
    );
    const responseMarketingConsent = findConsent(
      updatedConsents,
      PolicyType.MARKETING,
    );

    return ResponseBuilder.success(res, '약관 동의가 업데이트되었습니다.', {
      terms: {
        isAgreed: responseTermsConsent?.isAgreed || false,
        version: responseTermsConsent?.version || null,
        agreedAt: responseTermsConsent?.agreedAt,
      },
      privacy: {
        isAgreed: responsePrivacyConsent?.isAgreed || false,
        version: responsePrivacyConsent?.version || null,
        agreedAt: responsePrivacyConsent?.agreedAt,
      },
      marketing: {
        isConsented: responseMarketingConsent?.isAgreed || false,
        consentedAt: responseMarketingConsent?.agreedAt,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('약관 동의 업데이트 에러:', error);
    throw new InternalServerError(
      '약관 동의 업데이트 실패',
      ErrorCodes.SYS_INTERNAL_ERROR,
    );
  }
};
