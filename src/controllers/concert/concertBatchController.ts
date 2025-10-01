import express from 'express';
import { ConcertBatchService } from '../../services/concert/concertBatchService';
import logger from '../../utils/logger/logger';
import { ResponseBuilder } from '../../utils/response/apiResponse';

export const batchUploadConcerts = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const result = await ConcertBatchService.batchUploadConcerts(req.body);

    if (result.success) {
      return ResponseBuilder.created(res, '콘서트 일괄 등록 성공', result.data);
    } else {
      return ResponseBuilder.badRequest(
        res,
        result.error || '콘서트 일괄 등록 실패',
        result.data ? JSON.stringify(result.data) : undefined,
      );
    }
  } catch (error) {
    logger.error('❌ 콘서트 일괄 등록 컨트롤러 에러:', error);
    return ResponseBuilder.internalError(
      res,
      '서버 에러로 콘서트 일괄 등록 실패',
      error instanceof Error ? error.message : '알 수 없는 에러',
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
      return ResponseBuilder.badRequest(
        res,
        result.error || '콘서트 일괄 수정 실패',
        result.data ? JSON.stringify(result.data) : undefined,
      );
    }
  } catch (error) {
    logger.error('❌ 콘서트 일괄 수정 컨트롤러 에러:', error);
    return ResponseBuilder.internalError(
      res,
      '서버 에러로 콘서트 일괄 수정 실패',
      error instanceof Error ? error.message : '알 수 없는 에러',
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
      return ResponseBuilder.badRequest(
        res,
        result.error || '콘서트 일괄 삭제 실패',
        result.data ? JSON.stringify(result.data) : undefined,
      );
    }
  } catch (error) {
    logger.error('❌ 콘서트 일괄 삭제 컨트롤러 에러:', error);
    return ResponseBuilder.internalError(
      res,
      '서버 에러로 콘서트 일괄 삭제 실패',
      error instanceof Error ? error.message : '알 수 없는 에러',
    );
  }
};
