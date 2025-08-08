import express from "express";
import { UserService } from "../../services/auth/userService";
import { safeParseInt } from "../../utils/numberUtils";
import logger from "../../utils/logger";


export class AdminController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * @swagger
   * /auth/admin/users:
   *   get:
   *     summary: 전체 사용자 목록 조회 (관리자 전용)
   *     description: 모든 사용자의 목록을 페이지네이션과 함께 조회합니다. 관리자 권한이 필요합니다.
   *     tags: [Admin]
   *     security:
   *       - sessionAuth: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 50
   *           minimum: 1
   *           maximum: 100
   *         description: 페이지당 사용자 수
   *       - in: query
   *         name: skip
   *         schema:
   *           type: integer
   *           default: 0
   *           minimum: 0
   *         description: 건너뛸 사용자 수
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: 사용자명 또는 이메일 검색
   *     responses:
   *       200:
   *         description: 사용자 목록 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "사용자 목록 조회 성공"
   *                 totalUsers:
   *                   type: integer
   *                   example: 1250
   *                 currentPage:
   *                   type: integer
   *                   example: 1
   *                 totalPages:
   *                   type: integer
   *                   example: 25
   *                 users:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/AdminUserView'
   *       401:
   *         description: 로그인 필요
   *       403:
   *         description: 관리자 권한 필요
   *       500:
   *         description: 서버 에러
   */
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
            user.email.toLowerCase().includes(search.toLowerCase())
        );
      }

      const safeUsers = filteredUsers.map((user) => ({
        id: user._id,
        email: user.email,
        username: user.username,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        // 추가 관리자 정보
        lastLogin: user.updatedAt, // 마지막 활동 시간으로 대체
        status: "active", // 추후 사용자 상태 필드 추가 시 사용
      }));

      res.status(200).json({
        message: "사용자 목록 조회 성공",
        totalUsers,
        currentPage: Math.floor(skip / limit) + 1,
        totalPages: Math.ceil(totalUsers / limit),
        users: safeUsers,
        searchQuery: search || null,
      });
    } catch (error) {
      logger.error("관리자 사용자 목록 조회 에러:", error);
      res.status(500).json({ message: "사용자 목록 조회 실패" });
    }
  };

  /**
   * @swagger
   * /auth/admin/users/{userId}:
   *   get:
   *     summary: 특정 사용자 상세 조회 (관리자 전용)
   *     description: 특정 사용자의 상세 정보를 조회합니다.
   *     tags: [Admin]
   *     security:
   *       - sessionAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: 사용자 ID
   *     responses:
   *       200:
   *         description: 사용자 상세 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 user:
   *                   $ref: '#/components/schemas/AdminUserDetail'
   *       404:
   *         description: 사용자를 찾을 수 없음
   *       401:
   *         description: 로그인 필요
   *       403:
   *         description: 관리자 권한 필요
   */
  getUserById = async (req: express.Request, res: express.Response) => {
    try {
      const { userId } = req.params;
      const user = await this.userService.findById(userId);

      if (!user) {
        res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
        return;
      }

      res.status(200).json({
        message: "사용자 상세 조회 성공",
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          profileImage: user.profileImage,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          // 관리자용 추가 정보
          lastLogin: user.updatedAt,
          accountStatus: "active",
          loginCount: 0, // 추후 구현
        },
      });
    } catch (error) {
      logger.error("관리자 사용자 상세 조회 에러:", error);
      res.status(500).json({ message: "사용자 상세 조회 실패" });
    }
  };

  /**
   * @swagger
   * /auth/admin/users/{userId}/status:
   *   patch:
   *     summary: 사용자 상태 변경 (관리자 전용)
   *     description: 사용자 계정을 활성화/비활성화합니다.
   *     tags: [Admin]
   *     security:
   *       - sessionAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: 사용자 ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - status
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [active, suspended, deleted]
   *                 example: "suspended"
   *               reason:
   *                 type: string
   *                 example: "스팸 활동 감지"
   *     responses:
   *       200:
   *         description: 사용자 상태 변경 성공
   *       404:
   *         description: 사용자를 찾을 수 없음
   *       401:
   *         description: 로그인 필요
   *       403:
   *         description: 관리자 권한 필요
   */
  updateUserStatus = async (req: express.Request, res: express.Response) => {
    try {
      const { userId } = req.params;
      const { status, reason } = req.body;

      if (!["active", "suspended", "deleted"].includes(status)) {
        res.status(400).json({ message: "올바르지 않은 상태값입니다." });
        return;
      }

      const user = await this.userService.findById(userId);
      if (!user) {
        res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
        return;
      }

      // 추후 사용자 상태 필드가 추가되면 실제 업데이트 구현
      // await this.userService.updateUser(userId, { status, statusReason: reason });

      logger.info(
        `👑 관리자 조치: 사용자 ${user.username} 상태를 ${status}로 변경 (사유: ${reason})`
      );

      res.status(200).json({
        message: "사용자 상태가 변경되었습니다.",
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          status: status,
          statusReason: reason,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error("사용자 상태 변경 에러:", error);
      res.status(500).json({ message: "사용자 상태 변경 실패" });
    }
  };

  /**
   * @swagger
   * /auth/admin/stats:
   *   get:
   *     summary: 관리자 대시보드 통계 (관리자 전용)
   *     description: 사용자 통계 및 시스템 현황을 조회합니다.
   *     tags: [Admin]
   *     security:
   *       - sessionAuth: []
   *     responses:
   *       200:
   *         description: 통계 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 stats:
   *                   $ref: '#/components/schemas/AdminStats'
   *       401:
   *         description: 로그인 필요
   *       403:
   *         description: 관리자 권한 필요
   */
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

      res.status(200).json({
        message: "관리자 통계 조회 성공",
        stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("관리자 통계 조회 에러:", error);
      res.status(500).json({ message: "통계 조회 실패" });
    }
  };
}
