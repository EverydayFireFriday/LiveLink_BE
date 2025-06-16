import express from "express";
import { AuthValidator } from "../../validators/auth/authValidator";

// UserService와 AuthService는 필요할 때 지연 로딩
export class AuthController {
  /**
   * @swagger
   * /auth/login:
   *   post:
   *     summary: 사용자 로그인
   *     tags: [Auth]
   */
  login = async (req: express.Request, res: express.Response) => {
    const { email, password } = req.body;

    // 유효성 검증
    const emailValidation = AuthValidator.validateEmail(email);
    if (!emailValidation.isValid) {
      res.status(400).json({ message: emailValidation.message });
      return;
    }

    if (!password) {
      res.status(400).json({ message: "비밀번호를 입력해주세요." });
      return;
    }

    try {
      // 지연 로딩으로 서비스 import
      const { AuthService } = await import("../../services/auth/authService");
      const { UserService } = await import("../../services/auth/userService");

      const authService = new AuthService();
      const userService = new UserService();

      // 사용자 확인
      const user = await userService.findByEmail(email);
      if (!user) {
        res
          .status(401)
          .json({ message: "이메일 또는 비밀번호가 일치하지 않습니다." });
        return;
      }

      // 비밀번호 확인
      const isPasswordValid = await authService.verifyPassword(
        password,
        user.passwordHash
      );
      if (!isPasswordValid) {
        res
          .status(401)
          .json({ message: "이메일 또는 비밀번호가 일치하지 않습니다." });
        return;
      }

      // 마지막 로그인 시간 업데이트
      await userService.updateUser(user._id!.toString(), {
        updatedAt: new Date(),
      });

      // 세션 저장
      req.session.user = authService.createSessionData(user);

      res.status(200).json({
        message: "로그인 성공",
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          profileImage: user.profileImage,
        },
        sessionId: req.sessionID,
      });
    } catch (error) {
      console.error("로그인 에러:", error);
      res.status(500).json({ message: "서버 에러로 로그인 실패" });
    }
  };

  /**
   * @swagger
   * /auth/logout:
   *   post:
   *     summary: 로그아웃
   *     tags: [Auth]
   */
  logout = (req: express.Request, res: express.Response) => {
    const sessionId = req.sessionID;

    req.session.destroy((err) => {
      if (err) {
        console.error("로그아웃 에러:", err);
        res.status(500).json({ message: "로그아웃 실패" });
        return;
      }

      res.clearCookie("connect.sid");
      res.status(200).json({
        message: "로그아웃 성공",
        deletedSessionId: sessionId,
      });
    });
  };

  /**
   * @swagger
   * /auth/session:
   *   get:
   *     summary: 로그인 상태 확인
   *     tags: [Auth]
   */
  checkSession = (req: express.Request, res: express.Response) => {
    if (req.session.user) {
      res.status(200).json({
        loggedIn: true,
        user: req.session.user,
        sessionId: req.sessionID,
      });
    } else {
      res.status(200).json({
        loggedIn: false,
        sessionId: req.sessionID,
      });
    }
  };
}
