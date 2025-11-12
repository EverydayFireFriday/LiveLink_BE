import express from 'express';
import { UserService } from '../../services/auth/userService';
import { UserValidator } from '../../utils/validation/auth/userValidator';
import { safeParseInt } from '../../utils/number/numberUtils';
import logger from '../../utils/logger/logger';
import { ResponseBuilder } from '../../utils/response/apiResponse';
import { ErrorCodes } from '../../utils/errors/errorCodes';
import {
  AppError,
  BadRequestError,
  NotFoundError,
  ConflictError,
  InternalServerError,
} from '../../utils/errors/customErrors';

export class ProfileController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  getProfile = async (req: express.Request, res: express.Response) => {
    try {
      const user = await this.userService.findUserWithLikes(
        req.session.user!.email,
      );

      if (!user) {
        throw new NotFoundError(
          '사용자를 찾을 수 없습니다.',
          ErrorCodes.AUTH_USER_NOT_FOUND,
        );
      }

      return ResponseBuilder.success(res, '프로필 조회 성공', {
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          profileImage: user.profileImage,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          likedConcerts: user.likedConcerts || [],
          likedArticles: user.likedArticles || [],
          fcmToken: user.fcmToken,
          fcmTokenUpdatedAt: user.fcmTokenUpdatedAt,
          notificationPreference: user.notificationPreference,
          hasPassword: !!user.passwordHash, // 비밀번호 설정 여부 (회원탈퇴 시 필요)
          oauthProviders: user.oauthProviders?.map((p) => p.provider) || [], // OAuth 연동 정보
        },
        session: req.session.user,
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('프로필 조회 에러:', error);
      throw new InternalServerError(
        '프로필 조회 실패',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };

  updateProfile = async (req: express.Request, res: express.Response) => {
    try {
      const { profileImage } = req.body;
      const userId = req.session.user!.userId;

      const updatedUser = await this.userService.updateUser(userId, {
        profileImage,
      });

      if (!updatedUser) {
        throw new NotFoundError(
          '사용자를 찾을 수 없습니다.',
          ErrorCodes.AUTH_USER_NOT_FOUND,
        );
      }

      // 세션 정보도 업데이트
      req.session.user!.profileImage = profileImage;

      return ResponseBuilder.success(res, '프로필 업데이트 성공', {
        user: {
          id: updatedUser._id,
          email: updatedUser.email,
          username: updatedUser.username,
          profileImage: updatedUser.profileImage,
          updatedAt: updatedUser.updatedAt,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('프로필 업데이트 에러:', error);
      throw new InternalServerError(
        '프로필 업데이트 실패',
        ErrorCodes.USER_PROFILE_UPDATE_FAILED,
      );
    }
  };

  updateUsername = async (req: express.Request, res: express.Response) => {
    const { newUsername } = req.body;

    const usernameValidation = UserValidator.validateUsername(newUsername);
    if (!usernameValidation.isValid) {
      throw new BadRequestError(
        usernameValidation.message || '별명 형식이 올바르지 않습니다.',
        ErrorCodes.VAL_INVALID_FORMAT,
      );
    }

    try {
      const userId = req.session.user!.userId;
      const currentUser = await this.userService.findById(userId);

      if (!currentUser) {
        throw new NotFoundError(
          '사용자를 찾을 수 없습니다.',
          ErrorCodes.AUTH_USER_NOT_FOUND,
        );
      }

      if (currentUser.username === newUsername) {
        throw new BadRequestError(
          '현재 별명과 동일합니다.',
          ErrorCodes.VAL_INVALID_INPUT,
        );
      }

      const existingUser = await this.userService.findByUsername(newUsername);
      if (existingUser) {
        throw new ConflictError(
          '이미 사용 중인 별명입니다.',
          ErrorCodes.AUTH_USERNAME_TAKEN,
        );
      }

      const updatedUser = await this.userService.updateUser(userId, {
        username: newUsername,
      });

      if (!updatedUser) {
        throw new NotFoundError(
          '사용자 업데이트에 실패했습니다.',
          ErrorCodes.USER_UPDATE_FAILED,
        );
      }

      req.session.user!.username = newUsername;

      return ResponseBuilder.success(res, '별명이 성공적으로 변경되었습니다.', {
        user: {
          id: updatedUser._id,
          email: updatedUser.email,
          username: updatedUser.username,
          profileImage: updatedUser.profileImage,
          updatedAt: updatedUser.updatedAt,
        },
        previousUsername: currentUser.username,
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('별명 변경 에러:', error);
      throw new InternalServerError(
        '별명 변경 실패',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };

  getAllUsers = async (req: express.Request, res: express.Response) => {
    try {
      const limit = safeParseInt(req.query.limit, 50);
      const skip = safeParseInt(req.query.skip, 0);

      const users = await this.userService.getAllUsers(limit, skip);
      const totalUsers = await this.userService.countUsers();

      const safeUsers = users.map((user) => ({
        id: user._id,
        email: user.email,
        username: user.username,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));

      return ResponseBuilder.paginated(
        res,
        '사용자 목록 조회 성공',
        safeUsers,
        {
          total: totalUsers,
          page: Math.floor(skip / limit) + 1,
          limit,
          totalPages: Math.ceil(totalUsers / limit),
        },
      );
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('사용자 목록 조회 에러:', error);
      throw new InternalServerError(
        '사용자 목록 조회 실패',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };

  updateFCMToken = async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.session.user!.userId;
      const { fcmToken } = req.body;

      if (!fcmToken || typeof fcmToken !== 'string') {
        throw new BadRequestError(
          'FCM 토큰이 필요합니다.',
          ErrorCodes.VAL_MISSING_FIELD,
        );
      }

      const updatedUser = await this.userService.updateUser(userId, {
        fcmToken,
        fcmTokenUpdatedAt: new Date(),
      });

      if (!updatedUser) {
        throw new NotFoundError(
          '사용자를 찾을 수 없습니다.',
          ErrorCodes.AUTH_USER_NOT_FOUND,
        );
      }

      logger.info(
        `✅ FCM 토큰 등록: 사용자 ${updatedUser.username} (${updatedUser.email})`,
      );

      return ResponseBuilder.success(res, 'FCM 토큰이 등록되었습니다.', {
        fcmTokenRegistered: true,
        registeredAt: updatedUser.fcmTokenUpdatedAt,
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('FCM 토큰 등록 에러:', error);
      throw new InternalServerError(
        'FCM 토큰 등록 실패',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };
}
