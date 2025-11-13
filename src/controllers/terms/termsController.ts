import { Request, Response } from 'express';
import {
  getAllPolicyDocuments,
  getPolicyDocument,
  PolicyType,
} from '../../config/terms';
import { ResponseBuilder } from '../../utils/response/apiResponse';
import logger from '../../utils/logger/logger';
import { ErrorCodes } from '../../utils/errors/errorCodes';
import {
  AppError,
  BadRequestError,
  InternalServerError,
} from '../../utils/errors/customErrors';

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
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('약관 조회 에러:', error);
    throw new InternalServerError('약관 조회 실패', ErrorCodes.SYS_INTERNAL_ERROR);
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
      throw new BadRequestError(
        '유효하지 않은 약관 타입입니다. (terms, privacy)',
        ErrorCodes.VAL_INVALID_INPUT,
      );
    }

    const policy = getPolicyDocument(type as PolicyType);
    return ResponseBuilder.success(
      res,
      '약관을 성공적으로 조회했습니다.',
      policy,
    );
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('약관 조회 에러:', error);
    throw new InternalServerError('약관 조회 실패', ErrorCodes.SYS_INTERNAL_ERROR);
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
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('이용약관 조회 에러:', error);
    throw new InternalServerError(
      'Failed to retrieve terms and conditions.',
      ErrorCodes.SYS_INTERNAL_ERROR,
    );
  }
};
