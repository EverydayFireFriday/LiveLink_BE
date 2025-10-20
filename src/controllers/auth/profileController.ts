import express from 'express';
import { UserService } from '../../services/auth/userService';
import { UserValidator } from '../../utils/validation/auth/userValidator';
import { safeParseInt } from '../../utils/number/numberUtils';
import logger from '../../utils/logger/logger';
import { ResponseBuilder } from '../../utils/response/apiResponse';

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
        return ResponseBuilder.notFound(res, '사용자를 찾을 수 없습니다.');
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
        },
        session: req.session.user,
      });
    } catch (error) {
      logger.error('프로필 조회 에러:', error);
      return ResponseBuilder.internalError(res, '프로필 조회 실패');
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
        return ResponseBuilder.notFound(res, '사용자를 찾을 수 없습니다.');
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
      logger.error('프로필 업데이트 에러:', error);
      return ResponseBuilder.internalError(res, '프로필 업데이트 실패');
    }
  };

  updateUsername = async (req: express.Request, res: express.Response) => {
    const { newUsername } = req.body;

    const usernameValidation = UserValidator.validateUsername(newUsername);
    if (!usernameValidation.isValid) {
      return ResponseBuilder.badRequest(
        res,
        usernameValidation.message || '별명 형식이 올바르지 않습니다.',
      );
    }

    try {
      const userId = req.session.user!.userId;
      const currentUser = await this.userService.findById(userId);

      if (!currentUser) {
        return ResponseBuilder.notFound(res, '사용자를 찾을 수 없습니다.');
      }

      if (currentUser.username === newUsername) {
        return ResponseBuilder.badRequest(res, '현재 별명과 동일합니다.');
      }

      const existingUser = await this.userService.findByUsername(newUsername);
      if (existingUser) {
        return ResponseBuilder.conflict(res, '이미 사용 중인 별명입니다.');
      }

      const updatedUser = await this.userService.updateUser(userId, {
        username: newUsername,
      });

      if (!updatedUser) {
        return ResponseBuilder.notFound(res, '사용자 업데이트에 실패했습니다.');
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
      logger.error('별명 변경 에러:', error);
      return ResponseBuilder.internalError(res, '별명 변경 실패');
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
      logger.error('사용자 목록 조회 에러:', error);
      return ResponseBuilder.internalError(res, '사용자 목록 조회 실패');
    }
  };

  updateFCMToken = async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.session.user!.userId;
      const { fcmToken } = req.body;

      if (!fcmToken || typeof fcmToken !== 'string') {
        return ResponseBuilder.badRequest(res, 'FCM 토큰이 필요합니다.');
      }

      const updatedUser = await this.userService.updateUser(userId, {
        fcmToken,
        fcmTokenUpdatedAt: new Date(),
      });

      if (!updatedUser) {
        return ResponseBuilder.notFound(res, '사용자를 찾을 수 없습니다.');
      }

      logger.info(
        `✅ FCM 토큰 등록: 사용자 ${updatedUser.username} (${updatedUser.email})`,
      );

      return ResponseBuilder.success(res, 'FCM 토큰이 등록되었습니다.', {
        fcmTokenRegistered: true,
        registeredAt: updatedUser.fcmTokenUpdatedAt,
      });
    } catch (error) {
      logger.error('FCM 토큰 등록 에러:', error);
      return ResponseBuilder.internalError(res, 'FCM 토큰 등록 실패');
    }
  };
}
