import express from 'express';
import { setlistService } from '../../services/setlist/setlistService';
import logger from '../../utils/logger/logger';
import { ResponseBuilder } from '../../utils/response/apiResponse';
import { ErrorCodes } from '../../utils/errors/errorCodes';
import {
  BadRequestError,
  NotFoundError,
  InternalServerError,
} from '../../utils/errors/customErrors';

export const getSetlist = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const { concertId } = req.params;

    if (!concertId) {
      throw new BadRequestError(
        'concertId는 필수입니다.',
        ErrorCodes.VAL_MISSING_FIELD,
      );
    }

    const result = await setlistService.getSetlistByConcertId(concertId);

    if (!result.success) {
      if (result.statusCode === 404) {
        throw new NotFoundError(
          result.error || '콘서트를 찾을 수 없습니다.',
          ErrorCodes.CONCERT_NOT_FOUND,
        );
      }
      throw new InternalServerError(
        result.error || '셋리스트 조회 중 오류가 발생했습니다.',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }

    logger.info(`셋리스트 조회: ${concertId}`);
    return ResponseBuilder.success(res, '셋리스트 조회 성공', result.data);
  } catch (error) {
    logger.error('셋리스트 조회 중 오류:', error);
    throw error;
  }
};

export const createOrUpdateSetlist = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const { concertId, setList } = req.body;

    if (!concertId || !setList) {
      throw new BadRequestError(
        'concertId와 setList는 필수입니다.',
        ErrorCodes.VAL_MISSING_FIELD,
      );
    }

    if (!Array.isArray(setList) || setList.length === 0) {
      throw new BadRequestError(
        'setList는 비어있지 않은 배열이어야 합니다.',
        ErrorCodes.VAL_INVALID_FORMAT,
      );
    }

    const result = await setlistService.createOrUpdateSetlist({
      concertId,
      setList,
    });

    if (!result.success) {
      if (result.statusCode === 404) {
        throw new NotFoundError(
          result.error || '콘서트를 찾을 수 없습니다.',
          ErrorCodes.CONCERT_NOT_FOUND,
        );
      }
      if (result.statusCode === 400) {
        throw new BadRequestError(
          result.error || '잘못된 요청입니다.',
          ErrorCodes.VAL_INVALID_FORMAT,
        );
      }
      throw new InternalServerError(
        result.error || '셋리스트 저장 중 오류가 발생했습니다.',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }

    const isCreated = result.statusCode === 201;
    logger.info(`셋리스트 ${isCreated ? '생성' : '업데이트'}: ${concertId}`);

    if (isCreated) {
      return ResponseBuilder.created(res, '셋리스트 생성 성공', result.data);
    }

    return ResponseBuilder.success(res, '셋리스트 업데이트 성공', result.data);
  } catch (error) {
    logger.error('셋리스트 생성/업데이트 중 오류:', error);
    throw error;
  }
};

export const deleteSetlist = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const { concertId } = req.params;

    if (!concertId) {
      throw new BadRequestError(
        'concertId는 필수입니다.',
        ErrorCodes.VAL_MISSING_FIELD,
      );
    }

    const result = await setlistService.deleteSetlist(concertId);

    if (!result.success) {
      if (result.statusCode === 404) {
        throw new NotFoundError(
          result.error || '셋리스트를 찾을 수 없습니다.',
          ErrorCodes.CONCERT_NOT_FOUND,
        );
      }
      throw new InternalServerError(
        result.error || '셋리스트 삭제 중 오류가 발생했습니다.',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }

    logger.info(`셋리스트 삭제: ${concertId}`);
    return ResponseBuilder.success(res, '셋리스트 삭제 성공');
  } catch (error) {
    logger.error('셋리스트 삭제 중 오류:', error);
    throw error;
  }
};
