import express from 'express';
import { ConcertBatchService } from '../../services/concert/concertBatchService';
import logger from '../../utils/logger/logger';
import { ResponseBuilder } from '../../utils/response/apiResponse';
import { ErrorCodes } from '../../utils/errors/errorCodes';
import {
  AppError,
  UnauthorizedError,
  NotFoundError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  InternalServerError,
} from '../../utils/errors/customErrors';

export const batchUploadConcerts = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const result = await ConcertBatchService.batchUploadConcerts(req.body);

    if (result.success) {
      return ResponseBuilder.created(res, '콘서트 일괄 등록 성공', result.data);
    } else {
      throw new BadRequestError(
        result.error || '콘서트 일괄 등록 실패',
        ErrorCodes.CONCERT_CREATE_FAILED,
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('❌ 콘서트 일괄 등록 컨트롤러 에러:', error);
    throw new InternalServerError(
      '서버 에러로 콘서트 일괄 등록 실패',
      ErrorCodes.SYS_INTERNAL_ERROR,
    );
  }
};

export const batchUpdateConcerts = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const result = await ConcertBatchService.batchUpdateConcerts(req.body);

    if (result.success) {
      return ResponseBuilder.success(res, '콘서트 일괄 수정 성공', result.data);
    } else {
      throw new BadRequestError(
        result.error || '콘서트 일괄 수정 실패',
        ErrorCodes.CONCERT_UPDATE_FAILED,
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('❌ 콘서트 일괄 수정 컨트롤러 에러:', error);
    throw new InternalServerError(
      '서버 에러로 콘서트 일괄 수정 실패',
      ErrorCodes.SYS_INTERNAL_ERROR,
    );
  }
};

export const batchDeleteConcerts = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const result = await ConcertBatchService.batchDeleteConcerts(req.body);

    if (result.success) {
      return ResponseBuilder.success(res, '콘서트 일괄 삭제 성공', result.data);
    } else {
      throw new BadRequestError(
        result.error || '콘서트 일괄 삭제 실패',
        ErrorCodes.CONCERT_DELETE_FAILED,
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('❌ 콘서트 일괄 삭제 컨트롤러 에러:', error);
    throw new InternalServerError(
      '서버 에러로 콘서트 일괄 삭제 실패',
      ErrorCodes.SYS_INTERNAL_ERROR,
    );
  }
};
