import express from 'express';
import { TestService } from '../../services/test/testService';
import logger from '../../utils/logger/logger';
import { ResponseBuilder } from '../../utils/response/apiResponse';
import { ObjectId } from 'mongodb';

export const uploadTestConcert = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    // 요청 데이터 유효성 검사
    if (!req.body) {
      return ResponseBuilder.badRequest(res, '요청 본문이 비어있습니다.');
    }

    // 미들웨어에서 이미 인증 처리되었으므로 여기서는 서비스 로직만
    const result = await TestService.createTestConcert(req.body);

    if (result.success) {
      // 세션 정보 가져오기 (개발환경에서는 임시 세션이 생성됨)
      const userInfo = {
        email:
          req.session?.user?.email ||
          process.env.DEFAULT_EMAIL ||
          'system@stagelives.com',
        username: req.session?.user?.username || 'unknown-user',
        userId: req.session?.user?.userId || 'unknown-id',
      };

      logger.info(
        `✅ 테스트 콘서트 정보 저장 완료: ${result.data.title} (UID: ${result.data.uid}) - 업로드 사용자: ${userInfo.username} (${userInfo.email})`,
      );

      return ResponseBuilder.created(res, '테스트 콘서트 정보 업로드 성공', {
        ...result.data,
        metadata: {
          imageInfo: {
            posterImageProvided: !!result.data.posterImage,
            infoImagesCount: result.data.infoImages
              ? result.data.infoImages.length
              : 0, // info → infoImages
          },
          userInfo: {
            uploadedBy: userInfo.email,
            username: userInfo.username,
            environment: process.env.NODE_ENV || 'development',
            loginTime: req.session?.user?.loginTime,
          },
          validation: {
            artistCount: result.data.artist?.length || 0,
            locationCount: result.data.location?.length || 0,
            datetimeCount: result.data.datetime?.length || 0,
            categoryCount: result.data.category?.length || 0,
          },
        },
      });
    } else {
      return ResponseBuilder.badRequest(
        res,
        result.error || '테스트 콘서트 업로드 실패',
      );
    }
  } catch (error) {
    logger.error('❌ 테스트 콘서트 업로드 컨트롤러 에러:', error);

    // 구체적인 에러 타입에 따른 응답
    if (error instanceof Error) {
      if (error.message.includes('유효성 검사 실패')) {
        return ResponseBuilder.badRequest(
          res,
          '입력 데이터가 유효하지 않습니다.',
          error.message,
        );
      }

      if (error.message.includes('중복')) {
        return ResponseBuilder.conflict(res, '중복된 콘서트 UID입니다.');
      }
    }

    return ResponseBuilder.internalError(
      res,
      '서버 에러로 테스트 콘서트 업로드 실패',
      error instanceof Error ? error.message : '알 수 없는 에러',
    );
  }
};

export const sendTestNotification = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    const { userId, fcmToken, count } = req.body;

    // userId나 fcmToken 중 하나는 필수
    if (!userId && !fcmToken) {
      return ResponseBuilder.badRequest(
        res,
        'userId 또는 fcmToken 중 하나는 필수입니다.',
      );
    }

    // count 유효성 검사
    const notificationCount = count || 30;
    if (notificationCount < 1 || notificationCount > 100) {
      return ResponseBuilder.badRequest(
        res,
        '알림 개수는 1~100 사이여야 합니다.',
      );
    }

    // userId 유효성 검사
    if (userId && !ObjectId.isValid(userId)) {
      return ResponseBuilder.badRequest(res, '유효하지 않은 userId입니다.');
    }

    const result = await TestService.sendTestNotifications({
      userId,
      fcmToken,
      count: notificationCount,
    });

    if (result.success) {
      logger.info(`✅ 테스트 알림 전송 완료: ${JSON.stringify(result.data)}`);
      return ResponseBuilder.success(res, '테스트 알림 전송 성공', result.data);
    } else {
      return ResponseBuilder.badRequest(
        res,
        result.error || '테스트 알림 전송 실패',
      );
    }
  } catch (error) {
    logger.error('❌ 테스트 알림 전송 컨트롤러 에러:', error);
    return ResponseBuilder.internalError(
      res,
      '서버 에러로 테스트 알림 전송 실패',
      error instanceof Error ? error.message : '알 수 없는 에러',
    );
  }
};
