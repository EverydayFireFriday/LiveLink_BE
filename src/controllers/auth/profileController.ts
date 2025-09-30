import express from 'express';
import { UserService } from '../../services/auth/userService';
import { UserValidator } from '../../utils/validation/auth/userValidator';
import { safeParseInt } from '../../utils/number/numberUtils';
import logger from '../../utils/logger/logger';

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
        res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        return;
      }

      res.status(200).json({
        message: '프로필 조회 성공',
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
      res.status(500).json({ message: '프로필 조회 실패' });
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
        res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        return;
      }

      // 세션 정보도 업데이트
      req.session.user!.profileImage = profileImage;

      res.status(200).json({
        message: '프로필 업데이트 성공',
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
      res.status(500).json({ message: '프로필 업데이트 실패' });
    }
  };

  updateUsername = async (req: express.Request, res: express.Response) => {
    const { newUsername } = req.body;

    const usernameValidation = UserValidator.validateUsername(newUsername);
    if (!usernameValidation.isValid) {
      res.status(400).json({ message: usernameValidation.message });
      return;
    }

    try {
      const userId = req.session.user!.userId;
      const currentUser = await this.userService.findById(userId);

      if (!currentUser) {
        res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        return;
      }

      if (currentUser.username === newUsername) {
        res.status(400).json({ message: '현재 별명과 동일합니다.' });
        return;
      }

      const existingUser = await this.userService.findByUsername(newUsername);
      if (existingUser) {
        res.status(400).json({ message: '이미 사용 중인 별명입니다.' });
        return;
      }

      const updatedUser = await this.userService.updateUser(userId, {
        username: newUsername,
      });

      if (!updatedUser) {
        res.status(404).json({ message: '사용자 업데이트에 실패했습니다.' });
        return;
      }

      req.session.user!.username = newUsername;

      res.status(200).json({
        message: '별명이 성공적으로 변경되었습니다.',
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
      res.status(500).json({ message: '별명 변경 실패' });
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

      res.status(200).json({
        message: '사용자 목록 조회 성공',
        totalUsers,
        currentPage: Math.floor(skip / limit) + 1,
        totalPages: Math.ceil(totalUsers / limit),
        users: safeUsers,
      });
    } catch (error) {
      logger.error('사용자 목록 조회 에러:', error);
      res.status(500).json({ message: '사용자 목록 조회 실패' });
    }
  };
}
