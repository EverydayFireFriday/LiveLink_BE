import express from 'express';
import { ConcertBatchService } from '../../services/concert/concertBatchService';
import logger from '../../utils/logger/logger';

export const batchUploadConcerts = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const result = await ConcertBatchService.batchUploadConcerts(req.body);

    if (result.success) {
      res.status(result.statusCode!).json(result.data);
    } else {
      res.status(result.statusCode!).json({
        message: result.error,
        ...(result.data && { ...result.data }),
      });
    }
  } catch (error) {
    logger.error('❌ 콘서트 일괄 등록 컨트롤러 에러:', error);
    res.status(500).json({
      message: '서버 에러로 콘서트 일괄 등록 실패',
      error: error instanceof Error ? error.message : '알 수 없는 에러',
      timestamp: new Date().toISOString(),
    });
  }
};

export const batchUpdateConcerts = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const result = await ConcertBatchService.batchUpdateConcerts(req.body);

    if (result.success) {
      res.status(result.statusCode!).json(result.data);
    } else {
      res.status(result.statusCode!).json({
        message: result.error,
        ...(result.data && { ...result.data }),
      });
    }
  } catch (error) {
    logger.error('❌ 콘서트 일괄 수정 컨트롤러 에러:', error);
    res.status(500).json({
      message: '서버 에러로 콘서트 일괄 수정 실패',
      error: error instanceof Error ? error.message : '알 수 없는 에러',
      timestamp: new Date().toISOString(),
    });
  }
};

export const batchDeleteConcerts = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const result = await ConcertBatchService.batchDeleteConcerts(req.body);

    if (result.success) {
      res.status(result.statusCode!).json(result.data);
    } else {
      res.status(result.statusCode!).json({
        message: result.error,
        ...(result.data && { ...result.data }),
      });
    }
  } catch (error) {
    logger.error('❌ 콘서트 일괄 삭제 컨트롤러 에러:', error);
    res.status(500).json({
      message: '서버 에러로 콘서트 일괄 삭제 실패',
      error: error instanceof Error ? error.message : '알 수 없는 에러',
      timestamp: new Date().toISOString(),
    });
  }
};


