import express from 'express';
import { UserService } from '../../services/auth/userService';
import { safeParseInt } from '../../utils/number/numberUtils';
import logger from '../../utils/logger/logger';
import { ResponseBuilder } from '../../utils/response/apiResponse';
import { ErrorCodes } from '../../utils/errors/errorCodes';
import { UserRole } from '../../models/auth/user';
import {
  AppError,
  BadRequestError,
  NotFoundError,
  InternalServerError,
} from '../../utils/errors/customErrors';

export class AdminController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  getAllUsers = async (req: express.Request, res: express.Response) => {
    try {
      const limit = safeParseInt(req.query.limit, 50);
      const skip = safeParseInt(req.query.skip, 0);
      const search = req.query.search as string;

      const users = await this.userService.getAllUsers(limit, skip);
      const totalUsers = await this.userService.countUsers();

      // 검색 기능 (추후 구현)
      let filteredUsers = users;
      if (search) {
        filteredUsers = users.filter(
          (user) =>
            user.username.toLowerCase().includes(search.toLowerCase()) ||
            user.email.toLowerCase().includes(search.toLowerCase()),
        );
      }

      const safeUsers = filteredUsers.map((user) => ({
        id: user._id,
        email: user.email,
        username: user.username,
        profileImage: user.profileImage,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        // 추가 관리자 정보
        lastLogin: user.updatedAt, // 마지막 활동 시간으로 대체
        status: user.status, // 추후 사용자 상태 필드 추가 시 사용
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
      logger.error('관리자 사용자 목록 조회 에러:', error);
      throw new InternalServerError(
        '사용자 목록 조회 실패',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };

  getUserById = async (req: express.Request, res: express.Response) => {
    try {
      const { userId } = req.params;
      const user = await this.userService.findById(userId);

      if (!user) {
        throw new NotFoundError(
          '사용자를 찾을 수 없습니다.',
          ErrorCodes.AUTH_USER_NOT_FOUND,
        );
      }

      return ResponseBuilder.success(res, '사용자 상세 조회 성공', {
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          profileImage: user.profileImage,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          // 관리자용 추가 정보
          lastLogin: user.updatedAt,
          accountStatus: user.status,
          loginCount: 0, // 추후 구현
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('관리자 사용자 상세 조회 에러:', error);
      throw new InternalServerError(
        '사용자 상세 조회 실패',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };

  updateUserStatus = async (req: express.Request, res: express.Response) => {
    try {
      const { userId } = req.params;
      const { status, reason } = req.body;

      if (!['active', 'suspended', 'deleted'].includes(status)) {
        throw new BadRequestError(
          '올바르지 않은 상태값입니다.',
          ErrorCodes.VAL_INVALID_ENUM,
        );
      }

      const user = await this.userService.findById(userId);
      if (!user) {
        throw new NotFoundError(
          '사용자를 찾을 수 없습니다.',
          ErrorCodes.AUTH_USER_NOT_FOUND,
        );
      }

      await this.userService.updateUser(userId, {
        status,
        statusReason: reason,
      });

      logger.info(
        `👑 관리자 조치: 사용자 ${user.username} 상태를 ${status}로 변경 (사유: ${reason})`,
      );

      return ResponseBuilder.success(res, '사용자 상태가 변경되었습니다.', {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          status: status,
          statusReason: reason,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('사용자 상태 변경 에러:', error);
      throw new InternalServerError(
        '사용자 상태 변경 실패',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };

  getAdminStats = async (req: express.Request, res: express.Response) => {
    try {
      const totalUsers = await this.userService.countUsers();

      // 추후 구현할 통계들
      const stats = {
        users: {
          total: totalUsers,
          active: totalUsers, // 추후 상태별 카운트 구현
          newToday: 0,
          newThisWeek: 0,
        },
        system: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          nodeVersion: process.version,
        },
        activity: {
          loginToday: 0, // 추후 구현
          loginThisWeek: 0,
          sessionsActive: 0,
        },
      };

      return ResponseBuilder.success(res, '관리자 통계 조회 성공', {
        stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('관리자 통계 조회 에러:', error);
      throw new InternalServerError(
        '통계 조회 실패',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };

  /**
   * Get users with email and role for admin management
   * 관리자용 사용자 목록 조회 (이메일, 역할 포함)
   */
  getUsersForAdmin = async (req: express.Request, res: express.Response) => {
    try {
      const limit = safeParseInt(req.query.limit, 50);
      const skip = safeParseInt(req.query.skip, 0);

      const users = await this.userService.getUsersForAdmin(limit, skip);
      const totalUsers = await this.userService.countUsers();

      return ResponseBuilder.paginated(res, '사용자 목록 조회 성공', users, {
        total: totalUsers,
        page: Math.floor(skip / limit) + 1,
        limit,
        totalPages: Math.ceil(totalUsers / limit),
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('관리자 사용자 목록 조회 에러:', error);
      throw new InternalServerError(
        '사용자 목록 조회 실패',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };

  /**
   * Update user role (admin only)
   * 사용자 역할 변경 (관리자 전용)
   */
  updateUserRole = async (req: express.Request, res: express.Response) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      // 역할 유효성 검증
      if (!Object.values(UserRole).includes(role)) {
        throw new BadRequestError(
          '올바르지 않은 역할입니다.',
          ErrorCodes.VAL_INVALID_ENUM,
        );
      }

      // 사용자 존재 확인
      const user = await this.userService.findById(userId);
      if (!user) {
        throw new NotFoundError(
          '사용자를 찾을 수 없습니다.',
          ErrorCodes.AUTH_USER_NOT_FOUND,
        );
      }

      // 역할 변경
      const updatedUser = await this.userService.updateUserRole(userId, role);

      if (!updatedUser) {
        throw new InternalServerError(
          '역할 변경에 실패했습니다.',
          ErrorCodes.SYS_INTERNAL_ERROR,
        );
      }

      logger.info(
        `👑 관리자 조치: 사용자 ${user.username} 역할을 ${role}로 변경`,
      );

      return ResponseBuilder.success(res, '사용자 역할이 변경되었습니다.', {
        user: {
          id: updatedUser._id,
          username: updatedUser.username,
          email: updatedUser.email,
          role: updatedUser.role,
          updatedAt: updatedUser.updatedAt,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('사용자 역할 변경 에러:', error);
      throw new InternalServerError(
        '사용자 역할 변경 실패',
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };
}
