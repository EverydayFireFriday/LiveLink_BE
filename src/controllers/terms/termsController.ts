import { Request, Response } from 'express';
import {
  getAllPolicyDocuments,
  getPolicyDocument,
  PolicyType,
} from '../../config/terms';
import { ResponseBuilder } from '../../utils/response/apiResponse';
import logger from '../../utils/logger/logger';

/**
 * 모든 약관 문서 조회
 * GET /terms
 */
export const getAllPolicies = (req: Request, res: Response) => {
  try {
    const policies = getAllPolicyDocuments();
    return ResponseBuilder.success(
      res,
      '약관을 성공적으로 조회했습니다.',
      policies,
    );
  } catch (error) {
    logger.error('약관 조회 에러:', error);
    return ResponseBuilder.internalError(res, '약관 조회 실패');
  }
};

/**
 * 특정 타입의 약관 문서 조회
 * GET /terms/:type
 */
export const getPolicyByType = (req: Request, res: Response) => {
  try {
    const { type } = req.params;

    // 유효한 약관 타입인지 확인
    if (!Object.values(PolicyType).includes(type as PolicyType)) {
      return ResponseBuilder.badRequest(
        res,
        '유효하지 않은 약관 타입입니다. (terms, privacy)',
      );
    }

    const policy = getPolicyDocument(type as PolicyType);
    return ResponseBuilder.success(
      res,
      '약관을 성공적으로 조회했습니다.',
      policy,
    );
  } catch (error) {
    logger.error('약관 조회 에러:', error);
    return ResponseBuilder.internalError(res, '약관 조회 실패');
  }
};

/**
 * 이용약관 조회 (하위 호환성)
 * GET /terms/termsAndConditions
 */
export const getTermsAndConditions = (req: Request, res: Response) => {
  try {
    const policy = getPolicyDocument(PolicyType.TERMS);
    return res.status(200).json({ termsAndConditions: policy.content });
  } catch (error) {
    logger.error('이용약관 조회 에러:', error);
    return res
      .status(500)
      .json({ message: 'Failed to retrieve terms and conditions.' });
  }
};
