import express from "express";
import { UserService } from "../../services/auth/userService";
import { UserValidator } from "../../utils/validation/auth/userValidator";

export class ProfileController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * @swagger
   * /auth/profile:
   *   get:
   *     summary: 프로필 조회
   *     description: 현재 로그인된 사용자의 프로필 정보를 조회합니다.
   *     tags: [Profile]
   *     security:
   *       - sessionAuth: []
   *     responses:
   *       200:
   *         description: 프로필 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "프로필 조회 성공"
   *                 user:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                       description: 사용자 ID
   *                     email:
   *                       type: string
   *                       format: email
   *                       description: 사용자 이메일
   *                     username:
   *                       type: string
   *                       description: 사용자명
   *                     profileImage:
   *                       type: string
   *                       description: 프로필 이미지 URL
   *                     createdAt:
   *                       type: string
   *                       format: date-time
   *                       description: 계정 생성일
   *                     updatedAt:
   *                       type: string
   *                       format: date-time
   *                       description: 마지막 업데이트일
   *                 session:
   *                   type: object
   *                   description: 현재 세션 정보
   *                   properties:
   *                     userId:
   *                       type: string
   *                     email:
   *                       type: string
   *                     username:
   *                       type: string
   *                     profileImage:
   *                       type: string
   *       404:
   *         description: 사용자를 찾을 수 없음
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "사용자를 찾을 수 없습니다."
   *       500:
   *         description: 서버 에러
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "프로필 조회 실패"
   */
  getProfile = async (req: express.Request, res: express.Response) => {
    try {
      const user = await this.userService.findByEmail(req.session.user!.email);

      if (!user) {
        res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
        return;
      }

      res.status(200).json({
        message: "프로필 조회 성공",
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          profileImage: user.profileImage,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        session: req.session.user,
      });
    } catch (error) {
      console.error("프로필 조회 에러:", error);
      res.status(500).json({ message: "프로필 조회 실패" });
    }
  };

  /**
   * @swagger
   * /auth/profile:
   *   put:
   *     summary: 프로필 업데이트
   *     description: 현재 로그인된 사용자의 프로필 정보를 업데이트합니다.
   *     tags: [Profile]
   *     security:
   *       - sessionAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               profileImage:
   *                 type: string
   *                 description: 새로운 프로필 이미지 URL
   *                 example: "https://example.com/new-profile-image.jpg"
   *     responses:
   *       200:
   *         description: 프로필 업데이트 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "프로필 업데이트 성공"
   *                 user:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                       description: 사용자 ID
   *                     email:
   *                       type: string
   *                       format: email
   *                       description: 사용자 이메일
   *                     username:
   *                       type: string
   *                       description: 사용자명
   *                     profileImage:
   *                       type: string
   *                       description: 업데이트된 프로필 이미지 URL
   *                     updatedAt:
   *                       type: string
   *                       format: date-time
   *                       description: 업데이트 시간
   *       404:
   *         description: 사용자를 찾을 수 없음
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "사용자를 찾을 수 없습니다."
   *       500:
   *         description: 서버 에러
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "프로필 업데이트 실패"
   */
  updateProfile = async (req: express.Request, res: express.Response) => {
    try {
      const { profileImage } = req.body;
      const userId = req.session.user!.userId;

      const updatedUser = await this.userService.updateUser(userId, {
        profileImage,
      });

      if (!updatedUser) {
        res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
        return;
      }

      // 세션 정보도 업데이트
      req.session.user!.profileImage = profileImage;

      res.status(200).json({
        message: "프로필 업데이트 성공",
        user: {
          id: updatedUser._id,
          email: updatedUser.email,
          username: updatedUser.username,
          profileImage: updatedUser.profileImage,
          updatedAt: updatedUser.updatedAt,
        },
      });
    } catch (error) {
      console.error("프로필 업데이트 에러:", error);
      res.status(500).json({ message: "프로필 업데이트 실패" });
    }
  };

  /**
   * @swagger
   * /auth/username:
   *   put:
   *     summary: 사용자명 변경
   *     description: 현재 로그인된 사용자의 사용자명을 변경합니다.
   *     tags: [Profile]
   *     security:
   *       - sessionAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - newUsername
   *             properties:
   *               newUsername:
   *                 type: string
   *                 description: 새로운 사용자명
   *                 example: "새로운별명"
   *                 minLength: 2
   *                 maxLength: 20
   *     responses:
   *       200:
   *         description: 사용자명 변경 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "별명이 성공적으로 변경되었습니다."
   *                 user:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                       description: 사용자 ID
   *                     email:
   *                       type: string
   *                       format: email
   *                       description: 사용자 이메일
   *                     username:
   *                       type: string
   *                       description: 변경된 사용자명
   *                     profileImage:
   *                       type: string
   *                       description: 프로필 이미지 URL
   *                     updatedAt:
   *                       type: string
   *                       format: date-time
   *                       description: 업데이트 시간
   *                 previousUsername:
   *                   type: string
   *                   description: 이전 사용자명
   *       400:
   *         description: 잘못된 요청
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   examples:
   *                     invalid_username:
   *                       value: "사용자명은 2-20자의 한글, 영문, 숫자만 가능합니다."
   *                     same_username:
   *                       value: "현재 별명과 동일합니다."
   *                     duplicate_username:
   *                       value: "이미 사용 중인 별명입니다."
   *       404:
   *         description: 사용자를 찾을 수 없음
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   examples:
   *                     user_not_found:
   *                       value: "사용자를 찾을 수 없습니다."
   *                     update_failed:
   *                       value: "사용자 업데이트에 실패했습니다."
   *       500:
   *         description: 서버 에러
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "별명 변경 실패"
   */
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
        res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
        return;
      }

      if (currentUser.username === newUsername) {
        res.status(400).json({ message: "현재 별명과 동일합니다." });
        return;
      }

      const existingUser = await this.userService.findByUsername(newUsername);
      if (existingUser) {
        res.status(400).json({ message: "이미 사용 중인 별명입니다." });
        return;
      }

      const updatedUser = await this.userService.updateUser(userId, {
        username: newUsername,
      });

      if (!updatedUser) {
        res.status(404).json({ message: "사용자 업데이트에 실패했습니다." });
        return;
      }

      req.session.user!.username = newUsername;

      res.status(200).json({
        message: "별명이 성공적으로 변경되었습니다.",
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
      console.error("별명 변경 에러:", error);
      res.status(500).json({ message: "별명 변경 실패" });
    }
  };

  /**
   * @swagger
   * /auth/users:
   *   get:
   *     summary: 전체 사용자 목록 조회 (관리자용)
   *     description: 전체 사용자 목록을 페이지네이션과 함께 조회합니다. 관리자 권한이 필요합니다.
   *     tags: [Profile]
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
   *         description: 한 페이지당 사용자 수
   *       - in: query
   *         name: skip
   *         schema:
   *           type: integer
   *           default: 0
   *           minimum: 0
   *         description: 건너뛸 사용자 수 (오프셋)
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
   *                   type: number
   *                   description: 전체 사용자 수
   *                   example: 150
   *                 currentPage:
   *                   type: number
   *                   description: 현재 페이지 번호
   *                   example: 1
   *                 totalPages:
   *                   type: number
   *                   description: 전체 페이지 수
   *                   example: 3
   *                 users:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                         description: 사용자 ID
   *                       email:
   *                         type: string
   *                         format: email
   *                         description: 사용자 이메일
   *                       username:
   *                         type: string
   *                         description: 사용자명
   *                       profileImage:
   *                         type: string
   *                         description: 프로필 이미지 URL
   *                       createdAt:
   *                         type: string
   *                         format: date-time
   *                         description: 계정 생성일
   *                       updatedAt:
   *                         type: string
   *                         format: date-time
   *                         description: 마지막 업데이트일
   *       500:
   *         description: 서버 에러
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "사용자 목록 조회 실패"
   */
  getAllUsers = async (req: express.Request, res: express.Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = parseInt(req.query.skip as string) || 0;

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
        message: "사용자 목록 조회 성공",
        totalUsers,
        currentPage: Math.floor(skip / limit) + 1,
        totalPages: Math.ceil(totalUsers / limit),
        users: safeUsers,
      });
    } catch (error) {
      console.error("사용자 목록 조회 에러:", error);
      res.status(500).json({ message: "사용자 목록 조회 실패" });
    }
  };
}
